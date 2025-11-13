// Global state
let currentPage = 1;
let currentFilters = {};

// DOM Elements
const uploadSection = document.getElementById('uploadSection');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const uploadStatus = document.getElementById('uploadStatus');
const mainContent = document.getElementById('mainContent');
const fileName = document.getElementById('fileName');
const closeFileBtn = document.getElementById('closeFileBtn');
const stats = document.getElementById('stats');
const logList = document.getElementById('logList');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const pagination = document.getElementById('pagination');
const pageInfo = document.getElementById('pageInfo');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const logModal = document.getElementById('logModal');
const modalClose = document.getElementById('modalClose');
const logDetail = document.getElementById('logDetail');

// Filters
const levelFilter = document.getElementById('levelFilter');
const searchFilter = document.getElementById('searchFilter');
const startDateFilter = document.getElementById('startDateFilter');
const endDateFilter = document.getElementById('endDateFilter');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkCurrentLog();
});

// Setup event listeners
function setupEventListeners() {
    // Upload
    selectFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', (e) => {
        if (e.target === uploadArea || e.target.closest('.upload-area')) {
            fileInput.click();
        }
    });

    // Controls
    closeFileBtn.addEventListener('click', closeFile);
    applyFiltersBtn.addEventListener('click', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);

    // Pagination
    prevPageBtn.addEventListener('click', () => loadPage(currentPage - 1));
    nextPageBtn.addEventListener('click', () => loadPage(currentPage + 1));

    // Modal
    modalClose.addEventListener('click', closeModal);
    logModal.addEventListener('click', (e) => {
        if (e.target === logModal) closeModal();
    });

    // Enter key on search
    searchFilter.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
}

// Check if there's a current log file
function checkCurrentLog() {
    fetch('api.php?action=list')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data.current_log) {
                loadLogs();
            }
        })
        .catch(error => console.error('Error checking current log:', error));
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
}

// File selection handler
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
}

// Upload file
function uploadFile(file) {
    // Validate file size only on client side
    // Content validation will be done on server side
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        alert('El archivo es demasiado grande. Máximo 50MB');
        return;
    }

    // Warn about file size = 0
    if (file.size === 0) {
        alert('El archivo está vacío');
        return;
    }

    // Show progress
    uploadProgress.style.display = 'block';
    uploadArea.style.display = 'none';
    progressFill.style.width = '0%';

    const formData = new FormData();
    formData.append('logfile', file);

    // Upload with progress
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressFill.style.width = percentComplete + '%';
            uploadStatus.textContent = `Subiendo archivo... ${Math.round(percentComplete)}%`;
        }
    });

    xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);

            if (response.success) {
                uploadStatus.textContent = 'Archivo subido correctamente. Procesando...';
                progressFill.style.width = '100%';

                setTimeout(() => {
                    loadLogs();
                }, 500);
            } else {
                alert('Error: ' + response.message);
                resetUpload();
            }
        } else {
            alert('Error al subir el archivo');
            resetUpload();
        }
    });

    xhr.addEventListener('error', () => {
        alert('Error de conexión al subir el archivo');
        resetUpload();
    });

    xhr.open('POST', 'upload.php');
    xhr.send(formData);
}

// Reset upload area
function resetUpload() {
    uploadProgress.style.display = 'none';
    uploadArea.style.display = 'block';
    fileInput.value = '';
}

