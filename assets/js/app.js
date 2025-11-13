// ============================================
// LOG ANALYZER PRO - Main Application
// ============================================

// Global State
const STATE = {
    allLogs: [],
    filteredLogs: [],
    currentPage: 1,
    pageSize: 50,
    currentView: 'dashboard',
    stats: {},
    fileName: '',
    tableColumns: []
};

// DOM Elements - will be initialized after DOMContentLoaded
let DOM = {};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initDOM();
    initEventListeners();
    checkExistingSession();
});

function initDOM() {
    DOM = {
        // Upload
        uploadContainer: document.getElementById('uploadContainer'),
        uploadBox: document.getElementById('uploadBox'),
        uploadLoading: document.getElementById('uploadLoading'),
        fileInput: document.getElementById('fileInput'),
        selectFileBtn: document.getElementById('selectFileBtn'),

        // Top Bar
        fileInfo: document.getElementById('fileInfo'),
        fileNameDisplay: document.getElementById('fileNameDisplay'),
        fileStatsDisplay: document.getElementById('fileStatsDisplay'),
        closeFileBtn: document.getElementById('closeFileBtn'),

        // Main Container
        mainContainer: document.getElementById('mainContainer'),

        // View Controls
        viewBtns: document.querySelectorAll('.view-btn'),
        viewControls: document.getElementById('viewControls'),
        searchInput: document.getElementById('searchInput'),
        levelSelect: document.getElementById('levelSelect'),
        applyFilters: document.getElementById('applyFilters'),

        // Views
        dashboardView: document.getElementById('dashboardView'),
        tableView: document.getElementById('tableView'),
        compactView: document.getElementById('compactView'),
        consoleView: document.getElementById('consoleView'),
        timelineView: document.getElementById('timelineView'),

        // Dashboard Elements
        totalLogs: document.getElementById('totalLogs'),
        errorCount: document.getElementById('errorCount'),
        warningCount: document.getElementById('warningCount'),
        infoCount: document.getElementById('infoCount'),
        levelChart: document.getElementById('levelChart'),
        timelineChart: document.getElementById('timelineChart'),
        insights: document.getElementById('insights'),
        recentErrors: document.getElementById('recentErrors'),

        // Table View
        logTableHead: document.getElementById('logTableHead'),
        logTableBody: document.getElementById('logTableBody'),

        // Other Views
        compactList: document.getElementById('compactList'),
        consoleOutput: document.getElementById('consoleOutput'),
        timelineContainer: document.getElementById('timelineContainer'),

        // Pagination
        paginationBar: document.getElementById('paginationBar'),
        paginationInfo: document.getElementById('paginationInfo'),
        firstPage: document.getElementById('firstPage'),
        prevPage: document.getElementById('prevPage'),
        nextPage: document.getElementById('nextPage'),
        lastPage: document.getElementById('lastPage'),
        pageNumbers: document.getElementById('pageNumbers'),
        pageSize: document.getElementById('pageSize'),

        // Modal
        logModal: document.getElementById('logModal'),
        modalClose: document.getElementById('modalClose'),
        logDetail: document.getElementById('logDetail'),

        loadingOverlay: document.getElementById('loadingOverlay')
    };
}

