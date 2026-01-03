// Initialize Application
let useMock = false;

async function init() {
    try {
        updateStatus('connecting');

        // Attempt connection (No Mock Fallback)
        log('🚀 Connecting to Qlik Cloud...');
        await connectToQlik();
        updateStatus('connected'); // ✅ Set Green Dot immediately on Socket Success

        log('🔄 Connected! Fetching Dashboard Data...');

        // Safe Field Check
        try {
            log('📋 checking fields...');
            const tables = await app.getTablesAndKeys({}, {}, 0, true, false);
            if (tables && tables.tr) {
                const fieldNames = tables.tr.flatMap(t => t.qFields.map(f => f.qName));
                log('✅ Available Fields: ' + fieldNames.join(', '));
            } else {
                log('⚠️ No Tables found in App.');
            }
        } catch (fieldErr) {
            log('⚠️ Could not fetch fields: ' + fieldErr.message);
        }

        log('🔄 Starting Dashboard Update...');
        await updateDashboard();

        // Bind Buttons (Safely)
        const btnWest = document.getElementById('btn-west');
        if (btnWest) {
            btnWest.addEventListener('click', async () => {
                log('🖱️ "Select West" Clicked');
                updateSelectionBar('Region', 'West');
                setTimeout(updateDashboard, 500);
            });
        }

        const btnEast = document.getElementById('btn-east');
        if (btnEast) {
            btnEast.addEventListener('click', async () => {
                log('🖱️ "Select East" Clicked');
                updateSelectionBar('Region', 'East');
                setTimeout(updateDashboard, 500);
            });
        }

        const btnFurn = document.getElementById('btn-furniture');
        if (btnFurn) {
            btnFurn.addEventListener('click', async () => {
                log('🖱️ "Select Furniture" Clicked');
                updateSelectionBar('Category', 'Furniture');
                setTimeout(updateDashboard, 500);
            });
        }

        const btnTech = document.getElementById('btn-tech');
        if (btnTech) {
            btnTech.addEventListener('click', async () => {
                log('🖱️ "Select Tech" Clicked');
                updateSelectionBar('Category', 'Technology');
                setTimeout(updateDashboard, 500);
            });
        }

        const btnClear = document.getElementById('btn-clear');
        if (btnClear) {
            btnClear.addEventListener('click', async () => {
                log('🖱️ "Clear" Clicked');
                await app.clearAll();
                const activeSel = document.getElementById('active-selections');
                if (activeSel) activeSel.innerHTML = '<div class="selection-placeholder">No active filters</div>';
                setTimeout(updateDashboard, 500);
            });
        }

    } catch (err) {
        log('❌ CONNECTION FATAL ERROR:');
        log(err.message || err);
        if (err.target && err.target.url) log(`URL: ${err.target.url}`);

        updateStatus('error');
        const txtStatus = document.getElementById('txt-status');
        if (txtStatus) txtStatus.innerText = "Connection Failed";
        console.error("Initialization Failed:", err);
    }
}

function updateStatus(state) {
    const dot = document.getElementById('dot-status');
    const txt = document.getElementById('txt-status');
    if (!dot || !txt) return;

    if (state === 'connected') {
        dot.className = 'dot ok'; // Turn Green
        txt.innerText = 'Connected';
    } else if (state === 'error') {
        dot.className = 'dot';
        dot.style.backgroundColor = 'red';
        txt.innerText = 'Connection Error';
    } else {
        dot.className = 'dot';
        txt.innerText = 'Connecting...';
    }
}

// Simple Filter Helper just for the button interactions
function setFilterUI(btnId) {
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('active');
}

