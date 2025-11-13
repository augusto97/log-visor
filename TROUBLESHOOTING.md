# 🔧 Guía de Solución de Problemas

## Problemas Corregidos en Esta Versión

### ✅ Botón "Seleccionar Archivo" abre explorador dos veces
**Solución aplicada**: Ahora el evento de click solo se dispara una vez.

### ✅ Parser mejorado para detectar niveles
**Solución aplicada**: Los patrones regex fueron reordenados y mejorados para detectar correctamente:
- Formato: `2025-11-13 10:00:00 [ERROR] mensaje`
- Formato: `[2025-11-13 10:00:00] ERROR: mensaje`
- PHP errors: `[date] PHP Fatal error: mensaje`
- Y muchos más formatos

## Herramientas de Diagnóstico

### 1. Página de Debug
Abre `debug.php` en tu navegador para ver:
- Información del sistema PHP
- Estado de archivos del proyecto
- Pruebas del parser
- Pruebas del API

**Cómo usar:**
```
http://localhost/log-visor/debug.php
```

### 2. Script de Prueba CLI
Ejecuta desde la terminal:
```bash
php test_parser.php
```

Esto probará el parser con el archivo `example.log` y mostrará:
- Número total de entradas parseadas
- Estadísticas por nivel (ERROR, WARNING, INFO, etc.)
- Primeras 5 entradas con detalles

## Problemas Comunes

### 🔴 Los archivos no se suben

**Posibles causas:**
1. Permisos del directorio `uploads/`
2. Límite de tamaño en PHP
3. Archivo binario en lugar de texto

**Soluciones:**
```bash
# Verificar y corregir permisos
chmod 755 uploads/

# Verificar configuración PHP
php -i | grep upload_max_filesize
php -i | grep post_max_size

# Si necesitas aumentar los límites, edita php.ini o .htaccess
```

### 🔴 No se detectan los niveles (ERROR, WARNING, etc.)

**Verifica el formato de tu archivo log:**
```bash
# Ver las primeras líneas de tu log
head -5 tu_archivo.log

# Probar con el script de test
php test_parser.php
```

**Formatos soportados:**
```
✓ 2025-11-13 10:00:00 [ERROR] mensaje
✓ [2025-11-13 10:00:00] ERROR: mensaje
✓ [13-Nov-2025 10:00:00 UTC] PHP Warning: mensaje
✓ 192.168.1.1 - - [13/Nov/2025:10:00:00 +0000] "GET /" 200
```

### 🔴 Las columnas no se muestran correctamente

**Posibles causas:**
1. CSS no se carga
2. Error de JavaScript en la consola
3. Datos no llegan correctamente del API

**Pasos de diagnóstico:**

1. **Verifica la consola del navegador:**
   - Abre las DevTools (F12)
   - Ve a la pestaña "Console"
   - Busca errores en rojo

2. **Verifica que el CSS se cargue:**
   - En DevTools, ve a "Network"
   - Recarga la página
   - Busca `style.css` - debe tener status 200

3. **Verifica los datos del API:**
   - Abre la consola del navegador
   - Deberías ver logs como:
     ```
     Displaying logs with data: {...}
     Entry 0: {...}
     Entry 1: {...}
     ```

4. **Inspecciona el HTML generado:**
   - Click derecho en un log → "Inspeccionar"
   - Verifica que tenga la estructura:
     ```html
     <div class="log-entry">
       <div class="log-line">#1</div>
       <div class="log-timestamp">2025-11-13 10:00:00</div>
       <div><span class="log-level error">ERROR</span></div>
       <div class="log-message">mensaje...</div>
     </div>
     ```

### 🔴 Error 500 al cargar archivos

**Posibles causas:**
1. Error de PHP
2. Parser encuentra un formato inesperado

**Solución:**
```bash
# Habilitar error reporting en .htaccess (ya incluido)
# Revisar logs de error de PHP
tail -f /var/log/apache2/error.log  # Linux/Mac
# O en XAMPP: xampp/apache/logs/error.log

# Probar el archivo directamente con el script de test
php test_parser.php
```

### 🔴 Sesión perdida / Archivo desaparece

**Solución:**
```bash
# Verificar que las sesiones estén habilitadas
php -i | grep session.save_path

# Asegurarse de que el directorio de sesiones tenga permisos
ls -la $(php -i | grep session.save_path | cut -d' ' -f3)
```

## Comandos Útiles de Debugging

### Verificar PHP está funcionando:
```bash
php -v
php -m  # Listar módulos cargados
```

### Verificar permisos:
```bash
ls -la uploads/
ls -la assets/
```

### Probar subida de archivo manualmente:
```bash
curl -F "logfile=@example.log" http://localhost/log-visor/upload.php
```

### Ver respuesta del API:
```bash
curl http://localhost/log-visor/api.php?action=list
```

## Modo Debug

Para habilitar logs detallados, edita `assets/js/app.js` y descomenta los `console.log()`:
- Ya hay logs en `displayLogs()`
- Puedes agregar más según necesites

## Contacto y Reportes

Si encuentras un bug:
1. Abre `debug.php` y copia la información del sistema
2. Abre la consola del navegador y copia los errores
3. Incluye un ejemplo de las líneas de tu archivo log que no se parsean correctamente
4. Crea un issue en el repositorio con toda esta información

## Verificación Rápida

Usa este checklist para verificar que todo funcione:

- [ ] `debug.php` se abre correctamente
- [ ] `test_parser.php` ejecuta sin errores
- [ ] Los archivos de ejemplo se pueden subir
- [ ] Las estadísticas muestran números correctos
- [ ] Los niveles tienen colores (rojo=ERROR, naranja=WARNING, etc.)
- [ ] Las columnas se muestran correctamente (Línea, Fecha, Nivel, Mensaje)
- [ ] El filtro por nivel funciona
- [ ] La búsqueda funciona
- [ ] El modal con detalles se abre al hacer click

---

**Última actualización**: 2025-11-13
