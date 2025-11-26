<?php
/**
 * Configuración de seguridad y aplicación
 */

// =====================================
// CONFIGURACIÓN DE SEGURIDAD
// =====================================

// Directorio de uploads (absoluto)
define('UPLOADS_DIR', __DIR__ . '/uploads');

// Tamaño máximo de archivo (50MB)
define('MAX_FILE_SIZE', 50 * 1024 * 1024);

// Rate limiting
define('MAX_UPLOADS_PER_HOUR', 10);
define('MAX_REQUESTS_PER_MINUTE', 60);

// Tiempo de expiración de archivos (24 horas)
define('FILE_EXPIRATION_TIME', 86400);

// Log de seguridad
define('SECURITY_LOG_FILE', __DIR__ . '/logs/security.log');

// Entorno (development o production)
define('APP_ENV', getenv('APP_ENV') ?: 'production');

// Credenciales de autenticación (CAMBIAR ESTOS VALORES EN PRODUCCIÓN)
// En producción, mover a .env o base de datos
define('AUTH_USERNAME', getenv('LOG_VIEWER_USER') ?: 'admin');
define('AUTH_PASSWORD_HASH', getenv('LOG_VIEWER_PASS_HASH') ?: password_hash('admin123', PASSWORD_DEFAULT));

// =====================================
// CONFIGURACIÓN DE SESIONES SEGURAS
// =====================================
function initSecureSession() {
    // Configuración segura de sesiones
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_samesite', 'Strict');
    ini_set('session.use_strict_mode', 1);
    ini_set('session.use_only_cookies', 1);

    // Solo en HTTPS (comentar si no tienes SSL)
    // ini_set('session.cookie_secure', 1);

    // Iniciar sesión si no está iniciada
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // Regenerar ID de sesión para nuevas sesiones
    if (!isset($_SESSION['initiated'])) {
        session_regenerate_id(true);
        $_SESSION['initiated'] = true;
        $_SESSION['created_at'] = time();
    }

    // Regenerar ID cada 30 minutos
    if (isset($_SESSION['created_at']) && (time() - $_SESSION['created_at'] > 1800)) {
        session_regenerate_id(true);
        $_SESSION['created_at'] = time();
    }
}

// =====================================
// HEADERS DE SEGURIDAD
// =====================================
function setSecurityHeaders() {
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:");

    // Comentar si causa problemas
    // header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

// =====================================
// VALIDACIÓN DE PATH TRAVERSAL
// =====================================
function validateFilePath($filename) {
    if (empty($filename)) {
        throw new Exception('Nombre de archivo vacío');
    }

    // Eliminar cualquier path traversal
    $filename = basename($filename);

    // Obtener path absoluto real
    $uploadsDir = realpath(UPLOADS_DIR);
    $filePath = $uploadsDir . DIRECTORY_SEPARATOR . $filename;

    // Verificar que el archivo existe
    if (!file_exists($filePath)) {
        throw new Exception('El archivo no existe');
    }

    // Obtener path real del archivo
    $realPath = realpath($filePath);

    // Verificar que el path real está dentro de uploads/
    if ($realPath === false || strpos($realPath, $uploadsDir) !== 0) {
        securityLog("Intento de path traversal bloqueado: $filename");
        throw new Exception('Acceso denegado');
    }

    return $realPath;
}

// =====================================
// CSRF TOKEN
// =====================================
function generateCsrfToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function validateCsrfToken($token) {
    if (empty($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

function getCsrfToken() {
    return $_SESSION['csrf_token'] ?? '';
}

// =====================================
// RATE LIMITING
// =====================================
function checkRateLimit($action = 'upload') {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $key = "rate_limit_{$action}_{$ip}";

    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = [
            'count' => 0,
            'reset_time' => time() + 3600
        ];
    }

    // Reset si pasó el tiempo
    if (time() > $_SESSION[$key]['reset_time']) {
        $_SESSION[$key] = [
            'count' => 0,
            'reset_time' => time() + 3600
        ];
    }

    // Incrementar contador
    $_SESSION[$key]['count']++;

    // Verificar límite
    $limit = ($action === 'upload') ? MAX_UPLOADS_PER_HOUR : MAX_REQUESTS_PER_MINUTE;

    if ($_SESSION[$key]['count'] > $limit) {
        securityLog("Rate limit excedido para $action desde IP: $ip");
        throw new Exception('Límite de solicitudes excedido. Intenta más tarde.');
    }

    return true;
}

// =====================================
// LOGGING DE SEGURIDAD
// =====================================
function securityLog($message) {
    $logDir = dirname(SECURITY_LOG_FILE);

    // Crear directorio si no existe
    if (!is_dir($logDir)) {
        mkdir($logDir, 0750, true);
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $user = $_SESSION['username'] ?? 'guest';
    $timestamp = date('Y-m-d H:i:s');
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

    $logMessage = "[$timestamp] [$ip] [$user] $message | UA: $userAgent\n";

    file_put_contents(SECURITY_LOG_FILE, $logMessage, FILE_APPEND | LOCK_EX);
}

// =====================================
// AUTENTICACIÓN
// =====================================
function isAuthenticated() {
    return isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true;
}

function requireAuth() {
    if (!isAuthenticated()) {
        header('Location: login.php');
        exit;
    }
}

function login($username, $password) {
    if ($username === AUTH_USERNAME && password_verify($password, AUTH_PASSWORD_HASH)) {
        session_regenerate_id(true);
        $_SESSION['authenticated'] = true;
        $_SESSION['username'] = $username;
        $_SESSION['login_time'] = time();
        securityLog("Login exitoso para usuario: $username");
        return true;
    }

    securityLog("Intento de login fallido para usuario: $username");
    return false;
}

function logout() {
    $username = $_SESSION['username'] ?? 'unknown';
    securityLog("Logout de usuario: $username");

    $_SESSION = array();

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }

    session_destroy();
}

// =====================================
// SANITIZACIÓN DE ENTRADA
// =====================================
function sanitizeInput($input, $maxLength = 200) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }

    $input = trim($input);
    $input = substr($input, 0, $maxLength);
    return $input;
}

function validateLogLevel($level) {
    $allowedLevels = ['ERROR', 'WARNING', 'INFO', 'DEBUG', 'CRITICAL', 'NOTICE', 'ACCESS', 'TRACE', 'ALERT', 'EMERGENCY'];
    return in_array(strtoupper($level), $allowedLevels) ? strtoupper($level) : null;
}

// =====================================
// MANEJO DE ERRORES
// =====================================
function handleError(Exception $e) {
    // Log detallado internamente
    error_log('Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    securityLog('Error: ' . $e->getMessage());

    // Respuesta según entorno
    $response = [
        'success' => false,
        'message' => 'Error al procesar la solicitud'
    ];

    // En desarrollo, mostrar detalles
    if (APP_ENV === 'development') {
        $response['debug'] = [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ];
    }

    return $response;
}

// =====================================
// LIMPIEZA DE ARCHIVOS ANTIGUOS
// =====================================
function cleanupOldFiles() {
    $uploadsDir = UPLOADS_DIR;

    if (!is_dir($uploadsDir)) {
        return;
    }

    $files = glob($uploadsDir . '/*');
    $deletedCount = 0;

    foreach ($files as $file) {
        if (is_file($file) && basename($file) !== '.gitkeep') {
            if (filemtime($file) < time() - FILE_EXPIRATION_TIME) {
                if (unlink($file)) {
                    $deletedCount++;
                }
            }
        }
    }

    if ($deletedCount > 0) {
        securityLog("Limpieza automática: $deletedCount archivos eliminados");
    }

    return $deletedCount;
}