function initEventListeners() {
    // Upload
    if (DOM.selectFileBtn) {
        DOM.selectFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            DOM.fileInput.click();
        });
    }

    if (DOM.uploadBox) {
        DOM.uploadBox.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                DOM.fileInput.click();
            }
        });

        // Drag & Drop
        DOM.uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            DOM.uploadBox.classList.add('drag-over');
        });

        DOM.uploadBox.addEventListener('dragleave', () => {
            DOM.uploadBox.classList.remove('drag-over');
        });

        DOM.uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            DOM.uploadBox.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                uploadFile(e.dataTransfer.files[0]);
            }
        });
    }

    if (DOM.fileInput) {
        DOM.fileInput.addEventListener('change', handleFileSelect);
    }

    // View Selector
    if (DOM.viewBtns) {
        DOM.viewBtns.forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
        });
    }

    // Filters
    if (DOM.applyFilters) {
        DOM.applyFilters.addEventListener('click', applyFilters);
    }

    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyFilters();
        });
    }

    // Pagination
    if (DOM.firstPage) {
        DOM.firstPage.addEventListener('click', () => goToPage(1));
    }
    if (DOM.prevPage) {
        DOM.prevPage.addEventListener('click', () => goToPage(STATE.currentPage - 1));
    }
    if (DOM.nextPage) {
        DOM.nextPage.addEventListener('click', () => goToPage(STATE.currentPage + 1));
    }
    if (DOM.lastPage) {
        DOM.lastPage.addEventListener('click', () => goToPage(getTotalPages()));
    }
    if (DOM.pageSize) {
        DOM.pageSize.addEventListener('change', changePageSize);
    }

    // Close file
    if (DOM.closeFileBtn) {
        DOM.closeFileBtn.addEventListener('click', closeFile);
    }

    // Modal
    if (DOM.modalClose) {
        DOM.modalClose.addEventListener('click', () => DOM.logModal.classList.remove('show'));
    }
    if (DOM.logModal) {
        DOM.logModal.addEventListener('click', (e) => {
            if (e.target === DOM.logModal) DOM.logModal.classList.remove('show');
        });
    }
}

function checkExistingSession() {
    fetch('api.php?action=list')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data.current_log) {
                STATE.fileName = data.data.current_log;
                loadLogs();
            }
        })
        .catch(console.error);
}

// ============================================
// FILE UPLOAD
// ============================================

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        uploadFile(e.target.files[0]);
    }
}

function uploadFile(file) {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('Archivo demasiado grande. Máximo 50MB');
        return;
    }

    if (file.size === 0) {
        alert('El archivo está vacío');
        return;
    }

    DOM.uploadBox.classList.add('hidden');
    DOM.uploadLoading.classList.remove('hidden');

    const formData = new FormData();
    formData.append('logfile', file);

    fetch('upload.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            STATE.fileName = data.file.original_name;
            loadLogs();
        } else {
            alert('Error: ' + data.message);
            resetUpload();
        }
    })
    .catch(error => {
        alert('Error: ' + error.message);
        resetUpload();
    });
}

function resetUpload() {
    DOM.uploadBox.classList.remove('hidden');
    DOM.uploadLoading.classList.add('hidden');
    DOM.fileInput.value = '';
}

// ============================================
// LOAD LOGS
// ============================================

function loadLogs() {
    DOM.loadingOverlay.classList.remove('hidden');

    fetch('api.php?action=parse&page=1&per_page=1000')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                STATE.allLogs = data.data.entries;
                STATE.filteredLogs = [...STATE.allLogs];
                STATE.stats = data.data.stats;
                STATE.currentPage = 1;

                // Show main container
                DOM.uploadContainer.classList.add('hidden');
                DOM.mainContainer.classList.remove('hidden');
                DOM.fileInfo.classList.remove('hidden');
                DOM.closeFileBtn.classList.remove('hidden');
                DOM.viewControls.classList.remove('hidden');

                // Update file info
                DOM.fileNameDisplay.textContent = STATE.fileName;
                updateTopBarStats();

                // Detect columns
                detectColumns();

                // Render current view
                renderCurrentView();

                DOM.loadingOverlay.classList.add('hidden');
            } else {
                alert('Error: ' + data.message);
                resetUpload();
                DOM.loadingOverlay.classList.add('hidden');
            }
        })
        .catch(error => {
            alert('Error: ' + error.message);
            resetUpload();
            DOM.loadingOverlay.classList.add('hidden');
        });
}

