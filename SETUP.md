# Quick Start Guide

## Prerequisites

Before running the dashboard, you need:

1. **Node.js** - Download from https://nodejs.org/ (LTS version recommended)
2. **MySQL Server** - Download from https://dev.mysql.com/downloads/installer/

## Installation Steps

### 1. Install Node.js
- Download and install Node.js from https://nodejs.org/
- Verify: Open terminal and run `node --version`

### 2. Install MySQL
- Download MySQL Community Server from https://dev.mysql.com/downloads/installer/
- During installation, set a root password (remember this!)
- Keep default port 3306

### 3. Install Project Dependencies
```bash
cd "e:\usha\qlik project"
npm install
```

### 4. Configure Database
Create a `.env` file in the project root:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=supply_chain_db
DB_PORT=3306
PORT=3000
```

Replace `your_mysql_password_here` with your MySQL root password.

### 5. Create and Seed Database
```bash
npm run seed
```

You should see:
```
✅ Database seeded successfully!
   - 100 customers
   - 80 products  
   - 250 orders
```

### 6. Start the Server
```bash
npm start
```

You should see:
```
🚀 Server running on http://localhost:3000
```

### 7. Open Dashboard
Open your browser and go to: **http://localhost:3000**

## Features

- 📊 **5 KPI Cards** - Revenue, Orders, Profit Margin, Delivery Time, Quantity
- 📈 **4 Interactive Charts** - Sales trends, Shipping modes, Categories, Regions
- 🔍 **Advanced Filters** - Filter by region, category, ship mode, date range
- 📋 **Data Table** - Search and explore 250+ orders

## Troubleshooting

**"npm is not recognized"**
→ Install Node.js and restart terminal

**"Database connection failed"**  
→ Check MySQL is running and password in `.env` is correct

**"Port 3000 already in use"**
→ Change PORT in `.env` to 3001

## Commands

- **Start server**: `npm start`
- **Seed database**: `npm run seed`
- **Development mode**: `npm run dev`

## Portfolio Use

This dashboard demonstrates:
- Full-stack development (Node.js + MySQL)
- REST API design (7 endpoints)
- Data visualization (Chart.js)
- Modern UI/UX (Qlik-inspired design)
- Professional database design

Perfect for showcasing in your resume!
