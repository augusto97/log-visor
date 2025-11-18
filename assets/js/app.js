// =====================================
// GLOBAL STATE
// =====================================
console.log('app.js loaded successfully');

let currentLogs = [];
let filteredLogs = [];
let currentStats = {};
let currentFileName = '';
let tableColumns = [];
let currentView = 'table'; // Default view
let currentPage = 1;
let pageSize = 50;

// =====================================
// DOM ELEMENTS
// =====================================
const uploadContainer = document.getElementById('uploadContainer');
const uploadBox = document.getElementById('uploadBox');
const uploadLoading = document.getElementById('uploadLoading');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileInfo = document.getElementById('fileInfo');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const fileStatsDisplay = document.getElementById('fileStatsDisplay');
const closeFileBtn = document.getElementById('closeFileBtn');
const controlsBar = document.getElementById('controlsBar');
const searchInput = document.getElementById('searchInput');
const levelSelect = document.getElementById('levelSelect');
const applyFilters = document.getElementById('applyFilters');
const logModal = document.getElementById('logModal');
const modalClose = document.getElementById('modalClose');
const logDetail = document.getElementById('logDetail');

// View containers
const tableView = document.getElementById('tableView');
const dashboardView = document.getElementById('dashboardView');
const miniView = document.getElementById('miniView');

// Table elements
const logTableHead = document.getElementById('logTableHead');
const logTableBody = document.getElementById('logTableBody');

// Dashboard elements
const totalLogsEl = document.getElementById('totalLogs');
const errorCountEl = document.getElementById('errorCount');
const warningCountEl = document.getElementById('warningCount');
const infoCountEl = document.getElementById('infoCount');
const levelChartEl = document.getElementById('levelChart');
const recentErrorsEl = document.getElementById('recentErrors');

// Other view elements
const miniList = document.getElementById('miniList');

// Pagination elements
const paginationBar = document.getElementById('paginationBar');
const paginationInfo = document.getElementById('paginationInfo');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageNumbers = document.getElementById('pageNumbers');
const pageSizeSelect = document.getElementById('pageSize');

// View selector buttons
const viewBtns = document.querySelectorAll('.view-btn');

console.log('DOM elements loaded:');
console.log('levelSelect:', levelSelect);
console.log('uploadBox:', uploadBox);
console.log('controlsBar:', controlsBar);

// =====================================
// EVENT LISTENERS
// =====================================

// Upload
if (selectFileBtn) {
    selectFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (fileInput) fileInput.click();
    });
}

if (uploadBox) {
    uploadBox.addEventListener('click', (e) => {
        if (!e.target.closest('button') && fileInput) {
            fileInput.click();
        }
    });
}

if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
}

// Drag & Drop
if (uploadBox) {
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (uploadBox) uploadBox.classList.add('drag-over');
    });

    uploadBox.addEventListener('dragleave', () => {
        if (uploadBox) uploadBox.classList.remove('drag-over');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        if (uploadBox) uploadBox.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            uploadFile(e.dataTransfer.files[0]);
        }
    });
}

// Other controls
if (closeFileBtn) {
    closeFileBtn.addEventListener('click', closeFile);
}
if (applyFilters) {
    applyFilters.addEventListener('click', filterLogs);
}
if (modalClose && logModal) {
    modalClose.addEventListener('click', () => {
        if (logModal) logModal.classList.remove('show');
    });
}
if (logModal) {
    logModal.addEventListener('click', (e) => {
        if (e.target === logModal && logModal) logModal.classList.remove('show');
    });
}

if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') filterLogs();
    });
}

// View selector
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        switchView(view);
    });
});

// Pagination
if (prevPage) {
    prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderCurrentView();
        }
    });
}

if (nextPage) {
    nextPage.addEventListener('click', () => {
        const totalPages = getTotalPages();
        if (currentPage < totalPages) {
            currentPage++;
            renderCurrentView();
        }
    });
}

if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', () => {
        pageSize = parseInt(pageSizeSelect.value);
        currentPage = 1;
        renderCurrentView();
    });
}

// =====================================
// FILE HANDLING
// =====================================

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        uploadFile(e.target.files[0]);
    }
}

