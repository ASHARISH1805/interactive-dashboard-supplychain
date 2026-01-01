// Initialize Application
let useMock = false;

async function init() {
    try {
        updateStatus('connecting');
        log('🚀 Connecting to Qlik Cloud...');
        await connectToQlik();
        updateStatus('connected');
        log('🔄 Connected! Starting Analysis...');

        // Set Default View
        switchView('desc');

        // Bind 8-Pillar Navigation
        const pages = ['desc', 'diag', 'supply', 'cust', 'prod', 'geo', 'pred', 'pres'];
        pages.forEach(p => {
            const btn = document.getElementById('nav-' + p);
            if (btn) btn.addEventListener('click', () => switchView(p));
        });

        // Bind Filters
        const bindFilter = (id, field, val) => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => {
                log(`🖱️ Filter: ${field}=${val}`);
                updateSelectionBar(field, val);
                setTimeout(() => switchView(currentView), 500); // Refresh current view
            });
        };

        bindFilter('btn-west', 'Region', 'West');
        bindFilter('btn-east', 'Region', 'East');

        const btnClear = document.getElementById('btn-clear');
        if (btnClear) btnClear.addEventListener('click', async () => {
            await app.clearAll();
            setTimeout(() => switchView(currentView), 500);
        });

    } catch (err) {
        log('❌ CONNECTION FATAL ERROR: ' + err.message);
        updateStatus('error');
    }
}

let currentView = 'desc';

// --- VIEW SWITCHING LOGIC ---
async function switchView(viewName) {
    currentView = viewName;

    // 1. Update UI Buttons
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    const activeBtn = document.getElementById('nav-' + viewName);
    if (activeBtn) activeBtn.classList.add('active');

    // 2. Hide All Views
    const views = ['view-desc', 'view-diag', 'view-supply', 'view-cust', 'view-prod', 'view-geo', 'view-pred', 'view-pres'];
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.style.display = 'none';
    });

    // 3. Show Selected & Load Data
    const target = document.getElementById('view-' + viewName);
    if (target) target.style.display = 'block';

    log(`📂 Loading View: ${viewName.toUpperCase()}...`);

    // 4. Trigger Specific Data Load
    if (viewName === 'desc') await updateDescriptive();
    if (viewName === 'diag') await updateDiagnostic();
    if (viewName === 'supply') await updateSupplyChain();
    if (viewName === 'cust') await updateCustomer();
    if (viewName === 'prod') await updateProduct();
    if (viewName === 'geo') await updateGeographic();
    if (viewName === 'pred') await updatePredictive();
    // Prescriptive is static text, so no data fetch needed
}

// ----------------------------------------------------
// 1. DESCRIPTIVE ANALYTICS
// ----------------------------------------------------
async function updateDescriptive() {
    await updateKPIs(); // Reused KPI logic (Revenue, Margin, Delivery, Discount)

    // Monthly Sales Trend
    await createLineChart('chart-trend', 'order_date.autoCalendar.Month', 'Sum(sales)', 'Monthly Sales Trend', '#2563eb');
}

// ----------------------------------------------------
// 2. DIAGNOSTIC ANALYTICS
// ----------------------------------------------------
async function updateDiagnostic() {
    // 1. Whale Curve (Profit vs Sales)
    await createScatterChart('chart-scatter', 'customer_name', 'Sum(sales)', 'Sum(profit)', 'Customer Profit vs Sales');

    // 2. Discount Radar
    await createRadarChart('chart-radar', 'region', 'Avg(discount)', 'Avg Discount by Region');
}

// ----------------------------------------------------
// 3. SUPPLY CHAIN ANALYTICS
// ----------------------------------------------------
async function updateSupplyChain() {
    // Delivery Efficiency
    await createBarChart('chart-ship-time', 'ship_mode', 'Avg(delivery_days)', 'Avg Delivery Days', '#ea580c');

    // Logistics Cost
    await createBarChart('chart-ship-cost', 'ship_mode', 'Avg(shipping_cost)', 'Avg Shipping Cost', '#64748b');
}

// ----------------------------------------------------
// 4. CUSTOMER ANALYTICS
// ----------------------------------------------------
async function updateCustomer() {
    // Customer Clusters (Uses Scatter Logic)
    await createScatterChart('chart-scatter-2', 'segment', 'Sum(sales)', 'Sum(profit)', 'Segment Profitability');
}