// ----------------------------------------------------
// UI INTERACTIONS (Selections & Navigation)
// ----------------------------------------------------
function updateSelectionBar(field, value) {
    // 1. Visual Pill Update
    document.querySelectorAll('.selection-pill').forEach(p => {
        if (p.innerText.includes(value)) {
            p.style.backgroundColor = '#009845'; // Qlik Green
            p.style.color = 'white';
        } else if (p.innerText.includes('Clear')) {
            // Reset Clear button style
            p.style.backgroundColor = '#fff';
            p.style.color = '#333';
        } else {
            // Reset others
            p.style.backgroundColor = '#e0e0e0';
            p.style.color = '#333';
        }
    });

    // 2. Clear Logic Reset
    if (field === 'Clear') {
        document.querySelectorAll('.selection-pill').forEach(p => {
            if (!p.innerText.includes('Clear')) {
                p.style.backgroundColor = '#e0e0e0';
                p.style.color = '#333';
            }
        });
        return;
    }

    // 3. Make Qlik Selection (Already handled by button ID click if attached, but let's be safe)
    log(`🔍 Selecting ${field}: ${value}`);
    if (app) {
        app.getField(field).then(f => f.select(value));
    }
}

// NAVIGATION LOGIC
document.addEventListener('DOMContentLoaded', () => {
    const views = {
        'nav-overview': 'view-overview',
        'nav-sales': 'view-sales',
        'nav-shipping': 'view-shipping',
        'nav-products': 'view-products',
        'nav-settings': 'view-settings' // Added Settings
    };

    // Map Nav IDs to Titles for Dynamic Header
    const titles = {
        'nav-overview': 'Overview|Supply Chain Key Performance Indicators',
        'nav-sales': 'Sales Analysis|Revenue Trends & Customer Profitability',
        'nav-shipping': 'Logistics Tower|Carrier Costs & Delivery Performance',
        'nav-products': 'Product Intelligence|Category Performance & Stock Levels',
        'nav-settings': 'System Settings|Configure Dashboard Preferences'
    };

    Object.keys(views).forEach(navId => {
        const el = document.getElementById(navId);
        if (el) {
            el.addEventListener('click', () => {
                // 1. Update Active Nav Link
                document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
                el.classList.add('active');

                // 2. Hide ALL Views
                document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');

                // 3. Show Selected View
                const targetId = views[navId];
                const target = document.getElementById(targetId);
                if (target) {
                    target.style.display = navId === 'view-settings' ? 'block' : 'block';
                    // Note: 'block' or 'grid' depending on internal structure. 
                    // Our views have dashboard-grid inside them, so block is fine for the container.
                    target.style.display = 'block';

                    log(`📱 Switched to View: ${targetId}`);
                    // Trigger resize for charts
                    window.dispatchEvent(new Event('resize'));
                }

                // 4. Update Header Title
                if (titles[navId]) {
                    const [main, sub] = titles[navId].split('|');
                    document.getElementById('page-heading').innerText = main;
                    document.querySelector('.page-title p').innerText = sub;
                }
            });
        }
    });

    // Dark Mode Toggle Logic
    const themeToggle = document.getElementById('toggle-theme');
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.style.setProperty('--bg-color', '#121212');
                document.documentElement.style.setProperty('--sidebar-bg', '#000000');
                document.documentElement.style.setProperty('--card-bg', '#1E1E1E');
                document.documentElement.style.setProperty('--text-primary', '#FFFFFF');
                document.documentElement.style.setProperty('--text-secondary', '#AAAAAA');
            } else {
                // Reset to Light (approximate original values)
                document.documentElement.style.setProperty('--bg-color', '#F7F7F7');
                document.documentElement.style.setProperty('--sidebar-bg', '#333333');
                document.documentElement.style.setProperty('--card-bg', '#FFFFFF');
                document.documentElement.style.setProperty('--text-primary', '#1a1a1a');
                document.documentElement.style.setProperty('--text-secondary', '#595959');
            }
        });
    }
});

async function updateDashboard() {
    try {
        log('📊 Fetching KPI Data...');
        await updateKPIs();
        log('📈 Fetching Chart Data...');
        await updateCharts();
        log('✅ Dashboard Updated!');
    } catch (e) {
        log('❌ DATA LOAD ERROR: ' + e.message);
        console.error(e);
    }
}