function detectColumns() {
    const columns = ['line', 'timestamp', 'level'];
    const contextKeys = new Set();

    STATE.allLogs.slice(0, 50).forEach(log => {
        if (log.context) {
            Object.keys(log.context).forEach(key => contextKeys.add(key));
        }
    });

    const columnOrder = ['module', 'error_code', 'pid', 'client', 'ip', 'status'];
    columnOrder.forEach(col => {
        if (contextKeys.has(col)) columns.push(col);
    });

    columns.push('message');
    STATE.tableColumns = columns;
}

// ============================================
// VIEW MANAGEMENT
// ============================================

function switchView(viewName) {
    STATE.currentView = viewName;

    // Update active button
    DOM.viewBtns.forEach(btn => {
        if (btn.dataset.view === viewName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Show/hide view controls
    if (viewName === 'dashboard') {
        DOM.viewControls.classList.add('hidden');
        DOM.paginationBar.classList.add('hidden');
    } else {
        DOM.viewControls.classList.remove('hidden');
        DOM.paginationBar.classList.remove('hidden');
    }

    // Hide all views
    document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));

    // Show selected view
    const viewMap = {
        dashboard: DOM.dashboardView,
        table: DOM.tableView,
        compact: DOM.compactView,
        console: DOM.consoleView,
        timeline: DOM.timelineView
    };

    viewMap[viewName].classList.remove('hidden');

    // Render view
    renderCurrentView();
}

function renderCurrentView() {
    switch (STATE.currentView) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'table':
            renderTableView();
            DOM.paginationBar.classList.remove('hidden');
            updatePagination();
            break;
        case 'compact':
            renderCompactView();
            DOM.paginationBar.classList.remove('hidden');
            updatePagination();
            break;
        case 'console':
            renderConsoleView();
            DOM.paginationBar.classList.remove('hidden');
            updatePagination();
            break;
        case 'timeline':
            renderTimelineView();
            DOM.paginationBar.classList.remove('hidden');
            updatePagination();
            break;
    }
}

// ============================================
// TOP BAR STATS
// ============================================

function updateTopBarStats() {
    const badges = [];
    const total = STATE.allLogs.length;
    badges.push(`<span class="stat-badge">${total} líneas</span>`);

    if (STATE.stats.ERROR) {
        badges.push(`<span class="stat-badge error">${STATE.stats.ERROR} errores</span>`);
    }
    if (STATE.stats.WARNING) {
        badges.push(`<span class="stat-badge warning">${STATE.stats.WARNING} warnings</span>`);
    }
    if (STATE.stats.CRITICAL) {
        badges.push(`<span class="stat-badge error">${STATE.stats.CRITICAL} críticos</span>`);
    }

    DOM.fileStatsDisplay.innerHTML = badges.join('');
}

// ============================================
// FILTERS
// ============================================

function applyFilters() {
    const search = DOM.searchInput.value.toLowerCase();
    const level = DOM.levelSelect.value;

    STATE.filteredLogs = STATE.allLogs.filter(log => {
        // Search filter
        if (search && !log.message.toLowerCase().includes(search) && !log.raw.toLowerCase().includes(search)) {
            return false;
        }

        // Level filter
        if (level !== 'ALL' && log.level !== level) {
            return false;
        }

        return true;
    });

    STATE.currentPage = 1;
    renderCurrentView();
}

// ============================================
// PAGINATION
// ============================================

function getTotalPages() {
    return Math.ceil(STATE.filteredLogs.length / STATE.pageSize);
}

function getCurrentPageLogs() {
    const start = (STATE.currentPage - 1) * STATE.pageSize;
    const end = start + STATE.pageSize;
    return STATE.filteredLogs.slice(start, end);
}

function goToPage(page) {
    const totalPages = getTotalPages();
    if (page < 1 || page > totalPages) return;

    STATE.currentPage = page;
    renderCurrentView();
}

function changePageSize() {
    STATE.pageSize = parseInt(DOM.pageSize.value);
    STATE.currentPage = 1;
    renderCurrentView();
}

