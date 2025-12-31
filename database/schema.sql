-- Supply Chain Analytics Database Schema (PostgreSQL)
-- Note: Run this after creating the database

-- Drop tables if they exist (in correct order due to foreign keys)
DROP VIEW IF EXISTS sales_summary;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;

-- Customers Table
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    segment VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    region VARCHAR(50)
);

-- Products Table
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    unit_price NUMERIC(10, 2)
);

-- Orders Table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    order_date DATE NOT NULL,
    ship_date DATE,
    ship_mode VARCHAR(50),
    customer_id INTEGER REFERENCES customers(customer_id),
    product_id INTEGER REFERENCES products(product_id),
    quantity INTEGER,
    discount NUMERIC(5, 2),
    shipping_cost NUMERIC(10, 2),
    order_priority VARCHAR(20),
    warehouse VARCHAR(100)
);

-- Sales Performance View
CREATE VIEW sales_summary AS
SELECT 
    o.order_id,
    o.order_date,
    o.ship_date,
    o.ship_mode,
    o.quantity,
    o.discount,
    o.shipping_cost,
    o.order_priority,
    c.customer_name,
    c.segment,
    c.city,
    c.state,
    c.region,
    c.country,
    p.product_name,
    p.category,
    p.sub_category,
    p.unit_price,
    (p.unit_price * o.quantity) AS sales,
    ((p.unit_price * o.quantity) * (1 - o.discount) - o.shipping_cost) AS profit,
    (o.ship_date - o.order_date) AS delivery_days
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN products p ON o.product_id = p.product_id;

-- Indexes for better performance
CREATE INDEX idx_order_date ON orders(order_date);
CREATE INDEX idx_customer_region ON customers(region);
CREATE INDEX idx_product_category ON products(category);
CREATE INDEX idx_ship_mode ON orders(ship_mode);
