const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

// PostgreSQL configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'supply_chain_db',
    port: process.env.DB_PORT || 5432
});

// Sample data generators
const regions = ['East', 'West', 'Central', 'South'];
const segments = ['Consumer', 'Corporate', 'Home Office'];
const categories = ['Furniture', 'Office Supplies', 'Technology'];
const subCategories = {
    'Furniture': ['Chairs', 'Tables', 'Bookcases', 'Furnishings'],
    'Office Supplies': ['Paper', 'Binders', 'Art', 'Appliances', 'Storage'],
    'Technology': ['Phones', 'Accessories', 'Machines', 'Copiers']
};
const shipModes = ['Standard Class', 'Second Class', 'First Class', 'Same Day'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const warehouses = ['Warehouse A', 'Warehouse B', 'Warehouse C', 'Warehouse D'];

const states = {
    'East': ['New York', 'Pennsylvania', 'Ohio', 'Michigan'],
    'West': ['California', 'Washington', 'Oregon', 'Nevada'],
    'Central': ['Texas', 'Illinois', 'Minnesota', 'Wisconsin'],
    'South': ['Florida', 'Georgia', 'North Carolina', 'Virginia']
};

// Generate random data
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateCustomers(count) {
    const customers = [];
    const companyPrefixes = ['Tech', 'Global', 'Premier', 'Superior', 'Elite', 'Mega', 'Prime', 'Advanced', 'Innovative', 'Dynamic'];
    const companySuffixes = ['Corp', 'Industries', 'Solutions', 'Enterprises', 'Group', 'Systems', 'Holdings', 'Partners', 'Services', 'Co'];

    for (let i = 1; i <= count; i++) {
        const region = randomElement(regions);
        const state = randomElement(states[region]);
        const prefix = randomElement(companyPrefixes);
        const suffix = randomElement(companySuffixes);

        customers.push({
            customer_name: `${prefix} ${suffix} ${i}`,
            segment: randomElement(segments),
            country: 'United States',
            city: `City ${Math.floor(Math.random() * 50)}`,
            state: state,
            postal_code: String(10000 + Math.floor(Math.random() * 89999)),
            region: region
        });
    }
    return customers;
}

function generateProducts(count) {
    const products = [];
    for (let i = 1; i <= count; i++) {
        const category = randomElement(categories);
        const subCategory = randomElement(subCategories[category]);
        products.push({
            product_name: `${subCategory} Product ${i}`,
            category: category,
            sub_category: subCategory,
            unit_price: (Math.random() * 500 + 10).toFixed(2)
        });
    }
    return products;
}

function generateOrders(count, customerCount, productCount) {
    const orders = [];
    const startDate = new Date('2023-01-01');
    const endDate = new Date('2024-12-31');

    for (let i = 1; i <= count; i++) {
        const orderDate = randomDate(startDate, endDate);
        const shipDays = Math.floor(Math.random() * 7) + 1;
        const shipDate = new Date(orderDate);
        shipDate.setDate(shipDate.getDate() + shipDays);

        orders.push({
            order_date: orderDate.toISOString().split('T')[0],
            ship_date: shipDate.toISOString().split('T')[0],
            ship_mode: randomElement(shipModes),
            customer_id: Math.floor(Math.random() * customerCount) + 1,
            product_id: Math.floor(Math.random() * productCount) + 1,
            quantity: Math.floor(Math.random() * 10) + 1,
            discount: (Math.random() * 0.3).toFixed(2),
            shipping_cost: (Math.random() * 50 + 5).toFixed(2),
            order_priority: randomElement(priorities),
            warehouse: randomElement(warehouses)
        });
    }
    return orders;
}

async function seedDatabase() {
    const client = await pool.connect();

    try {
        console.log('Connected to PostgreSQL...');

        console.log('Reading schema file...');
        const schema = fs.readFileSync(__dirname + '/schema.sql', 'utf8');

        console.log('Creating tables...');
        await client.query(schema);

        console.log('Generating sample data...');
        const customers = generateCustomers(100);
        const products = generateProducts(80);
        const orders = generateOrders(500, 100, 80);

        console.log('Inserting customers...');
        for (const customer of customers) {
            await client.query(
                'INSERT INTO customers (customer_name, segment, country, city, state, postal_code, region) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [customer.customer_name, customer.segment, customer.country, customer.city, customer.state, customer.postal_code, customer.region]
            );
        }

        console.log('Inserting products...');
        for (const product of products) {
            await client.query(
                'INSERT INTO products (product_name, category, sub_category, unit_price) VALUES ($1, $2, $3, $4)',
                [product.product_name, product.category, product.sub_category, product.unit_price]
            );
        }

        console.log('Inserting orders...');
        for (const order of orders) {
            await client.query(
                'INSERT INTO orders (order_date, ship_date, ship_mode, customer_id, product_id, quantity, discount, shipping_cost, order_priority, warehouse) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                [order.order_date, order.ship_date, order.ship_mode, order.customer_id, order.product_id, order.quantity, order.discount, order.shipping_cost, order.order_priority, order.warehouse]
            );
        }

        console.log('✅ Database seeded successfully!');
        console.log(`   - ${customers.length} customers`);
        console.log(`   - ${products.length} products`);
        console.log(`   - ${orders.length} orders`);

    } catch (error) {
        console.error('❌ Error seeding database:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seedDatabase();
