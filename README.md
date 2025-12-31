# Supply Chain Analytics Dashboard

Interactive Qlik-style supply chain analytics dashboard built with Node.js, MySQL, and modern web technologies.

## Features

- 📊 **Real-time KPIs**: Revenue, orders, profit margin, delivery time, and quantity metrics
- 📈 **Interactive Charts**: Sales trends, shipping modes, product categories, and regional performance
- 🔍 **Advanced Filtering**: Filter by region, category, shipping mode, and date range
- 📋 **Data Table**: Searchable order details with 250+ DataCo records
- 🎨 **Modern UI**: Qlik-inspired dark theme with glassmorphism effects
- 🗄️ **MySQL Backend**: Professional database with REST API

## Tech Stack

- **Backend**: Node.js, Express.js, MySQL
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Visualization**: Chart.js
- **Database**: MySQL with connection pooling

## Prerequisites

Before running this project, make sure you have:

- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- npm or yarn package manager

## Installation

### 1. Clone or navigate to the project directory

```bash
cd "qlik project"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure database

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=supply_chain_db
DB_PORT=3306
PORT=3000
```

### 4. Create and seed the database

Run the seeding script to create the database schema and populate it with sample data:

```bash
npm run seed
```

This will:
- Create the `supply_chain_db` database
- Set up tables for customers, products, and orders
- Populate with 250+ realistic DataCo supply chain records

## Running the Application

### Start the server

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

### Access the dashboard

Open your browser and navigate to:

```
http://localhost:3000
```

## API Endpoints

- `GET /api/orders` - Fetch orders with optional filters
- `GET /api/kpis` - Get key performance indicators
- `GET /api/charts/sales-trend` - Sales trend data
- `GET /api/charts/shipping-modes` - Shipping distribution
- `GET /api/charts/categories` - Product categories
- `GET /api/charts/regions` - Regional performance
- `GET /api/filters/options` - Available filter options
- `GET /health` - Server health check

## Project Structure

```
qlik project/
├── database/
│   ├── schema.sql          # MySQL database schema
│   └── seed.js             # Data seeding script
├── routes/
│   └── api.js              # API route handlers
├── public/
│   ├── index.html          # Main HTML file
│   ├── style.css           # Qlik-inspired styling
│   └── app.js              # Frontend JavaScript
├── server.js               # Express server
├── package.json            # Dependencies
└── .env.example            # Environment variables template
```

## Usage

1. **View KPIs**: See real-time metrics at the top of the dashboard
2. **Apply Filters**: Use dropdowns and date pickers to filter data
3. **Explore Charts**: Hover over chart elements for detailed information
4. **Search Orders**: Use the search box to find specific orders
5. **Interactive Charts**: Click legend items to show/hide data series

## Customization

### Database Configuration

To connect to a different MySQL server, update the `.env` file with your credentials.

### Adding More Data

Modify `database/seed.js` to adjust the number of records:

```javascript
const customers = generateCustomers(200);  // Change from 100
const products = generateProducts(150);    // Change from 80
const orders = generateOrders(500, 200, 150); // Change from 250
```

Then re-run:

```bash
npm run seed
```

## Portfolio Use

This dashboard is perfect for showcasing in your resume or portfolio:

- Demonstrates full-stack development skills
- Shows proficiency with database design
- Highlights data visualization capabilities
- Clean, professional UI/UX design

## Troubleshooting

### Database Connection Error

If you see "Database connection failed":
- Verify MySQL is running
- Check credentials in `.env` file
- Ensure database was created by running `npm run seed`

### Port Already in Use

If port 3000 is occupied, change it in `.env`:

```
PORT=3001
```

### Charts Not Displaying

- Check browser console for errors
- Ensure Chart.js CDN is accessible
- Verify API endpoints are returning data

## License

MIT License - feel free to use for personal or commercial projects.

## Author

Built for resume/portfolio demonstration purposes.
