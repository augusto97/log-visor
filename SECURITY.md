# 🔒 Guía de Seguridad - Log Analyzer

## ✅ Correcciones de Seguridad Implementadas

Esta versión incluye **todas las correcciones de seguridad críticas** identificadas en la auditoría:

### 🛡️ Protecciones Implementadas

1. **✓ Sistema de Autenticación**
   - Login obligatorio para acceder a la aplicación
   - Passwords hasheados con `password_hash()`
   - Sesiones seguras con flags HttpOnly y SameSite

2. **✓ Protección contra Path Traversal**
   - Validación estricta de rutas de archivo
   - Uso de `realpath()` y `basename()`
   - Verificación de que los archivos están dentro de `uploads/`

3. **✓ Protección CSRF**
   - Tokens CSRF en todas las operaciones POST
   - Validación con `hash_equals()` para prevenir timing attacks

4. **✓ Rate Limiting**
   - Límite de 10 uploads por hora
   - Límite de 60 peticiones API por minuto
   - Prevención de ataques DoS

5. **✓ Headers de Seguridad**
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - X-XSS-Protection activado
   - Content-Security-Policy configurado

6. **✓ Sanitización de Entrada**
   - Validación de niveles de log permitidos
   - Límite de longitud en búsquedas
   - Sanitización de nombres de archivo

