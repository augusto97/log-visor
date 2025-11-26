# 🔒 AUDITORÍA DE SEGURIDAD - Log Visor
**Fecha:** 2025-11-25
**Versión auditada:** Actual (rama claude/log-visualization-analysis-019L6wbNGuEWGg3Ziyg7jCZg)

---

## 📊 RESUMEN EJECUTIVO

**Nivel de Riesgo Global:** 🔴 **ALTO**

Se identificaron **15 vulnerabilidades críticas y de alta severidad** que requieren atención inmediata.

### Categorías de Vulnerabilidades:
- 🔴 **Críticas:** 5
- 🟠 **Altas:** 6
- 🟡 **Medias:** 3
- 🔵 **Bajas:** 1

---

## 🔴 VULNERABILIDADES CRÍTICAS

### 1. Path Traversal - Acceso a Archivos Arbitrarios
**Archivo:** `api.php` (líneas 51, 86, 126, 156)
**Severidad:** 🔴 CRÍTICA
**CVSS Score:** 9.1

**Descripción:**
```php
// Línea 51
$logFile = __DIR__ . '/uploads/' . $_SESSION['current_log'];
```

El valor de `$_SESSION['current_log']` se concatena directamente sin validación. Un atacante podría manipular la sesión para incluir:
- `../../../etc/passwd`
- `../index.php`
- Cualquier archivo del sistema

**Impacto:**
- Lectura de archivos arbitrarios del servidor
- Exposición de código fuente
- Lectura de archivos de configuración sensibles

**Explotación:**
```javascript
// Un atacante podría modificar su sesión para:
$_SESSION['current_log'] = '../../../etc/passwd';
// Y luego llamar api.php?action=parse
```

**Solución:**
```php
function validateLogFilename($filename) {
    // Solo permitir nombres de archivo seguros
    if (!preg_match('/^log_[a-f0-9]+\.[a-zA-Z0-9_-]+$/', $filename)) {
        throw new Exception('Nombre de archivo inválido');
    }

    // Resolver path y verificar que está dentro de uploads/
    $uploadsDir = realpath(__DIR__ . '/uploads');
    $logFile = realpath($uploadsDir . '/' . $filename);

    if ($logFile === false || strpos($logFile, $uploadsDir) !== 0) {
        throw new Exception('Archivo no permitido');
    }

    return $logFile;
}
```

---

### 2. File Upload - Ejecución Remota de Código (RCE)
**Archivo:** `upload.php` (líneas 26-59)
**Severidad:** 🔴 CRÍTICA
**CVSS Score:** 9.8

**Descripción:**
El sistema NO valida el tipo MIME real del archivo. Solo verifica que contenga texto UTF-8/ASCII, pero acepta cualquier extensión.

**Impacto:**
Un atacante puede subir:
- `malicious.php` con contenido que pase la validación de texto
- `shell.phtml`, `backdoor.php5`, `webshell.phar`
- Archivos ejecutables disfrazados de texto

**Explotación:**
```php
// Archivo malicioso.txt:
<?php system($_GET['cmd']); ?>
// Logs normales...
[2025-11-25] INFO: Normal log entry
```

Este archivo pasaría todas las validaciones porque:
1. ✅ Es UTF-8 válido
2. ✅ No tiene bytes nulos
3. ✅ Tiene contenido de texto

Luego el atacante accede a: `uploads/log_xxx_malicious.txt?cmd=whoami`

**Soluciones:**
```php
// 1. Validar MIME type real
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedMimes = ['text/plain', 'text/x-log', 'application/octet-stream'];
if (!in_array($mimeType, $allowedMimes)) {
    throw new Exception('Tipo de archivo no permitido');
}

// 2. Forzar extensión .log o .txt
$uniqueName = uniqid('log_', true) . '.log'; // Sin usar nombre original

// 3. Deshabilitar ejecución de PHP en uploads/
```

**`.htaccess` para `/uploads/`:**
```apache
# Denegar ejecución de scripts
php_flag engine off
AddType text/plain .php .php3 .php4 .php5 .phtml .phar
RemoveHandler .php .phtml .php3 .php4 .php5 .phar

# Solo permitir GET
<LimitExcept GET>
    Deny from all
</LimitExcept>
```

---

### 3. Exposición de Archivos de Otros Usuarios
**Archivo:** `api.php` función `listLogs()` (líneas 144-181)
**Severidad:** 🔴 CRÍTICA
**CVSS Score:** 8.5

**Descripción:**
```php
function listLogs() {
    // Lista TODOS los archivos de uploads/
    $files = scandir($uploadsDir);
    // Sin verificar si pertenecen al usuario actual
}
```

**Impacto:**
- Usuario A puede ver y acceder a los logs de Usuario B
- Violación de privacidad total
- Exposición de información sensible entre usuarios

**Solución:**
```php
function listLogs() {
    $uploadsDir = __DIR__ . '/uploads';
    $sessionId = session_id();
    $logs = [];

    if (is_dir($uploadsDir)) {
        $files = scandir($uploadsDir);
        foreach ($files as $file) {
            // Solo archivos de esta sesión
            if (strpos($file, 'log_' . $sessionId) === 0) {
                $logs[] = [/* ... */];
            }
        }
    }
    return ['success' => true, 'data' => ['logs' => $logs]];
}
```

