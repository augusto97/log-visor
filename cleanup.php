<?php
/**
 * Script de limpieza automática de archivos antiguos
 *
 * Ejecutar con cron cada hora:
 * 0 * * * * /usr/bin/php /ruta/a/log-visor/cleanup.php
 *
 * O ejecutar manualmente:
 * php cleanup.php
 */

require_once 'config.php';

// No requiere sesión ni autenticación para cron jobs
// Solo log de la operación

echo "=== Log Visor - Limpieza Automática ===\n";
echo "Fecha: " . date('Y-m-d H:i:s') . "\n";
echo "Eliminando archivos con más de " . (FILE_EXPIRATION_TIME / 3600) . " horas...\n\n";

try {
    $count = cleanupOldFiles();

    if ($count > 0) {
        echo "✓ Se eliminaron $count archivos antiguos\n";
    } else {
        echo "✓ No hay archivos antiguos para eliminar\n";
    }

    // Mostrar estadísticas del directorio
    $uploadsDir = UPLOADS_DIR;
    $files = glob($uploadsDir . '/*');
    $totalFiles = 0;
    $totalSize = 0;

    foreach ($files as $file) {
        if (is_file($file) && basename($file) !== '.gitkeep' && basename($file) !== '.htaccess') {
            $totalFiles++;
            $totalSize += filesize($file);
        }
    }

    echo "\nEstadísticas del directorio uploads/:\n";
    echo "  - Archivos actuales: $totalFiles\n";
    echo "  - Tamaño total: " . formatBytes($totalSize) . "\n";

    exit(0);

} catch (Exception $e) {
    echo "✗ Error durante la limpieza: " . $e->getMessage() . "\n";
    exit(1);
}

function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];

    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }

    return round($bytes, $precision) . ' ' . $units[$i];
}