function uploadFile(file) {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('El archivo es demasiado grande. Máximo 50MB');
        return;
    }

    if (file.size === 0) {
        alert('El archivo está vacío');
        return;
    }

    if (uploadBox) uploadBox.classList.add('hidden');
    if (uploadLoading) uploadLoading.classList.remove('hidden');

    const formData = new FormData();
    formData.append('logfile', file);

    fetch('upload.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentFileName = data.file.original_name;
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
    if (uploadBox) uploadBox.classList.remove('hidden');
    if (uploadLoading) uploadLoading.classList.add('hidden');
    if (fileInput) fileInput.value = '';
}

// =====================================
// LOAD LOGS
// =====================================

function loadLogs() {
    console.log('loadLogs() called');
    fetch('api.php?action=parse&page=1&per_page=10000')
        .then(response => response.json())
        .then(data => {
            console.log('API response received:', data);
            if (data.success) {
                currentLogs = data.data.entries;
                filteredLogs = [...currentLogs];
                currentStats = data.data.stats;
                console.log('Data loaded - Logs:', currentLogs.length, 'Stats:', currentStats);

                // Hide upload, show viewer
                if (uploadContainer) uploadContainer.classList.add('hidden');
                if (fileInfo) fileInfo.classList.remove('hidden');
                if (closeFileBtn) closeFileBtn.classList.remove('hidden');
                if (controlsBar) controlsBar.classList.remove('hidden');

                // Update file info
                if (fileNameDisplay) fileNameDisplay.textContent = currentFileName;
                updateFileStats();

                // Detect columns
                detectColumns();

                // Populate level filter dynamically
                console.log('About to call populateLevelFilter...');
                console.log('currentStats before call:', currentStats);
                populateLevelFilter();
                console.log('After populateLevelFilter call');

                // Render default view
                switchView('table');
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

function detectColumns() {
    const columns = ['line', 'timestamp', 'level'];
    const contextKeys = new Set();

    currentLogs.slice(0, 50).forEach(log => {
        if (log.context) {
            Object.keys(log.context).forEach(key => contextKeys.add(key));
        }
    });

    const columnOrder = ['module', 'error_code', 'pid', 'client', 'ip', 'status'];
    columnOrder.forEach(col => {
        if (contextKeys.has(col)) columns.push(col);
    });

    columns.push('message');
    tableColumns = columns;
}

function populateLevelFilter() {
    console.log('=== populateLevelFilter CALLED ===');
    console.log('levelSelect:', levelSelect);
    console.log('currentStats:', currentStats);

    if (!levelSelect) {
        console.error('levelSelect is null!');
        return;
    }

    if (!currentStats || Object.keys(currentStats).length === 0) {
        console.error('currentStats is empty or null!');
        return;
    }

    // Define order of severity (common levels first)
    const severityOrder = {
        'CRITICAL': 1,
        'ERROR': 2,
        'WARNING': 3,
        'NOTICE': 4,
        'INFO': 5,
        'DEBUG': 6,
        'TRACE': 7,
        'ACCESS': 8
    };

    // Get levels from stats and sort by severity
    const levels = Object.keys(currentStats).sort((a, b) => {
        const orderA = severityOrder[a.toUpperCase()] || 999;
        const orderB = severityOrder[b.toUpperCase()] || 999;

        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.localeCompare(b);
    });

    console.log('Levels found:', levels);

    // Clear current options
    levelSelect.innerHTML = '<option value="ALL">Todos los niveles</option>';

    // Add level options with counts
    levels.forEach(level => {
        const count = currentStats[level];
        const option = document.createElement('option');
        option.value = level;
        option.textContent = `${level} (${count})`;
        levelSelect.appendChild(option);
        console.log(`Added option: ${level} (${count})`);
    });

    console.log('Final select HTML:', levelSelect.innerHTML);
}

function updateFileStats() {
    const badges = [];
    const total = currentLogs.length;
    badges.push(`<span class="stat-badge">${total} líneas</span>`);

    if (currentStats.ERROR) {
        badges.push(`<span class="stat-badge error">${currentStats.ERROR} errores</span>`);
    }
    if (currentStats.WARNING) {
        badges.push(`<span class="stat-badge warning">${currentStats.WARNING} warnings</span>`);
    }
    if (currentStats.CRITICAL) {
        badges.push(`<span class="stat-badge error">${currentStats.CRITICAL} críticos</span>`);
    }

    if (fileStatsDisplay) fileStatsDisplay.innerHTML = badges.join('');
}

function closeFile() {
    if (!confirm('¿Cerrar archivo actual?')) return;

    fetch('api.php?action=delete')
        .then(() => {
            location.reload();
        });
}

// =====================================
// FILTERS
// =====================================

function filterLogs() {
    const search = searchInput.value.toLowerCase();
    const level = levelSelect.value;

    filteredLogs = currentLogs.filter(log => {
        if (search && !log.message.toLowerCase().includes(search) && !log.raw.toLowerCase().includes(search)) {
            return false;
        }
        if (level !== 'ALL' && log.level !== level) {
            return false;
        }
        return true;
    });

    currentPage = 1;
    renderCurrentView();
}

// =====================================
// VIEW SWITCHING
// =====================================

function switchView(view) {
    currentView = view;

    // Update active button
    viewBtns.forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Hide all views
    if (tableView) tableView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
    if (miniView) miniView.classList.add('hidden');

    // Render selected view
    renderCurrentView();
}

function renderCurrentView() {
    switch (currentView) {
        case 'table':
            if (tableView) tableView.classList.remove('hidden');
            renderTableView();
            if (paginationBar) {
                paginationBar.classList.remove('hidden');
                updatePagination();
            }
            break;
        case 'dashboard':
            if (dashboardView) dashboardView.classList.remove('hidden');
            renderDashboard();
            if (paginationBar) paginationBar.classList.add('hidden');
            break;
        case 'mini':
            if (miniView) miniView.classList.remove('hidden');
            renderMiniView();
            if (paginationBar) {
                paginationBar.classList.remove('hidden');
                updatePagination();
            }
            break;
    }
}

// =====================================
// TABLE VIEW
// =====================================

function renderTableView() {
    // Render header
    let headerHtml = '<tr>';
    tableColumns.forEach(col => {
        const label = col.charAt(0).toUpperCase() + col.slice(1).replace('_', ' ');
        let className = 'col-' + col;
        headerHtml += `<th class="${className}">${label}</th>`;
    });
    headerHtml += '</tr>';
    if (logTableHead) logTableHead.innerHTML = headerHtml;

    // Render body
    const pageLogs = getCurrentPageLogs();
    let bodyHtml = '';

    pageLogs.forEach(log => {
        bodyHtml += '<tr class="log-row" onclick="showLogDetail(' + (log.line_number - 1) + ')">';

        tableColumns.forEach(col => {
            let value = '';

            if (col === 'line') {
                value = `<span class="line-num">#${log.line_number}</span>`;
            } else if (col === 'timestamp') {
                value = `<span class="timestamp">${log.timestamp || '-'}</span>`;
            } else if (col === 'level') {
                const levelClass = log.level.toLowerCase();
                value = `<span class="level-badge ${levelClass}">${log.level}</span>`;
            } else if (col === 'message') {
                value = `<span class="message-text">${escapeHtml(truncate(log.message, 150))}</span>`;
            } else if (log.context && log.context[col]) {
                value = `<code class="context-value">${escapeHtml(log.context[col])}</code>`;
            } else {
                value = '<span style="color: var(--text-muted);">-</span>';
            }

            bodyHtml += `<td>${value}</td>`;
        });

        bodyHtml += '</tr>';
    });

    if (logTableBody) logTableBody.innerHTML = bodyHtml;
}

// =====================================
// DASHBOARD VIEW
// =====================================

function renderDashboard() {
    // Update stats cards
    if (totalLogsEl) totalLogsEl.textContent = filteredLogs.length;
    if (errorCountEl) errorCountEl.textContent = currentStats.ERROR || 0;
    if (warningCountEl) warningCountEl.textContent = currentStats.WARNING || 0;
    if (infoCountEl) infoCountEl.textContent = currentStats.INFO || 0;

    // Render level chart
    renderLevelChart();

    // Render recent errors
    renderRecentErrors();
}

function renderLevelChart() {
    const levels = ['ERROR', 'CRITICAL', 'WARNING', 'INFO', 'DEBUG', 'NOTICE'];
    const total = filteredLogs.length;

    let html = '<div class="bar-chart">';

    levels.forEach(level => {
        const count = currentStats[level] || 0;
        if (count > 0) {
            const percentage = (count / total * 100).toFixed(1);
            html += `
                <div class="bar-item">
                    <div class="bar-label">${level}</div>
                    <div class="bar-track">
                        <div class="bar-fill ${level.toLowerCase()}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="bar-value">${count} (${percentage}%)</div>
                </div>
            `;
        }
    });

    html += '</div>';
    if (levelChartEl) levelChartEl.innerHTML = html;
}

function renderRecentErrors() {
    const errors = filteredLogs
        .filter(log => log.level === 'ERROR' || log.level === 'CRITICAL')
        .slice(0, 10);

    if (errors.length === 0) {
        if (recentErrorsEl) {
            recentErrorsEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay errores</p>';
        }
        return;
    }

    let html = '';
    errors.forEach(log => {
        html += `
            <div class="error-item" onclick="showLogDetail(${log.line_number - 1})">
                <div class="error-header">
                    <span>#${log.line_number}</span>
                    <span>${log.timestamp || 'Sin timestamp'}</span>
                </div>
                <div class="error-message">${escapeHtml(truncate(log.message, 100))}</div>
            </div>
        `;
    });

    if (recentErrorsEl) recentErrorsEl.innerHTML = html;
}

// =====================================
// MINI VIEW (Ultra Compacta)
// =====================================

function renderMiniView() {
    const pageLogs = getCurrentPageLogs();

    if (!miniList) {
        return;
    }

    if (!pageLogs || pageLogs.length === 0) {
        miniList.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-secondary);">No hay logs para mostrar</div>';
        return;
    }

    let html = '';

    pageLogs.forEach(log => {
        const time = log.timestamp ? log.timestamp.substring(11, 19) : '--:--:--';
        const lineNum = log.line_number || 0;
        const level = log.level || 'INFO';
        const message = log.message || log.raw || 'Sin mensaje';

        html += `
            <div class="mini-item" onclick="showLogDetail(${lineNum - 1})">
                <span class="mini-line">#${lineNum}</span>
                <span class="mini-badge ${level.toLowerCase()}">${level}</span>
                <span class="mini-time">${time}</span>
                <span class="mini-message">${escapeHtml(message)}</span>
            </div>
        `;
    });

    miniList.innerHTML = html;
}

// =====================================
// PAGINATION
// =====================================

function getTotalPages() {
    return Math.ceil(filteredLogs.length / pageSize);
}

function getCurrentPageLogs() {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredLogs.slice(start, end);
}

function updatePagination() {
    const total = filteredLogs.length;
    const totalPages = getTotalPages();
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, total);

    if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${start}-${end} de ${total}`;
    }

    if (prevPage) prevPage.disabled = currentPage === 1;
    if (nextPage) nextPage.disabled = currentPage === totalPages;

    renderPageNumbers(totalPages);
}

function renderPageNumbers(totalPages) {
    const maxVisible = 5;
    let pages = [];

    if (totalPages <= maxVisible) {
        pages = Array.from({length: totalPages}, (_, i) => i + 1);
    } else {
        if (currentPage <= 3) {
            pages = [1, 2, 3, 4, '...', totalPages];
        } else if (currentPage >= totalPages - 2) {
            pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }

    if (pageNumbers) {
        pageNumbers.innerHTML = pages.map(page => {
            if (page === '...') {
                return '<span class="page-ellipsis">...</span>';
            }
            const active = page === currentPage ? 'active' : '';
            return `<button class="page-num ${active}" onclick="goToPage(${page})">${page}</button>`;
        }).join('');
    }
}

function goToPage(page) {
    const totalPages = getTotalPages();
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderCurrentView();
}

// =====================================
// MODAL
// =====================================

function showLogDetail(index) {
    const log = currentLogs[index];
    if (!log) return;

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

    if (logDetail) logDetail.innerHTML = html;
    if (logModal) logModal.classList.add('show');
}

// =====================================
// UTILITIES
// =====================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

// Make functions global for onclick handlers
window.showLogDetail = showLogDetail;
window.goToPage = goToPage;
