// Global state
let currentLogs = [];
let currentStats = {};
let currentFileName = '';
let tableColumns = [];

// DOM Elements
const uploadContainer = document.getElementById('uploadContainer');
const uploadBox = document.getElementById('uploadBox');
const uploadLoading = document.getElementById('uploadLoading');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileInfo = document.getElementById('fileInfo');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const fileStatsDisplay = document.getElementById('fileStatsDisplay');
const closeFileBtn = document.getElementById('closeFileBtn');
const filtersBar = document.getElementById('filtersBar');
const logViewer = document.getElementById('logViewer');
const logTableHead = document.getElementById('logTableHead');
const logTableBody = document.getElementById('logTableBody');
const tableLoading = document.getElementById('tableLoading');
const searchInput = document.getElementById('searchInput');
const levelSelect = document.getElementById('levelSelect');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const applyFilters = document.getElementById('applyFilters');
const clearFilters = document.getElementById('clearFilters');
const logModal = document.getElementById('logModal');
const modalClose = document.getElementById('modalClose');
const logDetail = document.getElementById('logDetail');

// Event Listeners
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

closeFileBtn.addEventListener('click', closeFile);
applyFilters.addEventListener('click', filterLogs);
clearFilters.addEventListener('click', resetFilters);
modalClose.addEventListener('click', () => logModal.classList.remove('show'));
logModal.addEventListener('click', (e) => {
    if (e.target === logModal) logModal.classList.remove('show');
});

// Search on Enter
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') filterLogs();
});

// File Selection Handler
function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        uploadFile(e.target.files[0]);
    }
}

// Upload File
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
        alert('Error de conexión: ' + error.message);
        resetUpload();
    });
}

// Reset Upload
function resetUpload() {
    uploadBox.classList.remove('hidden');
    uploadLoading.classList.add('hidden');
    fileInput.value = '';
}

// Load Logs
function loadLogs() {
    fetch('api.php?action=parse&page=1&per_page=500')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentLogs = data.data.entries;
                currentStats = data.data.stats;

                // Hide upload, show viewer
                uploadContainer.classList.add('hidden');
                filtersBar.classList.remove('hidden');
                logViewer.classList.remove('hidden');
                fileInfo.classList.remove('hidden');
                closeFileBtn.classList.remove('hidden');

                // Update file info
                fileNameDisplay.textContent = currentFileName;
                updateStatsDisplay();

                // Detect columns and render
                detectColumns();
                renderTable(currentLogs);
            } else {
                alert('Error: ' + data.message);
                resetUpload();
            }
        })
        .catch(error => {
            alert('Error al cargar logs: ' + error.message);
            resetUpload();
        });
}

// Detect Columns from Log Data
function detectColumns() {
    const columns = ['line', 'timestamp', 'level'];
    const contextKeys = new Set();

    // Analyze first 50 logs to detect available fields
    currentLogs.slice(0, 50).forEach(log => {
        if (log.context) {
            Object.keys(log.context).forEach(key => contextKeys.add(key));
        }
    });

    // Add context columns in order
    const columnOrder = ['module', 'error_code', 'pid', 'client', 'ip', 'status', 'meta'];
    columnOrder.forEach(col => {
        if (contextKeys.has(col)) {
            columns.push(col);
        }
    });

    // Always add message last
    columns.push('message');

    tableColumns = columns;
    updateTableHeader();
}

// Update Table Header
function updateTableHeader() {
    const columnLabels = {
        line: '#',
        timestamp: 'Timestamp',
        level: 'Nivel',
        module: 'Módulo',
        error_code: 'Código',
        pid: 'PID',
        client: 'Cliente',
        ip: 'IP',
        status: 'Status',
        meta: 'Info',
        message: 'Mensaje'
    };

    const columnClasses = {
        line: 'col-line',
        timestamp: 'col-timestamp',
        level: 'col-level',
        module: 'col-module',
        error_code: 'col-error-code',
        pid: 'col-pid',
        client: 'col-client',
        ip: 'col-client',
        status: 'col-error-code',
        meta: 'col-module',
        message: 'col-message'
    };

    const headerRow = document.createElement('tr');
    tableColumns.forEach(col => {
        const th = document.createElement('th');
        th.className = columnClasses[col] || '';
        th.textContent = columnLabels[col] || col.toUpperCase();
        headerRow.appendChild(th);
    });

    logTableHead.innerHTML = '';
    logTableHead.appendChild(headerRow);
}