// ----------------------------------------------------
// 1. KPI LOADER (Advanced Mode with SIMULATION)
// ----------------------------------------------------
// ----------------------------------------------------
// 1. PRODUCTION GRADE KPI LOADER
// ----------------------------------------------------
async function updateKPIs() {
    log('📊 Fetching Executive KPIs...');

    // We can fetch multiple metrics in one HyperCube for efficiency
    const kpiModel = await app.createSessionObject({
        qInfo: { qType: 'kpi-group' },
        qHyperCubeDef: {
            qMeasures: [
                { qDef: { qDef: 'Sum(sales)', qLabel: 'Revenue' } },
                { qDef: { qDef: 'Sum(profit)/Sum(sales)', qLabel: 'Margin' } }, // Ratio
                { qDef: { qDef: 'Avg(discount)', qLabel: 'Discount' } },
                { qDef: { qDef: 'Sum(shipping_cost)/Sum(sales)', qLabel: 'LogisticsCost' } }
            ],
            qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 4, qHeight: 1 }]
        }
    });

    const layout = await kpiModel.getLayout();
    const data = layout.qHyperCube.qDataPages[0].qMatrix[0]; // First row (totals)

    if (data) {
        // 1. Total Revenue
        const rev = data[0].qNum;
        document.getElementById('kpi-sales').innerText = '$' + (rev / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'k';

        // 2. Profit Margin
        const margin = data[1].qNum * 100;
        document.getElementById('kpi-margin').innerText = margin.toFixed(1) + '%';

        // Update Trend Colors dynamically
        const marginBadge = document.querySelector('#kpi-margin').nextElementSibling.querySelector('.trend-badge');
        if (marginBadge) {
            marginBadge.className = margin > 20 ? 'trend-badge up' : 'trend-badge down';
            marginBadge.innerText = margin > 20 ? '▲ Healthy' : '▼ Low';
        }

        // 3. Logistics Cost (Replaces OTIF for specific request)
        const logCost = data[3].qNum * 100;
        const kpiOtif = document.getElementById('kpi-otif');
        if (kpiOtif) {
            kpiOtif.innerText = logCost.toFixed(1) + '%';
            // Rename title if possible via DOM, or assume HTML update
            // document.getElementById('lbl-logistics').innerText = "Logistics Cost %"; 
        }

        // 4. Avg Discount (Replaces Orders)
        const discount = data[2].qNum * 100;
        const kpiOrders = document.getElementById('kpi-orders');
        if (kpiOrders) kpiOrders.innerText = discount.toFixed(1) + '%';
    }
}

// ----------------------------------------------------
// 2. ULTRA ANALYTICS CHARTS
// ----------------------------------------------------
let chartScatter = null;
let chartRadar = null;
let chartCombo = null;
let chartRegion = null;