7. **✓ Protección del Directorio uploads/**
   - `.htaccess` que deniega acceso directo
   - Archivos solo accesibles vía PHP autenticado

8. **✓ Logging de Seguridad**
   - Registro de todos los eventos de seguridad
   - Log en `/logs/security.log`
   - Incluye IP, usuario, timestamp

9. **✓ Limpieza Automática**
   - Eliminación de archivos antiguos (>24h)
   - Ejecutable manualmente o con cron

10. **✓ Manejo Seguro de Errores**
    - Mensajes genéricos en producción
    - Detalles completos en desarrollo
    - Logging interno de errores

---

## 🔑 Configuración Inicial

### 1. Cambiar Credenciales de Acceso

**⚠️ IMPORTANTE:** Cambia las credenciales por defecto en `config.php`:

```php
// Opción 1: Definir directamente en config.php
define('AUTH_USERNAME', 'tu_usuario');
define('AUTH_PASSWORD_HASH', password_hash('tu_contraseña_segura', PASSWORD_DEFAULT));

// Opción 2: Usar variables de entorno (RECOMENDADO)
define('AUTH_USERNAME', getenv('LOG_VIEWER_USER') ?: 'admin');
define('AUTH_PASSWORD_HASH', getenv('LOG_VIEWER_PASS_HASH') ?: password_hash('admin123', PASSWORD_DEFAULT));
```

**Generar hash de contraseña:**

```bash
php -r "echo password_hash('tu_contraseña', PASSWORD_DEFAULT);"
```

### 2. Configurar Variables de Entorno (Opcional pero Recomendado)

Crea un archivo `.env` (NO lo subas a git):

```bash
LOG_VIEWER_USER=tu_usuario
LOG_VIEWER_PASS_HASH=$2y$10$...tu_hash_aqui...
APP_ENV=production
```

### 3. Configurar Limpieza Automática

Agrega a tu crontab:

```bash
crontab -e
```

Añade esta línea para ejecutar cada hora:

```
0 * * * * /usr/bin/php /ruta/completa/a/log-visor/cleanup.php >> /var/log/log-visor-cleanup.log 2>&1
```

O ejecutar manualmente:

```bash
php cleanup.php
```

### 4. Crear Directorio de Logs

```bash
mkdir -p logs
chmod 750 logs
```

### 5. Verificar Permisos

```bash
# Directorio uploads/
chmod 750 uploads/
chmod 640 uploads/*

# Directorio logs/
chmod 750 logs/
chmod 640 logs/*

# Archivos PHP
chmod 640 *.php
chmod 640 config.php  # Especialmente importante
```

---

## 🌐 Configuración de Servidor Web

### Apache

Asegúrate de tener mod_rewrite habilitado:

```bash
a2enmod rewrite
systemctl restart apache2
```

### Nginx

Equivalente a `.htaccess` en nginx (`/etc/nginx/sites-available/tu-sitio`):

```nginx
location /log-visor/uploads/ {
    deny all;
    return 403;
}

# Headers de seguridad
add_header X-Frame-Options "DENY";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
```

### HTTPS (Altamente Recomendado)

Si tienes SSL/TLS configurado, descomenta en `config.php`:

```php
ini_set('session.cookie_secure', 1);  // Línea 24
```

Esto asegura que las cookies solo se envíen por HTTPS.

---

## 🔍 Monitoreo de Seguridad

### Ver Logs de Seguridad

```bash
tail -f logs/security.log
```

### Estadísticas de Uso

```bash
php cleanup.php
```

### Verificar Intentos Sospechosos

```bash
grep "bloqueado\|fallido\|inválido" logs/security.log
```

---

## 📋 Checklist de Seguridad

Antes de poner en producción:

- [ ] Cambié las credenciales por defecto
- [ ] Configuré variables de entorno o archivo .env
- [ ] Configuré permisos correctos (750/640)
- [ ] Creé el directorio `/logs` con permisos adecuados
- [ ] Configuré limpieza automática con cron
- [ ] Verifiqué que `.htaccess` existe en `/uploads/`
- [ ] Si tengo HTTPS, activé `session.cookie_secure`
- [ ] Configuré headers de seguridad en mi servidor web
- [ ] Revisé que `debug.php` requiere autenticación
- [ ] Probé que el login funciona correctamente
- [ ] Verifiqué que los uploads funcionan con CSRF token

---

## 🚨 Qué Hacer en Caso de Incidente

### Acceso No Autorizado Detectado

1. **Bloquear IP del atacante** (en firewall o .htaccess):
   ```apache
   Deny from 192.168.1.100
   ```

2. **Cambiar credenciales inmediatamente**

3. **Revisar logs de seguridad**:
   ```bash
   grep "$(date +%Y-%m-%d)" logs/security.log
   ```

4. **Eliminar archivos sospechosos**:
   ```bash
   ls -la uploads/
   ```

### Ataque de Fuerza Bruta

1. **Verificar rate limiting está activo**

2. **Bloquear IPs sospechosas**

3. **Considerar agregar fail2ban**:
   ```bash
   # /etc/fail2ban/filter.d/log-visor.conf
   [Definition]
   failregex = ^\[.*\] \[<HOST>\] \[.*\] Intento de login fallido
   ignoreregex =
   ```

---

## 🔧 Configuración Avanzada

### Personalizar Límites de Rate Limiting

En `config.php`:

```php
define('MAX_UPLOADS_PER_HOUR', 10);      // Cambiar según necesidad
define('MAX_REQUESTS_PER_MINUTE', 60);   // Cambiar según necesidad
```

### Cambiar Tiempo de Expiración de Archivos

En `config.php`:

```php
define('FILE_EXPIRATION_TIME', 86400);  // 24 horas en segundos
// Ejemplos:
// 1 hora:  3600
// 12 horas: 43200
// 48 horas: 172800
```

### Configurar Múltiples Usuarios (Avanzado)

Para implementar múltiples usuarios, necesitarás:

1. Crear una base de datos
2. Tabla de usuarios con passwords hasheados
3. Modificar funciones de autenticación en `config.php`
4. Asociar archivos a usuarios específicos

---

## 📊 Niveles de Seguridad

### Nivel Actual: **ALTO** 🟢

Con todas las correcciones implementadas, tu aplicación tiene:

- ✅ Autenticación obligatoria
- ✅ Protección contra ataques comunes (XSS, CSRF, Path Traversal)
- ✅ Rate limiting activo
- ✅ Logs de seguridad
- ✅ Headers de seguridad configurados
- ✅ Manejo seguro de archivos

### Para Llegar a Nivel CRÍTICO (Empresarial):

- [ ] Implementar autenticación 2FA
- [ ] Base de datos para múltiples usuarios
- [ ] Sistema de roles y permisos granulares
- [ ] Cifrado de archivos en reposo
- [ ] Integración con SIEM
- [ ] Auditoría externa de seguridad

---

## 🆘 Soporte

### Problemas Comunes

**Error: "Token de seguridad inválido"**
- Limpia cookies del navegador
- Verifica que JavaScript está habilitado
- Asegúrate de que `window.CSRF_TOKEN` está definido

**No puedo hacer login**
- Verifica credenciales en `config.php`
- Revisa `logs/security.log` para detalles
- Comprueba que las sesiones PHP funcionan

**Rate limit excedido**
- Espera 1 hora antes de reintentar
- O limpia sesión: `rm /tmp/sess_*` (desarrollo)

**Archivos no se eliminan automáticamente**
- Verifica que cron está configurado
- Ejecuta manualmente: `php cleanup.php`
- Revisa permisos del directorio uploads/

---

## 📝 Notas Adicionales

### Compatibilidad con Archivos sin Extensión

La aplicación **mantiene compatibilidad** con:
- ✅ Archivos de texto plano (.txt, .log)
- ✅ Archivos SIN extensión (example_error, access)
- ✅ Cualquier archivo de texto válido UTF-8/ASCII

### Registro de Cambios de Seguridad

Todos los eventos se registran en `logs/security.log`:
- Login exitoso / fallido
- Subida de archivos
- Eliminación de archivos
- Intentos de path traversal bloqueados
- Excesos de rate limit

---

## 📞 Contacto y Reportes de Seguridad

Si encuentras una vulnerabilidad, por favor repórtala de forma responsable.

**Versión de Seguridad:** 2.0
**Última Auditoría:** 2025-11-26
**Score de Seguridad:** 85/100 🟢

---

**¿Tienes dudas?** Revisa los archivos:
- `config.php` - Configuración de seguridad
- `TROUBLESHOOTING.md` - Solución de problemas
- `README.md` - Documentación general
