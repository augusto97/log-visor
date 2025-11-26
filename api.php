<?php
require_once 'config.php';
require_once 'LogParser.php';

initSecureSession();
setSecurityHeaders();
requireAuth();

header('Content-Type: application/json');

$response = [
    'success' => false,
    'message' => '',
    'data' => null
];

try {
    // Rate limiting para API
    checkRateLimit('api');

    $action = sanitizeInput($_GET['action'] ?? '');

    switch ($action) {
        case 'parse':
            $response = parseLog();
            break;

        case 'filter':
            $response = filterLog();
            break;

        case 'delete':
            $response = deleteLog();
            break;

        case 'list':
            $response = listLogs();
            break;

        default:
            throw new Exception('Acción no válida');
    }

} catch (Exception $e) {
    $response = handleError($e);
}

echo json_encode($response);

/**
 * Parse and return log entries
 */
function parseLog() {
    if (!isset($_SESSION['current_log'])) {
        throw new Exception('No hay ningún archivo de log cargado');
    }

    // Validar path traversal - SEGURIDAD CRÍTICA
    $logFile = validateFilePath($_SESSION['current_log']);

    $parser = new LogParser($logFile);
    $parser->parse();

    $page = max(1, intval($_GET['page'] ?? 1));
    $perPage = max(1, min(1000, intval($_GET['per_page'] ?? 50)));

    $entries = $parser->getEntries();
    $paginated = $parser->paginate($entries, $page, $perPage);

    securityLog("Parse de archivo: " . basename($logFile) . " (página $page)");

    return [
        'success' => true,
        'data' => [
            'entries' => $paginated['entries'],
            'pagination' => $paginated['pagination'],
            'stats' => $parser->getStats(),
            'total_lines' => count($entries),
            'file_name' => $_SESSION['original_name'] ?? basename($_SESSION['current_log'])
        ]
    ];
}

/**
 * Filter log entries
 */
function filterLog() {
    if (!isset($_SESSION['current_log'])) {
        throw new Exception('No hay ningún archivo de log cargado');
    }

    // Validar path traversal - SEGURIDAD CRÍTICA
    $logFile = validateFilePath($_SESSION['current_log']);

    $parser = new LogParser($logFile);
    $parser->parse();

    // Sanitizar y validar parámetros de entrada
    $level = validateLogLevel($_GET['level'] ?? '');
    $search = sanitizeInput($_GET['search'] ?? '', 200);
    $startDate = sanitizeInput($_GET['start_date'] ?? '', 30);
    $endDate = sanitizeInput($_GET['end_date'] ?? '', 30);
    $page = max(1, intval($_GET['page'] ?? 1));
    $perPage = max(1, min(1000, intval($_GET['per_page'] ?? 50)));

    $filtered = $parser->filter($level, $search, $startDate, $endDate);
    $paginated = $parser->paginate($filtered, $page, $perPage);

    securityLog("Filtro aplicado - Level: $level, Search: " . substr($search, 0, 50));

    return [
        'success' => true,
        'data' => [
            'entries' => $paginated['entries'],
            'pagination' => $paginated['pagination'],
            'stats' => $parser->getStats(),
            'total_lines' => count($parser->getEntries()),
            'filtered_lines' => count($filtered),
            'file_name' => $_SESSION['original_name'] ?? basename($_SESSION['current_log'])
        ]
    ];
}

/**
 * Delete current log file
 */
function deleteLog() {
    if (!isset($_SESSION['current_log'])) {
        throw new Exception('No hay ningún archivo de log cargado');
    }

    // Validar path traversal - SEGURIDAD CRÍTICA
    $logFile = validateFilePath($_SESSION['current_log']);
    $fileName = basename($logFile);

    if (file_exists($logFile)) {
        unlink($logFile);
        securityLog("Archivo eliminado: $fileName");
    }

    unset($_SESSION['current_log']);
    unset($_SESSION['original_name']);

    return [
        'success' => true,
        'message' => 'Archivo eliminado correctamente'
    ];
}

/**
 * List all uploaded logs
 */
function listLogs() {
    $uploadsDir = UPLOADS_DIR;
    $logs = [];

    if (is_dir($uploadsDir)) {
        $files = scandir($uploadsDir);

        foreach ($files as $file) {
            if ($file === '.' || $file === '..' || $file === '.htaccess' || $file === '.gitkeep') {
                continue;
            }

            $filePath = $uploadsDir . '/' . $file;

            if (is_file($filePath)) {
                $logs[] = [
                    'name' => $file,
                    'size' => filesize($filePath),
                    'modified' => filemtime($filePath),
                    'is_current' => isset($_SESSION['current_log']) && $_SESSION['current_log'] === $file
                ];
            }
        }
    }

    // Sort by modified date, newest first
    usort($logs, function($a, $b) {
        return $b['modified'] - $a['modified'];
    });

    securityLog("Listado de archivos solicitado");

    return [
        'success' => true,
        'data' => [
            'logs' => $logs,
            'current_log' => $_SESSION['current_log'] ?? null
        ]
    ];
}
