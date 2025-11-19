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
let pageSize = 20;

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
const dateFromInput = document.getElementById('dateFrom');
const dateToInput = document.getElementById('dateTo');
const timeFromSelect = document.getElementById('timeFrom');
const timeToSelect = document.getElementById('timeTo');
const applyFilters = document.getElementById('applyFilters');
const clearFilters = document.getElementById('clearFilters');
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
const timeSpanEl = document.getElementById('timeSpan');
const logsPerMinuteEl = document.getElementById('logsPerMinute');
const errorRateEl = document.getElementById('errorRate');
const uniqueMessagesEl = document.getElementById('uniqueMessages');
const levelChartEl = document.getElementById('levelChart');
const timelineChartEl = document.getElementById('timelineChart');
const hourlyChartEl = document.getElementById('hourlyChart');
const topErrorsChartEl = document.getElementById('topErrorsChart');
const weekdayChartEl = document.getElementById('weekdayChart');
const moduleChartEl = document.getElementById('moduleChart');
const moduleChartCardEl = document.getElementById('moduleChartCard');
const ipChartEl = document.getElementById('ipChart');
const ipChartCardEl = document.getElementById('ipChartCard');
const statusChartEl = document.getElementById('statusChart');
const statusChartCardEl = document.getElementById('statusChartCard');
const networkChartsRowEl = document.getElementById('networkChartsRow');
const contextChart1El = document.getElementById('contextChart1');
const contextChart2El = document.getElementById('contextChart2');
const contextChart1TitleEl = document.getElementById('contextChart1Title');
const contextChart2TitleEl = document.getElementById('contextChart2Title');
const contextChartsRowEl = document.getElementById('contextChartsRow');
const criticalEventsEl = document.getElementById('criticalEvents');

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
if (clearFilters) {
    clearFilters.addEventListener('click', clearAllFilters);
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
    fetch('api.php?action=parse&page=1&per_page=10000')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentLogs = data.data.entries;
                filteredLogs = [...currentLogs];
                currentStats = data.data.stats;

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
                populateLevelFilter();

                // Setup date range filter
                setupDateRangeFilter();

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
    if (!levelSelect || !currentStats || Object.keys(currentStats).length === 0) return;

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
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
    });

    // Clear current options
    levelSelect.innerHTML = '<option value="ALL">Todos los niveles</option>';

    // Add level options with counts
    levels.forEach(level => {
        const count = currentStats[level];
        const option = document.createElement('option');
        option.value = level;
        option.textContent = `${level} (${count})`;
        levelSelect.appendChild(option);
    });
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
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const level = levelSelect ? levelSelect.value : 'ALL';
    const dateFrom = dateFromInput ? dateFromInput.value : '';
    const dateTo = dateToInput ? dateToInput.value : '';
    const timeFrom = timeFromSelect ? timeFromSelect.value : '';
    const timeTo = timeToSelect ? timeToSelect.value : '';

    filteredLogs = currentLogs.filter(log => {
        // Text search filter
        if (search && !log.message.toLowerCase().includes(search) && !log.raw.toLowerCase().includes(search)) {
            return false;
        }

        // Level filter
        if (level !== 'ALL' && log.level !== level) {
            return false;
        }

        // Date range filter
        if (log.timestamp) {
            const logDate = new Date(log.timestamp);

            // Check dateFrom + timeFrom
            if (dateFrom) {
                const timeStr = timeFrom || '00:00';
                const fromDateTime = new Date(dateFrom + 'T' + timeStr + ':00');
                if (logDate < fromDateTime) {
                    return false;
                }
            }

            // Check dateTo + timeTo
            if (dateTo) {
                const timeStr = timeTo || '23:59';
                const toDateTime = new Date(dateTo + 'T' + timeStr + ':59');
                if (logDate > toDateTime) {
                    return false;
                }
            }
        } else if (dateFrom || dateTo) {
            // If date filters are set but log has no timestamp, exclude it
            return false;
        }

        return true;
    });

    currentPage = 1;
    renderCurrentView();
}

