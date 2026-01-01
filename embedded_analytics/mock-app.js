/**
 * Mock Qlik Engine for Demo/Offline Mode
 * Simulates the specific API calls used by our dashboard.
 */
class MockApp {
    constructor() {
        this.id = 'MOCK-APP-123';
        console.log('⚠️ RUNNING IN MOCK MODE');
    }

    async getTablesAndKeys() {
        return { tr: [{ qFields: [{ qName: 'Region' }, { qName: 'order_date' }] }] };
    }

    async getField(name) {
        return {
            select: async (val) => console.log(`[MOCK] Selected ${name}: ${val}`)
        };
    }

    async clearAll() {
        console.log('[MOCK] Cleared selections');
    }

    async createSessionObject(def) {
        // Return a mock object with getLayout
        return {
            getLayout: async () => {
                // Determine what type of data to return based on the definition
                const isKPI = def.qInfo.qType === 'kpi';
                const isChart = def.qInfo.qType === 'chart';

                // 1. KPI Logic
                if (isKPI) {
                    const measure = def.qHyperCubeDef.qMeasures[0].qDef.qDef;
                    let val = 0;
                    if (measure.includes('sales')) val = 850000 + Math.random() * 50000;
                    if (measure.includes('delivery')) val = 0.92 + Math.random() * 0.05; // 92%
                    if (measure.includes('Count(order_id)')) val = 1240 + Math.floor(Math.random() * 100);

                    if (measure.includes('delivery')) {
                        // OTIF is usually < 1
                        return this._wrapKPI(val);
                    }
                    return this._wrapKPI(val);
                }

                // 2. Chart Logic
                if (isChart) {
                    const dim = def.qHyperCubeDef.qDimensions[0].qDef.qFieldDefs[0];

                    if (dim.toLowerCase().includes('scatter')) {
                        // Advanced Scatter Data: Sales (x) vs Margin (y) vs Discount (r)
                        // Mocking complex object array for Chart.js
                        const data = [];
                        for (let i = 0; i < 50; i++) {
                            data.push({
                                x: Math.floor(Math.random() * 5000) + 500, // Sales
                                y: (Math.random() * 40 - 10).toFixed(1), // Profit Margin %
                                r: Math.floor(Math.random() * 15) + 5, // Discount/Volume
                                label: `Cust-${i}`
                            });
                        }
                        return this._wrapScatterData(data);
                    }

                    if (dim.toLowerCase().includes('radar')) {
                        // Radar Data: Categories
                        return this._wrapChartData([
                            ['Furniture', 85], ['Office', 92], ['Tech', 78],
                            ['Logistics', 65], ['Marketing', 88]
                        ]);
                    }

                    if (dim.toLowerCase().includes('combo')) {
                        // Combo Data: Date, Sales, Lead Time
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const data = months.map(m => [
                            m,
                            Math.floor(Math.random() * 50000) + 20000, // Bar
                            Math.floor(Math.random() * 5) + 2          // Line
                        ]);
                        return this._wrapChartData(data);
                    }

                    // Default Pareto
                    return this._wrapChartData([
                        ['Prod A', 5000], ['Prod B', 3000], ['Prod C', 1000]
                    ]);
                }
            }
        };
    }

    // Helper to generic Qlik QHyperCube structure for a single number
    _wrapKPI(num) {
        return {
            qHyperCube: {
                qDataPages: [{
                    qMatrix: [[{ qNum: num, qText: num.toFixed(1) }]]
                }]
            }
        };
    }

    // Helper for simple charts
    _wrapChartData(arr) {
        const matrix = arr.map(row => [
            { qText: row[0], qNum: NaN },
            { qText: String(row[1]), qNum: row[1] },
            { qText: String(row[2] || 0), qNum: row[2] || 0 } // Optional 2nd measure
        ]);
        return {
            qHyperCube: {
                qDataPages: [{ qMatrix: matrix }]
            }
        };
    }

    // Helper for scatter data (Simulating Engine payload)
    _wrapScatterData(arr) {
        // We jam the JSON object into qText for the frontend to parse
        // In real Qlik we'd use multiple measures, but for mock this is easier
        const matrix = arr.map(obj => [
            { qText: JSON.stringify(obj), qNum: 0 }
        ]);
        return {
            qHyperCube: {
                qDataPages: [{ qMatrix: matrix }]
            }
        };
    }
}
