// =====================================
// GLOBAL STATE
// =====================================
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
const compactView = document.getElementById('compactView');
const miniView = document.getElementById('miniView');
const timelineView = document.getElementById('timelineView');

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
const compactList = document.getElementById('compactList');
const miniList = document.getElementById('miniList');
const timelineContainer = document.getElementById('timelineContainer');

// Pagination elements
const paginationBar = document.getElementById('paginationBar');
const paginationInfo = document.getElementById('paginationInfo');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageNumbers = document.getElementById('pageNumbers');
const pageSizeSelect = document.getElementById('pageSize');

// View selector buttons
const viewBtns = document.querySelectorAll('.view-btn');

// =====================================
// EVENT LISTENERS
// =====================================

// Upload
selectFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

uploadBox.addEventListener('click', (e) => {
    if (!e.target.closest('button')) {
        fileInput.click();
    }
});

fileInput.addEventListener('change', handleFileSelect);

// Drag & Drop
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('drag-over');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('drag-over');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        uploadFile(e.dataTransfer.files[0]);
    }
});

// Other controls
closeFileBtn.addEventListener('click', closeFile);
applyFilters.addEventListener('click', filterLogs);
modalClose.addEventListener('click', () => logModal.classList.remove('show'));
logModal.addEventListener('click', (e) => {
    if (e.target === logModal) logModal.classList.remove('show');
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') filterLogs();
});

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

    uploadBox.classList.add('hidden');
    uploadLoading.classList.remove('hidden');

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
    uploadBox.classList.remove('hidden');
    uploadLoading.classList.add('hidden');
    fileInput.value = '';
}

// =====================================
// LOAD LOGS
// =====================================

function loadLogs() {
    fetch('api.php?action=parse&page=1&per_page=10000')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentLogs = data.data.entries;
                filteredLogs = [...currentLogs];
                currentStats = data.data.stats;

                // Hide upload, show viewer
                uploadContainer.classList.add('hidden');
                fileInfo.classList.remove('hidden');
                closeFileBtn.classList.remove('hidden');
                controlsBar.classList.remove('hidden');

                // Update file info
                fileNameDisplay.textContent = currentFileName;
                updateFileStats();

                // Detect columns
                detectColumns();

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

    fileStatsDisplay.innerHTML = badges.join('');
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
    tableView.classList.add('hidden');
    dashboardView.classList.add('hidden');
    compactView.classList.add('hidden');
    miniView.classList.add('hidden');
    timelineView.classList.add('hidden');

    // Render selected view
    renderCurrentView();
}

function renderCurrentView() {
    switch (currentView) {
        case 'table':
            tableView.classList.remove('hidden');
            renderTableView();
            paginationBar.classList.remove('hidden');
            updatePagination();
            break;
        case 'dashboard':
            dashboardView.classList.remove('hidden');
            renderDashboard();
            paginationBar.classList.add('hidden');
            break;
        case 'compact':
            compactView.classList.remove('hidden');
            renderCompactView();
            paginationBar.classList.remove('hidden');
            updatePagination();
            break;
        case 'mini':
            miniView.classList.remove('hidden');
            renderMiniView();
            paginationBar.classList.remove('hidden');
            updatePagination();
            break;
        case 'timeline':
            timelineView.classList.remove('hidden');
            renderTimelineView();
            paginationBar.classList.remove('hidden');
            updatePagination();
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
    logTableHead.innerHTML = headerHtml;

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

    logTableBody.innerHTML = bodyHtml;
}

// =====================================
// DASHBOARD VIEW
// =====================================

function renderDashboard() {
    // Update stats cards
    totalLogsEl.textContent = filteredLogs.length;
    errorCountEl.textContent = currentStats.ERROR || 0;
    warningCountEl.textContent = currentStats.WARNING || 0;
    infoCountEl.textContent = currentStats.INFO || 0;

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
    levelChartEl.innerHTML = html;
}

function renderRecentErrors() {
    const errors = filteredLogs
        .filter(log => log.level === 'ERROR' || log.level === 'CRITICAL')
        .slice(0, 10);

    if (errors.length === 0) {
        recentErrorsEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay errores</p>';
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

    recentErrorsEl.innerHTML = html;
}

// =====================================
// COMPACT VIEW
// =====================================

function renderCompactView() {
    const pageLogs = getCurrentPageLogs();
    let html = '';

    pageLogs.forEach(log => {
        html += `
            <div class="compact-item" onclick="showLogDetail(${log.line_number - 1})">
                <div class="compact-header">
                    <span class="compact-line">#${log.line_number}</span>
                    <span class="level-badge ${log.level.toLowerCase()}">${log.level}</span>
                    <span class="compact-time">${log.timestamp || 'Sin timestamp'}</span>
                </div>
                <div class="compact-message">${escapeHtml(log.message)}</div>
            </div>
        `;
    });

    compactList.innerHTML = html;
}

// =====================================
// MINI VIEW (Ultra Compacta)
// =====================================

function renderMiniView() {
    const pageLogs = getCurrentPageLogs();
    let html = '';

    pageLogs.forEach(log => {
        const time = log.timestamp ? log.timestamp.substring(11, 19) : '--:--:--';
        html += `
            <div class="mini-item" onclick="showLogDetail(${log.line_number - 1})">
                <span class="mini-line">#${log.line_number}</span>
                <span class="mini-badge ${log.level.toLowerCase()}">${log.level}</span>
                <span class="mini-time">${time}</span>
                <span class="mini-message">${escapeHtml(log.message)}</span>
            </div>
        `;
    });

    miniList.innerHTML = html;
}

// =====================================
// TIMELINE VIEW
// =====================================

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
                <div class="timeline-item ${log.level.toLowerCase()}" onclick="showLogDetail(${log.line_number - 1})">
                    <div class="timeline-header">
                        <span class="timeline-time">${time}</span>
                        <span class="level-badge ${log.level.toLowerCase()}">${log.level}</span>
                        <span class="timeline-line">#${log.line_number}</span>
                    </div>
                    <div class="timeline-message">${escapeHtml(truncate(log.message, 150))}</div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    timelineContainer.innerHTML = html;
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

    paginationInfo.textContent = `Mostrando ${start}-${end} de ${total}`;

    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages;

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

    pageNumbers.innerHTML = pages.map(page => {
        if (page === '...') {
            return '<span class="page-ellipsis">...</span>';
        }
        const active = page === currentPage ? 'active' : '';
        return `<button class="page-num ${active}" onclick="goToPage(${page})">${page}</button>`;
    }).join('');
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

    logDetail.innerHTML = html;
    logModal.classList.add('show');
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
