# 📖 Guía Rápida - Log Visor

## ✅ Mejoras Implementadas

### 1. **Parser Robusto para Logs Complejos**
Ahora soporta logs de Apache, ModSecurity, Nginx, PHP y más:
- Apache Error Log: `[timestamp] [module:level] [pid x:tid y] [client ip] message`
- ModSecurity logs con múltiples campos
- Extracción automática de códigos de error (AH01071, etc.)
- Fechas en múltiples formatos

### 2. **Visualización Mejorada**
- ✅ Columnas con separadores visuales claros
- ✅ 4 columnas bien definidas: Línea | Timestamp | Nivel | Mensaje
- ✅ Colores por nivel (ERROR=rojo, WARNING=naranja, INFO=azul)
- ✅ Hover mejorado con borde azul
- ✅ Modal detallado con toda la información contextual

### 3. **Upload Mejorado**
- ✅ Mejor manejo de eventos de click
- ✅ Prevención de doble disparo
- ✅ Funciona tanto con drag & drop como con botón

## 🔍 Diagnóstico de Problemas

### Si el botón "Seleccionar Archivo" no funciona:

1. **Abre la herramienta de diagnóstico:**
   ```
   http://localhost/log-visor/test_upload.html
   ```

2. **Prueba los 3 tests:**
   - Test 1: Input directo
   - Test 2: Botón que dispara input
   - Test 3: Como en la app (con eventos)

3. **Abre la consola del navegador (F12)** y busca errores

4. **Si algún test funciona pero la app no:**
   - Revisa que no haya conflictos de JavaScript
   - Verifica que no haya extensiones del navegador bloqueando

### Si las columnas no se ven bien:

1. **Refresca la página con Ctrl+F5** (limpia caché)

2. **Verifica que el CSS se haya cargado:**
   - F12 → Network → Busca `style.css`
   - Debe tener status 200

3. **Inspecciona un log entry:**
   - Click derecho en un log → Inspeccionar
   - Debe tener estructura:
     ```html
     <div class="log-entry" style="display: grid; grid-template-columns: 70px 170px 110px 1fr;">
       <div class="log-line">#1</div>
       <div class="log-timestamp">2025-04-07 09:01:14</div>
       <div><span class="log-level error">ERROR</span></div>
       <div class="log-message">mensaje...</div>
     </div>
     ```

## 🚀 Cómo Usar

### 1. **Subir un Archivo**
Tienes 3 opciones:
- **Arrastra y suelta** el archivo sobre el área morada
- **Haz click** en el área morada para seleccionar
- **Usa el botón** "Seleccionar Archivo"

### 2. **Ver los Logs**
Una vez cargado verás:
- **Estadísticas** en la parte superior (cuántos ERROR, WARNING, etc.)
- **Lista de logs** en tabla de 4 columnas
- **Click en cualquier log** para ver detalles completos

### 3. **Filtrar**
Usa los filtros en la parte superior:
- **Nivel:** Filtra por ERROR, WARNING, INFO, etc.
- **Buscar:** Busca texto en el mensaje
- **Desde/Hasta:** Filtra por rango de fechas

### 4. **Información Detallada**
Haz click en cualquier línea de log para ver:
- Timestamp completo
- Módulo (si aplica)
- PID/TID (si aplica)
- Cliente/IP (si aplica)
- Código de error Apache (AH01071, etc.)
- Mensaje completo
- Línea completa del log original

## 📊 Ejemplo de Logs Soportados

### Apache Error Log:
```
[Mon Apr 07 09:01:14.420518 2025] [proxy_fcgi:error] [pid 2963252:tid 140637412251392] [client 172.71.126.160:0] AH01071: Got error 'PHP message: [error] Uncaught Exception...'
```

Parseado como:
- **Timestamp:** 2025-04-07 09:01:14
- **Módulo:** proxy_fcgi
- **Nivel:** ERROR
- **PID:** 2963252:tid 140637412251392
- **Cliente:** 172.71.126.160:0
- **Código Error:** AH01071
- **Mensaje:** Got error 'PHP message: [error] Uncaught Exception...'

### ModSecurity Log:
```
[Mon Apr 07 09:01:16.117333 2025] [security2:error] [pid 2963253:tid 140638016231168] [client 172.71.126.160:0] [client 172.71.126.160] ModSecurity: Access denied with code 403 (phase 1)...
```

Parseado como:
- **Timestamp:** 2025-04-07 09:01:16
- **Módulo:** security2
- **Nivel:** ERROR
- **PID:** 2963253:tid 140638016231168
- **Cliente:** 172.71.126.160:0
- **Mensaje:** [client 172.71.126.160] ModSecurity: Access denied...

## 🎯 Características Principales

✅ **Universal:** Acepta cualquier archivo de texto plano
✅ **Inteligente:** Detecta automáticamente el formato del log
✅ **Robusto:** Maneja logs de Apache, Nginx, PHP, WordPress, etc.
✅ **Visual:** Colores por nivel, columnas claras, modal detallado
✅ **Rápido:** Paginación automática para archivos grandes
✅ **Filtrable:** Por nivel, búsqueda de texto, rango de fechas

## 🐛 Solución de Problemas Rápida

| Problema | Solución |
|----------|----------|
| Botón no funciona | Abre `test_upload.html` y prueba |
| Columnas no se ven | Ctrl+F5 para limpiar caché |
| Logs no se parsean | Revisa que sea texto plano (no binario) |
| Error 500 | Asegúrate que no existe `.htaccess` |
| Archivo no sube | Máx. 50MB, verifica PHP settings |

## 📞 Archivos de Ayuda

- **ERROR_500_FIX.md** - Solucionar error 500
- **TROUBLESHOOTING.md** - Guía completa de solución de problemas
- **README.md** - Documentación completa
- **test_upload.html** - Herramienta de diagnóstico de upload
- **debug.php** - Página de diagnóstico del sistema
- **test_simple.php** - Test básico de PHP

## 💡 Tips

1. **Para logs muy grandes** (>10MB): El navegador puede tardar unos segundos en procesar
2. **Si el timestamp no se detecta**: El log aparecerá de todos modos, solo sin fecha
3. **Para ver la línea completa**: Siempre puedes hacer click en el log para ver el modal
4. **Usa la búsqueda**: Busca IPs, códigos de error, rutas, etc.
5. **Filtra por nivel**: Enfócate en ERROR y CRITICAL para problemas graves

---

**Última actualización:** 2025-11-13
**Versión:** 2.0 - Parser robusto y visualización mejorada
