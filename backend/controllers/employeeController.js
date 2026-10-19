const { pool } = require('../config/db');
const { isPositiveInteger, validateEmployee } = require('../utils/validators');

// GET all employees with inventory & dispatch metrics
const getAllEmployees = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        e.*,
        COUNT(DISTINCT i.inventory_id) AS total_inventory_managed,
        COUNT(DISTINCT d.dispatch_id) AS total_dispatches_handled
      FROM employee e
      LEFT JOIN inventory i ON e.employee_id = i.employee_id
      LEFT JOIN dispatch d ON e.employee_id = d.employee_id
      GROUP BY e.employee_id
      ORDER BY e.employee_id ASC
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

// GET single employee by ID with managed inventory and dispatches
const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    const [employees] = await pool.query(`SELECT * FROM employee WHERE employee_id = ?`, [id]);
    if (employees.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Managed inventory
    const [inventoryRows] = await pool.query(
      `SELECT 
        i.*,
        p.name AS product_name,
        p.category AS product_category,
        ws.temperature AS section_temperature
       FROM inventory i
       JOIN product p ON i.product_id = p.product_id
       JOIN warehouse_section ws ON i.section_id = ws.section_id
       WHERE i.employee_id = ?
       ORDER BY i.entry_date DESC`,
      [id]
    );

    // Handled dispatches
    const [dispatchRows] = await pool.query(
      `SELECT 
        d.*,
        p.name AS product_name,
        i.quantity AS batch_quantity
       FROM dispatch d
       JOIN inventory i ON d.inventory_id = i.inventory_id
       JOIN product p ON i.product_id = p.product_id
       WHERE d.employee_id = ?
       ORDER BY d.date DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...employees[0],
        managed_inventory: inventoryRows,
        handled_dispatches: dispatchRows
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST create employee
const createEmployee = async (req, res, next) => {
  try {
    const errors = validateEmployee(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const { name, designation, phone } = req.body;

    const [result] = await pool.query(
      `INSERT INTO employee (name, designation, phone) VALUES (?, ?, ?)`,
      [name.trim(), designation.trim(), phone.trim()]
    );

    const [newEmployee] = await pool.query(
      `SELECT * FROM employee WHERE employee_id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: newEmployee[0]
    });
  } catch (error) {
    next(error);
  }
};

// PUT update employee
const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    const errors = validateEmployee(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const [existing] = await pool.query(`SELECT * FROM employee WHERE employee_id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { name, designation, phone } = req.body;

    await pool.query(
      `UPDATE employee SET name = ?, designation = ?, phone = ? WHERE employee_id = ?`,
      [name.trim(), designation.trim(), phone.trim(), id]
    );

    const [updated] = await pool.query(`SELECT * FROM employee WHERE employee_id = ?`, [id]);

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

// DELETE employee
const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid employee ID' });
    }

    // Check references in inventory or dispatches
    const [invCount] = await pool.query(`SELECT COUNT(*) AS count FROM inventory WHERE employee_id = ?`, [id]);
    const [dispCount] = await pool.query(`SELECT COUNT(*) AS count FROM dispatch WHERE employee_id = ?`, [id]);

    const totalRefs = invCount[0].count + dispCount[0].count;
    if (totalRefs > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete employee: Managed ${invCount[0].count} inventory batch(es) and handled ${dispCount[0].count} dispatch(es). Reassign records first.`
      });
    }

    const [result] = await pool.query(`DELETE FROM employee WHERE employee_id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
