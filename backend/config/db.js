const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool using environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'warehouse_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection helper
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return { ok: true, message: 'Connected to MySQL successfully' };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

module.exports = {
  pool,
  testConnection
};
