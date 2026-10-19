const { pool } = require('../config/db');
const { isPositiveInteger, validateProduct } = require('../utils/validators');

// GET all products with optional search & category filter
const getAllProducts = async (req, res, next) => {
  try {
    const { search, category } = req.query;
    let query = `
      SELECT 
        p.*,
        COUNT(i.inventory_id) AS total_inventory_records,
        COALESCE(SUM(CASE WHEN i.status = 'Stored' THEN i.quantity ELSE 0 END), 0) AS total_active_quantity
      FROM product p
      LEFT JOIN inventory i ON p.product_id = i.product_id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      query += ` AND (p.name LIKE ? OR p.category LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category && category.trim() && category !== 'All') {
      query += ` AND p.category = ?`;
      params.push(category.trim());
    }

    query += ` GROUP BY p.product_id ORDER BY p.product_id DESC`;

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

// GET single product by ID
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const [products] = await pool.query(
      `SELECT * FROM product WHERE product_id = ?`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Also get inventory records for this product
    const [inventoryRows] = await pool.query(
      `SELECT 
        i.*,
        ws.temperature,
        ws.capacity AS section_capacity,
        e.name AS employee_name
       FROM inventory i
       JOIN warehouse_section ws ON i.section_id = ws.section_id
       JOIN employee e ON i.employee_id = e.employee_id
       WHERE i.product_id = ?
       ORDER BY i.entry_date DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...products[0],
        inventory: inventoryRows
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST create product
const createProduct = async (req, res, next) => {
  try {
    const errors = validateProduct(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const { name, category, weight, expiry_date } = req.body;
    const cleanWeight = weight !== undefined && weight !== '' ? parseFloat(weight) : null;
    const cleanExpiry = expiry_date ? expiry_date : null;

    const [result] = await pool.query(
      `INSERT INTO product (name, category, weight, expiry_date) VALUES (?, ?, ?, ?)`,
      [name.trim(), category.trim(), cleanWeight, cleanExpiry]
    );

    const [newProduct] = await pool.query(
      `SELECT * FROM product WHERE product_id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct[0]
    });
  } catch (error) {
    next(error);
  }
};

// PUT update product
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const errors = validateProduct(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const [existing] = await pool.query(`SELECT * FROM product WHERE product_id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { name, category, weight, expiry_date } = req.body;
    const cleanWeight = weight !== undefined && weight !== '' ? parseFloat(weight) : null;
    const cleanExpiry = expiry_date ? expiry_date : null;

    await pool.query(
      `UPDATE product SET name = ?, category = ?, weight = ?, expiry_date = ? WHERE product_id = ?`,
      [name.trim(), category.trim(), cleanWeight, cleanExpiry, id]
    );

    const [updated] = await pool.query(`SELECT * FROM product WHERE product_id = ?`, [id]);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

// DELETE product
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isPositiveInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    // Check if product is referenced in inventory
    const [invCount] = await pool.query(
      `SELECT COUNT(*) AS count FROM inventory WHERE product_id = ?`,
      [id]
    );

    if (invCount[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete product: It is referenced in ${invCount[0].count} inventory batch(es). Delete or reassign inventory records first.`
      });
    }

    const [result] = await pool.query(`DELETE FROM product WHERE product_id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
