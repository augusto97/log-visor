<?php

class LogParser {
    private $logFile;
    private $entries = [];
    private $stats = [];

    public function __construct($logFile) {
        $this->logFile = $logFile;
    }

    /**
     * Parse the log file and extract entries
     */
    public function parse() {
        if (!file_exists($this->logFile)) {
            throw new Exception("Log file not found: " . $this->logFile);
        }

        $content = file_get_contents($this->logFile);
        $lines = explode("\n", $content);

        foreach ($lines as $lineNumber => $line) {
            if (empty(trim($line))) {
                continue;
            }

            $entry = $this->parseLine($line, $lineNumber + 1);
            if ($entry) {
                $this->entries[] = $entry;
                $this->updateStats($entry);
            }
        }

        return $this->entries;
    }

    /**
     * Parse a single log line and detect format
     */
    private function parseLine($line, $lineNumber) {
        $entry = [
            'line_number' => $lineNumber,
            'raw' => $line,
            'timestamp' => null,
            'level' => 'INFO',
            'message' => $line,
            'context' => []
        ];

        // Try different log formats (order matters - most specific first)

        // Apache Error Log with module and all details: [timestamp] [module:level] [pid x:tid y] [client ip:port] message
        if (preg_match('/^\[([^\]]+)\] \[([^:]+):(error|warn|notice|info|debug|crit|alert|emerg)\] \[pid ([^\]]+)\] \[client ([^\]]+)\] (.*)$/i', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[1]);
            $entry['level'] = strtoupper($matches[3]);
            $rawMessage = trim($matches[6]);

            // Extract error code if present (e.g., AH01071:)
            if (preg_match('/^(AH\d+):\s*(.*)/', $rawMessage, $msgMatch)) {
                $entry['context']['error_code'] = $msgMatch[1];
                $entry['message'] = $msgMatch[2];
            } else {
                $entry['message'] = $rawMessage;
            }

            $entry['context']['module'] = $matches[2];
            $entry['context']['pid'] = $matches[4];
            $entry['context']['client'] = $matches[5];
        }
        // Apache Error Log without PID: [timestamp] [module:level] [client ip] message
        elseif (preg_match('/^\[([^\]]+)\] \[([^:]+):(error|warn|notice|info|debug|crit|alert|emerg)\] \[client ([^\]]+)\] (.*)$/i', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[1]);
            $entry['level'] = strtoupper($matches[3]);
            $entry['message'] = trim($matches[5]);
            $entry['context']['module'] = $matches[2];
            $entry['context']['client'] = $matches[4];
        }
        // Apache/Nginx access log
        elseif (preg_match('/^(\S+) \S+ \S+ \[(.*?)\] "(.*?)" (\d+) (\d+|-) "(.*?)" "(.*?)"/', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[2]);
            $entry['level'] = 'ACCESS';
            $entry['message'] = $matches[3];
            $entry['context'] = [
                'ip' => $matches[1],
                'status' => $matches[4],
                'size' => $matches[5],
                'referer' => $matches[6],
                'user_agent' => substr($matches[7], 0, 100) // Truncate long UA
            ];
        }
        // PHP error log: [date] PHP Level: message
        elseif (preg_match('/^\[(.*?)\] PHP (Fatal error|Parse error|Warning|Notice|Deprecated|Error|Strict Standards):(.*)/', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[1]);
            $entry['level'] = $this->normalizeLevel($matches[2]);
            $entry['message'] = trim($matches[3]);
        }
        // Format: 2025-11-13 10:00:00 [LEVEL] message
        elseif (preg_match('/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})\s*\[(ERROR|WARN|WARNING|INFO|DEBUG|NOTICE|CRITICAL|ALERT|EMERGENCY|FATAL)\]\s*(.*)$/i', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[1]);
            $entry['level'] = strtoupper($matches[2]);
            $entry['message'] = $matches[3];
        }
        // Format: [2025-11-13 10:00:00] LEVEL: message
        elseif (preg_match('/^\[(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})\]\s*(ERROR|WARN|WARNING|INFO|DEBUG|NOTICE|CRITICAL|ALERT|EMERGENCY|FATAL):\s*(.*)$/i', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[1]);
            $entry['level'] = strtoupper($matches[2]);
            $entry['message'] = $matches[3];
        }
        // Generic: [timestamp] [anything] [anything] message
        elseif (preg_match('/^\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.*)/', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[1]);

            // Check if second bracket contains level
            if (preg_match('/(error|warn|warning|info|debug|notice|critical|alert|emergency)/i', $matches[2], $levelMatch)) {
                $entry['level'] = strtoupper($levelMatch[1]);
            }

            $entry['message'] = trim($matches[4]);
            $entry['context']['meta'] = $matches[2] . ' ' . $matches[3];
        }
        // Format: [date] message (only if date is valid)
        elseif (preg_match('/^\[(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\]]*)\]\s+(.*)$/i', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[1]);
            $entry['message'] = $matches[2];
            // Try to extract level from message
            if (preg_match('/^(ERROR|WARN|WARNING|INFO|DEBUG|NOTICE|CRITICAL|ALERT|EMERGENCY|FATAL)[\s:]/i', $matches[2], $levelMatch)) {
                $entry['level'] = strtoupper($levelMatch[1]);
                $entry['message'] = trim(substr($matches[2], strlen($levelMatch[0])));
            }
        }
        // Generic timestamp at start + level somewhere: 2025-11-13 10:00:00 ... ERROR ... message
        elseif (preg_match('/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\s]*)/', $line, $dateMatch)) {
            $entry['timestamp'] = $this->parseDate($dateMatch[1]);
            // Look for level in the rest of the line
            if (preg_match('/[\[\(\s](ERROR|WARN|WARNING|INFO|DEBUG|NOTICE|CRITICAL|ALERT|EMERGENCY|FATAL)[\]\)\s:]/i', $line, $levelMatch)) {
                $entry['level'] = strtoupper($levelMatch[1]);
            }
        }
        // Look for level keywords anywhere in the line (fallback)
        elseif (preg_match('/[\[\(\s](ERROR|WARN|WARNING|INFO|DEBUG|NOTICE|CRITICAL|ALERT|EMERGENCY|FATAL)[\]\)\s:]/i', $line, $matches)) {
            $entry['level'] = strtoupper($matches[1]);
        }

        $entry['level'] = $this->normalizeLevel($entry['level']);

        // Truncate very long messages for display
        if (strlen($entry['message']) > 500) {
            $entry['message'] = substr($entry['message'], 0, 500) . '...';
        }

        return $entry;
    }

