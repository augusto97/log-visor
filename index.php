<?php session_start(); ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Analyzer Pro</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <!-- Top Bar -->
    <div class="top-bar">
        <div class="top-bar-left">
            <div class="logo">
                <span>⚡</span>
                <span>Log Analyzer Pro</span>
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

    <!-- Main Content -->
    <div class="main-container hidden" id="mainContainer">
        <!-- View Selector & Controls -->
        <div class="controls-bar">
            <div class="view-selector">
                <button class="view-btn active" data-view="dashboard" title="Dashboard con estadísticas">📊 Dashboard</button>
                <button class="view-btn" data-view="table" title="Vista de tabla detallada">📋 Tabla</button>
                <button class="view-btn" data-view="compact" title="Vista compacta">📑 Compacta</button>
                <button class="view-btn" data-view="console" title="Vista estilo consola">💻 Consola</button>
                <button class="view-btn" data-view="timeline" title="Timeline cronológico">⏱️ Timeline</button>
            </div>

            <div class="view-controls hidden" id="viewControls">
                <div class="filter-group">
                    <input type="text" class="filter-input-sm" id="searchInput" placeholder="🔍 Buscar...">
                </div>
                <div class="filter-group">
                    <select class="filter-select-sm" id="levelSelect">
                        <option value="ALL">Todos los niveles</option>
                        <option value="ERROR">Error</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="WARNING">Warning</option>
                        <option value="INFO">Info</option>
                        <option value="DEBUG">Debug</option>
                    </select>
                </div>
                <button class="btn btn-primary btn-sm" id="applyFilters">Filtrar</button>
            </div>
        </div>

        <!-- Dashboard View -->
        <div class="view-container" id="dashboardView">
            <div class="dashboard-grid">
                <!-- Stats Cards -->
                <div class="stats-cards">
                    <div class="stat-card stat-total">
                        <div class="stat-icon">📄</div>
                        <div class="stat-content">
                            <div class="stat-value" id="totalLogs">0</div>
                            <div class="stat-label">Total Entradas</div>
                        </div>
                    </div>
                    <div class="stat-card stat-error">
                        <div class="stat-icon">🔴</div>
                        <div class="stat-content">
                            <div class="stat-value" id="errorCount">0</div>
                            <div class="stat-label">Errores</div>
                        </div>
                    </div>
                    <div class="stat-card stat-warning">
                        <div class="stat-icon">🟡</div>
                        <div class="stat-content">
                            <div class="stat-value" id="warningCount">0</div>
                            <div class="stat-label">Warnings</div>
                        </div>
                    </div>
                    <div class="stat-card stat-info">
                        <div class="stat-icon">🔵</div>
                        <div class="stat-content">
                            <div class="stat-value" id="infoCount">0</div>
                            <div class="stat-label">Info</div>
                        </div>
                    </div>
                </div>

                <!-- Charts Row -->
                <div class="charts-row">
                    <div class="chart-card">
                        <h3>Distribución por Nivel</h3>
                        <div class="chart-container" id="levelChart"></div>
                    </div>
                    <div class="chart-card">
                        <h3>Timeline de Eventos</h3>
                        <div class="chart-container" id="timelineChart"></div>
                    </div>
                </div>

                <!-- Top Errors -->
                <div class="insights-card">
                    <h3>🔍 Análisis Inteligente</h3>
                    <div id="insights"></div>
                </div>

                <!-- Recent Errors -->
                <div class="recent-logs-card">
                    <h3>⚠️ Errores y Críticos Recientes</h3>
                    <div id="recentErrors"></div>
                </div>
            </div>
        </div>

        <!-- Table View -->
        <div class="view-container hidden" id="tableView">
            <div class="log-viewer">
                <table class="log-table">
                    <thead id="logTableHead"></thead>
                    <tbody id="logTableBody"></tbody>
                </table>
            </div>
        </div>

        <!-- Compact View -->
        <div class="view-container hidden" id="compactView">
            <div class="compact-list" id="compactList"></div>
        </div>

        <!-- Console View -->
        <div class="view-container hidden" id="consoleView">
            <div class="console-output" id="consoleOutput"></div>
        </div>

        <!-- Timeline View -->
        <div class="view-container hidden" id="timelineView">
            <div class="timeline-container" id="timelineContainer"></div>
        </div>

        <!-- Pagination -->
        <div class="pagination-bar hidden" id="paginationBar">
            <div class="pagination-info">
                <span id="paginationInfo">Mostrando 1-50 de 500</span>
            </div>
            <div class="pagination-controls">
                <button class="btn btn-secondary btn-sm" id="firstPage" disabled>⏮️ Primera</button>
                <button class="btn btn-secondary btn-sm" id="prevPage" disabled>◀️ Anterior</button>
                <div class="page-numbers" id="pageNumbers"></div>
                <button class="btn btn-secondary btn-sm" id="nextPage">Siguiente ▶️</button>
                <button class="btn btn-secondary btn-sm" id="lastPage">Última ⏭️</button>
            </div>
            <div class="pagination-size">
                <select class="filter-select-sm" id="pageSize">
                    <option value="25">25 por página</option>
                    <option value="50" selected>50 por página</option>
                    <option value="100">100 por página</option>
                    <option value="200">200 por página</option>
                </select>
            </div>
        </div>
    </div>

    <!-- Loading Overlay -->
    <div class="loading-overlay hidden" id="loadingOverlay">
        <div class="spinner"></div>
        <p>Procesando...</p>
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

    <script src="assets/js/app.js"></script>
</body>
</html>
