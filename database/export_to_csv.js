const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'supply_chain_db',
    port: process.env.DB_PORT || 5432
});

async function exportToCSV() {
    const client = await pool.connect();

    try {
        console.log('Exporting data from PostgreSQL...');

        // Export sales_summary view (all the data we need)
        const query = 'SELECT * FROM sales_summary ORDER BY order_date';
        const result = await client.query(query);

        const data = result.rows;
        console.log(`Found ${data.length} records to export`);

        // Create CSV header
        const headers = Object.keys(data[0]);
        let csvContent = headers.join(',') + '\n';

        // Add data rows
        data.forEach(row => {
            const values = headers.map(header => {
                let value = row[header];

                // Handle null values
                if (value === null || value === undefined) {
                    return '';
                }

                // Convert dates to string
                if (value instanceof Date) {
                    value = value.toISOString().split('T')[0];
                }

                // Escape quotes and wrap in quotes if contains comma or quote
                value = String(value);
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }

                return value;
            });

            csvContent += values.join(',') + '\n';
        });

        // Save to file
        const outputPath = path.join(__dirname, '..', 'supply_chain_data.csv');
        fs.writeFileSync(outputPath, csvContent, 'utf8');

        console.log(`✅ Data exported successfully to: ${outputPath}`);
        console.log(`Total records: ${data.length}`);
        console.log(`File size: ${(csvContent.length / 1024).toFixed(2)} KB`);

    } catch (error) {
        console.error('❌ Error exporting data:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

exportToCSV();
