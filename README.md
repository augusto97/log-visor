# 📊 Log Visor

**Visualizador inteligente de archivos log en PHP**

Log Visor es una aplicación web moderna y amigable que te permite analizar archivos de log de manera visual e interactiva. Soporta múltiples formatos de log incluyendo Apache, Nginx, PHP, WordPress y más.

## ✨ Características

- 📁 **Subida de archivos**: Sube cualquier archivo de texto plano mediante drag & drop o selección manual
- 🎨 **Interfaz moderna**: Diseño responsive y visualmente atractivo
- 🔍 **Filtros avanzados**: Filtra por nivel, fecha, y búsqueda de texto
- 📊 **Estadísticas en tiempo real**: Visualiza la distribución de logs por nivel
- 🎯 **Detección automática**: Reconoce automáticamente diferentes formatos de log
- 📄 **Paginación**: Maneja archivos grandes con paginación eficiente
- 🌈 **Código de colores**: Identifica rápidamente errores, warnings, info, etc.
- 💾 **Sesiones**: Mantiene tu archivo cargado entre visitas
- 📝 **Formatos flexibles**: Acepta archivos .log, .txt, sin extensión o cualquier extensión de texto

## 🚀 Formatos Soportados

Log Visor detecta automáticamente los siguientes formatos:

- **Apache/Nginx Access Logs**
- **Apache/Nginx Error Logs**
- **PHP Error Logs**
- **WordPress Debug Logs**
- **Logs genéricos con timestamp y nivel**
- **Logs de aplicaciones personalizadas**

## 📋 Requisitos

- PHP 7.0 o superior
- Servidor web (Apache, Nginx, etc.)
- Extensiones PHP recomendadas:
  - `fileinfo`
  - `mbstring`
  - `session`

## 🔧 Instalación

### Opción 1: Servidor local (XAMPP, WAMP, MAMP)

1. Clona o descarga este repositorio:
```bash
git clone https://github.com/tuusuario/log-visor.git
```

2. Copia el directorio a tu carpeta de servidor web:
   - XAMPP: `C:\xampp\htdocs\log-visor`
   - WAMP: `C:\wamp\www\log-visor`
   - MAMP: `/Applications/MAMP/htdocs/log-visor`

3. Asegúrate de que los permisos de escritura estén configurados:
```bash
chmod 755 uploads/
```

4. Abre tu navegador y visita:
```
http://localhost/log-visor
```

### Opción 2: Servidor en producción

1. Sube los archivos a tu servidor vía FTP/SFTP

2. Configura los permisos:
```bash
chmod 755 uploads/
chmod 644 *.php
```

3. Asegúrate de que PHP esté configurado correctamente:
   - `upload_max_filesize = 50M`
   - `post_max_size = 50M`
   - `max_execution_time = 300`

4. Visita tu dominio:
```
https://tudominio.com/log-visor
```

## 📖 Uso

### 1. Subir un archivo

- **Drag & Drop**: Arrastra tu archivo .log directamente al área de subida
- **Selector de archivos**: Haz clic en "Seleccionar Archivo"

### 2. Visualizar logs

Una vez cargado, verás:
- **Estadísticas**: Resumen de entradas por nivel (ERROR, WARNING, INFO, etc.)
- **Lista de logs**: Todas las entradas con colores según el nivel
- **Detalles**: Haz clic en cualquier entrada para ver el detalle completo

### 3. Filtrar logs

Usa los filtros disponibles:
- **Nivel**: Filtra por ERROR, WARNING, INFO, DEBUG, etc.
- **Búsqueda**: Busca texto específico en los logs
- **Fecha desde/hasta**: Filtra por rango de fechas

### 4. Navegación

- Usa la paginación para navegar por archivos grandes
- Cada página muestra 50 entradas por defecto

## 🗂️ Estructura del Proyecto

```
log-visor/
├── assets/
│   ├── css/
│   │   └── style.css          # Estilos de la aplicación
│   └── js/
│       └── app.js             # Lógica JavaScript
├── uploads/                    # Directorio para archivos subidos
├── index.php                   # Página principal
├── upload.php                  # Manejo de subida de archivos
├── api.php                     # API para operaciones con logs
├── LogParser.php               # Clase para parsear logs
└── README.md                   # Este archivo
```

## 🎨 Niveles de Log

Log Visor reconoce y colorea los siguientes niveles:

| Nivel | Color | Descripción |
|-------|-------|-------------|
| ERROR | Rojo | Errores críticos |
| CRITICAL | Rojo oscuro | Errores muy graves |
| WARNING | Naranja | Advertencias |
| INFO | Azul | Información general |
| DEBUG | Gris | Información de depuración |
| NOTICE | Morado | Avisos |
| ACCESS | Verde | Logs de acceso |

## 🔒 Seguridad

- Solo acepta archivos `.log` y `.txt`
- Valida el tipo MIME de los archivos
- Limita el tamaño máximo a 50MB
- Los archivos se almacenan con nombres únicos
- Sanitización de entrada de usuario
- Protección contra XSS

## 🛠️ Configuración Avanzada

### Cambiar el tamaño máximo de archivo

Edita `upload.php`:
```php
$maxFileSize = 100 * 1024 * 1024; // 100MB
```

Y actualiza tu `php.ini`:
```ini
upload_max_filesize = 100M
post_max_size = 100M
```

### Cambiar entradas por página

Edita `api.php`:
```php
$perPage = intval($_GET['per_page'] ?? 100); // 100 entradas
```

### Personalizar formatos de log

Edita `LogParser.php` y añade tu patrón regex en el método `parseLine()`:
```php
elseif (preg_match('/tu-patron-regex/', $line, $matches)) {
    // Tu lógica de parseo
}
```

## 🐛 Solución de Problemas

### El archivo no se sube
- Verifica los permisos del directorio `uploads/`
- Revisa la configuración de PHP (`upload_max_filesize`)
- Asegúrate de que sea un archivo de texto plano (no binario)
- Verifica que el archivo no esté vacío

### Los logs no se muestran correctamente
- Verifica que el archivo tenga un formato de log válido
- Intenta con un archivo de log conocido (Apache, Nginx)
- Revisa la consola del navegador para errores JavaScript

### Error de sesión
- Asegúrate de que las sesiones de PHP estén habilitadas
- Verifica los permisos de la carpeta de sesiones de PHP

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Si quieres mejorar Log Visor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Ejemplos de Logs Soportados

### Apache Access Log
```
192.168.1.1 - - [13/Nov/2025:10:30:15 +0000] "GET /index.php HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
```

### PHP Error Log
```
[13-Nov-2025 10:30:15 UTC] PHP Warning: Division by zero in /var/www/app.php on line 42
```

### WordPress Debug Log
```
[13-Nov-2025 10:30:15] ERROR: Database connection failed
```

### Generic Application Log
```
2025-11-13 10:30:15 [ERROR] User authentication failed for user: admin
```

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👨‍💻 Autor

Desarrollado con ❤️ para facilitar el análisis de logs

## 🔗 Enlaces Útiles

- [Documentación de Apache Logs](https://httpd.apache.org/docs/current/logs.html)
- [Documentación de Nginx Logs](https://docs.nginx.com/nginx/admin-guide/monitoring/logging/)
- [PHP Error Logging](https://www.php.net/manual/en/errorfunc.configuration.php)

---

⭐ Si te gusta este proyecto, ¡dale una estrella en GitHub!
