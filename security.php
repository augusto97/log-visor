<?php
/**
 * Security Utilities for Log Visor
 * Funciones de seguridad para proteger la aplicación
 */

/**
 * Configurar sesiones seguras
 */
function initSecureSession() {
    // Configuración de cookies seguras
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_samesite', 'Strict');
    ini_set('session.use_strict_mode', 1);

    // Solo usar HTTPS si está disponible
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        ini_set('session.cookie_secure', 1);
    }

    session_start();

    // Regenerar ID de sesión en primera carga
    if (!isset($_SESSION['initiated'])) {
        session_regenerate_id(true);
        $_SESSION['initiated'] = true;
        $_SESSION['created_at'] = time();
    }

    // Regenerar ID cada 30 minutos
    if (isset($_SESSION['created_at']) && time() - $_SESSION['created_at'] > 1800) {
        session_regenerate_id(true);
        $_SESSION['created_at'] = time();
    }
}

/**
 * Generar token CSRF
 */
function generateCSRFToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Validar token CSRF
 */
function validateCSRFToken($token) {
    if (!isset($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Validar y sanitizar nombre de archivo de log
 * Previene Path Traversal
 */
function validateLogFilename($filename) {
    // El filename debe tener el formato: log_[hash].[ext]
    if (!preg_match('/^log_[a-f0-9]+\.(log|txt)$/i', $filename)) {
        throw new Exception('Nombre de archivo inválido');
    }

    // Construir path completo
    $uploadsDir = realpath(__DIR__ . '/uploads');
    if ($uploadsDir === false) {
        throw new Exception('Directorio de uploads no encontrado');
    }

    $logFile = $uploadsDir . DIRECTORY_SEPARATOR . $filename;

    // Resolver path real y verificar que está dentro de uploads/
    $realPath = realpath($logFile);

    // Si el archivo no existe, realpath devuelve false
    // En ese caso, verificar manualmente que no tenga path traversal
    if ($realPath === false) {
        if (strpos($filename, '..') !== false ||
            strpos($filename, '/') !== false ||
            strpos($filename, '\\') !== false) {
            throw new Exception('Nombre de archivo inválido');
        }
        return $logFile;
    }

    // Verificar que el path real está dentro de uploads/
    if (strpos($realPath, $uploadsDir) !== 0) {
        throw new Exception('Acceso a archivo no permitido');
    }

    return $realPath;
}

/**
 * Rate limiting simple basado en sesión
 */
function checkRateLimit($action, $maxRequests = 10, $timeWindow = 3600) {
    $key = 'rate_limit_' . $action;
    $resetKey = $key . '_reset';

    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = 0;
        $_SESSION[$resetKey] = time();
    }

    // Reset counter si pasó el tiempo
    if (time() - $_SESSION[$resetKey] > $timeWindow) {
        $_SESSION[$key] = 0;
        $_SESSION[$resetKey] = time();
    }

    // Verificar límite
    if ($_SESSION[$key] >= $maxRequests) {
        $remainingTime = $timeWindow - (time() - $_SESSION[$resetKey]);
        $minutes = ceil($remainingTime / 60);
        throw new Exception("Límite de solicitudes alcanzado. Intenta en $minutes minutos.");
    }

    $_SESSION[$key]++;
    return true;
}

/**
 * Validar tipo MIME de archivo
 */
function validateFileMimeType($filePath, $allowedMimes = ['text/plain', 'text/x-log']) {
    if (!file_exists($filePath)) {
        throw new Exception('Archivo no encontrado');
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $filePath);
    finfo_close($finfo);

    // También aceptar application/octet-stream para archivos .log
    if (!in_array($mimeType, $allowedMimes) && $mimeType !== 'application/octet-stream') {
        throw new Exception('Tipo de archivo no permitido: ' . $mimeType);
    }

    return true;
}

/**
 * Generar nombre de archivo seguro y aleatorio
 */
function generateSecureFilename($extension = 'log') {
    // Usar random_bytes para mayor entropía
    $randomPart = bin2hex(random_bytes(16));
    return 'log_' . $randomPart . '.' . $extension;
}

/**
 * Sanitizar output para prevenir XSS
 */
function sanitizeOutput($text) {
    return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
}

/**
 * Agregar headers de seguridad
 */
function addSecurityHeaders() {
    // Prevenir clickjacking
    header('X-Frame-Options: DENY');

    // Prevenir MIME sniffing
    header('X-Content-Type-Options: nosniff');

    // XSS Protection (legacy pero útil)
    header('X-XSS-Protection: 1; mode=block');

    // Referrer policy
    header('Referrer-Policy: strict-origin-when-cross-origin');

    // Content Security Policy
    $csp = "default-src 'self'; " .
           "script-src 'self' 'unsafe-inline'; " .
           "style-src 'self' 'unsafe-inline'; " .
           "img-src 'self' data:; " .
           "font-src 'self'; " .
           "connect-src 'self'; " .
           "frame-ancestors 'none';";
    header("Content-Security-Policy: $csp");

    // Remover header de versión PHP
    header_remove('X-Powered-By');
}

/**
 * Limpiar archivos antiguos (llamar desde cron o manualmente)
 */
function cleanupOldFiles($directory, $maxAge = 604800) { // 7 días por defecto
    if (!is_dir($directory)) {
        return false;
    }

    $files = glob($directory . '/log_*');
    $deletedCount = 0;

    foreach ($files as $file) {
        if (is_file($file) && (time() - filemtime($file)) > $maxAge) {
            if (unlink($file)) {
                $deletedCount++;
            }
        }
    }

    return $deletedCount;
}

/**
 * Log de eventos de seguridad
 */
function logSecurityEvent($event, $details = []) {
    $logFile = __DIR__ . '/logs/security.log';
    $logDir = dirname($logFile);

    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

    $logEntry = sprintf(
        "[%s] EVENT: %s | IP: %s | UA: %s | Details: %s\n",
        $timestamp,
        $event,
        $ip,
        $userAgent,
        json_encode($details)
    );

    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

/**
 * Verificar si el usuario está autenticado (placeholder)
 * Implementar según necesidades
 */
function requireAuth() {
    // TODO: Implementar sistema de autenticación
    // Por ahora solo verificar que tenga sesión válida
    if (!isset($_SESSION['initiated'])) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
}

/**
 * Limitar tamaño de procesamiento según memoria disponible
 */
function getMaxProcessableFileSize() {
    $memoryLimit = ini_get('memory_limit');

    if (preg_match('/^(\d+)(.)$/', $memoryLimit, $matches)) {
        $value = (int)$matches[1];
        $unit = strtoupper($matches[2]);

        switch ($unit) {
            case 'G':
                $bytes = $value * 1024 * 1024 * 1024;
                break;
            case 'M':
                $bytes = $value * 1024 * 1024;
                break;
            case 'K':
                $bytes = $value * 1024;
                break;
            default:
                $bytes = $value;
        }

        // Usar máximo 20% de la memoria disponible
        return min($bytes * 0.2, 10 * 1024 * 1024); // Máximo 10MB
    }

    return 5 * 1024 * 1024; // 5MB por defecto
}