// Render Table
function renderTable(logs) {
    logTableBody.innerHTML = '';

    if (logs.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = tableColumns.length;
        td.style.textAlign = 'center';
        td.style.padding = '40px';
        td.style.color = 'var(--text-muted)';
        td.textContent = 'No se encontraron logs';
        tr.appendChild(td);
        logTableBody.appendChild(tr);
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.onclick = () => showLogDetail(log);

        tableColumns.forEach(col => {
            const td = document.createElement('td');

            switch (col) {
                case 'line':
                    td.className = 'col-line';
                    td.textContent = log.line_number;
                    break;

                case 'timestamp':
                    td.className = 'col-timestamp';
                    td.textContent = log.timestamp || '-';
                    break;

                case 'level':
                    td.className = 'col-level';
                    const badge = document.createElement('span');
                    badge.className = 'level-badge ' + log.level.toLowerCase();
                    badge.textContent = log.level;
                    td.appendChild(badge);
                    break;

                case 'message':
                    td.className = 'col-message';
                    td.textContent = truncate(log.message, 200);
                    break;

                default:
                    // Context fields
                    if (log.context && log.context[col]) {
                        td.textContent = truncate(log.context[col], 100);
                        td.className = 'col-' + col;
                    } else {
                        td.textContent = '-';
                        td.style.color = 'var(--text-muted)';
                    }
                    break;
            }

            tr.appendChild(td);
        });

        logTableBody.appendChild(tr);
    });
}

// Update Stats Display
function updateStatsDisplay() {
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

// Filter Logs
function filterLogs() {
    const search = searchInput.value.toLowerCase();
    const level = levelSelect.value;
    const start = startDate.value;
    const end = endDate.value;

    let filtered = [...currentLogs];

    if (search) {
        filtered = filtered.filter(log =>
            log.message.toLowerCase().includes(search) ||
            log.raw.toLowerCase().includes(search)
        );
    }

    if (level !== 'ALL') {
        filtered = filtered.filter(log => log.level === level);
    }

    if (start) {
        const startTimestamp = start.replace('T', ' ') + ':00';
        filtered = filtered.filter(log =>
            !log.timestamp || log.timestamp >= startTimestamp
        );
    }

    if (end) {
        const endTimestamp = end.replace('T', ' ') + ':00';
        filtered = filtered.filter(log =>
            !log.timestamp || log.timestamp <= endTimestamp
        );
    }

    renderTable(filtered);
}

// Reset Filters
function resetFilters() {
    searchInput.value = '';
    levelSelect.value = 'ALL';
    startDate.value = '';
    endDate.value = '';
    renderTable(currentLogs);
}

// Show Log Detail
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

    // Add context fields
    if (log.context) {
        const labels = {
            module: 'Módulo',
            error_code: 'Código de Error',
            pid: 'Process ID',
            client: 'Cliente',
            ip: 'IP Address',
            status: 'HTTP Status',
            size: 'Tamaño',
            referer: 'Referer',
            user_agent: 'User Agent',
            meta: 'Metadata'
        };

        Object.keys(log.context).forEach(key => {
            const label = labels[key] || key;
            html += `
                <div class="detail-label">${label}:</div>
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
    `;

    html += `
        <div>
            <strong style="color: var(--text-secondary); font-size: 0.85rem;">LÍNEA COMPLETA:</strong>
            <div class="raw-line">${escapeHtml(log.raw)}</div>
        </div>
    `;

    logDetail.innerHTML = html;
    logModal.classList.add('show');
}

// Close File
function closeFile() {
    if (!confirm('¿Cerrar archivo actual?')) return;

    fetch('api.php?action=delete')
        .then(() => {
            uploadContainer.classList.remove('hidden');
            filtersBar.classList.add('hidden');
            logViewer.classList.add('hidden');
            fileInfo.classList.add('hidden');
            closeFileBtn.classList.add('hidden');
            resetUpload();
            currentLogs = [];
            currentStats = {};
        });
}

// Utilities
function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Check for existing session
fetch('api.php?action=list')
    .then(response => response.json())
    .then(data => {
        if (data.success && data.data.current_log) {
            currentFileName = data.data.current_log;
            loadLogs();
        }
    });
