const { pool } = require('../config/db');
const { isPositiveInteger, validateDispatch } = require('../utils/validators');

// GET all dispatches with filtering
const getAllDispatches = async (req, res, next) => {
  try {
    const { date, employee_id, destination, search } = req.query;

    let query = `
      SELECT 
        d.*,
        e.name AS employee_name,
        e.designation AS employee_designation,
        i.quantity AS batch_quantity,
        i.status AS inventory_status,
        i.section_id,
        p.product_id,
        p.name AS product_name,
        p.category AS product_category
      FROM dispatch d
      JOIN employee e ON d.employee_id = e.employee_id
      JOIN inventory i ON d.inventory_id = i.inventory_id
      JOIN product p ON i.product_id = p.product_id
      WHERE 1=1
    `;
    const params = [];

    if (date && date.trim()) {
      query += ` AND d.date = ?`;
      params.push(date.trim());
    }

    if (employee_id && isPositiveInteger(employee_id)) {
      query += ` AND d.employee_id = ?`;
      params.push(parseInt(employee_id, 10));
    }

    if (destination && destination.trim()) {
      query += ` AND d.destination LIKE ?`;
      params.push(`%${destination.trim()}%`);
    }

    if (search && search.trim()) {
      query += ` AND (d.vehicle_no LIKE ? OR d.destination LIKE ? OR p.name LIKE ? OR e.name LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ` ORDER BY d.date DESC, d.dispatch_id DESC`;

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// GET single dispatch by ID
const getDispatchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid dispatch ID' });
    }

    const query = `
      SELECT 
        d.*,
        e.name AS employee_name,
        e.designation AS employee_designation,
        e.phone AS employee_phone,
        i.quantity AS batch_quantity,
        i.status AS inventory_status,
        i.entry_date AS inventory_entry_date,
        i.exit_date AS inventory_exit_date,
        i.section_id,
        ws.temperature AS section_temperature,
        p.product_id,
        p.name AS product_name,
        p.category AS product_category,
        p.weight AS product_weight
      FROM dispatch d
      JOIN employee e ON d.employee_id = e.employee_id
      JOIN inventory i ON d.inventory_id = i.inventory_id
      JOIN warehouse_section ws ON i.section_id = ws.section_id
      JOIN product p ON i.product_id = p.product_id
      WHERE d.dispatch_id = ?
    `;

    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dispatch record not found' });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// POST create dispatch
// Validates employee and inventory existence. If inventory was 'Stored', marks it 'Dispatched'
// with exit_date and frees up the section's available_space safely inside a transaction.
const createDispatch = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const errors = validateDispatch(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const { employee_id, inventory_id, vehicle_no, date, destination, markAsDispatched } = req.body;

    await connection.beginTransaction();

    // Verify employee exists
    const [employeeRows] = await connection.query(`SELECT * FROM employee WHERE employee_id = ?`, [employee_id]);
    if (employeeRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Specified employee does not exist.' });
    }

    // Verify inventory exists FOR UPDATE
    const [inventoryRows] = await connection.query(
      `SELECT * FROM inventory WHERE inventory_id = ? FOR UPDATE`,
      [inventory_id]
    );

    if (inventoryRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Specified inventory record does not exist.' });
    }

    const inv = inventoryRows[0];

    // Create the dispatch record
    const [result] = await connection.query(
      `INSERT INTO dispatch (employee_id, inventory_id, vehicle_no, date, destination)
       VALUES (?, ?, ?, ?, ?)`,
      [employee_id, inventory_id, vehicle_no.trim(), date, destination.trim()]
    );

    // If markAsDispatched is true (default true if currently Stored)
    const shouldMarkDispatched = markAsDispatched !== undefined ? Boolean(markAsDispatched) : true;
    if (shouldMarkDispatched && inv.status === 'Stored') {
      // Free up section space
      await connection.query(
        `UPDATE warehouse_section SET available_space = available_space + ? WHERE section_id = ?`,
        [inv.quantity, inv.section_id]
      );

      // Update inventory record status and exit_date
      await connection.query(
        `UPDATE inventory SET status = 'Dispatched', exit_date = ? WHERE inventory_id = ?`,
        [date, inventory_id]
      );
    }

    await connection.commit();

    const [newDispatch] = await pool.query(
      `SELECT 
        d.*,
        e.name AS employee_name,
        p.name AS product_name,
        i.quantity AS batch_quantity
       FROM dispatch d
       JOIN employee e ON d.employee_id = e.employee_id
       JOIN inventory i ON d.inventory_id = i.inventory_id
       JOIN product p ON i.product_id = p.product_id
       WHERE d.dispatch_id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Dispatch recorded successfully and inventory status updated',
      data: newDispatch[0]
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// PUT update dispatch
const updateDispatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid dispatch ID' });
    }

    const errors = validateDispatch(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const [existing] = await pool.query(`SELECT * FROM dispatch WHERE dispatch_id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Dispatch record not found' });
    }

    const { employee_id, inventory_id, vehicle_no, date, destination } = req.body;

    // Check employee
    const [emp] = await pool.query(`SELECT employee_id FROM employee WHERE employee_id = ?`, [employee_id]);
    if (emp.length === 0) {
      return res.status(400).json({ success: false, message: 'Specified employee does not exist.' });
    }

    // Check inventory
    const [inv] = await pool.query(`SELECT inventory_id FROM inventory WHERE inventory_id = ?`, [inventory_id]);
    if (inv.length === 0) {
      return res.status(400).json({ success: false, message: 'Specified inventory record does not exist.' });
    }

    await pool.query(
      `UPDATE dispatch SET employee_id = ?, inventory_id = ?, vehicle_no = ?, date = ?, destination = ? WHERE dispatch_id = ?`,
      [employee_id, inventory_id, vehicle_no.trim(), date, destination.trim(), id]
    );

    const [updated] = await pool.query(`SELECT * FROM dispatch WHERE dispatch_id = ?`, [id]);

    res.json({
      success: true,
      message: 'Dispatch record updated successfully',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

// DELETE dispatch
const deleteDispatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid dispatch ID' });
    }

    const [result] = await pool.query(`DELETE FROM dispatch WHERE dispatch_id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Dispatch record not found' });
    }

    res.json({
      success: true,
      message: 'Dispatch record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDispatches,
  getDispatchById,
  createDispatch,
  updateDispatch,
  deleteDispatch
};