function setupDateRangeFilter() {
    if (!dateFromInput || !dateToInput || !timeFromSelect || !timeToSelect) return;

    // Populate hour selects (0-23)
    const populateHourSelect = (selectEl) => {
        // Clear existing options except the first one
        selectEl.innerHTML = '<option value="">Hora</option>';
        for (let h = 0; h < 24; h++) {
            const hour = String(h).padStart(2, '0') + ':00';
            const option = document.createElement('option');
            option.value = hour;
            option.textContent = hour;
            selectEl.appendChild(option);
        }
    };

    populateHourSelect(timeFromSelect);
    populateHourSelect(timeToSelect);

    // Get logs with valid timestamps
    const logsWithTimestamp = currentLogs.filter(log => log.timestamp);

    if (logsWithTimestamp.length === 0) {
        // No timestamps available, disable date filters
        dateFromInput.disabled = true;
        dateToInput.disabled = true;
        timeFromSelect.disabled = true;
        timeToSelect.disabled = true;
        return;
    }

    // Enable inputs
    dateFromInput.disabled = false;
    dateToInput.disabled = false;
    timeFromSelect.disabled = false;
    timeToSelect.disabled = false;

    // Find min and max dates
    const timestamps = logsWithTimestamp.map(log => new Date(log.timestamp));
    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps));

    // Format to date format (YYYY-MM-DD)
    const formatDate = (date) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };

    // Set min and max attributes
    dateFromInput.min = formatDate(minDate);
    dateFromInput.max = formatDate(maxDate);
    dateToInput.min = formatDate(minDate);
    dateToInput.max = formatDate(maxDate);

    // Set titles with range info
    const formatDisplay = (date) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    dateFromInput.title = `Disponible desde: ${formatDisplay(minDate)}`;
    dateToInput.title = `Disponible hasta: ${formatDisplay(maxDate)}`;
}

function clearAllFilters() {
    // Clear text search
    if (searchInput) searchInput.value = '';

    // Reset level filter
    if (levelSelect) levelSelect.value = 'ALL';

    // Clear date filters
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    if (timeFromSelect) timeFromSelect.value = '';
    if (timeToSelect) timeToSelect.value = '';

    // Apply empty filter (shows all logs)
    filterLogs();
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
    // Calculate advanced stats
    const stats = calculateAdvancedStats();

    // Update basic stats cards
    if (totalLogsEl) totalLogsEl.textContent = filteredLogs.length.toLocaleString();
    if (errorCountEl) errorCountEl.textContent = (currentStats.ERROR || 0) + (currentStats.CRITICAL || 0);
    if (warningCountEl) warningCountEl.textContent = currentStats.WARNING || 0;
    if (infoCountEl) infoCountEl.textContent = currentStats.INFO || 0;

    // Update advanced stats cards
    if (timeSpanEl) timeSpanEl.textContent = stats.timeSpan;
    if (logsPerMinuteEl) logsPerMinuteEl.textContent = stats.logsPerMinute;
    if (errorRateEl) errorRateEl.textContent = stats.errorRate;
    if (uniqueMessagesEl) uniqueMessagesEl.textContent = stats.uniqueMessages;

    // Render all charts
    renderLevelChart();
    renderTimelineChart();
    renderHourlyChart();
    renderTopErrorsChart();
    renderWeekdayChart();
    renderModuleChart();
    renderNetworkCharts();
    renderCriticalEvents();
    renderContextCharts();
}

function calculateAdvancedStats() {
    const timestamps = filteredLogs
        .map(log => log.timestamp)
        .filter(ts => ts);

    let timeSpan = '-';
    let logsPerMinute = '-';

    if (timestamps.length > 1) {
        const sorted = [...timestamps].sort();
        const first = new Date(sorted[0]);
        const last = new Date(sorted[sorted.length - 1]);
        const diffMs = last - first;
        const diffMinutes = diffMs / 1000 / 60;

        if (diffMinutes < 60) {
            timeSpan = Math.round(diffMinutes) + 'm';
        } else if (diffMinutes < 1440) {
            timeSpan = Math.round(diffMinutes / 60) + 'h';
        } else {
            timeSpan = Math.round(diffMinutes / 1440) + 'd';
        }

        if (diffMinutes > 0) {
            logsPerMinute = (filteredLogs.length / diffMinutes).toFixed(1);
        }
    }

    const totalLogs = filteredLogs.length;
    const errorLogs = (currentStats.ERROR || 0) + (currentStats.CRITICAL || 0);
    const errorRate = totalLogs > 0 ? ((errorLogs / totalLogs) * 100).toFixed(1) + '%' : '0%';

    const uniqueMessages = new Set(filteredLogs.map(log => log.message)).size;

    return { timeSpan, logsPerMinute, errorRate, uniqueMessages };
}