---

### 4. Cross-Site Scripting (XSS) - Stored
**Archivo:** `assets/js/app.js` función `showLogDetail()` (línea 1316)
**Severidad:** 🔴 CRÍTICA
**CVSS Score:** 8.2

**Descripción:**
```javascript
Object.keys(log.context).forEach(key => {
    html += `
        <div class="detail-label">${key}:</div>  // ⚠️ NO ESCAPADO
        <div class="detail-value"><code>${escapeHtml(log.context[key])}</code></div>
    `;
});
```

La variable `key` se inyecta directamente sin escapar.

**Explotación:**
Si un log contiene:
```
[2025-11-25] [module:error] [client 1.2.3.4] Message
```

El parser crea `context['client'] = '1.2.3.4'`

Un atacante podría crear un log malicioso que genere:
```javascript
context['<img src=x onerror=alert(document.cookie)>'] = 'value'
```

**Impacto:**
- Robo de cookies de sesión
- Secuestro de sesión
- Ejecución de código JavaScript arbitrario
- Phishing dentro de la aplicación

**Solución:**
```javascript
Object.keys(log.context).forEach(key => {
    html += `
        <div class="detail-label">${escapeHtml(key)}:</div>
        <div class="detail-value"><code>${escapeHtml(log.context[key])}</code></div>
    `;
});
```

---

### 5. CSRF - Cross-Site Request Forgery
**Archivo:** `api.php` función `deleteLog()` (líneas 121-139)
**Severidad:** 🔴 CRÍTICA
**CVSS Score:** 7.5

**Descripción:**
```php
case 'delete':
    $response = deleteLog(); // Sin validación CSRF
    break;
```

No hay tokens CSRF en ninguna operación destructiva.

**Explotación:**
```html
<!-- Página maliciosa evil.com -->
<img src="https://log-visor.com/api.php?action=delete" style="display:none">
```

Si un usuario autenticado visita evil.com, sus logs se eliminan automáticamente.

**Solución:**
```php
// index.php - Generar token
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

// JavaScript
fetch('api.php?action=delete', {
    headers: { 'X-CSRF-Token': csrfToken }
});

// api.php - Validar
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'], $token)) {
        throw new Exception('CSRF token inválido');
    }
}
```

---

## 🟠 VULNERABILIDADES ALTAS

### 6. Insecure Session Management
**Severidad:** 🟠 ALTA
**CVSS Score:** 7.3

**Problemas:**
```php
session_start(); // Sin configuración segura
```

No se configuran:
- ❌ `httponly` - Las cookies son accesibles desde JavaScript
- ❌ `secure` - Las cookies se envían por HTTP (no solo HTTPS)
- ❌ `samesite` - Vulnerable a CSRF
- ❌ Regeneración de ID de sesión

**Solución:**
```php
// Antes de session_start()
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1); // Si usas HTTPS
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_strict_mode', 1);

session_start();

// Regenerar ID en acciones importantes
if (!isset($_SESSION['initiated'])) {
    session_regenerate_id(true);
    $_SESSION['initiated'] = true;
}
```

---

### 7. Denial of Service - Memory Exhaustion
**Archivo:** `LogParser.php` (línea 20)
**Severidad:** 🟠 ALTA
**CVSS Score:** 6.8

**Descripción:**
```php
$content = file_get_contents($this->logFile); // Sin límite
```

Lee archivos completos en memoria sin límite. El upload permite hasta 50MB.

**Impacto:**
- Subir archivo de 50MB → consume 50MB+ de RAM
- 10 usuarios = 500MB
- Servidor cae por falta de memoria

**Solución:**
```php
public function parse() {
    $maxFileSize = 10 * 1024 * 1024; // 10MB máximo para parsing
    $fileSize = filesize($this->logFile);

    if ($fileSize > $maxFileSize) {
        throw new Exception("Archivo demasiado grande para procesar");
    }

    // O mejor: leer línea por línea
    $handle = fopen($this->logFile, 'r');
    $lineNumber = 0;
    while (($line = fgets($handle)) !== false) {
        $lineNumber++;
        $entry = $this->parseLine($line, $lineNumber);
        if ($entry) {
            $this->entries[] = $entry;
            $this->updateStats($entry);
        }
    }
    fclose($handle);
}
```

---

### 8. Regular Expression Denial of Service (ReDoS)
**Archivo:** `LogParser.php` (líneas 54, 72, 80, etc.)
**Severidad:** 🟠 ALTA
**CVSS Score:** 6.5

**Descripción:**
Múltiples regex complejas sin timeouts:
```php
preg_match('/^\[([^\]]+)\] \[([^:]+):(error|warn|...) \[pid ([^\]]+)\] \[client ([^\]]+)\] (.*)$/i', ...)
```

**Explotación:**
```
[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[...
```

Líneas especialmente crafteadas pueden causar catástrofe por backtracking.

