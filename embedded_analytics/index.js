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
        'nav-intro': 'view-intro',
        'nav-ai': 'view-ai',
        'nav-data': 'view-data', // Added Data View
        'nav-overview': 'view-overview',
        'nav-sales': 'view-sales',
        'nav-shipping': 'view-shipping',
        'nav-products': 'view-products',
        'nav-settings': 'view-settings'
    };

    // Map Nav IDs to Titles for Dynamic Header
    const titles = {
        'nav-intro': 'Project Architecture|Dataset Specifications & Analytical Strategy',
        'nav-ai': 'AI Analyst|Natural Language Query Engine',
        'nav-data': 'Dataset Explorer|Raw Transactional Data & Filters',
        'nav-overview': 'Overview|Supply Chain Key Performance Indicators',
        'nav-sales': 'Sales Analysis|Revenue Trends & Customer Profitability',
        'nav-shipping': 'Logistics Tower|Carrier Costs & Delivery Performance',
        'nav-products': 'Product Intelligence|Category Performance & Stock Levels',
        'nav-settings': 'System Settings|Configure Dashboard Preferences'
    };

    // ... (Existing Loop)

    // Auto Load Data when View Switched
    document.getElementById('nav-data').addEventListener('click', () => {
        updateDataView(document.getElementById('data-limit').value);
    });

    // ... (Existing Event Listeners)

    // ----------------------------------------------------
    // DATASET EXPLORER LOGIC
    // ----------------------------------------------------
    let dataModel = null;
    let currentSortField = 'Row ID'; // Default logic name (mapped later)
    let currentSortOrder = 1;
    let cachedFieldMap = null;

    // Exposed Sort Function
    window.sortData = function (field) {
        log(`🔹 Sorting by ${field}...`);
        if (currentSortField === field) {
            currentSortOrder *= -1;
        } else {
            currentSortField = field;
            currentSortOrder = 1;
        }
        updateDataView(document.getElementById('data-limit').value);
    };

    async function resolveFields() {
        if (cachedFieldMap) return cachedFieldMap;
        try {
            const tables = await app.getTablesAndKeys({}, {}, 0, true, false);
            // If API fails or returns no tables, we return null to trigger fallback
            if (!tables || !tables.tr || tables.tr.length === 0) {
                console.warn("Smart Resolve: No tables found. Using Fallback.");
                return null;
            }

            const available = tables.tr.flatMap(t => t.qFields.map(f => f.qName));

            // Map Logical Name -> Actual Field Name (Case Insensitive Match)
            const targets = [
                'Row ID', 'Order ID', 'Order Date', 'Ship Date', 'Ship Mode',
                'Customer ID', 'Customer Name', 'Segment', 'Country', 'City',
                'State', 'Postal Code', 'Region', 'Product ID', 'Category',
                'Sub-Category', 'Product Name', 'Sales', 'Quantity', 'Discount', 'Profit', 'Shipping Cost'
            ];

            const map = {};
            targets.forEach(t => {
                // Try 1: Exact Match
                let found = available.find(a => a === t);
                // Try 2: Snake Case (row_id matching Row ID)
                if (!found) found = available.find(a => a.toLowerCase() === t.toLowerCase().replace(/ /g, '_'));
                // Try 3: No Space (RowID matching Row ID)
                if (!found) found = available.find(a => a.toLowerCase() === t.toLowerCase().replace(/ /g, ''));
                // Try 4: Lowercase match
                if (!found) found = available.find(a => a.toLowerCase() === t.toLowerCase());

                map[t] = found || null;
            });

            cachedFieldMap = map;
            log('✅ Fields Resolved: ' + Object.keys(map).length);
            return map;
        } catch (e) {
            console.error("Field Resolution Failed", e);
            return null;
        }
    }

    async function updateDataView(limit) {
        if (!app) return;
        limit = parseInt(limit) || 100;

        const tbody = document.getElementById('data-table-body');
        tbody.innerHTML = '<tr><td colspan="21" style="text-align:center; padding:20px; color:#aaa;">Fetching Records...</td></tr>';

        try {
            let fieldMap = await resolveFields();

            // FALLBACK MECHANISM: If Auto-Detect fails, use 'Title Case' (Superstore Standard)
            if (!fieldMap) {
                log("⚠️ Smart Resolve failed. Using 'Title Case' defaults.");
                fieldMap = {
                    'Row ID': 'Row ID', 'Order ID': 'Order ID', 'Order Date': 'Order Date',
                    'Ship Date': 'Ship Date', 'Ship Mode': 'Ship Mode', 'Customer ID': 'Customer ID',
                    'Customer Name': 'Customer Name', 'Segment': 'Segment', 'Country': 'Country',
                    'City': 'City', 'State': 'State', 'Postal Code': 'Postal Code',
                    'Region': 'Region', 'Product ID': 'Product ID', 'Category': 'Category',
                    'Sub-Category': 'Sub-Category', 'Product Name': 'Product Name',
                    'Sales': 'Sales', 'Quantity': 'Quantity', 'Discount': 'Discount', 'Profit': 'Profit', 'Shipping Cost': 'Shipping Cost'
                };
            }

            log(`💾 Fetching Top ${limit} Rows (Sorted by ${currentSortField})...`);

            const getFD = (logicalName) => {
                let actual = fieldMap[logicalName];
                // Extra fallback if a specific KEY is missing from map
                if (!actual) actual = logicalName.toLowerCase().replace(/ /g, '_');
                return { qFieldDefs: [actual] };
            };

            const getM = (logicalName, agg) => {
                let actual = fieldMap[logicalName];
                if (!actual) actual = logicalName.toLowerCase();
                return `${agg}([${actual}])`;
            };

            // Dimension Defs (0-16)
            const dNames = [
                'Row ID', 'Order ID', 'Order Date', 'Ship Date', 'Ship Mode',
                'Customer ID', 'Customer Name', 'Segment', 'Country', 'City',
                'State', 'Postal Code', 'Region', 'Product ID', 'Category', 'Sub-Category', 'Product Name'
            ];
            const dDefs = dNames.map(name => ({ qDef: getFD(name) }));

            // Measure Defs (17-20)
            const mDefs = [
                { qDef: { qDef: getM('Sales', 'Sum'), qLabel: 'Sales' } },
                { qDef: { qDef: getM('Quantity', 'Sum'), qLabel: 'Quantity' } },
                { qDef: { qDef: getM('Discount', 'Avg'), qLabel: 'Discount' } },
                { qDef: { qDef: getM('Profit', 'Sum'), qLabel: 'Profit' } }
            ];

            const allCols = [...dNames, 'Sales', 'Quantity', 'Discount', 'Profit'];
            const sortIdx = allCols.indexOf(currentSortField);

            // Apply Sort
            if (sortIdx !== -1) {
                if (sortIdx < 17) {
                    dDefs[sortIdx].qDef.qSortCriterias = [{
                        qSortByAscii: currentSortOrder,
                        qSortByNumeric: currentSortOrder,
                        qSortByLoadOrder: 0 // FIXED: Must be 0 to allow interactive sort
                    }];
                } else {
                    mDefs[sortIdx - 17].qSortBy = {
                        qSortByNumeric: currentSortOrder,
                        qSortByLoadOrder: 0 // FIXED: Must be 0
                    };
                }
            }

            // Create Table HyperCube
            if (dataModel) app.destroySessionObject(dataModel.id);
            dataModel = await app.createSessionObject({
                qInfo: { qType: 'table' },
                qHyperCubeDef: {
                    qDimensions: dDefs,
                    qMeasures: mDefs,
                    qInterColumnSortOrder: [sortIdx >= 0 ? sortIdx : 0],
                    qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 21, qHeight: limit }]
                }
            });

            const layout = await dataModel.getLayout();
            const rows = layout.qHyperCube.qDataPages[0].qMatrix;

            if (rows.length > 0) {
                if (rows[0].length < 21) log(`⚠️ Warning: Only received ${rows[0].length} columns out of 21.`);
            }

            let html = '';
            rows.forEach(r => {
                if (!r) return;
                const profitCell = r[20];
                const profit = profitCell ? profitCell.qNum : 0;
                const profitColor = profit < 0 ? '#D13438' : '#009845';

                html += `<tr style="border-bottom:1px solid #eee; white-space:nowrap;">`;
                for (let i = 0; i <= 16; i++) {
                    const cell = r[i];
                    html += `<td style="padding:8px;">${(cell && cell.qText) ? cell.qText : '-'}</td>`;
                }
                html += `<td style="padding:8px; text-align:right;">${r[17] ? r[17].qText : '-'}</td>`;
                html += `<td style="padding:8px; text-align:right;">${r[18] ? r[18].qText : '-'}</td>`;
                const discVal = r[19] ? r[19].qNum : 0;
                html += `<td style="padding:8px; text-align:center;">${(discVal * 100).toFixed(0)}%</td>`;
                html += `<td style="padding:8px; text-align:right; color:${profitColor}; font-weight:bold;">${r[20] ? r[20].qText : '-'}</td>`;
                html += `</tr>`;
            });

            tbody.innerHTML = html;

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="21" style="text-align:center; color:red;">Error: ${e.message}</td></tr>`;
            console.error(e);
        }
    }

    // AI BUTTON LISTENER
    const btnAsk = document.getElementById('btn-ask-ai');
    if (btnAsk) {
        btnAsk.addEventListener('click', () => {
            const val = document.getElementById('ai-input').value;
            if (val) handleAIQuery(val);
        });
    }

    // Expose helper for pills
    window.setAsk = function (txt) {
        const inp = document.getElementById('ai-input');
        if (inp) {
            inp.value = txt;
            handleAIQuery(txt);
        }
    };

    // VOICE RECOGNITION
    window.startVoice = function () {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Voice not supported in this browser. Try Chrome/Edge.');
            return;
        }

        const micBtn = document.getElementById('btn-mic');
        micBtn.classList.add('listening');

        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript;
            log(`🎙️ Voice Command: "${transcript}"`);

            const inp = document.getElementById('ai-input');
            inp.value = transcript;

            // Auto Submit
            handleAIQuery(transcript);
        };

        recognition.onspeechend = function () {
            recognition.stop();
            micBtn.classList.remove('listening');
        };

        recognition.onerror = function (event) {
            console.error('Voice Error', event.error);
            micBtn.classList.remove('listening');
        };

        recognition.start();
    };

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

    // Brand Click -> Go to Intro
    const brand = document.getElementById('brand-logo');
    if (brand) {
        brand.addEventListener('click', () => {
            const introBtn = document.getElementById('nav-intro');
            if (introBtn) introBtn.click();
        });
    }

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
// 1. KPI LOADER
// ----------------------------------------------------
async function updateKPIs() {
    log('📊 Fetching Executive KPIs...');

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
        const rev = data[0].qNum;
        document.getElementById('kpi-sales').innerText = '$' + (rev / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'k';

        const margin = data[1].qNum * 100;
        document.getElementById('kpi-margin').innerText = margin.toFixed(1) + '%';
        const marginBadge = document.querySelector('#kpi-margin').nextElementSibling.querySelector('.trend-badge');
        if (marginBadge) {
            marginBadge.className = margin > 20 ? 'trend-badge up' : 'trend-badge down';
            marginBadge.innerText = margin > 20 ? '▲ Healthy' : '▼ Low';
        }

        const logCost = data[3].qNum * 100;
        document.getElementById('kpi-otif').innerText = logCost.toFixed(1) + '%';

        const discount = data[2].qNum * 100;
        document.getElementById('kpi-orders').innerText = discount.toFixed(1) + '%';
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
                        backgroundColor: scatterData.map(d => d.y < 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.6)'),
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
                qInterColumnSortOrder: [1, 0], // Sort by Profit
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 3, qHeight: 15 }]
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
                            data: rows.map(r => r[2].qNum),
                            borderColor: '#F59E0B',
                            borderWidth: 2,
                            yAxisID: 'y1'
                        },
                        {
                            type: 'bar',
                            label: 'Profit Contribution',
                            data: rows.map(r => r[1].qNum),
                            backgroundColor: '#0F172A',
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
                qMeasures: [{ qDef: { qDef: 'Avg(discount)' } }],
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
                        data: rows.map(r => r[1].qNum * 100),
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

    if (typeof updateLogisticsCharts === 'function') await updateLogisticsCharts();
    if (typeof updateInventoryCharts === 'function') await updateInventoryCharts();
}

// ----------------------------------------------------
// 3. LOGISTICS TOWER CHARTS
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
            x: r[1].qNum,
            y: r[2].qNum
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
// 4. PRODUCT CHARTS
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

// ----------------------------------------------------
// AI QUERY ENGINE (Helper)
// ----------------------------------------------------
async function handleAIQuery(text) {
    const loading = document.getElementById('ai-loading');
    const resultCard = document.getElementById('ai-result-card');
    const titleEl = document.getElementById('ai-chart-title');

    // UI Loading State
    loading.style.display = 'block';
    resultCard.style.display = 'none';

    // 1. PARSE INTENT (Simple Keyword Matching)
    text = text.toLowerCase();

    // Detect Measure
    let qMeasure = { qDef: 'Sum(sales)', label: 'Sales' };
    if (text.includes('profit')) qMeasure = { qDef: 'Sum(profit)', label: 'Profit' };
    else if (text.includes('discount')) qMeasure = { qDef: 'Avg(discount)', label: 'Avg Discount' };
    else if (text.includes('shipping') || text.includes('cost')) qMeasure = { qDef: 'Sum(shipping_cost)', label: 'Shipping Cost' };
    else if (text.includes('quantity')) qMeasure = { qDef: 'Sum(quantity)', label: 'Quantity' };

    // Detect Dimension
    let qDim = { qField: 'region', label: 'Region' };
    if (text.includes('category')) qDim = { qField: 'category', label: 'Category' };
    else if (text.includes('segment')) qDim = { qField: 'segment', label: 'Segment' };
    else if (text.includes('ship mode') || text.includes('mode')) qDim = { qField: 'ship_mode', label: 'Ship Mode' };
    else if (text.includes('customer')) qDim = { qField: 'customer_name', label: 'Customer' };
    else if (text.includes('state')) qDim = { qField: 'state', label: 'State' };

    log(`🤖 AI Interpreted: ${qMeasure.label} by ${qDim.label}`);
    titleEl.innerText = `Generated Analysis: ${qMeasure.label} by ${qDim.label}`;

    // 2. GENERATE HYPERCUBE
    try {
        const aiModel = await app.createSessionObject({
            qInfo: { qType: 'chart' },
            qHyperCubeDef: {
                qDimensions: [{ qDef: { qFieldDefs: [qDim.qField] } }],
                qMeasures: [{ qDef: { qDef: qMeasure.qDef } }],
                qInitialDataFetch: [{ qTop: 0, qLeft: 0, qWidth: 2, qHeight: 50 }]
            }
        });

        const layout = await aiModel.getLayout();
        const data = layout.qHyperCube.qDataPages[0].qMatrix.map(r => ({
            label: r[0].qText,
            value: r[1].qNum
        }));

        // 3. RENDER CHART
        loading.style.display = 'none';
        resultCard.style.display = 'block';

        const ctx = document.getElementById('chart-ai');
        // chartAI global var expected
        // We will assume chartAI is accessible or we should look it up
        if (typeof chartAI !== 'undefined' && chartAI) chartAI.destroy();
        else {
            // Try to destroy existing if valid context
            const checkChart = Chart.getChart(ctx);
            if (checkChart) checkChart.destroy();
        }

        // Let's use a simplistic recreation.
        new Chart(ctx, {
            type: 'bar', // Dynamic capability possible, but Bar is safest for aggregation
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    label: qMeasure.label,
                    data: data.map(d => d.value),
                    backgroundColor: '#009845',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                    x: { grid: { display: false } }
                }
            }
        });

    } catch (e) {
        log('❌ AI Generation Failed: ' + e.message);
        loading.style.display = 'none';
    }
}

// Start Application
init();
