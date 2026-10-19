const { pool } = require('../config/db');

// GET /api/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const [productCount] = await pool.query(`SELECT COUNT(*) AS total FROM product`);
    const [sectionCount] = await pool.query(`SELECT COUNT(*) AS total FROM warehouse_section`);
    const [employeeCount] = await pool.query(`SELECT COUNT(*) AS total FROM employee`);
    const [inventoryCount] = await pool.query(`SELECT COUNT(*) AS total FROM inventory`);
    const [dispatchCount] = await pool.query(`SELECT COUNT(*) AS total FROM dispatch`);

    const [capacityStats] = await pool.query(`
      SELECT 
        COALESCE(SUM(capacity), 0) AS total_capacity,
        COALESCE(SUM(available_space), 0) AS total_available_space
      FROM warehouse_section
    `);

    const [stockStats] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'Stored' THEN quantity ELSE 0 END), 0) AS active_stock_quantity,
        COUNT(CASE WHEN status = 'Stored' THEN 1 END) AS active_batches,
        COUNT(CASE WHEN status = 'Dispatched' THEN 1 END) AS dispatched_batches
      FROM inventory
    `);

    const totalCap = capacityStats[0].total_capacity;
    const totalAvail = capacityStats[0].total_available_space;
    const activeQty = stockStats[0].active_stock_quantity;
    const overallUtilization = totalCap > 0 ? Number(((totalCap - totalAvail) / totalCap * 100).toFixed(2)) : 0;

    res.json({
      success: true,
      data: {
        total_products: productCount[0].total,
        total_sections: sectionCount[0].total,
        total_employees: employeeCount[0].total,
        total_inventory_records: inventoryCount[0].total,
        total_dispatches: dispatchCount[0].total,
        active_stock_quantity: activeQty,
        active_batches: stockStats[0].active_batches,
        dispatched_batches: stockStats[0].dispatched_batches,
        total_capacity: totalCap,
        total_available_space: totalAvail,
        overall_utilization_percent: overallUtilization
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/inventory-status
const getInventoryStatusDistribution = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        status,
        COUNT(*) AS count,
        COALESCE(SUM(quantity), 0) AS total_quantity
      FROM inventory
      GROUP BY status
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/category-distribution
const getCategoryDistribution = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.category,
        COUNT(DISTINCT p.product_id) AS product_count,
        COALESCE(SUM(CASE WHEN i.status = 'Stored' THEN i.quantity ELSE 0 END), 0) AS active_quantity
      FROM product p
      LEFT JOIN inventory i ON p.product_id = i.product_id
      GROUP BY p.category
      ORDER BY active_quantity DESC, product_count DESC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/section-capacity
const getSectionCapacityMetrics = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        ws.section_id,
        ws.temperature,
        ws.capacity,
        ws.available_space,
        (ws.capacity - ws.available_space) AS used_space,
        ROUND(((ws.capacity - ws.available_space) / ws.capacity) * 100, 2) AS utilization_percent,
        COUNT(i.inventory_id) AS batch_count
      FROM warehouse_section ws
      LEFT JOIN inventory i ON ws.section_id = i.section_id AND i.status = 'Stored'
      GROUP BY ws.section_id
      ORDER BY ws.section_id ASC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/recent-dispatches
const getRecentDispatches = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        d.dispatch_id,
        d.vehicle_no,
        d.date,
        d.destination,
        e.name AS employee_name,
        p.name AS product_name,
        p.category AS product_category,
        i.quantity AS batch_quantity
      FROM dispatch d
      JOIN employee e ON d.employee_id = e.employee_id
      JOIN inventory i ON d.inventory_id = i.inventory_id
      JOIN product p ON i.product_id = p.product_id
      ORDER BY d.date DESC, d.dispatch_id DESC
      LIMIT 6
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/expiry-alerts
const getExpiryAlerts = async (req, res, next) => {
  try {
    // Shows products with active stock whose expiry date is within 60 days or already expired
    const [rows] = await pool.query(`
      SELECT 
        p.product_id,
        p.name AS product_name,
        p.category,
        p.expiry_date,
        DATEDIFF(p.expiry_date, CURDATE()) AS days_until_expiry,
        i.inventory_id,
        i.quantity,
        i.section_id,
        ws.temperature AS section_temperature,
        CASE 
          WHEN p.expiry_date < CURDATE() THEN 'Expired'
          WHEN DATEDIFF(p.expiry_date, CURDATE()) <= 15 THEN 'Critical (< 15 days)'
          WHEN DATEDIFF(p.expiry_date, CURDATE()) <= 30 THEN 'Urgent (< 30 days)'
          ELSE 'Upcoming (< 60 days)'
        END AS alert_level
      FROM product p
      JOIN inventory i ON p.product_id = i.product_id
      JOIN warehouse_section ws ON i.section_id = ws.section_id
      WHERE p.expiry_date IS NOT NULL
        AND i.status = 'Stored'
        AND DATEDIFF(p.expiry_date, CURDATE()) <= 60
      ORDER BY p.expiry_date ASC
    `);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getInventoryStatusDistribution,
  getCategoryDistribution,
  getSectionCapacityMetrics,
  getRecentDispatches,
  getExpiryAlerts
};
