<?php session_start(); ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Analyzer Pro</title>
    <link rel="stylesheet" href="assets/css/style-pro.css">
</head>
<body>
    <!-- Top Bar -->
    <div class="top-bar">
        <div class="top-bar-left">
            <div class="logo">
                <span>⚡</span>
                <span>Log Analyzer</span>
            </div>
            <div class="file-info hidden" id="fileInfo">
                <span class="file-name" id="fileNameDisplay">archivo.log</span>
                <div class="file-stats" id="fileStatsDisplay"></div>
            </div>
        </div>
        <div class="top-bar-right">
            <button class="btn btn-secondary btn-sm hidden" id="closeFileBtn">✕ Cerrar</button>
        </div>
    </div>

    <!-- Upload Section -->
    <div class="upload-container" id="uploadContainer">
        <div class="upload-box" id="uploadBox">
            <div class="upload-icon">📊</div>
            <h2>Analizar Archivo de Log</h2>
            <p>Arrastra tu archivo aquí o haz click para seleccionar</p>
            <p style="font-size: 0.85rem; opacity: 0.7;">Soporta: Apache, Nginx, PHP, WordPress, ModSecurity y más</p>
            <input type="file" id="fileInput">
            <br><br>
            <button class="btn btn-primary" id="selectFileBtn">Seleccionar Archivo</button>
        </div>
        <div class="loading hidden" id="uploadLoading">
            <div class="spinner"></div>
            <p>Procesando log file...</p>
        </div>
    </div>

    <!-- Filters Bar -->
    <div class="filters-bar hidden" id="filtersBar">
        <div class="filter-group">
            <span class="filter-label">🔍</span>
            <input type="text" class="filter-input" id="searchInput" placeholder="Buscar en logs...">
        </div>
        <div class="filter-group">
            <span class="filter-label">Nivel:</span>
            <select class="filter-select" id="levelSelect">
                <option value="ALL">Todos</option>
                <option value="ERROR">Error</option>
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
                <option value="DEBUG">Debug</option>
                <option value="NOTICE">Notice</option>
                <option value="ACCESS">Access</option>
            </select>
        </div>
        <div class="filter-group">
            <span class="filter-label">Desde:</span>
            <input type="datetime-local" class="filter-input" id="startDate" style="min-width: 200px;">
        </div>
        <div class="filter-group">
            <span class="filter-label">Hasta:</span>
            <input type="datetime-local" class="filter-input" id="endDate" style="min-width: 200px;">
        </div>
        <button class="btn btn-primary btn-sm" id="applyFilters">Aplicar</button>
        <button class="btn btn-secondary btn-sm" id="clearFilters">Limpiar</button>
    </div>

    <!-- Log Viewer -->
    <div class="log-viewer hidden" id="logViewer">
        <table class="log-table">
            <thead id="logTableHead">
                <tr>
                    <th class="col-line">#</th>
                    <th class="col-timestamp">Timestamp</th>
                    <th class="col-level">Nivel</th>
                    <th class="col-message">Mensaje</th>
                </tr>
            </thead>
            <tbody id="logTableBody">
                <!-- Logs will be inserted here -->
            </tbody>
        </table>
        <div class="loading hidden" id="tableLoading">
            <div class="spinner"></div>
            <p>Cargando logs...</p>
        </div>
    </div>

    <!-- Modal -->
    <div class="modal" id="logModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Detalle del Log</h3>
                <span class="modal-close" id="modalClose">×</span>
            </div>
            <div id="logDetail"></div>
        </div>
    </div>

    <script src="assets/js/app-pro.js"></script>
</body>
</html>
