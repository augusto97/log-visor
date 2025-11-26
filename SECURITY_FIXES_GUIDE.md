# 🔧 GUÍA DE IMPLEMENTACIÓN DE CORRECCIONES DE SEGURIDAD

Esta guía muestra cómo implementar las correcciones para las vulnerabilidades encontradas.

---

## 📁 Archivos Creados

1. **`security.php`** - Funciones de seguridad reutilizables
2. **`uploads/.htaccess`** - Protección del directorio de uploads
3. **`SECURITY_AUDIT.md`** - Reporte completo de auditoría

---

## 🔴 CORRECCIONES CRÍTICAS

### 1. Corregir `upload.php`

**Cambios necesarios:**

```php
<?php
// Añadir al inicio
require_once 'security.php';
initSecureSession();
addSecurityHeaders();

// Verificar rate limiting
checkRateLimit('upload', 5, 3600); // 5 uploads por hora

header('Content-Type: application/json');

// ... código existente ...

try {
    // Validar CSRF
    $csrfToken = $_POST['csrf_token'] ?? '';
    if (!validateCSRFToken($csrfToken)) {
        throw new Exception('Token de seguridad inválido');
    }

    if (!isset($_FILES['logfile']) || $_FILES['logfile']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No se recibió ningún archivo o hubo un error en la subida');
    }

    $file = $_FILES['logfile'];
    $maxFileSize = 10 * 1024 * 1024; // Reducir a 10MB

    // Validar tamaño
    if ($file['size'] > $maxFileSize) {
        throw new Exception('El archivo es demasiado grande. Máximo 10MB');
    }

    // ✅ NUEVO: Validar MIME type
    validateFileMimeType($file['tmp_name']);

    $sample = file_get_contents($file['tmp_name'], false, null, 0, 8192);

    if (empty($sample)) {
        throw new Exception('El archivo está vacío');
    }

    $binaryCheck = preg_match('/[\x00-\x08\x0B-\x0C\x0E-\x1F]/', $sample);
    if ($binaryCheck) {
        throw new Exception('El archivo parece ser binario. Solo se aceptan archivos de texto plano');
    }

    if (!mb_check_encoding($sample, 'UTF-8') && !mb_check_encoding($sample, 'ASCII')) {
        throw new Exception('El archivo no tiene una codificación de texto válida (UTF-8 o ASCII)');
    }

    $uploadsDir = __DIR__ . '/uploads';
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
    }

    // ✅ CAMBIO: Generar nombre aleatorio seguro (sin usar nombre original)
    $uniqueName = generateSecureFilename('log');
    $destination = $uploadsDir . '/' . $uniqueName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        throw new Exception('Error al guardar el archivo');
    }

    // ✅ NUEVO: Log de seguridad
    logSecurityEvent('file_upload', [
        'filename' => $uniqueName,
        'size' => $file['size'],
        'original_name' => $file['name']
    ]);

    $_SESSION['current_log'] = $uniqueName;
    $_SESSION['original_name'] = $file['name'];

    $response['success'] = true;
    $response['message'] = 'Archivo subido correctamente';
    $response['file'] = [
        'name' => $uniqueName,
        'original_name' => $file['name'],
        'size' => $file['size']
    ];

} catch (Exception $e) {
    $response['message'] = $e->getMessage();

    // ✅ NUEVO: Log de errores de seguridad
    logSecurityEvent('upload_error', ['error' => $e->getMessage()]);
}

echo json_encode($response);
```

---

### 2. Corregir `api.php`

**Cambios necesarios:**

