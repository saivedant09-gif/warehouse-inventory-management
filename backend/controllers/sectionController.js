const { pool } = require('../config/db');
const { isPositiveInteger, validateWarehouseSection } = require('../utils/validators');

// GET all sections with capacity utilization metrics
const getAllSections = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        ws.*,
        COALESCE(SUM(CASE WHEN i.status = 'Stored' THEN i.quantity ELSE 0 END), 0) AS allocated_stock,
        COUNT(i.inventory_id) AS total_inventory_batches,
        ROUND(
          (COALESCE(SUM(CASE WHEN i.status = 'Stored' THEN i.quantity ELSE 0 END), 0) / ws.capacity) * 100, 
          2
        ) AS utilization_percentage
      FROM warehouse_section ws
      LEFT JOIN inventory i ON ws.section_id = i.section_id
      GROUP BY ws.section_id
      ORDER BY ws.section_id ASC
    `;

    const [rows] = await pool.query(query);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// GET single section by ID with associated inventory records
const getSectionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid section ID' });
    }

    const query = `
      SELECT 
        ws.*,
        COALESCE(SUM(CASE WHEN i.status = 'Stored' THEN i.quantity ELSE 0 END), 0) AS allocated_stock,
        COUNT(i.inventory_id) AS total_inventory_batches,
        ROUND(
          (COALESCE(SUM(CASE WHEN i.status = 'Stored' THEN i.quantity ELSE 0 END), 0) / ws.capacity) * 100, 
          2
        ) AS utilization_percentage
      FROM warehouse_section ws
      LEFT JOIN inventory i ON ws.section_id = i.section_id
      WHERE ws.section_id = ?
      GROUP BY ws.section_id
    `;

    const [sections] = await pool.query(query, [id]);

    if (sections.length === 0) {
      return res.status(404).json({ success: false, message: 'Warehouse section not found' });
    }

    // Associated inventory records
    const [inventoryRows] = await pool.query(
      `SELECT 
        i.*,
        p.name AS product_name,
        p.category AS product_category,
        p.weight AS product_weight,
        e.name AS employee_name
       FROM inventory i
       JOIN product p ON i.product_id = p.product_id
       JOIN employee e ON i.employee_id = e.employee_id
       WHERE i.section_id = ?
       ORDER BY i.entry_date DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...sections[0],
        inventory: inventoryRows
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST create warehouse section
const createSection = async (req, res, next) => {
  try {
    const errors = validateWarehouseSection(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const { temperature, capacity, available_space } = req.body;
    const cleanTemp = temperature !== undefined && temperature !== '' ? parseFloat(temperature) : null;
    const cleanCap = parseInt(capacity, 10);
    // Invariant: fresh section with no stock has available_space = capacity unless specified
    const cleanAvail = (available_space !== undefined && available_space !== '') 
      ? parseInt(available_space, 10) 
      : cleanCap;

    const [result] = await pool.query(
      `INSERT INTO warehouse_section (temperature, capacity, available_space) VALUES (?, ?, ?)`,
      [cleanTemp, cleanCap, cleanAvail]
    );

    const [newSection] = await pool.query(
      `SELECT * FROM warehouse_section WHERE section_id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Warehouse section created successfully',
      data: newSection[0]
    });
  } catch (error) {
    next(error);
  }
};

// PUT update warehouse section
// Ensures: capacity reductions cannot violate currently allocated stock
const updateSection = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid section ID' });
    }

    const errors = validateWarehouseSection(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    await connection.beginTransaction();

    const [existing] = await connection.query(
      `SELECT * FROM warehouse_section WHERE section_id = ? FOR UPDATE`,
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Warehouse section not found' });
    }

    // Calculate current allocated stock in this section
    const [allocatedRows] = await connection.query(
      `SELECT COALESCE(SUM(quantity), 0) AS current_allocated 
       FROM inventory 
       WHERE section_id = ? AND status = 'Stored'`,
      [id]
    );

    const currentAllocated = allocatedRows[0].current_allocated;
    const newCapacity = parseInt(req.body.capacity, 10);
    const newTemp = req.body.temperature !== undefined && req.body.temperature !== '' 
      ? parseFloat(req.body.temperature) 
      : null;

    if (newCapacity < currentAllocated) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Capacity cannot be reduced to ${newCapacity}. Current active allocated stock is ${currentAllocated} units.`
      });
    }

    // Maintain invariant: available_space = capacity - total active allocated stock units
    const updatedAvailableSpace = newCapacity - currentAllocated;

    await connection.query(
      `UPDATE warehouse_section 
       SET temperature = ?, capacity = ?, available_space = ? 
       WHERE section_id = ?`,
      [newTemp, newCapacity, updatedAvailableSpace, id]
    );

    await connection.commit();

    const [updated] = await pool.query(
      `SELECT * FROM warehouse_section WHERE section_id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Warehouse section updated successfully',
      data: updated[0]
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// DELETE warehouse section
const deleteSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid section ID' });
    }

    // Check if referenced by inventory
    const [invCount] = await pool.query(
      `SELECT COUNT(*) AS count FROM inventory WHERE section_id = ?`,
      [id]
    );

    if (invCount[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete section: It contains ${invCount[0].count} inventory record(s). Move or delete inventory first.`
      });
    }

    const [result] = await pool.query(`DELETE FROM warehouse_section WHERE section_id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Warehouse section not found' });
    }

    res.json({
      success: true,
      message: 'Warehouse section deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection
};
