<?php
require_once 'config.php';

initSecureSession();
setSecurityHeaders();
requireAuth();

// Limpiar archivos antiguos al cargar la página (solo 1 de cada 10 veces para no afectar rendimiento)
if (rand(1, 10) === 1) {
    cleanupOldFiles();
}

// Generar token CSRF
$csrfToken = generateCsrfToken();

securityLog('Acceso a index.php');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Analyzer Pro</title>
    <link rel="stylesheet" href="assets/css/style.css?v=<?php echo time(); ?>">
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
            <a href="logout.php" class="btn btn-secondary btn-sm" style="margin-left: 10px;">🔓 Cerrar Sesión</a>
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

    <!-- Controls Bar -->
    <div class="controls-bar hidden" id="controlsBar">
        <!-- View Selector -->
        <div class="view-selector">
            <button class="view-btn active" data-view="table" title="Vista de tabla detallada">📋 Tabla</button>
            <button class="view-btn" data-view="dashboard" title="Dashboard con estadísticas">📊 Dashboard</button>
            <button class="view-btn" data-view="mini" title="Vista ultra compacta">📝 Mini</button>
        </div>

        <!-- Filters -->
        <div class="filter-controls">
            <div class="filter-group">
                <input type="text" class="filter-input-sm" id="searchInput" placeholder="🔍 Buscar...">
            </div>
            <div class="filter-group">
                <select class="filter-select-sm" id="levelSelect">
                    <option value="ALL">Todos los niveles</option>
                </select>
            </div>
            <div class="filter-group">
                <label style="font-size: 0.75rem; margin-right: 4px;">Desde:</label>
                <input type="date" class="filter-input-sm" id="dateFrom" style="width: 135px;">
                <select class="filter-select-sm" id="timeFrom" style="width: 70px;">
                    <option value="">Hora</option>
                </select>
            </div>
            <div class="filter-group">
                <label style="font-size: 0.75rem; margin-right: 4px;">Hasta:</label>
                <input type="date" class="filter-input-sm" id="dateTo" style="width: 135px;">
                <select class="filter-select-sm" id="timeTo" style="width: 70px;">
                    <option value="">Hora</option>
                </select>
            </div>
            <button class="btn btn-primary btn-sm" id="applyFilters">Filtrar</button>
            <button class="btn btn-secondary btn-sm" id="clearFilters">Limpiar</button>
        </div>
    </div>

    <!-- Table View (Vista por defecto) -->
    <div class="view-container" id="tableView">
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

    <!-- Dashboard View -->
    <div class="view-container hidden" id="dashboardView">
        <div class="dashboard-grid">
            <!-- Stats Cards Row 1 -->
            <div class="stats-row">
                <div class="stat-card">
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

            <!-- Stats Cards Row 2 - Métricas adicionales -->
            <div class="stats-row">
                <div class="stat-card">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-content">
                        <div class="stat-value" id="timeSpan">-</div>
                        <div class="stat-label">Período</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-value" id="logsPerMinute">-</div>
                        <div class="stat-label">Logs/min promedio</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-content">
                        <div class="stat-value" id="errorRate">0%</div>
                        <div class="stat-label">Tasa de Error</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🎯</div>
                    <div class="stat-content">
                        <div class="stat-value" id="uniqueMessages">0</div>
                        <div class="stat-label">Mensajes únicos</div>
                    </div>
                </div>
            </div>

            <!-- Charts Row 1 - Timeline -->
            <div class="charts-row">
                <div class="chart-card chart-full">
                    <h3>📈 Timeline de Logs</h3>
                    <div class="chart-container" id="timelineChart"></div>
                </div>
            </div>

            <!-- Charts Row 2 - Distribución y Actividad por hora -->
            <div class="charts-row">
                <div class="chart-card">
                    <h3>📊 Distribución por Nivel</h3>
                    <div class="chart-container" id="levelChart"></div>
                </div>
                <div class="chart-card">
                    <h3>🕐 Actividad por Hora</h3>
                    <div class="chart-container" id="hourlyChart"></div>
                </div>
            </div>

            <!-- Charts Row 3 - Día de semana y Módulos -->
            <div class="charts-row">
                <div class="chart-card">
                    <h3>📅 Distribución por Día de la Semana</h3>
                    <div class="chart-container" id="weekdayChart"></div>
                </div>
                <div class="chart-card" id="moduleChartCard" style="display: none;">
                    <h3>🔧 Top Módulos Activos</h3>
                    <div class="chart-container" id="moduleChart"></div>
                </div>
            </div>

            <!-- Charts Row 4 - Top Errores Frecuentes -->
            <div class="charts-row">
                <div class="chart-card chart-full">
                    <h3>🔥 Top 10 Errores Frecuentes</h3>
                    <div class="chart-container" id="topErrorsChart"></div>
                </div>
            </div>

            <!-- Charts Row 5 - IPs y Códigos HTTP -->
            <div class="charts-row" id="networkChartsRow" style="display: none;">
                <div class="chart-card" id="ipChartCard">
                    <h3>🌐 Top IPs/Clientes</h3>
                    <div class="chart-container" id="ipChart"></div>
                </div>
                <div class="chart-card" id="statusChartCard">
                    <h3>📡 Códigos de Estado HTTP</h3>
                    <div class="chart-container" id="statusChart"></div>
                </div>
            </div>

            <!-- Charts Row 6 - Contexto adicional -->
            <div class="charts-row" id="contextChartsRow" style="display: none;">
                <div class="chart-card">
                    <h3 id="contextChart1Title">Contexto</h3>
                    <div class="chart-container" id="contextChart1"></div>
                </div>
                <div class="chart-card">
                    <h3 id="contextChart2Title">Contexto</h3>
                    <div class="chart-container" id="contextChart2"></div>
                </div>
            </div>

            <!-- Recent Critical Events -->
            <div class="charts-row">
                <div class="chart-card chart-full">
                    <h3>🚨 Eventos Críticos Recientes</h3>
                    <div id="criticalEvents"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Mini View (Ultra Compacta) -->
    <div class="view-container hidden" id="miniView">
        <div class="mini-list" id="miniList"></div>
    </div>

    <!-- Pagination -->
    <div class="pagination-bar hidden" id="paginationBar">
        <div class="pagination-info">
            <span id="paginationInfo">Mostrando 1-50 de 500</span>
        </div>
        <div class="pagination-controls">
            <button class="btn btn-sm" id="prevPage">◀ Anterior</button>
            <div class="page-numbers" id="pageNumbers"></div>
            <button class="btn btn-sm" id="nextPage">Siguiente ▶</button>
        </div>
        <div class="pagination-size">
            <select class="filter-select-sm" id="pageSize">
                <option value="20" selected>20 por página</option>
                <option value="50">50 por página</option>
                <option value="100">100 por página</option>
                <option value="200">200 por página</option>
            </select>
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

    <script>
        // Pasar CSRF token al JavaScript
        window.CSRF_TOKEN = '<?= htmlspecialchars($csrfToken) ?>';
    </script>
    <script src="assets/js/app.js?v=<?php echo time(); ?>"></script>
</body>
</html>