function updatePagination() {
    const total = STATE.filteredLogs.length;
    const totalPages = getTotalPages();
    const start = (STATE.currentPage - 1) * STATE.pageSize + 1;
    const end = Math.min(STATE.currentPage * STATE.pageSize, total);

    DOM.paginationInfo.textContent = `Mostrando ${start}-${end} de ${total}`;

    // Update buttons
    DOM.firstPage.disabled = STATE.currentPage === 1;
    DOM.prevPage.disabled = STATE.currentPage === 1;
    DOM.nextPage.disabled = STATE.currentPage === totalPages;
    DOM.lastPage.disabled = STATE.currentPage === totalPages;

    // Update page numbers
    renderPageNumbers(totalPages);
}

function renderPageNumbers(totalPages) {
    const current = STATE.currentPage;
    const maxVisible = 5;
    let pages = [];

    if (totalPages <= maxVisible) {
        pages = Array.from({length: totalPages}, (_, i) => i + 1);
    } else {
        if (current <= 3) {
            pages = [1, 2, 3, 4, '...', totalPages];
        } else if (current >= totalPages - 2) {
            pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', current - 1, current, current + 1, '...', totalPages];
        }
    }

    DOM.pageNumbers.innerHTML = pages.map(page => {
        if (page === '...') {
            return '<span class="page-ellipsis">...</span>';
        }
        return `<button class="page-num ${page === current ? 'active' : ''}" onclick="goToPage(${page})">${page}</button>`;
    }).join('');
}

// ============================================
// UTILITIES
// ============================================

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function showLogDetail(log) {
    let html = '<div class="detail-grid">';

    html += `
        <div class="detail-label">Línea:</div>
        <div class="detail-value">#${log.line_number}</div>
        <div class="detail-label">Timestamp:</div>
        <div class="detail-value">${log.timestamp || 'N/A'}</div>
        <div class="detail-label">Nivel:</div>
        <div class="detail-value"><span class="level-badge ${log.level.toLowerCase()}">${log.level}</span></div>
    `;

    if (log.context) {
        Object.keys(log.context).forEach(key => {
            html += `
                <div class="detail-label">${key}:</div>
                <div class="detail-value"><code>${escapeHtml(log.context[key])}</code></div>
            `;
        });
    }

    html += '</div>';

    html += `
        <div style="margin-bottom: 20px;">
            <strong style="color: var(--text-secondary); font-size: 0.85rem;">MENSAJE:</strong>
            <div class="message-box">${escapeHtml(log.message)}</div>
        </div>
        <div>
            <strong style="color: var(--text-secondary); font-size: 0.85rem;">LÍNEA COMPLETA:</strong>
            <div class="raw-line">${escapeHtml(log.raw)}</div>
        </div>
    `;

    DOM.logDetail.innerHTML = html;
    DOM.logModal.classList.add('show');
}