```php
<?php
// Añadir al inicio
require_once 'security.php';
initSecureSession();
addSecurityHeaders();

header('Content-Type: application/json');

$response = [
    'success' => false,
    'message' => '',
    'data' => null
];

try {
    $action = $_GET['action'] ?? '';

    // ✅ NUEVO: Validar CSRF para operaciones destructivas
    if ($action === 'delete') {
        $csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!validateCSRFToken($csrfToken)) {
            throw new Exception('Token de seguridad inválido');
        }
    }

    // ✅ NUEVO: Rate limiting
    checkRateLimit($action, 50, 60); // 50 requests por minuto

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
    // ✅ CAMBIO: No exponer paths del servidor
    $response['message'] = $e->getMessage();

    // Log interno con detalles
    logSecurityEvent('api_error', [
        'action' => $_GET['action'] ?? 'unknown',
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}

echo json_encode($response);

function parseLog() {
    if (!isset($_SESSION['current_log'])) {
        throw new Exception('No hay ningún archivo de log cargado');
    }

    // ✅ CAMBIO CRÍTICO: Validar filename para prevenir Path Traversal
    $logFile = validateLogFilename($_SESSION['current_log']);

    if (!file_exists($logFile)) {
        throw new Exception('El archivo de log no existe');
    }

    // ✅ NUEVO: Verificar tamaño antes de parsear
    $fileSize = filesize($logFile);
    $maxSize = getMaxProcessableFileSize();

    if ($fileSize > $maxSize) {
        throw new Exception('Archivo demasiado grande para procesar');
    }

    $parser = new LogParser($logFile);
    $parser->parse();

    $page = intval($_GET['page'] ?? 1);
    $perPage = intval($_GET['per_page'] ?? 50);

    // ✅ VALIDAR: Limitar per_page
    $perPage = min($perPage, 100); // Máximo 100 por página

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

function filterLog() {
    if (!isset($_SESSION['current_log'])) {
        throw new Exception('No hay ningún archivo de log cargado');
    }

    // ✅ CAMBIO CRÍTICO: Validar filename
    $logFile = validateLogFilename($_SESSION['current_log']);

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
    $perPage = min(intval($_GET['per_page'] ?? 50), 100);

    // ✅ NUEVO: Sanitizar búsqueda para prevenir ReDoS
    if ($search && strlen($search) > 200) {
        $search = substr($search, 0, 200);
    }

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

function deleteLog() {
    if (!isset($_SESSION['current_log'])) {
        throw new Exception('No hay ningún archivo de log cargado');
    }

    // ✅ CAMBIO CRÍTICO: Validar filename
    $logFile = validateLogFilename($_SESSION['current_log']);

    if (file_exists($logFile)) {
        // ✅ NUEVO: Log antes de eliminar
        logSecurityEvent('file_delete', [
            'filename' => $_SESSION['current_log']
        ]);

        unlink($logFile);
    }

    unset($_SESSION['current_log']);
    unset($_SESSION['original_name']);

    return [
        'success' => true,
        'message' => 'Archivo eliminado correctamente'
    ];
}

function listLogs() {
    $uploadsDir = __DIR__ . '/uploads';
    $logs = [];

    if (is_dir($uploadsDir)) {
        $files = scandir($uploadsDir);

        // ✅ CAMBIO CRÍTICO: Solo listar archivos que coincidan con el patrón seguro
        foreach ($files as $file) {
            if ($file === '.' || $file === '..' || $file === '.htaccess' || $file === '.gitkeep') {
                continue;
            }

            // ✅ NUEVO: Validar que el archivo tenga formato seguro
            if (!preg_match('/^log_[a-f0-9]+\.(log|txt)$/i', $file)) {
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
```

---

### 3. Corregir `index.php`

**Añadir al inicio:**

```php
<?php
require_once 'security.php';
initSecureSession();
addSecurityHeaders();

// Generar CSRF token
$csrfToken = generateCSRFToken();
?>
```

**En el HTML, añadir token CSRF en formularios:**

```html
<script>
// Definir CSRF token globalmente
const csrfToken = '<?php echo $csrfToken; ?>';
</script>
```

---

### 4. Corregir `assets/js/app.js`

**Función showLogDetail() - línea 1299:**

```javascript
function showLogDetail(index) {
    const log = currentLogs[index];
    if (!log) return;

    let html = '<div class="detail-grid">';

    html += `
        <div class="detail-label">Línea:</div>
        <div class="detail-value">#${log.line_number}</div>
        <div class="detail-label">Timestamp:</div>
        <div class="detail-value">${log.timestamp || 'N/A'}</div>
        <div class="detail-label">Nivel:</div>
        <div class="detail-value"><span class="level-badge ${log.level.toLowerCase()}">${escapeHtml(log.level)}</span></div>
    `;

    if (log.context) {
        Object.keys(log.context).forEach(key => {
            html += `
                <div class="detail-label">${escapeHtml(key)}:</div>
                <div class="detail-value"><code>${escapeHtml(log.context[key])}</code></div>
            `;
        });
    }

    html += '</div>';

    html += `
        <div style="margin-bottom: 20px;">
            <strong style="color: var(--text-secondary); font-size: 0.85rem;">MENSAJE:</strong>
            <div class="message-box">${escapeHtml(log.message)}</div>
        </div>
        <div>
            <strong style="color: var(--text-secondary); font-size: 0.85rem;">LÍNEA COMPLETA:</strong>
            <div class="raw-line">${escapeHtml(log.raw)}</div>
        </div>
    `;

    if (logDetail) logDetail.innerHTML = html;
    if (logModal) logModal.classList.add('show');
}
```

**Añadir CSRF token a requests:**

```javascript
// En uploadFile()
async function uploadFile() {
    const formData = new FormData();
    formData.append('logfile', fileInput.files[0]);
    formData.append('csrf_token', csrfToken); // ✅ NUEVO

    try {
        const response = await fetch('upload.php', {
            method: 'POST',
            body: formData
        });
        // ... resto del código
    }
}

// En deleteCurrentFile()
async function deleteCurrentFile() {
    if (!confirm('¿Estás seguro de eliminar este archivo?')) return;

    try {
        const response = await fetch('api.php?action=delete', {
            headers: {
                'X-CSRF-Token': csrfToken // ✅ NUEVO
            }
        });
        // ... resto del código
    }
}
```

