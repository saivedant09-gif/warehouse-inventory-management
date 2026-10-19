const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/db');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const dashboardRoutes = require('./routes/dashboardRoutes');
const productRoutes = require('./routes/productRoutes');
const sectionRoutes = require('./routes/sectionRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root index endpoint with links to Frontend and API
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Warehouse Inventory API Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #0f172a; color: #f8fafc; }
          .card { max-width: 600px; margin: 40px auto; background: #1e293b; padding: 32px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border: 1px solid #334155; }
          h1 { color: #60a5fa; margin-top: 0; font-size: 1.5rem; }
          p { color: #cbd5e1; line-height: 1.6; }
          .btn { display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          .btn:hover { background: #1d4ed8; }
          ul { background: #0f172a; padding: 16px 32px; border-radius: 8px; border: 1px solid #334155; }
          li { margin: 8px 0; }
          a { color: #38bdf8; text-decoration: none; }
          a:hover { text-decoration: underline; }
          code { background: #334155; padding: 2px 6px; border-radius: 4px; color: #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>📦 Warehouse Inventory API Server</h1>
          <p>This is the <strong>Node.js / Express backend server</strong> on port 5000.</p>
          <p>To view and interact with the <strong>React Dashboard Web UI</strong>, click below:</p>
          <a class="btn" href="http://localhost:3000">🚀 Open React Frontend (http://localhost:3000)</a>
          <h3 style="margin-top: 24px; font-size: 1rem; color: #94a3b8;">Available API Endpoints:</h3>
          <ul>
            <li><a href="/api/health"><code>GET /api/health</code></a> — Health Check & DB Status</li>
            <li><a href="/api/dashboard/stats"><code>GET /api/dashboard/stats</code></a> — Summary Statistics</li>
            <li><a href="/api/products"><code>GET /api/products</code></a> — Products Catalog</li>
            <li><a href="/api/sections"><code>GET /api/sections</code></a> — Warehouse Sections</li>
            <li><a href="/api/employees"><code>GET /api/employees</code></a> — Employees Directory</li>
            <li><a href="/api/inventory"><code>GET /api/inventory</code></a> — Inventory Batches</li>
            <li><a href="/api/dispatches"><code>GET /api/dispatches</code></a> — Outbound Dispatches</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// Health Check API
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    backend: 'Node.js Express Server',
    database: {
      client: 'mysql2',
      name: process.env.DB_NAME || 'warehouse_management',
      connected: dbStatus.ok,
      message: dbStatus.ok ? dbStatus.message : dbStatus.error
    }
  });
});

// Register API Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dispatches', dispatchRoutes);

// 404 & Global Error Handler
app.use(notFound);
app.use(errorHandler);

// Start Server
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(` Warehouse Inventory Management Backend running`);
  console.log(` Server URL : http://localhost:${PORT}`);
  console.log(` Health API : http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);

  const dbStatus = await testConnection();
  if (dbStatus.ok) {
    console.log(`[Database] MySQL connection verified: ${process.env.DB_NAME}`);
  } else {
    console.error(`[Database Error] Failed to connect:`, dbStatus.error);
  }
});

module.exports = app;