async function updateCharts() {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#595959';

    // --- Chart 1: Customer Profitability (Scatter) ---
    // The "Whale Curve" verification. 
    try {
        log('.. Generating Customer Profitability Matrix');
        const scatterModel = await app.createSessionObject({
            qInfo: { qType: 'chart' },
            qHyperCubeDef: {
                qDimensions: [{ qDef: { qFieldDefs: ['customer_name'] } }],
                qMeasures: [
                    { qDef: { qDef: 'Sum(sales)' } },
                    { qDef: { qDef: 'Sum(profit)' } }
                ],
                // Get Top 300 customers to visualize spread
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 3, qHeight: 300 }]
            }
        });
        const layout = await scatterModel.getLayout();

        const scatterData = layout.qHyperCube.qDataPages[0].qMatrix.map(r => ({
            name: r[0].qText,
            x: r[1].qNum, // Sales
            y: r[2].qNum  // Profit
        }));

        const el = document.getElementById('chart-scatter');
        if (el) {
            if (chartScatter) chartScatter.destroy();
            chartScatter = new Chart(el, {
                type: 'bubble',
                data: {
                    datasets: [{
                        label: 'Customers',
                        data: scatterData,
                        backgroundColor: scatterData.map(d => d.y < 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.6)'), // Red for loss makers
                        borderColor: scatterData.map(d => d.y < 0 ? '#b91c1c' : '#047857'),
                        borderWidth: 1,
                        radius: 5,
                        hoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: false, text: 'Customer Profitability' },
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (c) => `${c.raw.name}: Sales $${Math.floor(c.raw.x)}, Profit $${Math.floor(c.raw.y)}`
                            }
                        }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Revenue ($)' }, grid: { display: false } },
                        y: { title: { display: true, text: 'Profit ($)' }, grid: { borderDash: [2, 2] } }
                    }
                }
            });
        }
    } catch (e) { console.error("Scatter failed", e); }

    // --- Chart 2: Pareto Analysis (Category Combo) ---
    // 80/20 Rule Visualization
    try {
        log('.. Building Pareto Analysis');
        const comboModel = await app.createSessionObject({
            qInfo: { qType: 'chart' },
            qHyperCubeDef: {
                qDimensions: [{ qDef: { qFieldDefs: ['sub_category'] } }],
                qMeasures: [
                    { qDef: { qDef: 'Sum(profit)' } },
                    { qDef: { qDef: 'Sum(sales)' } }
                ],
                qInterColumnSortOrder: [1, 0], // Sort by Profit Descending
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 3, qHeight: 15 }] // Top 15 Sub-Cats
            }
        });
        const layout = await comboModel.getLayout();
        const rows = layout.qHyperCube.qDataPages[0].qMatrix;

        const el = document.getElementById('chart-combo');
        if (el) {
            if (chartCombo) chartCombo.destroy();
            chartCombo = new Chart(el, {
                type: 'bar',
                data: {
                    labels: rows.map(r => r[0].qText),
                    datasets: [
                        {
                            type: 'line',
                            label: 'Accumulated Sales',
                            data: rows.map(r => r[2].qNum), // Simplified for visual
                            borderColor: '#F59E0B', // Amber
                            borderWidth: 2,
                            yAxisID: 'y1'
                        },
                        {
                            type: 'bar',
                            label: 'Profit Contribution',
                            data: rows.map(r => r[1].qNum),
                            backgroundColor: '#0F172A', // Dark Navy
                            borderRadius: 4,
                            yAxisID: 'y'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                        y: { position: 'left', grid: { display: false } },
                        y1: { position: 'right', grid: { display: false } }, // Dual Axis
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    } catch (e) { console.error("Pareto failed", e); }

    // --- Chart 3: Regional Radar ---
    try {
        log('.. Building Regional Dynamics');
        const radarModel = await app.createSessionObject({
            qInfo: { qType: 'chart' },
            qHyperCubeDef: {
                qDimensions: [{ qDef: { qFieldDefs: ['region'] } }],
                qMeasures: [{ qDef: { qDef: 'Avg(discount)' } }], // Discount Discipline by Region
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 2, qHeight: 10 }]
            }
        });
        const rows = (await radarModel.getLayout()).qHyperCube.qDataPages[0].qMatrix;

        const el = document.getElementById('chart-radar');
        if (el) {
            if (chartRadar) chartRadar.destroy();
            chartRadar = new Chart(el, {
                type: 'radar',
                data: {
                    labels: rows.map(r => r[0].qText),
                    datasets: [{
                        label: 'Avg Discount Given',
                        data: rows.map(r => r[1].qNum * 100), // %
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderColor: '#3B82F6',
                        pointBackgroundColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: { beginAtZero: true }
                    }
                }
            });
        }
    } catch (e) { console.error("Radar failed", e); }

    // CALL NEW UPDATE FUNCTIONS
    if (typeof updateLogisticsCharts === 'function') await updateLogisticsCharts();
    if (typeof updateInventoryCharts === 'function') await updateInventoryCharts();
}

// ----------------------------------------------------
// 3. LOGISTICS TOWER CHARTS (Refactored to Shipping View)
// ----------------------------------------------------
let chartShipMode = null;
let chartShipCost = null;

async function updateLogisticsCharts() {
    try {
        log('.. Generating Shipping Mode Analysis');

        // 1. Ship Mode Pie Chart
        const shipModel = await app.createSessionObject({
            qInfo: { qType: 'chart' },
            qHyperCubeDef: {
                qDimensions: [{ qDef: { qFieldDefs: ['ship_mode'] } }],
                qMeasures: [{ qDef: { qDef: 'Sum(shipping_cost)' } }],
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 2, qHeight: 10 }]
            }
        });
        const rows = (await shipModel.getLayout()).qHyperCube.qDataPages[0].qMatrix;

        const el = document.getElementById('chart-ship-mode');
        if (el) {
            if (chartShipMode) chartShipMode.destroy();
            chartShipMode = new Chart(el, {
                type: 'doughnut',
                data: {
                    labels: rows.map(r => r[0].qText),
                    datasets: [{
                        data: rows.map(r => r[1].qNum),
                        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
            });
        }

        // 2. Shipping Cost Scatter (Sales vs Cost)
        const costModel = await app.createSessionObject({
            qInfo: { qType: 'chart' },
            qHyperCubeDef: {
                qDimensions: [{ qDef: { qFieldDefs: ['customer_name'] } }],
                qMeasures: [
                    { qDef: { qDef: 'Sum(sales)' } },
                    { qDef: { qDef: 'Sum(shipping_cost)' } }
                ],
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 3, qHeight: 100 }]
            }
        });
        const costRows = (await costModel.getLayout()).qHyperCube.qDataPages[0].qMatrix.map(r => ({
            name: r[0].qText,
            x: r[1].qNum, // Sales
            y: r[2].qNum  // Cost
        }));

        const elCost = document.getElementById('chart-ship-cost');
        if (elCost) {
            if (chartShipCost) chartShipCost.destroy();
            chartShipCost = new Chart(elCost, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Cost Efficiency',
                        data: costRows,
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: '#3B82F6'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Sales' } }, y: { title: { display: true, text: 'Shipping Cost' } } } }
            });
        }

    } catch (e) { console.error('Logistic Charts Failed', e); }
}

// ----------------------------------------------------
// 4. PRODUCT CHARTS (Refactored to Inventory/Products View)
// ----------------------------------------------------
let chartProducts = null;

async function updateInventoryCharts() {
    try {
        log('.. Generating Product Analysis');
        const prodModel = await app.createSessionObject({
            qInfo: { qType: 'chart' },
            qHyperCubeDef: {
                qDimensions: [{ qDef: { qFieldDefs: ['category'] } }],
                qMeasures: [
                    { qDef: { qDef: 'Sum(profit)' } },
                    { qDef: { qDef: 'Sum(sales)' } }
                ],
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 3, qHeight: 10 }]
            }
        });
        const rows = (await prodModel.getLayout()).qHyperCube.qDataPages[0].qMatrix;

        const el = document.getElementById('chart-product-bar');
        if (el) {
            if (chartProducts) chartProducts.destroy();
            chartProducts = new Chart(el, {
                type: 'bar',
                data: {
                    labels: rows.map(r => r[0].qText),
                    datasets: [
                        { label: 'Profit', data: rows.map(r => r[1].qNum), backgroundColor: '#10B981' },
                        { label: 'Sales', data: rows.map(r => r[2].qNum), backgroundColor: '#3B82F6', hidden: true }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    } catch (e) { console.error('Product Charts Failed', e); }
}

// Start Application
init();
