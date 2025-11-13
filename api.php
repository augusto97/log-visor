<?php
session_start();
require_once 'LogParser.php';

header('Content-Type: application/json');

$response = [
    'success' => false,
    'message' => '',
    'data' => null
];

try {
    $action = $_GET['action'] ?? '';

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
    $response['message'] = $e->getMessage();
}

echo json_encode($response);

/**
 * Parse and return log entries
 */
function parseLog() {
    if (!isset($_SESSION['current_log'])) {
        throw new Exception('No hay ningún archivo de log cargado');
    }

    $logFile = __DIR__ . '/uploads/' . $_SESSION['current_log'];

    if (!file_exists($logFile)) {
        throw new Exception('El archivo de log no existe');
    }

    $parser = new LogParser($logFile);
    $parser->parse();

    $page = intval($_GET['page'] ?? 1);
    $perPage = intval($_GET['per_page'] ?? 50);

    $entries = $parser->getEntries();
    $paginated = $parser->paginate($entries, $page, $perPage);

    return [
        'success' => true,
        'data' => [
            'entries' => $paginated['entries'],
            'pagination' => $paginated['pagination'],
            'stats' => $parser->getStats(),
            'total_lines' => count($entries),
            'file_name' => $_SESSION['original_name'] ?? $_SESSION['current_log']
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

    $logFile = __DIR__ . '/uploads/' . $_SESSION['current_log'];

    if (!file_exists($logFile)) {
        throw new Exception('El archivo de log no existe');
    }

    $parser = new LogParser($logFile);
    $parser->parse();

    $level = $_GET['level'] ?? null;
    $search = $_GET['search'] ?? null;
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    $page = intval($_GET['page'] ?? 1);
    $perPage = intval($_GET['per_page'] ?? 50);

    $filtered = $parser->filter($level, $search, $startDate, $endDate);
    $paginated = $parser->paginate($filtered, $page, $perPage);

    return [
        'success' => true,
        'data' => [
            'entries' => $paginated['entries'],
            'pagination' => $paginated['pagination'],
            'stats' => $parser->getStats(),
            'total_lines' => count($parser->getEntries()),
            'filtered_lines' => count($filtered),
            'file_name' => $_SESSION['original_name'] ?? $_SESSION['current_log']
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

    $logFile = __DIR__ . '/uploads/' . $_SESSION['current_log'];

    if (file_exists($logFile)) {
        unlink($logFile);
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
    $uploadsDir = __DIR__ . '/uploads';
    $logs = [];

    if (is_dir($uploadsDir)) {
        $files = scandir($uploadsDir);

        foreach ($files as $file) {
            if ($file === '.' || $file === '..') {
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

    return [
        'success' => true,
        'data' => [
            'logs' => $logs,
            'current_log' => $_SESSION['current_log'] ?? null
        ]
    ];
}
