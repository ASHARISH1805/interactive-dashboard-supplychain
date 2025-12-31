// Demo version - uses MockAPI instead of real API calls

// Global state
let charts = {};
let currentOrders = [];
let filterOptions = {};

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async () => {
    loadFilterOptions();
    await loadDashboard();
    setupEventListeners();
});

// Load filter options from mock data
function loadFilterOptions() {
    filterOptions = MockAPI.getFilterOptions();

    populateFilter('regionFilter', filterOptions.regions);
    populateFilter('categoryFilter', filterOptions.categories);
    populateFilter('shipModeFilter', filterOptions.ship_modes);
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
    searchInput.addEventListener('input', filterTable);
}

// Load main dashboard data
async function loadDashboard() {
    const filters = getActiveFilters();

    try {
        loadKPIs(filters);
        loadCharts(filters);
        loadOrders(filters);

        updateLastUpdateTime();
    } catch (error) {
        console.error('Error loading dashboard:', error);
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

// Load KPIs
function loadKPIs(filters) {
    const kpis = MockAPI.getKPIs(filters);

    // Update KPI cards
    document.getElementById('kpiRevenue').textContent = formatCurrency(kpis.total_revenue);
    document.getElementById('kpiOrders').textContent = formatNumber(kpis.total_orders);
    document.getElementById('kpiProfit').textContent = `${kpis.profit_margin}%`;
    document.getElementById('kpiDelivery').textContent = `${Math.round(kpis.avg_delivery_days)} days`;
    document.getElementById('kpiQuantity').textContent = formatNumber(kpis.total_quantity);

    // Update trends
    document.querySelectorAll('.kpi-trend').forEach(el => {
        el.textContent = '📊 Mock data';
    });
}

// Load all charts
function loadCharts(filters) {
    loadSalesTrendChart(filters);
    loadShippingChart(filters);
    loadCategoryChart(filters);
    loadRegionChart(filters);
}

// Load sales trend chart
function loadSalesTrendChart(filters) {
    const data = MockAPI.getSalesTrend(filters);
    const ctx = document.getElementById('salesTrendChart');

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
}

// Load shipping mode chart
function loadShippingChart(filters) {
    const data = MockAPI.getShippingModes(filters);
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
}

// Load category chart
function loadCategoryChart(filters) {
    const data = MockAPI.getCategories(filters);
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
}

// Load region chart
function loadRegionChart(filters) {
    const data = MockAPI.getRegions(filters);
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
}

// Load orders data
function loadOrders(filters) {
    currentOrders = MockAPI.getOrders(filters);
    renderOrdersTable(currentOrders);
}

// Render orders table
function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = orders.slice(0, 100).map(order => `
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

// Filter table based on search input
function filterTable() {
    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();

    if (!searchTerm) {
        renderOrdersTable(currentOrders);
        return;
    }

    const filtered = currentOrders.filter(order =>
        Object.values(order).some(value =>
            String(value).toLowerCase().includes(searchTerm)
        )
    );

    renderOrdersTable(filtered);
}

// Apply filters
function applyFilters() {
    loadDashboard();
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
        maintainAspectRatio: true,
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

// Update last update time
function updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent =
        `Loaded: ${now.toLocaleTimeString()}`;
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