**Solución:**
```php
// Añadir timeout
ini_set('pcre.backtrack_limit', 100000);
ini_set('pcre.recursion_limit', 100000);

// O simplificar regex y hacerlas más específicas
```

---

### 9. No Authentication/Authorization
**Severidad:** 🟠 ALTA
**CVSS Score:** 6.5

**Descripción:**
No hay autenticación en ningún endpoint. Cualquiera puede:
- Subir archivos
- Leer archivos subidos
- Eliminar archivos

**Solución:**
Implementar sistema de login básico con contraseña o OAuth.

---

### 10. Information Disclosure - Error Messages
**Archivo:** Todos los `.php`
**Severidad:** 🟠 ALTA
**CVSS Score:** 5.8

**Descripción:**
```php
throw new Exception("Log file not found: " . $this->logFile);
```

Los mensajes de error exponen paths del servidor:
```
"message": "Log file not found: /var/www/html/log-visor/uploads/file.log"
```

**Solución:**
```php
// Modo producción
ini_set('display_errors', 0);
error_reporting(0);

// Logs genéricos
throw new Exception("Archivo no encontrado");
```

---

### 11. No Rate Limiting
**Severidad:** 🟠 ALTA
**CVSS Score:** 5.5

Un atacante puede:
- Subir 1000 archivos de 50MB en minutos
- Llenar el disco del servidor
- Hacer miles de requests de parsing

**Solución:**
```php
// Simple rate limiting con sesión
if (!isset($_SESSION['upload_count'])) {
    $_SESSION['upload_count'] = 0;
    $_SESSION['upload_reset'] = time();
}

if (time() - $_SESSION['upload_reset'] > 3600) {
    $_SESSION['upload_count'] = 0;
    $_SESSION['upload_reset'] = time();
}

if ($_SESSION['upload_count'] >= 10) {
    throw new Exception('Límite de subidas alcanzado. Intenta en 1 hora.');
}

$_SESSION['upload_count']++;
```

---

## 🟡 VULNERABILIDADES MEDIAS

### 12. Predictable File Names
**Archivo:** `upload.php` (línea 54)
**Severidad:** 🟡 MEDIA
**CVSS Score:** 4.5

```php
$uniqueName = uniqid('log_', true) . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $fileName);
```

`uniqid()` es predecible. Un atacante podría adivinar nombres de archivos.

**Solución:**
```php
$uniqueName = 'log_' . bin2hex(random_bytes(16)) . '.log';
```

---

### 13. No File Cleanup - Disk Exhaustion
**Severidad:** 🟡 MEDIA
**CVSS Score:** 4.2

Los archivos nunca se eliminan automáticamente. Atacante puede llenar el disco.

**Solución:**
```php
// Cron job diario para eliminar archivos > 7 días
$files = glob($uploadsDir . '/*');
foreach ($files as $file) {
    if (filemtime($file) < time() - 7*24*3600) {
        unlink($file);
    }
}
```

---

### 14. Missing Security Headers
**Severidad:** 🟡 MEDIA
**CVSS Score:** 3.8

Faltan headers de seguridad básicos.

**Solución:**
```php
// index.php
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
```

---

## 🔵 VULNERABILIDADES BAJAS

### 15. Verbose Server Information
**Severidad:** 🔵 BAJA
**CVSS Score:** 2.1

Headers de PHP exponen versión del servidor.

**Solución:**
```php
header_remove('X-Powered-By');
```

---

## 🛠️ PLAN DE REMEDIACIÓN PRIORITARIO

### Fase 1 - URGENTE (24-48 horas):
1. ✅ Implementar validación de Path Traversal
2. ✅ Deshabilitar ejecución PHP en `/uploads/`
3. ✅ Añadir protección CSRF
4. ✅ Escapar XSS en `showLogDetail()`

### Fase 2 - ALTA PRIORIDAD (1 semana):
5. ✅ Implementar autenticación básica
6. ✅ Configurar sesiones seguras
7. ✅ Añadir rate limiting
8. ✅ Mejorar validación de uploads

### Fase 3 - MEJORAS (2 semanas):
9. ✅ Implementar limpieza automática de archivos
10. ✅ Optimizar parsing (lectura por streaming)
11. ✅ Añadir security headers
12. ✅ Logging de acciones sensibles

---

## 📋 CHECKLIST DE SEGURIDAD

```
Backend:
[ ] Path traversal validado
[ ] Upload con MIME validation
[ ] CSRF tokens implementados
[ ] Rate limiting activo
[ ] Sesiones seguras configuradas
[ ] .htaccess en /uploads/
[ ] Autenticación implementada
[ ] Errors no verbosos en producción

Frontend:
[ ] Todo HTML escapado
[ ] CSP headers configurados
[ ] No inline scripts peligrosos

Infraestructura:
[ ] HTTPS habilitado
[ ] PHP actualizado
[ ] Permisos de archivos correctos (644/755)
[ ] Backups configurados
```

---

## 📞 CONTACTO

Para más información sobre esta auditoría o asistencia en la implementación de las correcciones, contactar al equipo de seguridad.

**Generado por:** Claude Code - Auditoría de Seguridad Automatizada
**Fecha:** 2025-11-25
