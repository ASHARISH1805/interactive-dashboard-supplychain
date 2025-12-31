# Supply Chain Analytics Dashboard

An interactive supply chain analytics dashboard with PostgreSQL backend, featuring advanced data visualization and exploration capabilities.

![Dashboard](https://img.shields.io/badge/Status-Production%20Ready-green)
![Database](https://img.shields.io/badge/Database-PostgreSQL-blue)
![Records](https://img.shields.io/badge/Records-500%2B-orange)

## Features

### 📊 Interactive Data Visualization
- **4 Dynamic Charts**: Sales trends, shipping distribution, category analysis, regional performance
- **Chart Drill-Down**: Click any chart to filter data instantly
- **Real-Time Updates**: All visualizations update based on selected filters

### 🔍 Advanced Data Exploration
- **Pagination**: Navigate through 500+ records with 20 items per page
- **Multi-Column Sorting**: Sort by any column (order ID, date, sales, profit, etc.)
- **Real-Time Search**: Search across customers, products, order IDs, regions, and categories
- **CSV Export**: Download filtered data for external analysis

### 📈 Key Performance Indicators
- Total Revenue
- Total Orders
- Profit Margin (calculated)
- Average Delivery Time
- Total Quantity

### 🎯 Filters
- Region (East, West, Central, South)
- Product Category (Furniture, Office Supplies, Technology)
- Shipping Mode (4 options)
- Date Range (custom start/end dates)

## Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL database
- RESTful API

**Frontend:**
- Vanilla JavaScript
- Chart.js for visualizations
- Responsive CSS with dark theme

**Data:**
- 680 total records (100 customers, 80 products, 500 orders)
- Realistic supply chain data spanning 2023-2024

## Quick Start

### Prerequisites
- Node.js installed
- PostgreSQL installed and running

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/asharish1805/supply-chain-analytics.git
cd supply-chain-analytics
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure database**
Create a `.env` file:
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=supply_chain_db
DB_PORT=5432
PORT=3000
```

4. **Seed the database**
```bash
npm run seed
```

5. **Start the server**
```bash
npm start
```

6. **Access the dashboard**
Open http://localhost:3000

## Project Structure

```
supply-chain-analytics/
├── database/
│   ├── schema.sql          # PostgreSQL schema
│   ├── seed.js            # Data generator
│   └── export_to_csv.js   # CSV export utility
├── public/
│   ├── index.html         # Dashboard UI
│   ├── app.js            # Frontend logic
│   └── style.css         # Styling
├── routes/
│   └── api.js            # API endpoints
├── server.js             # Express server
└── package.json          # Dependencies
```

## API Endpoints

### Orders
```
GET /api/orders?page=1&limit=50&sort_by=sales&sort_order=DESC&search=tech
```

### KPIs
```
GET /api/kpis?region=West&category=Technology
```

### Charts
```
GET /api/charts/sales-trend
GET /api/charts/shipping-modes
GET /api/charts/categories
GET /api/charts/regions
```

### Filters
```
GET /api/filters/options
```

## Interactive Features Usage

### Sorting
Click any column header to sort. Click again to reverse order.

### Pagination
- Use Previous/Next buttons
- Click page numbers to jump
- See record count: "Showing 1-20 of 500 records"

### Search
Type in the search box to find orders across all columns.

### Export
Click "📥 Export CSV" to download current filtered data.

### Drill-Down
Click on any chart bar/segment to filter the entire dashboard by that value.

## Database Schema

### Tables
- **customers**: 100 records with realistic company names
- **products**: 80 products across 3 categories
- **orders**: 500 orders with sales and profit data

### View
- **sales_summary**: Denormalized view combining all data for analytics

## Screenshots

*Add your screenshots here after deployment*

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for learning and development.

## Author

**asharish1805**

## Acknowledgments

- Chart.js for data visualization
- PostgreSQL for robust database management
- Express.js for the backend framework