function renderLevelChart() {
    if (!levelChartEl) return;

    const total = filteredLogs.length;
    if (total === 0) {
        levelChartEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay datos</p>';
        return;
    }

    let html = '<div class="bar-chart">';

    // Only show levels that actually exist in the logs
    Object.keys(currentStats).sort((a, b) => currentStats[b] - currentStats[a]).forEach(level => {
        const count = currentStats[level];
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

function renderTimelineChart() {
    if (!timelineChartEl) return;

    const logsWithTime = filteredLogs.filter(log => log.timestamp);

    if (logsWithTime.length === 0) {
        timelineChartEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Sin datos temporales</p>';
        return;
    }

    // Group logs by time intervals (buckets)
    const buckets = {};
    const bucketSize = determineBucketSize(logsWithTime);

    logsWithTime.forEach(log => {
        const bucket = getBucketKey(log.timestamp, bucketSize);
        if (!buckets[bucket]) {
            buckets[bucket] = { total: 0, error: 0, warning: 0, info: 0 };
        }
        buckets[bucket].total++;
        if (log.level === 'ERROR' || log.level === 'CRITICAL') {
            buckets[bucket].error++;
        } else if (log.level === 'WARNING') {
            buckets[bucket].warning++;
        } else {
            buckets[bucket].info++;
        }
    });

    const sortedBuckets = Object.keys(buckets).sort();
    const maxCount = Math.max(...sortedBuckets.map(k => buckets[k].total));

    let html = '<div class="timeline-chart">';
    sortedBuckets.forEach(bucket => {
        const data = buckets[bucket];
        const height = (data.total / maxCount * 100);
        const errorHeight = (data.error / data.total * 100);
        const warningHeight = (data.warning / data.total * 100);
        const infoHeight = (data.info / data.total * 100);

        html += `
            <div class="timeline-bar" style="height: ${height}%;" title="${bucket}: ${data.total} logs">
                <div class="timeline-segment error" style="height: ${errorHeight}%"></div>
                <div class="timeline-segment warning" style="height: ${warningHeight}%"></div>
                <div class="timeline-segment info" style="height: ${infoHeight}%"></div>
            </div>
        `;
    });
    html += '</div>';
    html += '<div class="timeline-labels">';
    html += `<span>${sortedBuckets[0]}</span>`;
    if (sortedBuckets.length > 1) {
        html += `<span>${sortedBuckets[Math.floor(sortedBuckets.length / 2)]}</span>`;
        html += `<span>${sortedBuckets[sortedBuckets.length - 1]}</span>`;
    }
    html += '</div>';

    timelineChartEl.innerHTML = html;
}

function determineBucketSize(logs) {
    if (logs.length < 2) return 'minute';

    const first = new Date(logs[0].timestamp);
    const last = new Date(logs[logs.length - 1].timestamp);
    const diffHours = (last - first) / 1000 / 60 / 60;

    if (diffHours < 1) return 'minute';
    if (diffHours < 24) return 'hour';
    return 'day';
}

function getBucketKey(timestamp, bucketSize) {
    const date = new Date(timestamp);
    if (bucketSize === 'minute') {
        return date.toISOString().substring(0, 16);
    } else if (bucketSize === 'hour') {
        return date.toISOString().substring(0, 13) + ':00';
    } else {
        return date.toISOString().substring(0, 10);
    }
}

function renderHourlyChart() {
    if (!hourlyChartEl) return;

    const logsWithTime = filteredLogs.filter(log => log.timestamp);

    if (logsWithTime.length === 0) {
        hourlyChartEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Sin datos temporales</p>';
        return;
    }

    // Group by hour of day (0-23)
    const hours = Array(24).fill(0);
    logsWithTime.forEach(log => {
        const hour = new Date(log.timestamp).getHours();
        hours[hour]++;
    });

    const maxCount = Math.max(...hours);

    let html = '<div class="hourly-chart">';
    hours.forEach((count, hour) => {
        const height = maxCount > 0 ? (count / maxCount * 100) : 0;
        html += `
            <div class="hourly-bar">
                <div class="hourly-count">${count}</div>
                <div class="hourly-fill" style="height: ${height}%;" title="${hour}:00 - ${count} logs"></div>
                <div class="hourly-label">${hour}h</div>
            </div>
        `;
    });
    html += '</div>';

    hourlyChartEl.innerHTML = html;
}

function renderTopErrorsChart() {
    if (!topErrorsChartEl) return;

    const errors = filteredLogs.filter(log =>
        log.level === 'ERROR' || log.level === 'CRITICAL'
    );

    if (errors.length === 0) {
        topErrorsChartEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay errores</p>';
        return;
    }

    // Count frequency of each error message (store full message)
    const messageCounts = {};
    errors.forEach(log => {
        const msg = log.message;
        if (!messageCounts[msg]) {
            messageCounts[msg] = 0;
        }
        messageCounts[msg]++;
    });

    // Sort by frequency and take top 10
    const sorted = Object.entries(messageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const maxCount = sorted[0][1];

    let html = '<div class="top-errors-list">';
    sorted.forEach(([msg, count]) => {
        const percentage = (count / maxCount * 100);
        const displayMsg = msg.length > 100 ? truncate(msg, 100) : msg;
        html += `
            <div class="top-error-item">
                <div class="top-error-bar">
                    <div class="top-error-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="top-error-info">
                    <span class="top-error-count">${count}x</span>
                    <span class="top-error-msg" title="${escapeHtml(msg)}">${escapeHtml(displayMsg)}</span>
                </div>
            </div>
        `;
    });
    html += '</div>';

    topErrorsChartEl.innerHTML = html;
}

function renderCriticalEvents() {
    if (!criticalEventsEl) return;

    const critical = filteredLogs
        .filter(log => log.level === 'ERROR' || log.level === 'CRITICAL')
        .slice(0, 20);

    if (critical.length === 0) {
        criticalEventsEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">✅ No hay eventos críticos</p>';
        return;
    }

    let html = '<div class="critical-events-list">';
    critical.forEach(log => {
        html += `
            <div class="critical-event" onclick="showLogDetail(${log.line_number - 1})">
                <div class="critical-header">
                    <span class="level-badge ${log.level.toLowerCase()}">${log.level}</span>
                    <span class="critical-time">${log.timestamp || 'Sin timestamp'}</span>
                    <span class="critical-line">#${log.line_number}</span>
                </div>
                <div class="critical-message">${escapeHtml(truncate(log.message, 150))}</div>
            </div>
        `;
    });
    html += '</div>';

    criticalEventsEl.innerHTML = html;
}

function renderContextCharts() {
    // Check if logs have context data (IPs, modules, etc)
    const hasContext = filteredLogs.some(log => log.context && Object.keys(log.context).length > 0);

    if (!hasContext || !contextChartsRowEl) {
        if (contextChartsRowEl) contextChartsRowEl.style.display = 'none';
        return;
    }

    // Collect context data
    const contextData = {};
    filteredLogs.forEach(log => {
        if (log.context) {
            Object.keys(log.context).forEach(key => {
                if (!contextData[key]) contextData[key] = {};
                const value = log.context[key];
                contextData[key][value] = (contextData[key][value] || 0) + 1;
            });
        }
    });

    // Get top 2 context types by number of unique values
    const topContexts = Object.keys(contextData)
        .sort((a, b) => Object.keys(contextData[b]).length - Object.keys(contextData[a]).length)
        .slice(0, 2);

    if (topContexts.length === 0) {
        contextChartsRowEl.style.display = 'none';
        return;
    }

    contextChartsRowEl.style.display = 'flex';

    // Render first context chart
    if (topContexts[0]) {
        renderContextChart(topContexts[0], contextData[topContexts[0]], contextChart1El, contextChart1TitleEl);
    }

    // Render second context chart
    if (topContexts[1]) {
        renderContextChart(topContexts[1], contextData[topContexts[1]], contextChart2El, contextChart2TitleEl);
    }
}

function renderContextChart(contextName, data, element, titleElement) {
    if (!element) return;

    if (titleElement) {
        titleElement.textContent = `📋 Top ${contextName}`;
    }

    const sorted = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const maxCount = sorted[0][1];

    let html = '<div class="context-chart">';
    sorted.forEach(([value, count]) => {
        const percentage = (count / maxCount * 100);
        html += `
            <div class="context-item">
                <div class="context-bar">
                    <div class="context-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="context-info">
                    <span class="context-count">${count}</span>
                    <span class="context-value">${escapeHtml(truncate(value, 40))}</span>
                </div>
            </div>
        `;
    });
    html += '</div>';

    element.innerHTML = html;
}

function renderWeekdayChart() {
    if (!weekdayChartEl) return;

    // Get logs with timestamps
    const logsWithTimestamp = filteredLogs.filter(log => log.timestamp);

    if (logsWithTimestamp.length === 0) {
        weekdayChartEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay datos temporales</p>';
        return;
    }

    // Count logs by day of week
    const weekdayCounts = {
        'Dom': 0,
        'Lun': 0,
        'Mar': 0,
        'Mié': 0,
        'Jue': 0,
        'Vie': 0,
        'Sáb': 0
    };

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    logsWithTimestamp.forEach(log => {
        const date = new Date(log.timestamp);
        const dayIndex = date.getDay();
        weekdayCounts[dayNames[dayIndex]]++;
    });

    const maxCount = Math.max(...Object.values(weekdayCounts));

    let html = '<div class="hourly-chart" style="height: 160px;">';
    Object.entries(weekdayCounts).forEach(([day, count]) => {
        const height = maxCount > 0 ? (count / maxCount * 100) : 0;
        html += `
            <div class="hourly-bar">
                <div class="hourly-count">${count}</div>
                <div class="hourly-fill" style="height: ${height}%;" title="${day}: ${count} logs"></div>
                <div class="hourly-label">${day}</div>
            </div>
        `;
    });
    html += '</div>';

    weekdayChartEl.innerHTML = html;
}

function renderModuleChart() {
    if (!moduleChartEl || !moduleChartCardEl) return;

    // Collect module data from context
    const moduleCounts = {};
    filteredLogs.forEach(log => {
        if (log.context && log.context.module) {
            const module = log.context.module;
            moduleCounts[module] = (moduleCounts[module] || 0) + 1;
        }
    });

    if (Object.keys(moduleCounts).length === 0) {
        moduleChartCardEl.style.display = 'none';
        return;
    }

    moduleChartCardEl.style.display = 'block';

    // Sort and take top 10
    const sorted = Object.entries(moduleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const maxCount = sorted[0][1];

    let html = '<div class="context-chart">';
    sorted.forEach(([module, count]) => {
        const percentage = (count / maxCount * 100);
        html += `
            <div class="context-item">
                <div class="context-bar">
                    <div class="context-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="context-info">
                    <span class="context-count">${count}</span>
                    <span class="context-value">${escapeHtml(module)}</span>
                </div>
            </div>
        `;
    });
    html += '</div>';

    moduleChartEl.innerHTML = html;
}

function renderNetworkCharts() {
    if (!networkChartsRowEl) return;

    let hasNetworkData = false;

    // Render IP Chart
    if (ipChartEl && ipChartCardEl) {
        const ipCounts = {};
        filteredLogs.forEach(log => {
            if (log.context) {
                const ip = log.context.ip || log.context.client;
                if (ip) {
                    // Clean up client format (remove port if present)
                    const cleanIp = ip.split(':')[0];
                    ipCounts[cleanIp] = (ipCounts[cleanIp] || 0) + 1;
                }
            }
        });

        if (Object.keys(ipCounts).length > 0) {
            hasNetworkData = true;
            ipChartCardEl.style.display = 'block';

            const sorted = Object.entries(ipCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            const maxCount = sorted[0][1];

            let html = '<div class="context-chart">';
            sorted.forEach(([ip, count]) => {
                const percentage = (count / maxCount * 100);
                html += `
                    <div class="context-item">
                        <div class="context-bar">
                            <div class="context-fill" style="width: ${percentage}%"></div>
                        </div>
                        <div class="context-info">
                            <span class="context-count">${count}</span>
                            <span class="context-value">${escapeHtml(ip)}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            ipChartEl.innerHTML = html;
        } else {
            ipChartCardEl.style.display = 'none';
        }
    }

    // Render Status Code Chart
    if (statusChartEl && statusChartCardEl) {
        const statusCounts = {};
        filteredLogs.forEach(log => {
            if (log.context && log.context.status) {
                const status = log.context.status;
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            }
        });

        if (Object.keys(statusCounts).length > 0) {
            hasNetworkData = true;
            statusChartCardEl.style.display = 'block';

            const sorted = Object.entries(statusCounts)
                .sort((a, b) => b[1] - a[1]);

            const maxCount = sorted[0][1];

            // Group status codes by type
            const getStatusClass = (code) => {
                if (code.startsWith('2')) return 'success';
                if (code.startsWith('3')) return 'redirect';
                if (code.startsWith('4')) return 'client-error';
                if (code.startsWith('5')) return 'server-error';
                return 'unknown';
            };

            let html = '<div class="context-chart">';
            sorted.forEach(([status, count]) => {
                const percentage = (count / maxCount * 100);
                const statusClass = getStatusClass(status);
                html += `
                    <div class="context-item">
                        <div class="context-bar">
                            <div class="context-fill status-${statusClass}" style="width: ${percentage}%"></div>
                        </div>
                        <div class="context-info">
                            <span class="context-count">${count}</span>
                            <span class="context-value">HTTP ${status}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            statusChartEl.innerHTML = html;
        } else {
            statusChartCardEl.style.display = 'none';
        }
    }

    // Show/hide the network charts row
    if (networkChartsRowEl) {
        networkChartsRowEl.style.display = hasNetworkData ? 'flex' : 'none';
    }
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

// =====================================
// DRAG AND DROP FOR CHART REORGANIZATION
// =====================================

let draggedElement = null;

function initDragAndDrop() {
    const chartCards = document.querySelectorAll('.chart-card');

    chartCards.forEach(card => {
        card.setAttribute('draggable', 'true');

        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('dragenter', handleDragEnter);
    });
}

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');

    // Remove all drag-over classes
    const chartCards = document.querySelectorAll('.chart-card');
    chartCards.forEach(card => {
        card.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this !== draggedElement) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedElement !== this) {
        // Get parent containers
        const draggedParent = draggedElement.parentNode;
        const droppedParent = this.parentNode;

        // If they're in the same row, swap them
        if (draggedParent === droppedParent) {
            const allCards = Array.from(draggedParent.children);
            const draggedIndex = allCards.indexOf(draggedElement);
            const droppedIndex = allCards.indexOf(this);

            if (draggedIndex < droppedIndex) {
                draggedParent.insertBefore(draggedElement, this.nextSibling);
            } else {
                draggedParent.insertBefore(draggedElement, this);
            }
        } else {
            // If they're in different rows, swap their positions
            const draggedNext = draggedElement.nextSibling;
            const droppedNext = this.nextSibling;

            droppedParent.insertBefore(draggedElement, droppedNext);
            draggedParent.insertBefore(this, draggedNext);
        }
    }

    this.classList.remove('drag-over');
    return false;
}

// Initialize drag and drop when view switches to dashboard
const originalSwitchView = switchView;
window.switchView = function(view) {
    originalSwitchView(view);
    if (view === 'dashboard') {
        setTimeout(initDragAndDrop, 100);
    }
};
