// API Base URL
const API_BASE = window.location.origin;

// Global state
let charts = {};
let currentOrders = [];
let filterOptions = {};
let paginationState = {
    currentPage: 1,
    limit: 20,
    totalPages: 1,
    totalRecords: 0
};
let sortState = {
    column: 'order_date',
    order: 'DESC'
};

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadFilterOptions();
    await loadDashboard();
    setupEventListeners();
});

// Load filter options from API
async function loadFilterOptions() {
    try {
        const response = await fetch(`${API_BASE}/api/filters/options`);
        filterOptions = await response.json();

        populateFilter('regionFilter', filterOptions.regions);
        populateFilter('categoryFilter', filterOptions.categories);
        populateFilter('shipModeFilter', filterOptions.ship_modes);
    } catch (error) {
        console.error('Error loading filter options:', error);
        updateConnectionStatus(false);
    }
}

// Populate filter dropdown
function populateFilter(selectId, options) {
    const select = document.getElementById(selectId);
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('tableSearch');
    searchInput.addEventListener('input', debounce(filterTable, 500));
}

// Utility: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load main dashboard data
async function loadDashboard() {
    const filters = getActiveFilters();

    try {
        await Promise.all([
            loadKPIs(filters),
            loadCharts(filters),
            loadOrders(filters)
        ]);

        updateLastUpdateTime();
        updateConnectionStatus(true);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        updateConnectionStatus(false);
    }
}

// Get active filter values
function getActiveFilters() {
    return {
        region: document.getElementById('regionFilter').value,
        category: document.getElementById('categoryFilter').value,
        ship_mode: document.getElementById('shipModeFilter').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value
    };
}

// Build query string from filters
function buildQueryString(filters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
    });
    return params.toString();
}

// Load KPIs
async function loadKPIs(filters) {
    try {
        const queryString = buildQueryString(filters);
        const response = await fetch(`${API_BASE}/api/kpis?${queryString}`);
        const kpis = await response.json();

        // Update KPI cards
        document.getElementById('kpiRevenue').textContent = formatCurrency(kpis.total_revenue);
        document.getElementById('kpiOrders').textContent = formatNumber(kpis.total_orders);
        document.getElementById('kpiProfit').textContent = `${kpis.profit_margin}%`;
        document.getElementById('kpiDelivery').textContent = `${Math.round(kpis.avg_delivery_days)} days`;
        document.getElementById('kpiQuantity').textContent = formatNumber(kpis.total_quantity);

        // Update trends (placeholder - in real scenario, compare with previous period)
        document.querySelectorAll('.kpi-trend').forEach(el => {
            el.textContent = '📊 Current period';
        });
    } catch (error) {
        console.error('Error loading KPIs:', error);
        throw error;
    }
}

// Load all charts
async function loadCharts(filters) {
    await Promise.all([
        loadSalesTrendChart(filters),
        loadShippingChart(filters),
        loadCategoryChart(filters),
        loadRegionChart(filters)
    ]);

    // Add click interactions for drill-down
    addChartInteractions();
}

// Load sales trend chart
async function loadSalesTrendChart(filters) {
    try {
        const queryString = buildQueryString(filters);
        const response = await fetch(`${API_BASE}/api/charts/sales-trend?${queryString}`);
        const data = await response.json();

        const ctx = document.getElementById('salesTrendChart');

        // Destroy existing chart if it exists
        if (charts.salesTrend) {
            charts.salesTrend.destroy();
        }

        charts.salesTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.month),
                datasets: [
                    {
                        label: 'Sales',
                        data: data.map(d => d.total_sales),
                        borderColor: '#9333ea',
                        backgroundColor: 'rgba(147, 51, 234, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Profit',
                        data: data.map(d => d.total_profit),
                        borderColor: '#14b8a6',
                        backgroundColor: 'rgba(20, 184, 166, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: getChartOptions('line')
        });
    } catch (error) {
        console.error('Error loading sales trend chart:', error);
        throw error;
    }
}

