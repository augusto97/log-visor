<?php
require_once 'config.php';

initSecureSession();
setSecurityHeaders();
requireAuth();

securityLog('Acceso a debug.php');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debug - Log Visor</title>
    <style>
        body {
            font-family: monospace;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        .section {
            background: #2d2d2d;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 8px;
        }
        h2 {
            color: #4ec9b0;
            border-bottom: 2px solid #4ec9b0;
            padding-bottom: 10px;
        }
        .ok {
            color: #4ec9b0;
        }
        .error {
            color: #f48771;
        }
        pre {
            background: #1e1e1e;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
        }
        .test-btn {
            background: #0e639c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px;
        }
        .test-btn:hover {
            background: #1177bb;
        }
        #test-results {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <h1>🔧 Log Visor - Diagnóstico</h1>

    <div class="section">
        <h2>Información del Sistema</h2>
        <pre><?php
        echo "PHP Version: " . PHP_VERSION . "\n";
        echo "Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'N/A') . "\n";
        echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
        echo "Script Path: " . __DIR__ . "\n";
        ?></pre>
    </div>

    <div class="section">
        <h2>Archivos del Proyecto</h2>
        <pre><?php
        $files = [
            'index.php',
            'upload.php',
            'api.php',
            'LogParser.php',
            'assets/css/style.css',
            'assets/js/app.js',
            'uploads/'
        ];

        foreach ($files as $file) {
            $path = __DIR__ . '/' . $file;
            if (file_exists($path)) {
                echo "✓ $file ";
                if (is_dir($path)) {
                    echo "(directorio, permisos: " . substr(sprintf('%o', fileperms($path)), -4) . ")";
                } else {
                    echo "(" . filesize($path) . " bytes)";
                }
                echo "\n";
            } else {
                echo "✗ $file (NO ENCONTRADO)\n";
            }
        }
        ?></pre>
    </div>

    <div class="section">
        <h2>Extensiones PHP</h2>
        <pre><?php
        $required = ['mbstring', 'fileinfo', 'session'];
        foreach ($required as $ext) {
            if (extension_loaded($ext)) {
                echo "✓ $ext\n";
            } else {
                echo "✗ $ext (NO CARGADA)\n";
            }
        }
        ?></pre>
    </div>

    <div class="section">
        <h2>Test del Parser</h2>
        <pre><?php
        require_once 'LogParser.php';

        $testFile = __DIR__ . '/example.log';
        if (file_exists($testFile)) {
            try {
                $parser = new LogParser($testFile);
                $parser->parse();
                $entries = $parser->getEntries();
                $stats = $parser->getStats();

                echo "✓ Parser funciona correctamente\n";
                echo "  Entradas: " . count($entries) . "\n";
                echo "  Estadísticas: " . json_encode($stats) . "\n";
            } catch (Exception $e) {
                echo "✗ Error en parser: " . $e->getMessage() . "\n";
            }
        } else {
            echo "✗ Archivo example.log no encontrado\n";
        }
        ?></pre>
    </div>

    <div class="section">
        <h2>Test de API</h2>
        <button class="test-btn" onclick="testAPI('list')">Test List</button>
        <button class="test-btn" onclick="testUpload()">Test Upload</button>
        <button class="test-btn" onclick="testParse()">Test Parse</button>

        <div id="test-results"></div>
    </div>

    <div class="section">
        <h2>Archivos de Ejemplo</h2>
        <pre><?php
        $examples = glob(__DIR__ . '/example*');
        foreach ($examples as $ex) {
            echo basename($ex) . " (" . filesize($ex) . " bytes)\n";
        }
        ?></pre>
    </div>

    <script>
        function testAPI(action) {
            const resultsDiv = document.getElementById('test-results');
            resultsDiv.innerHTML = '<p>Probando API action=' + action + '...</p>';

            fetch('api.php?action=' + action)
                .then(response => response.json())
                .then(data => {
                    resultsDiv.innerHTML = '<h3>Resultado:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                })
                .catch(error => {
                    resultsDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
                });
        }

        function testUpload() {
            const resultsDiv = document.getElementById('test-results');
            resultsDiv.innerHTML = '<p>Para probar upload, usa la interfaz principal</p>';
        }

        function testParse() {
            const resultsDiv = document.getElementById('test-results');
            resultsDiv.innerHTML = '<p>Probando parse con example.log...</p>';

            // First upload example.log
            fetch('example.log')
                .then(response => response.blob())
                .then(blob => {
                    const formData = new FormData();
                    formData.append('logfile', blob, 'example.log');

                    return fetch('upload.php', {
                        method: 'POST',
                        body: formData
                    });
                })
                .then(response => response.json())
                .then(uploadData => {
                    if (uploadData.success) {
                        // Now test parse
                        return fetch('api.php?action=parse&page=1');
                    } else {
                        throw new Error('Upload failed: ' + uploadData.message);
                    }
                })
                .then(response => response.json())
                .then(data => {
                    resultsDiv.innerHTML = '<h3>Resultado Parse:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                })
                .catch(error => {
                    resultsDiv.innerHTML = '<p class="error">Error: ' + error.message + '</p>';
                });
        }
    </script>

    <div class="section">
        <p><a href="index.php" style="color: #4ec9b0;">← Volver a la aplicación</a></p>
    </div>
</body>
</html>