// ----------------------------------------------------
// 5. PRODUCT ANALYTICS
// ----------------------------------------------------
async function updateProduct() {
    // Pareto Combo Chart
    await createComboChart('chart-combo', 'sub_category', 'Sum(sales)', 'Sum(profit)');
}

// ----------------------------------------------------
// 6. GEOGRAPHIC ANALYTICS
// ----------------------------------------------------
async function updateGeographic() {
    // Regional Bar
    await createBarChart('chart-region', 'region', 'Sum(sales)', 'Regional Sales ($)', '#d97706');
}

// ----------------------------------------------------
// 7. PREDICTIVE ANALYTICS
// ----------------------------------------------------
async function updatePredictive() {
    // Forecast Line (Quantity Trend)
    await createLineChart('chart-forecast-2', 'order_date.autoCalendar.Month', 'Sum(quantity)', 'Quantity Forecast', '#0284c7');
}

// ====================================================
// GENERIC CHART HELPERS (To reduce code duplication)
// ====================================================

// Helper: KPIs
async function updateKPIs() {
    try {
        const kpiModel = await app.createSessionObject({
            qInfo: { qType: 'kpi-group' },
            qHyperCubeDef: {
                qMeasures: [
                    { qDef: { qDef: 'Sum(sales)', qLabel: 'Revenue' } },
                    { qDef: { qDef: 'Sum(profit)/Sum(sales)', qLabel: 'Margin' } },
                    { qDef: { qDef: 'Avg(delivery_days)', qLabel: 'Delivery' } },
                    { qDef: { qDef: 'Avg(discount)', qLabel: 'Discount' } }
                ],
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 4, qHeight: 1 }]
            }
        });
        const d = (await kpiModel.getLayout()).qHyperCube.qDataPages[0].qMatrix[0];
        if (d) {
            document.getElementById('kpi-sales').innerText = '$' + (d[0].qNum / 1000).toFixed(1) + 'k';
            document.getElementById('kpi-margin').innerText = (d[1].qNum * 100).toFixed(1) + '%';
            document.getElementById('kpi-otif').innerText = d[2].qNum.toFixed(1) + ' Days';
            document.getElementById('kpi-orders').innerText = (d[3].qNum * 100).toFixed(1) + '%';
        }
    } catch (e) { log('KPI Error: ' + e.message); }
}