// Load shipping mode chart
async function loadShippingChart(filters) {
    try {
        const queryString = buildQueryString(filters);
        const response = await fetch(`${API_BASE}/api/charts/shipping-modes?${queryString}`);
        const data = await response.json();

        const ctx = document.getElementById('shippingChart');

        if (charts.shipping) {
            charts.shipping.destroy();
        }

        charts.shipping = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.ship_mode),
                datasets: [{
                    data: data.map(d => d.total_sales),
                    backgroundColor: [
                        'rgba(147, 51, 234, 0.8)',
                        'rgba(20, 184, 166, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(236, 72, 153, 0.8)'
                    ],
                    borderColor: '#1a1a2e',
                    borderWidth: 2
                }]
            },
            options: getChartOptions('doughnut')
        });
    } catch (error) {
        console.error('Error loading shipping chart:', error);
        throw error;
    }
}

// Load category chart
async function loadCategoryChart(filters) {
    try {
        const queryString = buildQueryString(filters);
        const response = await fetch(`${API_BASE}/api/charts/categories?${queryString}`);
        const data = await response.json();

        const ctx = document.getElementById('categoryChart');

        if (charts.category) {
            charts.category.destroy();
        }

        charts.category = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.category),
                datasets: [
                    {
                        label: 'Sales',
                        data: data.map(d => d.total_sales),
                        backgroundColor: 'rgba(147, 51, 234, 0.8)',
                        borderColor: '#9333ea',
                        borderWidth: 1
                    },
                    {
                        label: 'Profit',
                        data: data.map(d => d.total_profit),
                        backgroundColor: 'rgba(20, 184, 166, 0.8)',
                        borderColor: '#14b8a6',
                        borderWidth: 1
                    }
                ]
            },
            options: getChartOptions('bar')
        });
    } catch (error) {
        console.error('Error loading category chart:', error);
        throw error;
    }
}

// Load region chart
async function loadRegionChart(filters) {
    try {
        const queryString = buildQueryString(filters);
        const response = await fetch(`${API_BASE}/api/charts/regions?${queryString}`);
        const data = await response.json();

        const ctx = document.getElementById('regionChart');

        if (charts.region) {
            charts.region.destroy();
        }

        charts.region = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.region),
                datasets: [{
                    label: 'Total Sales',
                    data: data.map(d => d.total_sales),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: '#3b82f6',
                    borderWidth: 1
                }]
            },
            options: {
                ...getChartOptions('bar'),
                indexAxis: 'y'
            }
        });
    } catch (error) {
        console.error('Error loading region chart:', error);
        throw error;
    }
}

// Load orders data with pagination and sorting
async function loadOrders(filters, page = 1) {
    try {
        const params = {
            ...filters,
            page: page,
            limit: paginationState.limit,
            sort_by: sortState.column,
            sort_order: sortState.order,
            search: document.getElementById('tableSearch')?.value || ''
        };

        const queryString = buildQueryString(params);
        const response = await fetch(`${API_BASE}/api/orders?${queryString}`);
        const result = await response.json();

        currentOrders = result.data;
        paginationState = {
            currentPage: result.pagination.page,
            limit: result.pagination.limit,
            totalPages: result.pagination.totalPages,
            totalRecords: result.pagination.total
        };

        renderOrdersTable(currentOrders);
        renderPagination();
    } catch (error) {
        console.error('Error loading orders:', error);
        throw error;
    }
}

