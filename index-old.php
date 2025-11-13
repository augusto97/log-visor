<?php
session_start();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Visor - Visualizador de Archivos Log</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="header">
            <h1>📊 Log Visor</h1>
            <p class="subtitle">Visualizador inteligente de archivos log</p>
        </header>

        <!-- Upload Section -->
        <section class="upload-section" id="uploadSection">
            <div class="upload-area" id="uploadArea">
                <div class="upload-icon">📁</div>
                <h3>Arrastra un archivo aquí o haz clic para seleccionar</h3>
                <p>Cualquier archivo de texto plano (máx. 50MB)</p>
                <input type="file" id="fileInput" hidden>
                <button class="btn btn-primary" id="selectFileBtn">Seleccionar Archivo</button>
            </div>

            <div class="upload-progress" id="uploadProgress" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <p id="uploadStatus">Subiendo archivo...</p>
            </div>
        </section>

        <!-- Main Content -->
        <main class="main-content" id="mainContent" style="display: none;">
            <!-- Controls -->
            <section class="controls">
                <div class="control-group">
                    <h3 id="fileName">Archivo cargado</h3>
                    <button class="btn btn-danger btn-sm" id="closeFileBtn">✕ Cerrar</button>
                </div>

                <!-- Statistics -->
                <div class="stats" id="stats"></div>

                <!-- Filters -->
                <div class="filters">
                    <div class="filter-item">
                        <label>Nivel:</label>
                        <select id="levelFilter">
                            <option value="ALL">Todos</option>
                            <option value="ERROR">Error</option>
                            <option value="WARNING">Warning</option>
                            <option value="INFO">Info</option>
                            <option value="DEBUG">Debug</option>
                            <option value="CRITICAL">Critical</option>
                            <option value="NOTICE">Notice</option>
                            <option value="ACCESS">Access</option>
                        </select>
                    </div>

                    <div class="filter-item">
                        <label>Buscar:</label>
                        <input type="text" id="searchFilter" placeholder="Buscar en logs...">
                    </div>

                    <div class="filter-item">
                        <label>Desde:</label>
                        <input type="datetime-local" id="startDateFilter">
                    </div>

                    <div class="filter-item">
                        <label>Hasta:</label>
                        <input type="datetime-local" id="endDateFilter">
                    </div>

                    <button class="btn btn-primary" id="applyFiltersBtn">Aplicar Filtros</button>
                    <button class="btn btn-secondary" id="clearFiltersBtn">Limpiar</button>
                </div>
            </section>

            <!-- Log Entries -->
            <section class="log-entries">
                <div class="log-header">
                    <span>Línea</span>
                    <span>Fecha/Hora</span>
                    <span>Nivel</span>
                    <span>Mensaje</span>
                </div>

                <div id="logList" class="log-list">
                    <!-- Log entries will be inserted here -->
                </div>

                <div class="loading" id="loading" style="display: none;">
                    <div class="spinner"></div>
                    <p>Cargando logs...</p>
                </div>

                <div class="no-results" id="noResults" style="display: none;">
                    <p>No se encontraron resultados</p>
                </div>
            </section>

            <!-- Pagination -->
            <section class="pagination" id="pagination" style="display: none;">
                <button class="btn btn-secondary" id="prevPageBtn" disabled>← Anterior</button>
                <span id="pageInfo">Página 1 de 1</span>
                <button class="btn btn-secondary" id="nextPageBtn" disabled>Siguiente →</button>
            </section>
        </main>

        <!-- Footer -->
        <footer class="footer">
            <p>Log Visor &copy; 2025 - Desarrollado con PHP</p>
        </footer>
    </div>

    <!-- Modal for log details -->
    <div class="modal" id="logModal">
        <div class="modal-content">
            <span class="modal-close" id="modalClose">×</span>
            <h3>Detalle del Log</h3>
            <div id="logDetail"></div>
        </div>
    </div>

    <script src="assets/js/app.js"></script>
</body>
</html>