// Helper: Bar Chart
async function createBarChart(canvasId, dim, meas, label, color) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    try {
        const model = await app.createSessionObject({
            qInfo: { qType: 'chart' },
            qHyperCubeDef: {
                qDimensions: [{ qDef: { qFieldDefs: [dim] } }],
                qMeasures: [{ qDef: { qDef: meas } }],
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 2, qHeight: 20 }]
            }
        });
        const data = (await model.getLayout()).qHyperCube.qDataPages[0].qMatrix;

        // Destroy old if exists
        const existing = Chart.getChart(el);
        if (existing) existing.destroy();

        new Chart(el, {
            type: 'bar',
            data: {
                labels: data.map(r => r[0].qText),
                datasets: [{ label: label, data: data.map(r => r[1].qNum), backgroundColor: color, borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    } catch (e) { console.error(canvasId, e); }
}

// Helper: Line Chart
async function createLineChart(canvasId, dim, meas, label, color) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    try {
        const model = await app.createSessionObject({
            qInfo: { qType: 'chart' },
            qHyperCubeDef: {
                qDimensions: [{ qDef: { qFieldDefs: [dim], qSortCriterias: [{ qSortByNumeric: 1 }] } }], // Sort by time
                qMeasures: [{ qDef: { qDef: meas } }],
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 2, qHeight: 50 }]
            }
        });
        const data = (await model.getLayout()).qHyperCube.qDataPages[0].qMatrix;
        const existing = Chart.getChart(el);
        if (existing) existing.destroy();

        new Chart(el, {
            type: 'line',
            data: {
                labels: data.map(r => r[0].qText),
                datasets: [{
                    label: label,
                    data: data.map(r => r[1].qNum),
                    borderColor: color,
                    backgroundColor: color + '20', // Transparent fill
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } catch (e) { console.error(canvasId, e); }
}

// Helper: Scatter Bubble
async function createScatterChart(canvasId, dim, measX, measY, title) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    try {
        const model = await app.createSessionObject({
            qInfo: { qType: 'chart' },
            qHyperCubeDef: {
                qDimensions: [{ qDef: { qFieldDefs: [dim] } }],
                qMeasures: [{ qDef: { qDef: measX } }, { qDef: { qDef: measY } }],
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 3, qHeight: 100 }]
            }
        });
        const data = (await model.getLayout()).qHyperCube.qDataPages[0].qMatrix;
        const scatterData = data.map(r => ({ x: r[1].qNum, y: r[2].qNum, name: r[0].qText }));

        const existing = Chart.getChart(el);
        if (existing) existing.destroy();

        new Chart(el, {
            type: 'bubble',
            data: {
                datasets: [{
                    label: title,
                    data: scatterData,
                    backgroundColor: scatterData.map(d => d.y < 0 ? '#ef4444' : '#10b981'), // Red if negative
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw.name}: (${Math.round(c.raw.x)}, ${Math.round(c.raw.y)})` } } }
            }
        });
    } catch (e) { console.error(canvasId, e); }
}

// Helper: Radar Chart
async function createRadarChart(canvasId, dim, meas, label) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    try {
        const model = await app.createSessionObject({
            qInfo: { qType: 'chart' },
            qHyperCubeDef: {
                qDimensions: [{ qDef: { qFieldDefs: [dim] } }],
                qMeasures: [{ qDef: { qDef: meas } }],
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 2, qHeight: 20 }]
            }
        });
        const data = (await model.getLayout()).qHyperCube.qDataPages[0].qMatrix;
        const existing = Chart.getChart(el);
        if (existing) existing.destroy();

        new Chart(el, {
            type: 'radar',
            data: {
                labels: data.map(r => r[0].qText),
                datasets: [{ label: label, data: data.map(r => r[1].qNum), backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6' }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } catch (e) { console.error(canvasId, e); }
}

// Helper: Combo Chart (Pareto) - Special Logic
async function createComboChart(canvasId, dim, measBar, measLine) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    try {
        const model = await app.createSessionObject({
            qInfo: { qType: 'chart' },
            qHyperCubeDef: {
                qDimensions: [{ qDef: { qFieldDefs: [dim] } }],
                qMeasures: [{ qDef: { qDef: measBar } }, { qDef: { qDef: measLine } }],
                qInterColumnSortOrder: [1, 0], // Sort by Bar desc
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 3, qHeight: 20 }]
            }
        });
        const data = (await model.getLayout()).qHyperCube.qDataPages[0].qMatrix;
        const existing = Chart.getChart(el);
        if (existing) existing.destroy();

        new Chart(el, {
            type: 'bar',
            data: {
                labels: data.map(r => r[0].qText),
                datasets: [
                    { type: 'line', label: 'Profit', data: data.map(r => r[2].qNum), borderColor: '#f59e0b', yAxisID: 'y1' },
                    { type: 'bar', label: 'Sales', data: data.map(r => r[1].qNum), backgroundColor: '#1e293b', yAxisID: 'y' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { position: 'left' }, y1: { position: 'right', grid: { display: false } } }
            }
        });
    } catch (e) { console.error(canvasId, e); }
}

// Selection Helper
async function updateSelectionBar(fieldName, value) {
    try {
        const field = await app.getField(fieldName);
        await field.select(value, false, true);
    } catch (e) { log('Selection Error: ' + e.message); }
}

function updateStatus(state) {
    const dot = document.getElementById('dot-status');
    const txt = document.getElementById('txt-status');
    if (!dot) return;
    if (state === 'connected') { dot.className = 'dot ok'; txt.innerText = 'Connected'; }
    else if (state === 'error') { dot.className = 'dot'; dot.style.backgroundColor = 'red'; txt.innerText = 'Error'; }
}

// Simple Logger
function log(msg) {
    console.log(msg);
    // UI Log logic is often handled in connect.js, but if we need it here:
    const el = document.getElementById('ui-log');
    if (el) { el.innerHTML += `> ${msg}<br>`; el.scrollTop = el.scrollHeight; }
}