---

### 5. Corregir `LogParser.php`

**Optimizar para prevenir Memory Exhaustion:**

```php
public function parse() {
    if (!file_exists($this->logFile)) {
        throw new Exception("Archivo de log no encontrado");
    }

    // ✅ NUEVO: Verificar tamaño antes de leer
    $fileSize = filesize($this->logFile);
    $maxSize = 10 * 1024 * 1024; // 10MB

    if ($fileSize > $maxSize) {
        // ✅ CAMBIO: Leer por streaming en lugar de todo en memoria
        return $this->parseStreaming();
    }

    // Para archivos pequeños, método original
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

// ✅ NUEVO: Método de parsing por streaming
private function parseStreaming() {
    $handle = fopen($this->logFile, 'r');
    if (!$handle) {
        throw new Exception("No se pudo abrir el archivo");
    }

    $lineNumber = 0;
    while (($line = fgets($handle)) !== false) {
        $lineNumber++;

        if (empty(trim($line))) {
            continue;
        }

        $entry = $this->parseLine($line, $lineNumber);
        if ($entry) {
            $this->entries[] = $entry;
            $this->updateStats($entry);
        }

        // ✅ NUEVO: Limitar máximo de entries en memoria
        if (count($this->entries) > 50000) {
            fclose($handle);
            throw new Exception("Archivo demasiado grande (>50k líneas)");
        }
    }

    fclose($handle);
    return $this->entries;
}
```

**Añadir timeout para regex:**

```php
private function parseLine($line, $lineNumber) {
    // ✅ NUEVO: Limitar longitud de línea para prevenir ReDoS
    if (strlen($line) > 10000) {
        $line = substr($line, 0, 10000);
    }

    $entry = [
        'line_number' => $lineNumber,
        'raw' => $line,
        'timestamp' => null,
        'level' => 'INFO',
        'message' => $line,
        'context' => []
    ];

    // ... resto del código existente ...
}
```

---

## 🛠️ TAREAS ADICIONALES

### Crear directorio de logs

```bash
mkdir -p logs
chmod 755 logs
touch logs/.gitkeep
echo "logs/*.log" >> .gitignore
```

### Crear script de limpieza (cleanup.php)

```php
<?php
require_once 'security.php';

// Este script debe ejecutarse periódicamente (cron)
$uploadsDir = __DIR__ . '/uploads';
$maxAge = 7 * 24 * 3600; // 7 días

$deletedCount = cleanupOldFiles($uploadsDir, $maxAge);

echo "Archivos eliminados: $deletedCount\n";
```

**Cron job sugerido:**

```bash
# Ejecutar diariamente a las 3 AM
0 3 * * * /usr/bin/php /path/to/log-visor/cleanup.php >> /path/to/log-visor/logs/cleanup.log 2>&1
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

```
[ ] Añadir security.php
[ ] Añadir uploads/.htaccess
[ ] Modificar upload.php con validaciones
[ ] Modificar api.php con validateLogFilename()
[ ] Modificar index.php para incluir CSRF token
[ ] Modificar app.js - corregir XSS en showLogDetail()
[ ] Modificar app.js - añadir CSRF tokens a requests
[ ] Modificar LogParser.php - streaming para archivos grandes
[ ] Crear directorio logs/
[ ] Crear cleanup.php
[ ] Configurar cron job para limpieza
[ ] Probar todas las funcionalidades
[ ] Verificar que .htaccess funciona
[ ] Revisar logs de seguridad
```

---

## 🧪 PRUEBAS DE SEGURIDAD

### Test 1: Path Traversal
```bash
# Intentar acceder a archivo fuera de uploads/
curl "http://localhost/api.php?action=parse" \
  --cookie "PHPSESSID=xxx" \
  -H "Cookie: current_log=../../etc/passwd"
```
**Resultado esperado:** Error "Nombre de archivo inválido"

### Test 2: Upload de PHP
```bash
# Intentar subir archivo PHP
echo "<?php phpinfo(); ?>" > malicious.php
curl -F "logfile=@malicious.php" http://localhost/upload.php
```
**Resultado esperado:** Error "Tipo de archivo no permitido"

### Test 3: XSS
```
Subir log con contexto malicioso y verificar que se escape correctamente
```

### Test 4: CSRF
```bash
# Request sin token
curl "http://localhost/api.php?action=delete" \
  --cookie "PHPSESSID=xxx"
```
**Resultado esperado:** Error "Token de seguridad inválido"

---

## 📞 SOPORTE

Para dudas sobre la implementación de estas correcciones, consultar:
- `SECURITY_AUDIT.md` - Detalles de vulnerabilidades
- `security.php` - Funciones de seguridad disponibles

**IMPORTANTE:** Implementar estas correcciones en un entorno de prueba antes de producción.