function closeFile() {
    if (!confirm('¿Cerrar archivo actual?')) return;

    fetch('api.php?action=delete')
        .then(() => {
            // Reset state
            STATE.allLogs = [];
            STATE.filteredLogs = [];
            STATE.currentPage = 1;
            STATE.fileName = '';

            // Hide main container
            DOM.mainContainer.classList.add('hidden');
            DOM.fileInfo.classList.add('hidden');
            DOM.closeFileBtn.classList.add('hidden');
            DOM.viewControls.classList.add('hidden');

            // Show upload container
            DOM.uploadContainer.classList.remove('hidden');
            DOM.uploadBox.classList.remove('hidden');
            DOM.uploadLoading.classList.add('hidden');
        })
        .catch(error => {
            console.error('Error closing file:', error);
        });
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderDashboard() {
    // Update stats cards
    DOM.totalLogs.textContent = STATE.allLogs.length;
    DOM.errorCount.textContent = STATE.stats.ERROR || 0;
    DOM.warningCount.textContent = STATE.stats.WARNING || 0;
    DOM.infoCount.textContent = STATE.stats.INFO || 0;

    // Render level distribution chart
    renderLevelChart();

    // Render timeline chart
    renderTimelineChart();

    // Generate intelligent insights
    renderInsights();

    // Show recent errors
    renderRecentErrors();

    // Hide pagination for dashboard view
    DOM.paginationBar.classList.add('hidden');
}

function renderLevelChart() {
    const levels = ['ERROR', 'CRITICAL', 'WARNING', 'INFO', 'DEBUG', 'NOTICE'];
    const total = STATE.allLogs.length;

    let html = '<div class="bar-chart">';

    levels.forEach(level => {
        const count = STATE.stats[level] || 0;
        const percentage = total > 0 ? (count / total * 100) : 0;

        if (count > 0) {
            html += `
                <div class="bar-item">
                    <div class="bar-label">${level}</div>
                    <div class="bar-track">
                        <div class="bar-fill ${level.toLowerCase()}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="bar-value">${count} (${percentage.toFixed(1)}%)</div>
                </div>
            `;
        }
    });

    html += '</div>';
    DOM.levelChart.innerHTML = html;
}

function renderTimelineChart() {
    // Group logs by hour
    const timeGroups = {};

    STATE.allLogs.forEach(log => {
        if (log.timestamp) {
            const hour = log.timestamp.substring(0, 13); // YYYY-MM-DD HH
            if (!timeGroups[hour]) {
                timeGroups[hour] = {total: 0, errors: 0};
            }
            timeGroups[hour].total++;
            if (log.level === 'ERROR' || log.level === 'CRITICAL') {
                timeGroups[hour].errors++;
            }
        }
    });

    const hours = Object.keys(timeGroups).sort();

    if (hours.length === 0) {
        DOM.timelineChart.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No hay datos de timestamp disponibles</p>';
        return;
    }

    const maxCount = Math.max(...hours.map(h => timeGroups[h].total));

    let html = '<div class="sparkline">';

    hours.slice(-24).forEach(hour => {
        const data = timeGroups[hour];
        const height = (data.total / maxCount * 100);
        const errorPercent = data.total > 0 ? (data.errors / data.total * 100) : 0;
        const displayHour = hour.substring(11, 13) + ':00';

        html += `
            <div class="spark-bar" title="${hour}: ${data.total} logs, ${data.errors} errores">
                <div class="spark-fill ${errorPercent > 50 ? 'error' : errorPercent > 20 ? 'warning' : 'info'}" style="height: ${height}%"></div>
                <div class="spark-label">${displayHour}</div>
            </div>
        `;
    });

    html += '</div>';
    DOM.timelineChart.innerHTML = html;
}

function renderInsights() {
    const insights = [];

    // Error rate analysis
    const errorCount = (STATE.stats.ERROR || 0) + (STATE.stats.CRITICAL || 0);
    const errorRate = (errorCount / STATE.allLogs.length * 100).toFixed(1);

    if (errorRate > 10) {
        insights.push({
            type: 'error',
            icon: '🔴',
            message: `Tasa de errores alta: ${errorRate}% (${errorCount} de ${STATE.allLogs.length})`
        });
    } else if (errorRate > 5) {
        insights.push({
            type: 'warning',
            icon: '🟡',
            message: `Tasa de errores moderada: ${errorRate}% (${errorCount} de ${STATE.allLogs.length})`
        });
    } else if (errorCount > 0) {
        insights.push({
            type: 'info',
            icon: '🟢',
            message: `Tasa de errores baja: ${errorRate}% (${errorCount} de ${STATE.allLogs.length})`
        });
    }

    // Find most common error codes
    const errorCodes = {};
    STATE.allLogs.forEach(log => {
        if (log.context && log.context.error_code) {
            errorCodes[log.context.error_code] = (errorCodes[log.context.error_code] || 0) + 1;
        }
    });

    const sortedCodes = Object.entries(errorCodes).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (sortedCodes.length > 0) {
        insights.push({
            type: 'info',
            icon: '📋',
            message: `Códigos de error más comunes: ${sortedCodes.map(([code, count]) => `${code} (${count}x)`).join(', ')}`
        });
    }

    // Find suspicious IPs (more than 10 errors)
    const ipErrors = {};
    STATE.allLogs.forEach(log => {
        if ((log.level === 'ERROR' || log.level === 'CRITICAL') && log.context && log.context.ip) {
            ipErrors[log.context.ip] = (ipErrors[log.context.ip] || 0) + 1;
        }
    });

    const suspiciousIPs = Object.entries(ipErrors).filter(([ip, count]) => count > 10);
    if (suspiciousIPs.length > 0) {
        insights.push({
            type: 'warning',
            icon: '⚠️',
            message: `IPs con múltiples errores: ${suspiciousIPs.slice(0, 3).map(([ip, count]) => `${ip} (${count}x)`).join(', ')}`
        });
    }

    // Render insights
    let html = '';
    if (insights.length === 0) {
        html = '<div class="insight-item info"><span class="insight-icon">✅</span> No se detectaron problemas importantes</div>';
    } else {
        insights.forEach(insight => {
            html += `<div class="insight-item ${insight.type}"><span class="insight-icon">${insight.icon}</span> ${insight.message}</div>`;
        });
    }

    DOM.insights.innerHTML = html;
}

function renderRecentErrors() {
    const recentErrors = STATE.allLogs
        .filter(log => log.level === 'ERROR' || log.level === 'CRITICAL')
        .slice(0, 10);

    if (recentErrors.length === 0) {
        DOM.recentErrors.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No hay errores para mostrar</p>';
        return;
    }

    let html = '<div class="recent-list">';
    recentErrors.forEach(log => {
        html += `
            <div class="recent-item" onclick="showLogDetail(STATE.allLogs[${log.line_number - 1}])">
                <div class="recent-header">
                    <span class="level-badge ${log.level.toLowerCase()}">${log.level}</span>
                    <span class="recent-time">${log.timestamp || 'Sin timestamp'}</span>
                    <span class="recent-line">#${log.line_number}</span>
                </div>
                <div class="recent-message">${escapeHtml(truncate(log.message, 120))}</div>
            </div>
        `;
    });
    html += '</div>';

    DOM.recentErrors.innerHTML = html;
}

function renderTableView() {
    // Render table header
    let headerHtml = '<tr>';
    STATE.tableColumns.forEach(col => {
        const label = col.charAt(0).toUpperCase() + col.slice(1).replace('_', ' ');
        headerHtml += `<th>${label}</th>`;
    });
    headerHtml += '</tr>';
    DOM.logTableHead.innerHTML = headerHtml;

    // Render table body
    const pageLogs = getCurrentPageLogs();
    let bodyHtml = '';

    pageLogs.forEach(log => {
        bodyHtml += '<tr onclick="showLogDetail(STATE.allLogs[' + (log.line_number - 1) + '])">';

        STATE.tableColumns.forEach(col => {
            let value = '';

            if (col === 'line') {
                value = `<span class="line-num">#${log.line_number}</span>`;
            } else if (col === 'timestamp') {
                value = `<span class="timestamp">${log.timestamp || '-'}</span>`;
            } else if (col === 'level') {
                value = `<span class="level-badge ${log.level.toLowerCase()}">${log.level}</span>`;
            } else if (col === 'message') {
                value = `<span class="message-text">${escapeHtml(truncate(log.message, 100))}</span>`;
            } else if (log.context && log.context[col]) {
                value = `<code class="context-value">${escapeHtml(log.context[col])}</code>`;
            } else {
                value = '<span style="color: var(--text-muted);">-</span>';
            }

            bodyHtml += `<td>${value}</td>`;
        });

        bodyHtml += '</tr>';
    });

    DOM.logTableBody.innerHTML = bodyHtml;
}

function renderCompactView() {
    const pageLogs = getCurrentPageLogs();
    let html = '';

    pageLogs.forEach(log => {
        html += `
            <div class="compact-item" onclick="showLogDetail(STATE.allLogs[${log.line_number - 1}])">
                <div class="compact-header">
                    <span class="compact-line">#${log.line_number}</span>
                    <span class="level-badge ${log.level.toLowerCase()}">${log.level}</span>
                    <span class="compact-time">${log.timestamp || 'Sin timestamp'}</span>
                </div>
                <div class="compact-message">${escapeHtml(log.message)}</div>
                ${log.context && Object.keys(log.context).length > 0 ? `
                    <div class="compact-meta">
                        ${Object.entries(log.context).slice(0, 3).map(([key, val]) =>
                            `<span class="meta-tag">${key}: <code>${escapeHtml(val)}</code></span>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    });

    DOM.compactList.innerHTML = html;
}

function renderConsoleView() {
    const pageLogs = getCurrentPageLogs();
    let html = '<div class="console-lines">';

    pageLogs.forEach(log => {
        const levelColor = {
            'ERROR': 'var(--error)',
            'CRITICAL': 'var(--error)',
            'WARNING': 'var(--warning)',
            'INFO': 'var(--info)',
            'DEBUG': 'var(--muted)',
            'NOTICE': 'var(--accent-purple)'
        }[log.level] || 'var(--text-primary)';

        html += `
            <div class="console-line" onclick="showLogDetail(STATE.allLogs[${log.line_number - 1}])">
                <span class="console-num">${String(log.line_number).padStart(5, ' ')}</span>
                <span class="console-time">${log.timestamp || '                   '}</span>
                <span class="console-level" style="color: ${levelColor}">[${log.level.padEnd(8, ' ')}]</span>
                <span class="console-msg">${escapeHtml(log.message)}</span>
            </div>
        `;
    });

    html += '</div>';
    DOM.consoleOutput.innerHTML = html;
}

function renderTimelineView() {
    const pageLogs = getCurrentPageLogs();

    // Group by date
    const dateGroups = {};
    pageLogs.forEach(log => {
        const date = log.timestamp ? log.timestamp.substring(0, 10) : 'Sin fecha';
        if (!dateGroups[date]) {
            dateGroups[date] = [];
        }
        dateGroups[date].push(log);
    });

    let html = '';

    Object.keys(dateGroups).sort().reverse().forEach(date => {
        html += `
            <div class="timeline-group">
                <div class="timeline-date">📅 ${date}</div>
                <div class="timeline-items">
        `;

        dateGroups[date].forEach(log => {
            const time = log.timestamp ? log.timestamp.substring(11, 19) : '--:--:--';
            html += `
                <div class="timeline-item ${log.level.toLowerCase()}" onclick="showLogDetail(STATE.allLogs[${log.line_number - 1}])">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-time">${time}</span>
                            <span class="level-badge ${log.level.toLowerCase()}">${log.level}</span>
                            <span class="timeline-line">#${log.line_number}</span>
                        </div>
                        <div class="timeline-message">${escapeHtml(truncate(log.message, 150))}</div>
                        ${log.context && Object.keys(log.context).length > 0 ? `
                            <div class="timeline-meta">
                                ${Object.entries(log.context).slice(0, 3).map(([key, val]) =>
                                    `<span class="meta-tag">${key}: <code>${escapeHtml(String(val))}</code></span>`
                                ).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    DOM.timelineContainer.innerHTML = html;
}

// ============================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================
// These functions need to be accessible from onclick handlers in generated HTML
window.showLogDetail = showLogDetail;
window.goToPage = goToPage;