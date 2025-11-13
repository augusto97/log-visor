<?php
/**
 * Script de prueba del parser
 */
require_once 'LogParser.php';

// Prueba con el archivo de ejemplo
$testFile = __DIR__ . '/example.log';

if (!file_exists($testFile)) {
    die("Archivo de prueba no encontrado: $testFile\n");
}

echo "=== Test del LogParser ===\n\n";
echo "Archivo: $testFile\n";
echo "Tamaño: " . filesize($testFile) . " bytes\n\n";

try {
    $parser = new LogParser($testFile);
    $parser->parse();

    $entries = $parser->getEntries();
    $stats = $parser->getStats();

    echo "Total de entradas parseadas: " . count($entries) . "\n";
    echo "\nEstadísticas por nivel:\n";
    foreach ($stats as $level => $count) {
        echo "  $level: $count\n";
    }

    echo "\n=== Primeras 5 entradas ===\n";
    foreach (array_slice($entries, 0, 5) as $i => $entry) {
        echo "\nEntrada " . ($i + 1) . ":\n";
        echo "  Línea: " . $entry['line_number'] . "\n";
        echo "  Timestamp: " . ($entry['timestamp'] ?? 'N/A') . "\n";
        echo "  Nivel: " . $entry['level'] . "\n";
        echo "  Mensaje: " . substr($entry['message'], 0, 80) . "...\n";
    }

    echo "\n=== Test de Filtrado ===\n";
    $errors = $parser->filter('ERROR');
    echo "Total de ERROR: " . count($errors) . "\n";

    $warnings = $parser->filter('WARNING');
    echo "Total de WARNING: " . count($warnings) . "\n";

    echo "\n=== Test completado con éxito ===\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}
