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

        // Try different log formats

        // Apache/Nginx access log
        if (preg_match('/^(\S+) \S+ \S+ \[(.*?)\] "(.*?)" (\d+) (\d+|-) "(.*?)" "(.*?)"/', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[2]);
            $entry['level'] = 'ACCESS';
            $entry['message'] = $matches[3];
            $entry['context'] = [
                'ip' => $matches[1],
                'status' => $matches[4],
                'size' => $matches[5],
                'referer' => $matches[6],
                'user_agent' => $matches[7]
            ];
        }
        // Apache/Nginx error log
        elseif (preg_match('/^\[(.*?)\] \[(.*?)\] \[(.*?)\] (.*)/', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[1]);
            $entry['level'] = strtoupper($matches[2]);
            $entry['message'] = $matches[4];
            $entry['context']['client'] = $matches[3];
        }
        // PHP error log
        elseif (preg_match('/^\[(.*?)\] PHP (.*?):  (.*)/', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[1]);
            $entry['level'] = $this->normalizeLevel($matches[2]);
            $entry['message'] = $matches[3];
        }
        // WordPress debug log
        elseif (preg_match('/^\[(.*?)\] (.*?): (.*)/', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[1]);
            $entry['level'] = strtoupper($matches[2]);
            $entry['message'] = $matches[3];
        }
        // Generic timestamp + level + message
        elseif (preg_match('/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}.*?)\s*[\[\(]?(ERROR|WARN|WARNING|INFO|DEBUG|NOTICE|CRITICAL|ALERT|EMERGENCY)[\]\)]?\s*:?\s*(.*)$/i', $line, $matches)) {
            $entry['timestamp'] = $this->parseDate($matches[1]);
            $entry['level'] = strtoupper($matches[2]);
            $entry['message'] = $matches[3];
        }
        // Look for level keywords anywhere in the line
        elseif (preg_match('/(ERROR|WARN|WARNING|INFO|DEBUG|NOTICE|CRITICAL|ALERT|EMERGENCY)/i', $line, $matches)) {
            $entry['level'] = strtoupper($matches[1]);

            // Try to extract timestamp
            if (preg_match('/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\s]*)/', $line, $dateMatch)) {
                $entry['timestamp'] = $this->parseDate($dateMatch[1]);
            }
        }

        $entry['level'] = $this->normalizeLevel($entry['level']);

        return $entry;
    }

    /**
     * Normalize log level names
     */
    private function normalizeLevel($level) {
        $level = strtoupper($level);

        $levelMap = [
            'FATAL ERROR' => 'ERROR',
            'FATAL' => 'ERROR',
            'WARN' => 'WARNING',
            'ERR' => 'ERROR',
            'CRIT' => 'CRITICAL',
            'EMERG' => 'EMERGENCY'
        ];

        return $levelMap[$level] ?? $level;
    }

    /**
     * Parse various date formats
     */
    private function parseDate($dateStr) {
        try {
            // Try common formats
            $formats = [
                'd/M/Y:H:i:s O',  // Apache
                'D M d H:i:s Y',  // Nginx error
                'd-M-Y H:i:s e',  // PHP
                'Y-m-d H:i:s',    // MySQL
                'Y-m-d\TH:i:sP',  // ISO8601
                'Y-m-d\TH:i:s.uP' // ISO8601 with microseconds
            ];

            foreach ($formats as $format) {
                $date = DateTime::createFromFormat($format, $dateStr);
                if ($date !== false) {
                    return $date->format('Y-m-d H:i:s');
                }
            }

            // Try strtotime as fallback
            $timestamp = strtotime($dateStr);
            if ($timestamp !== false) {
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
