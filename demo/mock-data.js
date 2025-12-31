// Mock Supply Chain Data - DataCo Dataset
// This replaces the API calls for the demo version

const mockData = {
    customers: generateCustomers(),
    products: generateProducts(),
    orders: []
};

// Generate mock customers
function generateCustomers() {
    const regions = ['East', 'West', 'Central', 'South'];
    const segments = ['Consumer', 'Corporate', 'Home Office'];
    const states = {
        'East': ['New York', 'Pennsylvania', 'Ohio', 'Michigan'],
        'West': ['California', 'Washington', 'Oregon', 'Nevada'],
        'Central': ['Texas', 'Illinois', 'Minnesota', 'Wisconsin'],
        'South': ['Florida', 'Georgia', 'North Carolina', 'Virginia']
    };

    const customers = [];
    for (let i = 1; i <= 100; i++) {
        const region = regions[Math.floor(Math.random() * regions.length)];
        const state = states[region][Math.floor(Math.random() * states[region].length)];
        customers.push({
            customer_id: i,
            customer_name: `Customer ${i}`,
            segment: segments[Math.floor(Math.random() * segments.length)],
            region: region,
            state: state,
            city: `City ${Math.floor(Math.random() * 50) + 1}`,
            country: 'United States'
        });
    }
    return customers;
}

// Generate mock products
function generateProducts() {
    const categories = {
        'Furniture': ['Chairs', 'Tables', 'Bookcases', 'Furnishings'],
        'Office Supplies': ['Paper', 'Binders', 'Art', 'Appliances', 'Storage'],
        'Technology': ['Phones', 'Accessories', 'Machines', 'Copiers']
    };

    const products = [];
    let id = 1;

    for (const [category, subCategories] of Object.entries(categories)) {
        for (const subCategory of subCategories) {
            for (let i = 0; i < 5; i++) {
                products.push({
                    product_id: id++,
                    product_name: `${subCategory} Product ${i + 1}`,
                    category: category,
                    sub_category: subCategory,
                    unit_price: Math.random() * 500 + 10
                });
            }
        }
    }
    return products;
}

// Generate mock orders
function generateOrders() {
    const shipModes = ['Standard Class', 'Second Class', 'First Class', 'Same Day'];
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    const orders = [];

    const startDate = new Date('2023-01-01');
    const endDate = new Date('2024-12-31');

    for (let i = 1; i <= 250; i++) {
        const orderDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
        const shipDays = Math.floor(Math.random() * 7) + 1;
        const shipDate = new Date(orderDate);
        shipDate.setDate(shipDate.getDate() + shipDays);

        const customer = mockData.customers[Math.floor(Math.random() * mockData.customers.length)];
        const product = mockData.products[Math.floor(Math.random() * mockData.products.length)];
        const quantity = Math.floor(Math.random() * 10) + 1;
        const discount = Math.random() * 0.3;
        const shippingCost = Math.random() * 50 + 5;
        const sales = product.unit_price * quantity;
        const profit = sales * (1 - discount) - shippingCost;

        orders.push({
            order_id: i,
            order_date: orderDate.toISOString().split('T')[0],
            ship_date: shipDate.toISOString().split('T')[0],
            ship_mode: shipModes[Math.floor(Math.random() * shipModes.length)],
            customer_id: customer.customer_id,
            customer_name: customer.customer_name,
            segment: customer.segment,
            region: customer.region,
            state: customer.state,
            city: customer.city,
            country: customer.country,
            product_id: product.product_id,
            product_name: product.product_name,
            category: product.category,
            sub_category: product.sub_category,
            unit_price: product.unit_price,
            quantity: quantity,
            discount: discount,
            shipping_cost: shippingCost,
            sales: sales,
            profit: profit,
            delivery_days: shipDays,
            order_priority: priorities[Math.floor(Math.random() * priorities.length)]
        });
    }

    return orders;
}

// Initialize mock data
mockData.orders = generateOrders();

// Mock API functions
const MockAPI = {
    getOrders: function (filters = {}) {
        let orders = [...mockData.orders];

        if (filters.region) {
            orders = orders.filter(o => o.region === filters.region);
        }
        if (filters.category) {
            orders = orders.filter(o => o.category === filters.category);
        }
        if (filters.ship_mode) {
            orders = orders.filter(o => o.ship_mode === filters.ship_mode);
        }
        if (filters.start_date) {
            orders = orders.filter(o => o.order_date >= filters.start_date);
        }
        if (filters.end_date) {
            orders = orders.filter(o => o.order_date <= filters.end_date);
        }

        return orders;
    },

    getKPIs: function (filters = {}) {
        const orders = this.getOrders(filters);

        const totalRevenue = orders.reduce((sum, o) => sum + o.sales, 0);
        const totalProfit = orders.reduce((sum, o) => sum + o.profit, 0);
        const totalOrders = orders.length;
        const avgDeliveryDays = orders.reduce((sum, o) => sum + o.delivery_days, 0) / orders.length || 0;
        const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0);
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;

        return {
            total_revenue: totalRevenue,
            total_profit: totalProfit,
            total_orders: totalOrders,
            avg_delivery_days: avgDeliveryDays,
            total_quantity: totalQuantity,
            profit_margin: profitMargin.toFixed(2)
        };
    },

    getSalesTrend: function (filters = {}) {
        const orders = this.getOrders(filters);
        const monthlyData = {};

        orders.forEach(order => {
            const month = order.order_date.substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { month, total_sales: 0, total_profit: 0 };
            }
            monthlyData[month].total_sales += order.sales;
            monthlyData[month].total_profit += order.profit;
        });

        return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    },

    getShippingModes: function (filters = {}) {
        const orders = this.getOrders(filters);
        const modeData = {};

        orders.forEach(order => {
            if (!modeData[order.ship_mode]) {
                modeData[order.ship_mode] = { ship_mode: order.ship_mode, order_count: 0, total_sales: 0 };
            }
            modeData[order.ship_mode].order_count++;
            modeData[order.ship_mode].total_sales += order.sales;
        });

        return Object.values(modeData).sort((a, b) => b.total_sales - a.total_sales);
    },

    getCategories: function (filters = {}) {
        const orders = this.getOrders(filters);
        const categoryData = {};

        orders.forEach(order => {
            if (!categoryData[order.category]) {
                categoryData[order.category] = { category: order.category, order_count: 0, total_sales: 0, total_profit: 0 };
            }
            categoryData[order.category].order_count++;
            categoryData[order.category].total_sales += order.sales;
            categoryData[order.category].total_profit += order.profit;
        });

        return Object.values(categoryData).sort((a, b) => b.total_sales - a.total_sales);
    },

    getRegions: function (filters = {}) {
        const orders = this.getOrders(filters);
        const regionData = {};

        orders.forEach(order => {
            if (!regionData[order.region]) {
                regionData[order.region] = { region: order.region, order_count: 0, total_sales: 0, total_profit: 0 };
            }
            regionData[order.region].order_count++;
            regionData[order.region].total_sales += order.sales;
            regionData[order.region].total_profit += order.profit;
        });

        return Object.values(regionData).sort((a, b) => b.total_sales - a.total_sales);
    },

    getFilterOptions: function () {
        const regions = [...new Set(mockData.customers.map(c => c.region))].sort();
        const categories = [...new Set(mockData.products.map(p => p.category))].sort();
        const shipModes = ['Standard Class', 'Second Class', 'First Class', 'Same Day'];

        return {
            regions,
            categories,
            ship_modes: shipModes
        };
    }
};
