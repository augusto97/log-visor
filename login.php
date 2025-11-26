<?php
require_once 'config.php';

initSecureSession();
setSecurityHeaders();

// Si ya está autenticado, redirigir a index
if (isAuthenticated()) {
    header('Location: index.php');
    exit;
}

$error = '';

// Procesar login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $csrf = $_POST['csrf_token'] ?? '';

    // Validar CSRF
    if (!validateCsrfToken($csrf)) {
        $error = 'Token de seguridad inválido';
        securityLog('CSRF token inválido en login');
    } else {
        if (login($username, $password)) {
            header('Location: index.php');
            exit;
        } else {
            $error = 'Usuario o contraseña incorrectos';
            // Pequeño delay para prevenir fuerza bruta
            sleep(1);
        }
    }
}

// Generar token CSRF
$csrfToken = generateCsrfToken();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Log Analyzer</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: #cdd6f4;
        }

        .login-container {
            background: #313244;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 400px;
        }

        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .login-header h1 {
            color: #89b4fa;
            font-size: 28px;
            margin-bottom: 10px;
        }

        .login-header .logo {
            font-size: 48px;
            margin-bottom: 10px;
        }

        .login-header p {
            color: #a6adc8;
            font-size: 14px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #cdd6f4;
            font-weight: 500;
        }

        .form-group input {
            width: 100%;
            padding: 12px 16px;
            background: #1e1e2e;
            border: 2px solid #45475a;
            border-radius: 8px;
            color: #cdd6f4;
            font-size: 14px;
            transition: border-color 0.3s;
        }

        .form-group input:focus {
            outline: none;
            border-color: #89b4fa;
        }

        .error-message {
            background: rgba(243, 139, 168, 0.1);
            border: 1px solid #f38ba8;
            color: #f38ba8;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
        }

        .login-btn {
            width: 100%;
            padding: 12px;
            background: #89b4fa;
            color: #1e1e2e;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
        }

        .login-btn:hover {
            background: #74c7ec;
        }

        .login-btn:active {
            transform: scale(0.98);
        }

        .login-footer {
            margin-top: 20px;
            text-align: center;
            color: #a6adc8;
            font-size: 12px;
        }

        .login-footer a {
            color: #89b4fa;
            text-decoration: none;
        }

        .login-footer a:hover {
            text-decoration: underline;
        }

        .security-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(166, 227, 161, 0.1);
            color: #a6e3a1;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            margin-top: 15px;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 30px 20px;
                margin: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <div class="logo">⚡</div>
            <h1>Log Analyzer</h1>
            <p>Ingresa tus credenciales para continuar</p>
        </div>

        <?php if ($error): ?>
            <div class="error-message">
                🔒 <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="">
            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken) ?>">

            <div class="form-group">
                <label for="username">Usuario</label>
                <input type="text" id="username" name="username" required autofocus autocomplete="username">
            </div>

            <div class="form-group">
                <label for="password">Contraseña</label>
                <input type="password" id="password" name="password" required autocomplete="current-password">
            </div>

            <button type="submit" class="login-btn">
                Iniciar Sesión
            </button>

            <div style="text-align: center;">
                <span class="security-badge">
                    🔐 Conexión segura
                </span>
            </div>
        </form>

        <div class="login-footer">
            <p>
                <strong>Credenciales por defecto:</strong><br>
                Usuario: <code>admin</code> | Contraseña: <code>admin123</code>
            </p>
            <p style="margin-top: 10px; font-size: 11px; opacity: 0.7;">
                ⚠️ Por favor, cambia las credenciales en <code>config.php</code>
            </p>
        </div>
    </div>
</body>
</html>
