const express = require('express');
const router = express.Router();

// Helper function to build parameterized query
function buildParameterizedQuery(baseParams, additionalParams) {
    let paramCounter = baseParams.length + 1;
    const result = {
        params: [...baseParams],
        placeholders: []
    };

    additionalParams.forEach(value => {
        result.params.push(value);
        result.placeholders.push(`$${paramCounter}`);
        paramCounter++;
    });

    return result;
}

// GET /api/orders - Fetch all orders with filtering, pagination, sorting, and search
router.get('/orders', async (req, res) => {
    try {
        const {
            region, category, ship_mode, start_date, end_date,
            page = 1, limit = 50,
            sort_by = 'order_date', sort_order = 'DESC',
            search = ''
        } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // Apply filters
        if (region) {
            whereClause += ` AND region = $${paramIndex++}`;
            params.push(region);
        }
        if (category) {
            whereClause += ` AND category = $${paramIndex++}`;
            params.push(category);
        }
        if (ship_mode) {
            whereClause += ` AND ship_mode = $${paramIndex++}`;
            params.push(ship_mode);
        }
        if (start_date) {
            whereClause += ` AND order_date >= $${paramIndex++}`;
            params.push(start_date);
        }
        if (end_date) {
            whereClause += ` AND order_date <= $${paramIndex++}`;
            params.push(end_date);
        }

        // Apply search across multiple columns
        if (search) {
            whereClause += ` AND (
                customer_name ILIKE $${paramIndex} OR 
                product_name ILIKE $${paramIndex + 1} OR 
                CAST(order_id AS TEXT) LIKE $${paramIndex + 2} OR
                region ILIKE $${paramIndex + 3} OR
                category ILIKE $${paramIndex + 4}
            )`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
            paramIndex += 5;
        }

        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM sales_summary ${whereClause}`;
        const countResult = await req.db.query(countQuery, params);
        const totalRecords = parseInt(countResult.rows[0].total);

        // Validate sort column to prevent SQL injection
        const validSortColumns = ['order_id', 'order_date', 'ship_date', 'customer_name', 'product_name', 'category', 'region', 'sales', 'profit', 'delivery_days'];
        const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'order_date';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Calculate pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const query = `
            SELECT * FROM sales_summary 
            ${whereClause}
            ORDER BY ${sortColumn} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(parseInt(limit), offset);

        const result = await req.db.query(query, params);

        res.json({
            data: result.rows,
            pagination: {
                total: totalRecords,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalRecords / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
    }
});

// GET /api/kpis - Calculate key performance indicators
router.get('/kpis', async (req, res) => {
    try {
        const { region, category, ship_mode, start_date, end_date } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (region) {
            whereClause += ` AND region = $${paramIndex++}`;
            params.push(region);
        }
        if (category) {
            whereClause += ` AND category = $${paramIndex++}`;
            params.push(category);
        }
        if (ship_mode) {
            whereClause += ` AND ship_mode = $${paramIndex++}`;
            params.push(ship_mode);
        }
        if (start_date) {
            whereClause += ` AND order_date >= $${paramIndex++}`;
            params.push(start_date);
        }
        if (end_date) {
            whereClause += ` AND order_date <= $${paramIndex++}`;
            params.push(end_date);
        }

        const query = `
            SELECT 
                COUNT(DISTINCT order_id) as total_orders,
                SUM(sales) as total_revenue,
                SUM(profit) as total_profit,
                AVG(delivery_days) as avg_delivery_days,
                SUM(quantity) as total_quantity
            FROM sales_summary
            ${whereClause}
        `;

        const result = await req.db.query(query, params);
        const kpis = result.rows[0];

        // Calculate profit margin
        kpis.profit_margin = kpis.total_revenue > 0
            ? ((kpis.total_profit / kpis.total_revenue) * 100).toFixed(2)
            : 0;

        res.json(kpis);
    } catch (error) {
        console.error('Error calculating KPIs:', error);
        res.status(500).json({ error: 'Failed to calculate KPIs', details: error.message });
    }
});

// GET /api/charts/sales-trend - Sales trend over time
router.get('/charts/sales-trend', async (req, res) => {
    try {
        const { region, category, ship_mode } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (region) {
            whereClause += ` AND region = $${paramIndex++}`;
            params.push(region);
        }
        if (category) {
            whereClause += ` AND category = $${paramIndex++}`;
            params.push(category);
        }
        if (ship_mode) {
            whereClause += ` AND ship_mode = $${paramIndex++}`;
            params.push(ship_mode);
        }

        const query = `
            SELECT 
                TO_CHAR(order_date, 'YYYY-MM') as month,
                SUM(sales) as total_sales,
                SUM(profit) as total_profit
            FROM sales_summary
            ${whereClause}
            GROUP BY month
            ORDER BY month
        `;

        const result = await req.db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sales trend:', error);
        res.status(500).json({ error: 'Failed to fetch sales trend', details: error.message });
    }
});

// GET /api/charts/shipping-modes - Shipping mode distribution
router.get('/charts/shipping-modes', async (req, res) => {
    try {
        const { region, category } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (region) {
            whereClause += ` AND region = $${paramIndex++}`;
            params.push(region);
        }
        if (category) {
            whereClause += ` AND category = $${paramIndex++}`;
            params.push(category);
        }

        const query = `
            SELECT 
                ship_mode,
                COUNT(*) as order_count,
                SUM(sales) as total_sales
            FROM sales_summary
            ${whereClause}
            GROUP BY ship_mode
            ORDER BY total_sales DESC
        `;

        const result = await req.db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching shipping modes:', error);
        res.status(500).json({ error: 'Failed to fetch shipping modes', details: error.message });
    }
});

// GET /api/charts/categories - Product category breakdown
router.get('/charts/categories', async (req, res) => {
    try {
        const { region, ship_mode } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (region) {
            whereClause += ` AND region = $${paramIndex++}`;
            params.push(region);
        }
        if (ship_mode) {
            whereClause += ` AND ship_mode = $${paramIndex++}`;
            params.push(ship_mode);
        }

        const query = `
            SELECT 
                category,
                COUNT(*) as order_count,
                SUM(sales) as total_sales,
                SUM(profit) as total_profit
            FROM sales_summary
            ${whereClause}
            GROUP BY category
            ORDER BY total_sales DESC
        `;

        const result = await req.db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
    }
});

// GET /api/charts/regions - Regional performance
router.get('/charts/regions', async (req, res) => {
    try {
        const { category, ship_mode } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (category) {
            whereClause += ` AND category = $${paramIndex++}`;
            params.push(category);
        }
        if (ship_mode) {
            whereClause += ` AND ship_mode = $${paramIndex++}`;
            params.push(ship_mode);
        }

        const query = `
            SELECT 
                region,
                COUNT(*) as order_count,
                SUM(sales) as total_sales,
                SUM(profit) as total_profit
            FROM sales_summary
            ${whereClause}
            GROUP BY region
            ORDER BY total_sales DESC
        `;

        const result = await req.db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching regions:', error);
        res.status(500).json({ error: 'Failed to fetch regions', details: error.message });
    }
});

// GET /api/filters/options - Get available filter options
router.get('/filters/options', async (req, res) => {
    try {
        const regionsResult = await req.db.query('SELECT DISTINCT region FROM customers ORDER BY region');
        const categoriesResult = await req.db.query('SELECT DISTINCT category FROM products ORDER BY category');
        const shipModesResult = await req.db.query('SELECT DISTINCT ship_mode FROM orders ORDER BY ship_mode');

        res.json({
            regions: regionsResult.rows.map(r => r.region),
            categories: categoriesResult.rows.map(c => c.category),
            ship_modes: shipModesResult.rows.map(s => s.ship_mode)
        });
    } catch (error) {
        console.error('Error fetching filter options:', error);
        res.status(500).json({ error: 'Failed to fetch filter options', details: error.message });
    }
});

module.exports = router;
