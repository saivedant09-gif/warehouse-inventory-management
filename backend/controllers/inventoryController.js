const { pool } = require('../config/db');
const { isPositiveInteger, validateInventory } = require('../utils/validators');

// GET all inventory records with filtering & pagination
const getAllInventory = async (req, res, next) => {
  try {
    const { product_id, section_id, employee_id, status, search, page, limit } = req.query;

    let baseQuery = `
      FROM inventory i
      JOIN product p ON i.product_id = p.product_id
      JOIN warehouse_section ws ON i.section_id = ws.section_id
      JOIN employee e ON i.employee_id = e.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (product_id && isPositiveInteger(product_id)) {
      baseQuery += ` AND i.product_id = ?`;
      params.push(parseInt(product_id, 10));
    }

    if (section_id && isPositiveInteger(section_id)) {
      baseQuery += ` AND i.section_id = ?`;
      params.push(parseInt(section_id, 10));
    }

    if (employee_id && isPositiveInteger(employee_id)) {
      baseQuery += ` AND i.employee_id = ?`;
      params.push(parseInt(employee_id, 10));
    }

    if (status && status !== 'All') {
      baseQuery += ` AND i.status = ?`;
      params.push(status);
    }

    if (search && search.trim()) {
      baseQuery += ` AND (p.name LIKE ? OR p.category LIKE ? OR e.name LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    // Count total records for pagination
    const [countResult] = await pool.query(`SELECT COUNT(*) AS total ${baseQuery}`, params);
    const totalRecords = countResult[0].total;

    // Apply pagination if specified
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    let dataQuery = `
      SELECT 
        i.*,
        p.name AS product_name,
        p.category AS product_category,
        p.weight AS product_weight,
        p.expiry_date AS product_expiry,
        ws.temperature AS section_temperature,
        ws.capacity AS section_capacity,
        ws.available_space AS section_available_space,
        e.name AS employee_name,
        e.designation AS employee_designation
      ${baseQuery}
      ORDER BY i.inventory_id DESC
    `;

    if (limit && limit !== 'all') {
      dataQuery += ` LIMIT ? OFFSET ?`;
      params.push(limitNum, offset);
    }

    const [rows] = await pool.query(dataQuery, params);

    res.json({
      success: true,
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages: limit && limit !== 'all' ? Math.ceil(totalRecords / limitNum) : 1,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// GET single inventory record by ID
const getInventoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inventory ID' });
    }

    const [rows] = await pool.query(
      `SELECT 
        i.*,
        p.name AS product_name,
        p.category AS product_category,
        p.weight AS product_weight,
        p.expiry_date AS product_expiry,
        ws.temperature AS section_temperature,
        ws.capacity AS section_capacity,
        ws.available_space AS section_available_space,
        e.name AS employee_name,
        e.phone AS employee_phone
       FROM inventory i
       JOIN product p ON i.product_id = p.product_id
       JOIN warehouse_section ws ON i.section_id = ws.section_id
       JOIN employee e ON i.employee_id = e.employee_id
       WHERE i.inventory_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inventory record not found' });
    }

    // Associated dispatches for this inventory record
    const [dispatches] = await pool.query(
      `SELECT d.*, e.name AS employee_name
       FROM dispatch d
       JOIN employee e ON d.employee_id = e.employee_id
       WHERE d.inventory_id = ?
       ORDER BY d.date DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...rows[0],
        dispatches
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST create inventory entry
// Enforces: available space cannot be exceeded, transactionally updates section available_space
const createInventory = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const errors = validateInventory(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const { product_id, section_id, employee_id, quantity, entry_date, exit_date, status } = req.body;
    const qty = parseInt(quantity, 10);

    await connection.beginTransaction();

    // Verify product exists
    const [productRows] = await connection.query(`SELECT product_id FROM product WHERE product_id = ?`, [product_id]);
    if (productRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Specified product does not exist.' });
    }

    // Verify employee exists
    const [employeeRows] = await connection.query(`SELECT employee_id FROM employee WHERE employee_id = ?`, [employee_id]);
    if (employeeRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Specified employee does not exist.' });
    }

    // Lock section row for update to ensure safe concurrent allocation
    const [sectionRows] = await connection.query(
      `SELECT * FROM warehouse_section WHERE section_id = ? FOR UPDATE`,
      [section_id]
    );

    if (sectionRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Specified warehouse section does not exist.' });
    }

    const section = sectionRows[0];

    // If new inventory is being 'Stored', verify section available capacity
    if (status === 'Stored') {
      if (qty > section.available_space) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot allocate stock: Requested quantity (${qty}) exceeds Section ${section_id}'s available space (${section.available_space} / Capacity ${section.capacity}).`
        });
      }

      // Deduct from available space
      await connection.query(
        `UPDATE warehouse_section SET available_space = available_space - ? WHERE section_id = ?`,
        [qty, section_id]
      );
    }

    // Insert inventory record
    const [insertResult] = await connection.query(
      `INSERT INTO inventory (product_id, section_id, employee_id, quantity, entry_date, exit_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product_id, section_id, employee_id, qty, entry_date, exit_date || null, status]
    );

    await connection.commit();

    const [newRecord] = await pool.query(
      `SELECT 
        i.*,
        p.name AS product_name,
        p.category AS product_category,
        ws.temperature AS section_temperature,
        ws.available_space AS section_available_space,
        e.name AS employee_name
       FROM inventory i
       JOIN product p ON i.product_id = p.product_id
       JOIN warehouse_section ws ON i.section_id = ws.section_id
       JOIN employee e ON i.employee_id = e.employee_id
       WHERE i.inventory_id = ?`,
      [insertResult.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Inventory batch stored successfully',
      data: newRecord[0]
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// PUT update inventory
// Safely adjusts quantities, sections, or status while maintaining section available_space invariant
const updateInventory = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inventory ID' });
    }

    const errors = validateInventory(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const { product_id, section_id, employee_id, quantity, entry_date, exit_date, status } = req.body;
    const newQty = parseInt(quantity, 10);
    const newSectionId = parseInt(section_id, 10);

    await connection.beginTransaction();

    // Fetch existing inventory record FOR UPDATE
    const [existingRows] = await connection.query(
      `SELECT * FROM inventory WHERE inventory_id = ? FOR UPDATE`,
      [id]
    );

    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Inventory record not found' });
    }

    const existing = existingRows[0];
    const oldQty = existing.quantity;
    const oldSectionId = existing.section_id;
    const oldStatus = existing.status;

    // Lock both old and new sections (in deterministic order to avoid deadlocks)
    const sectionsToLock = [...new Set([oldSectionId, newSectionId])].sort((a, b) => a - b);
    for (const sId of sectionsToLock) {
      const [sCheck] = await connection.query(
        `SELECT * FROM warehouse_section WHERE section_id = ? FOR UPDATE`,
        [sId]
      );
      if (sCheck.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: `Warehouse section ${sId} not found.` });
      }
    }

    // Step 1: Release old stock from old section if it was 'Stored'
    if (oldStatus === 'Stored') {
      await connection.query(
        `UPDATE warehouse_section SET available_space = available_space + ? WHERE section_id = ?`,
        [oldQty, oldSectionId]
      );
    }

    // Step 2: If new status is 'Stored', check new section available space
    if (status === 'Stored') {
      const [newSectionRows] = await connection.query(
        `SELECT capacity, available_space FROM warehouse_section WHERE section_id = ?`,
        [newSectionId]
      );

      const newSection = newSectionRows[0];
      if (newQty > newSection.available_space) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Cannot update inventory: New quantity (${newQty}) exceeds available space in Section ${newSectionId} (Available: ${newSection.available_space} / Capacity: ${newSection.capacity}).`
        });
      }

      // Deduct new quantity from new section
      await connection.query(
        `UPDATE warehouse_section SET available_space = available_space - ? WHERE section_id = ?`,
        [newQty, newSectionId]
      );
    }

    // If status changed to Dispatched or Exited, and exit_date not provided, set to current date
    let effectiveExitDate = exit_date || null;
    if (status === 'Dispatched' && !effectiveExitDate) {
      effectiveExitDate = new Date().toISOString().split('T')[0];
    }

    // Step 3: Update inventory record
    await connection.query(
      `UPDATE inventory 
       SET product_id = ?, section_id = ?, employee_id = ?, quantity = ?, entry_date = ?, exit_date = ?, status = ?
       WHERE inventory_id = ?`,
      [product_id, newSectionId, employee_id, newQty, entry_date, effectiveExitDate, status, id]
    );

    await connection.commit();

    const [updatedRecord] = await pool.query(
      `SELECT 
        i.*,
        p.name AS product_name,
        p.category AS product_category,
        ws.temperature AS section_temperature,
        ws.available_space AS section_available_space,
        e.name AS employee_name
       FROM inventory i
       JOIN product p ON i.product_id = p.product_id
       JOIN warehouse_section ws ON i.section_id = ws.section_id
       JOIN employee e ON i.employee_id = e.employee_id
       WHERE i.inventory_id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Inventory record updated successfully',
      data: updatedRecord[0]
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// DELETE inventory
const deleteInventory = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid inventory ID' });
    }

    await connection.beginTransaction();

    // Check if referenced in dispatch
    const [dispatchCount] = await connection.query(
      `SELECT COUNT(*) AS count FROM dispatch WHERE inventory_id = ?`,
      [id]
    );

    if (dispatchCount[0].count > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: `Cannot delete inventory record: It is referenced by ${dispatchCount[0].count} dispatch record(s). Delete dispatch records first.`
      });
    }

    const [existingRows] = await connection.query(
      `SELECT * FROM inventory WHERE inventory_id = ? FOR UPDATE`,
      [id]
    );

    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Inventory record not found' });
    }

    const inv = existingRows[0];

    // If stock was 'Stored', return capacity to section
    if (inv.status === 'Stored') {
      await connection.query(
        `UPDATE warehouse_section SET available_space = available_space + ? WHERE section_id = ?`,
        [inv.quantity, inv.section_id]
      );
    }

    await connection.query(`DELETE FROM inventory WHERE inventory_id = ?`, [id]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Inventory record deleted successfully and section space reclaimed'
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory
};
