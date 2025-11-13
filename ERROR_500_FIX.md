# 🚨 Solución al Error 500

## ⚠️ Problema
La aplicación muestra un "Error 500 - Internal Server Error" al intentar cargar.

## ✅ Solución Aplicada

### 1. Eliminado `.htaccess` problemático
El archivo `.htaccess` contenía directivas que no son compatibles con todos los servidores. Ha sido eliminado.

### 2. Permisos corregidos
Los archivos ahora tienen los permisos correctos:
- Archivos PHP: 644
- Directorio uploads: 755

## 🔍 Verificación Paso a Paso

### Paso 1: Verifica que PHP funciona
Abre en tu navegador:
```
http://localhost/log-visor/test_simple.php
```

Deberías ver:
```
PHP está funcionando correctamente
✓ LogParser cargado correctamente
✓ Parser funciona correctamente
```

### Paso 2: Verifica la configuración PHP
Abre en tu navegador:
```
http://localhost/log-visor/phpinfo.php
```

Busca estas configuraciones:
- `upload_max_filesize`: Debería ser al menos 50M
- `post_max_size`: Debería ser al menos 50M
- `max_execution_time`: Recomendado 300

**IMPORTANTE**: Elimina `phpinfo.php` después de verificar por seguridad.

### Paso 3: Verifica la aplicación principal
Abre en tu navegador:
```
http://localhost/log-visor/index.php
```

Si funciona, deberías ver la interfaz del Log Visor.

### Paso 4: Verifica la página de debug
Abre en tu navegador:
```
http://localhost/log-visor/debug.php
```

Esta página te mostrará el estado de todos los componentes.

## 🛠️ Si Aún Tienes Error 500

### Opción A: Verificar logs de error

**XAMPP/WAMP (Windows):**
```
xampp/apache/logs/error.log
```

**MAMP (Mac):**
```
/Applications/MAMP/logs/apache_error.log
```

**Linux:**
```bash
tail -f /var/log/apache2/error.log
# o
tail -f /var/log/nginx/error.log
```

### Opción B: Habilitar display_errors

Crea un archivo `php.ini` en el directorio del proyecto con:
```ini
display_errors = On
error_reporting = E_ALL
upload_max_filesize = 50M
post_max_size = 50M
max_execution_time = 300
```

O agrega al principio de `index.php`:
```php
<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// ... resto del código
```

### Opción C: Verificar módulos de Apache/Nginx

Asegúrate de que estos módulos estén habilitados:
- mod_rewrite (Apache)
- mod_mime (Apache)
- PHP-FPM (Nginx)

### Opción D: Permisos de directorios

```bash
# Desde la raíz del proyecto
chmod 755 .
chmod 644 *.php
chmod 755 uploads/
chmod 755 assets/
chmod 644 assets/css/*
chmod 644 assets/js/*
```

## 🔧 Configuración Específica por Servidor

### Para PHP Built-in Server
```bash
cd /ruta/a/log-visor
php -S localhost:8000
```

Luego abre: `http://localhost:8000`

### Para Apache (XAMPP/WAMP/MAMP)
1. Coloca el proyecto en:
   - Windows: `C:\xampp\htdocs\log-visor`
   - Mac: `/Applications/MAMP/htdocs/log-visor`
   - Linux: `/var/www/html/log-visor`

2. Abre: `http://localhost/log-visor`

### Para Nginx
Configuración básica:
```nginx
location /log-visor {
    index index.php;
    try_files $uri $uri/ /log-visor/index.php?$args;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

## ✅ Checklist de Verificación

- [ ] `test_simple.php` funciona (muestra "PHP está funcionando")
- [ ] `phpinfo.php` muestra la configuración
- [ ] `debug.php` se carga sin errores
- [ ] No hay `.htaccess` problemático (verificar que fue eliminado)
- [ ] Los permisos son correctos (644 para PHP, 755 para directorios)
- [ ] PHP versión 7.0 o superior
- [ ] Extensiones mbstring, fileinfo y session están cargadas

## 📞 Última Instancia

Si nada funciona, prueba con el servidor integrado de PHP:
```bash
cd /ruta/a/log-visor
php -S localhost:8000
```

Esto evita problemas de configuración de Apache/Nginx.

---

**Última actualización**: 2025-11-13
**Estado**: Error 500 solucionado - `.htaccess` eliminado