// Load logs
function loadLogs() {
    showLoading();

    fetch('api.php?action=parse&page=' + currentPage)
        .then(response => response.json())
        .then(data => {
            hideLoading();

            if (data.success) {
                displayLogs(data.data);
                uploadSection.style.display = 'none';
                mainContent.style.display = 'block';
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            hideLoading();
            alert('Error al cargar los logs: ' + error.message);
        });
}

// Apply filters
function applyFilters() {
    currentPage = 1;
    currentFilters = {
        level: levelFilter.value,
        search: searchFilter.value,
        start_date: startDateFilter.value ? startDateFilter.value.replace('T', ' ') + ':00' : null,
        end_date: endDateFilter.value ? endDateFilter.value.replace('T', ' ') + ':00' : null
    };

    loadFilteredLogs();
}

// Clear filters
function clearFilters() {
    levelFilter.value = 'ALL';
    searchFilter.value = '';
    startDateFilter.value = '';
    endDateFilter.value = '';
    currentFilters = {};
    currentPage = 1;
    loadLogs();
}

// Load filtered logs
function loadFilteredLogs() {
    showLoading();

    const params = new URLSearchParams({
        action: 'filter',
        page: currentPage,
        level: currentFilters.level || 'ALL',
        search: currentFilters.search || '',
        start_date: currentFilters.start_date || '',
        end_date: currentFilters.end_date || ''
    });

    fetch('api.php?' + params.toString())
        .then(response => response.json())
        .then(data => {
            hideLoading();

            if (data.success) {
                displayLogs(data.data);
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            hideLoading();
            alert('Error al filtrar los logs: ' + error.message);
        });
}

// Display logs
function displayLogs(data) {
    // Update file name
    fileName.textContent = data.file_name;

    // Update statistics
    displayStats(data.stats, data.total_lines, data.filtered_lines);

    // Display log entries
    if (data.entries.length === 0) {
        logList.innerHTML = '';
        noResults.style.display = 'block';
        pagination.style.display = 'none';
        return;
    }

    noResults.style.display = 'none';

    logList.innerHTML = '';
    data.entries.forEach(entry => {
        const entryElement = createLogEntry(entry);
        logList.appendChild(entryElement);
    });

    // Update pagination
    updatePagination(data.pagination);
}

// Create log entry element
function createLogEntry(entry) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.onclick = () => showLogDetail(entry);

    const lineDiv = document.createElement('div');
    lineDiv.className = 'log-line';
    lineDiv.textContent = '#' + entry.line_number;

    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'log-timestamp';
    timestampDiv.textContent = entry.timestamp || '-';

    const levelDiv = document.createElement('div');
    const levelSpan = document.createElement('span');
    levelSpan.className = 'log-level ' + entry.level.toLowerCase();
    levelSpan.textContent = entry.level;
    levelDiv.appendChild(levelSpan);

    const messageDiv = document.createElement('div');
    messageDiv.className = 'log-message';
    messageDiv.textContent = truncateMessage(entry.message, 150);

    div.appendChild(lineDiv);
    div.appendChild(timestampDiv);
    div.appendChild(levelDiv);
    div.appendChild(messageDiv);

    return div;
}

// Truncate message
function truncateMessage(message, maxLength) {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
}

// Display statistics
function displayStats(statsData, totalLines, filteredLines) {
    stats.innerHTML = '';

    // Total lines stat
    const totalStat = document.createElement('div');
    totalStat.className = 'stat-item info';
    totalStat.innerHTML = `
        <span class="stat-count">${totalLines}</span>
        <span class="stat-label">Total Líneas</span>
    `;
    stats.appendChild(totalStat);

    // Filtered lines (if filtered)
    if (filteredLines !== undefined && filteredLines !== totalLines) {
        const filteredStat = document.createElement('div');
        filteredStat.className = 'stat-item info';
        filteredStat.innerHTML = `
            <span class="stat-count">${filteredLines}</span>
            <span class="stat-label">Filtradas</span>
        `;
        stats.appendChild(filteredStat);
    }

    // Level stats
    const levelOrder = ['ERROR', 'CRITICAL', 'WARNING', 'INFO', 'DEBUG', 'NOTICE', 'ACCESS'];

    levelOrder.forEach(level => {
        if (statsData[level]) {
            const statItem = document.createElement('div');
            statItem.className = 'stat-item ' + level.toLowerCase();
            statItem.innerHTML = `
                <span class="stat-count">${statsData[level]}</span>
                <span class="stat-label">${level}</span>
            `;
            stats.appendChild(statItem);
        }
    });
}

// Update pagination
function updatePagination(paginationData) {
    if (paginationData.total_pages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    pageInfo.textContent = `Página ${paginationData.current_page} de ${paginationData.total_pages}`;

    prevPageBtn.disabled = !paginationData.has_prev;
    nextPageBtn.disabled = !paginationData.has_next;
}

// Load page
function loadPage(page) {
    currentPage = page;

    if (Object.keys(currentFilters).length > 0) {
        loadFilteredLogs();
    } else {
        loadLogs();
    }
}

// Show log detail in modal
function showLogDetail(entry) {
    let detailHTML = `
        <p><strong>Línea:</strong> ${entry.line_number}</p>
        <p><strong>Timestamp:</strong> ${entry.timestamp || 'N/A'}</p>
        <p><strong>Nivel:</strong> <span class="log-level ${entry.level.toLowerCase()}">${entry.level}</span></p>
        <p><strong>Mensaje:</strong></p>
        <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 10px;">
            ${escapeHtml(entry.message)}
        </div>
    `;

    if (entry.context && Object.keys(entry.context).length > 0) {
        detailHTML += '<p><strong>Contexto:</strong></p><pre>' + JSON.stringify(entry.context, null, 2) + '</pre>';
    }

    detailHTML += `
        <p><strong>Línea completa:</strong></p>
        <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 10px;">
            ${escapeHtml(entry.raw)}
        </div>
    `;

    logDetail.innerHTML = detailHTML;
    logModal.classList.add('show');
}

// Close modal
function closeModal() {
    logModal.classList.remove('show');
}

// Close file
function closeFile() {
    if (!confirm('¿Estás seguro de que quieres cerrar este archivo?')) {
        return;
    }

    fetch('api.php?action=delete')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mainContent.style.display = 'none';
                uploadSection.style.display = 'block';
                resetUpload();
                currentPage = 1;
                currentFilters = {};
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => {
            alert('Error al cerrar el archivo: ' + error.message);
        });
}

// Show loading
function showLoading() {
    loading.style.display = 'block';
    logList.style.display = 'none';
    noResults.style.display = 'none';
}

// Hide loading
function hideLoading() {
    loading.style.display = 'none';
    logList.style.display = 'block';
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