// Render orders table
function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.order_id}</td>
            <td>${formatDate(order.order_date)}</td>
            <td>${order.customer_name}</td>
            <td>${order.product_name}</td>
            <td><span class="badge badge-purple">${order.category}</span></td>
            <td>${order.region}</td>
            <td><span class="badge badge-teal">${order.ship_mode}</span></td>
            <td>${formatCurrency(order.sales)}</td>
            <td style="color: ${order.profit >= 0 ? '#10b981' : '#ef4444'}">
                ${formatCurrency(order.profit)}
            </td>
            <td>${order.delivery_days} days</td>
        </tr>
    `).join('');
}

// Filter table based on search input (now uses server-side search)
function filterTable() {
    paginationState.currentPage = 1; // Reset to first page on search
    loadOrders(getActiveFilters(), 1);
}

// Apply filters
async function applyFilters() {
    await loadDashboard();
}

// Reset filters
function resetFilters() {
    document.getElementById('regionFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('shipModeFilter').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('tableSearch').value = '';

    loadDashboard();
}

// Chart options
function getChartOptions(type) {
    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#cbd5e1',
                    font: {
                        family: 'Inter',
                        size: 12
                    },
                    padding: 15
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 15, 35, 0.95)',
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(147, 51, 234, 0.5)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += formatCurrency(context.parsed.y || context.parsed);
                        }
                        return label;
                    }
                }
            }
        },
        scales: type === 'doughnut' ? {} : {
            x: {
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#94a3b8',
                    font: {
                        family: 'Inter',
                        size: 11
                    }
                }
            },
            y: {
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#94a3b8',
                    font: {
                        family: 'Inter',
                        size: 11
                    },
                    callback: function (value) {
                        return formatCurrency(value);
                    }
                }
            }
        }
    };

    return baseOptions;
}

// Update connection status
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    const statusDot = document.querySelector('.status-dot');

    if (connected) {
        statusElement.textContent = 'Connected';
        statusDot.style.background = '#10b981';
    } else {
        statusElement.textContent = 'Disconnected';
        statusDot.style.background = '#ef4444';
    }
}

// Update last update time
function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent =
        `Last updated: ${now.toLocaleTimeString()}`;
}

// Utility: Format currency
function formatCurrency(value) {
    if (value === null || value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

// Utility: Format number
function formatNumber(value) {
    if (value === null || value === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(value);
}

// Utility: Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Render pagination controls
function renderPagination() {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;

    const { currentPage, totalPages, totalRecords } = paginationState;

    let html = `
        <div class="pagination-info">
            Showing ${((currentPage - 1) * paginationState.limit) + 1} - ${Math.min(currentPage * paginationState.limit, totalRecords)} of ${totalRecords} records
        </div>
        <div class="pagination-buttons">
    `;

    // Previous button
    html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">← Previous</button>`;

    // Page numbers
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) html += `<span class="pagination-ellipsis">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="pagination-ellipsis">...</span>`;
        html += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next →</button>`;

    html += '</div>';
    paginationContainer.innerHTML = html;
}

// Change page
function changePage(page) {
    if (page < 1 || page > paginationState.totalPages) return;
    loadOrders(getActiveFilters(), page);
}

// Sort table by column
function sortTable(column) {
    // Toggle sort order if clicking same column
    if (sortState.column === column) {
        sortState.order = sortState.order === 'ASC' ? 'DESC' : 'ASC';
    } else {
        sortState.column = column;
        sortState.order = 'DESC';
    }

    // Update sort indicators
    updateSortIndicators();

    // Reload data with new sort
    paginationState.currentPage = 1;
    loadOrders(getActiveFilters(), 1);
}

// Update sort indicators in table headers
function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.column === sortState.column) {
            th.classList.add(sortState.order === 'ASC' ? 'sort-asc' : 'sort-desc');
        }
    });
}

// Export data to CSV
function exportToCSV() {
    if (currentOrders.length === 0) {
        alert('No data to export');
        return;
    }

    const headers = ['Order ID', 'Date', 'Customer', 'Product', 'Category', 'Region', 'Ship Mode', 'Sales', 'Profit', 'Delivery Days'];
    const rows = currentOrders.map(order => [
        order.order_id,
        formatDate(order.order_date),
        order.customer_name,
        order.product_name,
        order.category,
        order.region,
        order.ship_mode,
        order.sales,
        order.profit,
        order.delivery_days
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `supply_chain_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Add chart click interactions for drill-down
function addChartInteractions() {
    // Category chart click - filter by category
    if (charts.category) {
        charts.category.options.onClick = (event, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                const category = charts.category.data.labels[index];
                document.getElementById('categoryFilter').value = category;
                applyFilters();
            }
        };
    }

    // Region chart click - filter by region
    if (charts.region) {
        charts.region.options.onClick = (event, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                const region = charts.region.data.labels[index];
                document.getElementById('regionFilter').value = region;
                applyFilters();
            }
        };
    }

    // Shipping chart click - filter by ship mode
    if (charts.shipping) {
        charts.shipping.options.onClick = (event, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                const shipMode = charts.shipping.data.labels[index];
                document.getElementById('shipModeFilter').value = shipMode;
                applyFilters();
            }
        };
    }
}