    /**
     * Normalize log level names
     */
    private function normalizeLevel($level) {
        $level = strtoupper(trim($level));

        $levelMap = [
            'FATAL ERROR' => 'ERROR',
            'FATAL' => 'ERROR',
            'PARSE ERROR' => 'ERROR',
            'STRICT STANDARDS' => 'NOTICE',
            'WARN' => 'WARNING',
            'ERR' => 'ERROR',
            'CRIT' => 'CRITICAL',
            'EMERG' => 'EMERGENCY',
            'ALERT' => 'CRITICAL',
            'EMERGENCY' => 'CRITICAL'
        ];

        return $levelMap[$level] ?? $level;
    }

    /**
     * Parse various date formats
     */
    private function parseDate($dateStr) {
        try {
            // Remove microseconds if present to simplify parsing
            $dateStr = preg_replace('/\.(\d{6})/', '', $dateStr);

            // Try common formats
            $formats = [
                'D M d H:i:s Y',       // Apache: Mon Apr 07 09:01:14 2025
                'D M d H:i:s.u Y',     // Apache with microseconds
                'd/M/Y:H:i:s O',       // Apache access: 07/Apr/2025:09:01:14 +0000
                'd-M-Y H:i:s e',       // PHP: 13-Nov-2025 10:00:00 UTC
                'Y-m-d H:i:s',         // MySQL: 2025-11-13 10:00:00
                'Y-m-d\TH:i:sP',       // ISO8601: 2025-11-13T10:00:00+00:00
                'Y-m-d\TH:i:s.uP',     // ISO8601 with microseconds
                'M d H:i:s',           // Syslog: Apr 07 09:01:14 (add current year)
            ];

            foreach ($formats as $format) {
                $date = DateTime::createFromFormat($format, $dateStr);
                if ($date !== false && $date->format($format) === $dateStr) {
                    return $date->format('Y-m-d H:i:s');
                }
            }

            // Try strtotime as fallback (very flexible but slower)
            $timestamp = strtotime($dateStr);
            if ($timestamp !== false && $timestamp > 0) {
                return date('Y-m-d H:i:s', $timestamp);
            }
        } catch (Exception $e) {
            // Ignore parsing errors
        }

        return null;
    }

    /**
     * Update statistics
     */
    private function updateStats($entry) {
        $level = $entry['level'];

        if (!isset($this->stats[$level])) {
            $this->stats[$level] = 0;
        }

        $this->stats[$level]++;
    }

    /**
     * Get parsed entries
     */
    public function getEntries() {
        return $this->entries;
    }

    /**
     * Get statistics
     */
    public function getStats() {
        return $this->stats;
    }

    /**
     * Filter entries
     */
    public function filter($level = null, $search = null, $startDate = null, $endDate = null) {
        $filtered = $this->entries;

        if ($level && $level !== 'ALL') {
            $filtered = array_filter($filtered, function($entry) use ($level) {
                return $entry['level'] === $level;
            });
        }

        if ($search) {
            $filtered = array_filter($filtered, function($entry) use ($search) {
                return stripos($entry['raw'], $search) !== false ||
                       stripos($entry['message'], $search) !== false;
            });
        }

        if ($startDate) {
            $filtered = array_filter($filtered, function($entry) use ($startDate) {
                return !$entry['timestamp'] || $entry['timestamp'] >= $startDate;
            });
        }

        if ($endDate) {
            $filtered = array_filter($filtered, function($entry) use ($endDate) {
                return !$entry['timestamp'] || $entry['timestamp'] <= $endDate;
            });
        }

        return array_values($filtered);
    }

    /**
     * Get paginated entries
     */
    public function paginate($entries, $page = 1, $perPage = 50) {
        $total = count($entries);
        $totalPages = ceil($total / $perPage);
        $offset = ($page - 1) * $perPage;

        return [
            'entries' => array_slice($entries, $offset, $perPage),
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => $totalPages,
                'has_prev' => $page > 1,
                'has_next' => $page < $totalPages
            ]
        ];
    }
}
