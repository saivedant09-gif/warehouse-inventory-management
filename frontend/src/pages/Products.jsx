import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Scale
} from 'lucide-react';

import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorMessage from '../components/ErrorMessage';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} from '../api/api';
import { formatDate, formatInputDate, formatWeight, formatNumber } from '../utils/formatters';

const initialFormData = {
  name: '',
  category: '',
  weight: '',
  expiry_date: ''
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modals & Forms
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [detailProduct, setDetailProduct] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Delete Confirm Dialog
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchProductList = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (categoryFilter !== 'All') params.category = categoryFilter;

      const res = await getProducts(params);
      setProducts(res.data?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductList();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, categoryFilter]);

  // Categories list derived from current products or defaults
  const categories = ['All', ...new Set(products.map((p) => p.category).filter(Boolean))];

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product, e) => {
    if (e) e.stopPropagation();
    setIsEditing(true);
    setEditingId(product.product_id);
    setFormData({
      name: product.name || '',
      category: product.category || '',
      weight: product.weight !== null && product.weight !== undefined ? product.weight : '',
      expiry_date: formatInputDate(product.expiry_date)
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (product) => {
    try {
      const res = await getProduct(product.product_id);
      setDetailProduct(res.data?.data || product);
      setIsDetailOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to fetch product details.');
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Product name is required.';
    if (!formData.category.trim()) errors.category = 'Category is required.';
    if (formData.weight !== '' && (isNaN(formData.weight) || Number(formData.weight) < 0)) {
      errors.weight = 'Weight must be a valid non-negative number.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      if (isEditing) {
        await updateProduct(editingId, formData);
        setSuccessMsg(`Product #${editingId} updated successfully.`);
      } else {
        await createProduct(formData);
        setSuccessMsg('New product created successfully.');
      }
      setIsFormOpen(false);
      fetchProductList();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromptDelete = (product, e) => {
    if (e) e.stopPropagation();
    setDeleteId(product.product_id);
    setDeleteName(product.name);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setError('');
    setSuccessMsg('');
    try {
      await deleteProduct(deleteId);
      setSuccessMsg(`Product #${deleteId} ("${deleteName}") deleted successfully.`);
      setIsConfirmOpen(false);
      setDeleteId(null);
      fetchProductList();
    } catch (err) {
      setError(err.message || 'Failed to delete product.');
      setIsConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'product_id',
      width: '70px',
      render: (row) => <strong>#{row.product_id}</strong>
    },
    {
      header: 'Product Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.name}</div>
        </div>
      )
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => <span className="badge badge-default">{row.category}</span>
    },
    {
      header: 'Weight',
      accessor: 'weight',
      render: (row) => formatWeight(row.weight)
    },
    {
      header: 'Expiry Date',
      accessor: 'expiry_date',
      render: (row) => {
        if (!row.expiry_date) return <span style={{ color: 'var(--text-muted)' }}>Non-perishable</span>;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={14} color="#64748b" />
            {formatDate(row.expiry_date)}
          </span>
        );
      }
    },
    {
      header: 'Active Stock',
      accessor: 'total_active_quantity',
      render: (row) => (
        <span>
          <strong>{formatNumber(row.total_active_quantity)}</strong> units
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      width: '120px',
      render: (row) => (
        <div className="table-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn-icon btn-icon-primary"
            title="View Details"
            onClick={() => handleOpenDetail(row)}
          >
            <Eye size={16} />
          </button>
          <button
            className="btn-icon btn-icon-primary"
            title="Edit Product"
            onClick={(e) => handleOpenEdit(row, e)}
          >
            <Edit2 size={16} />
          </button>
          <button
            className="btn-icon btn-icon-danger"
            title="Delete Product"
            onClick={(e) => handlePromptDelete(row, e)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="page-header-row">
        <div className="page-intro">
          <h2 className="page-title">Products Management</h2>
          <p className="page-description">
            Maintain product catalog specifications, weights, categories, and expiry deadlines.
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} /> Add New Product
        </button>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError('')} />
      {successMsg && (
        <div className="success-banner">
          <span>{successMsg}</span>
        </div>
      )}

      {/* Toolbar / Search & Filter */}
      <div className="toolbar-card">
        <div className="search-input-wrapper">
          <Search size={16} className="search-input-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by product name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-group">
          <label style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Category:
          </label>
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        emptyTitle="No products found"
        emptyDescription="Try adjusting your search criteria or create a new product catalog item."
        onRowClick={handleOpenDetail}
      />

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditing ? `Edit Product #${editingId}` : 'Add New Product'}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">
              Product Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${formErrors.name ? 'error' : ''}`}
              placeholder="e.g. Frozen Salmon Fillets"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {formErrors.name && <div className="form-error">{formErrors.name}</div>}
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Category <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${formErrors.category ? 'error' : ''}`}
                placeholder="e.g. Seafood, Dairy, Produce"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              {formErrors.category && <div className="form-error">{formErrors.category}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`form-control ${formErrors.weight ? 'error' : ''}`}
                placeholder="e.g. 1.50"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
              {formErrors.weight && <div className="form-error">{formErrors.weight}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Expiry Date (Optional)</label>
            <input
              type="date"
              className="form-control"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            />
            <div className="form-hint">Leave blank for non-perishable merchandise.</div>
          </div>

          <div className="modal-footer" style={{ margin: '0 -24px -24px -24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Product Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={detailProduct ? `${detailProduct.name} (ID: #${detailProduct.product_id})` : 'Product Details'}
        maxWidth="680px"
      >
        {detailProduct && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px'
              }}
            >
              <div>
                <span className="section-stat-label">Category</span>
                <div style={{ fontWeight: 600 }}>{detailProduct.category}</div>
              </div>
              <div>
                <span className="section-stat-label">Weight</span>
                <div style={{ fontWeight: 600 }}>{formatWeight(detailProduct.weight)}</div>
              </div>
              <div>
                <span className="section-stat-label">Expiry Date</span>
                <div style={{ fontWeight: 600 }}>{formatDate(detailProduct.expiry_date)}</div>
              </div>
              <div>
                <span className="section-stat-label">Created At</span>
                <div style={{ fontWeight: 600 }}>{formatDate(detailProduct.created_at)}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>
              Associated Inventory Batches (Stored In Relationship)
            </h4>

            {detailProduct.inventory && detailProduct.inventory.length > 0 ? (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Batch ID</th>
                      <th>Section</th>
                      <th>Quantity</th>
                      <th>Entry Date</th>
                      <th>Status</th>
                      <th>Managed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailProduct.inventory.map((inv) => (
                      <tr key={inv.inventory_id}>
                        <td><strong>#{inv.inventory_id}</strong></td>
                        <td>
                          Section {inv.section_id} ({inv.temperature ? `${inv.temperature}°C` : 'Ambient'})
                        </td>
                        <td>{formatNumber(inv.quantity)}</td>
                        <td>{formatDate(inv.entry_date)}</td>
                        <td>
                          <span
                            className={`badge ${
                              inv.status === 'Stored' ? 'badge-success' : 'badge-info'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td>{inv.employee_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No inventory batches currently allocated for this product.
              </p>
            )}

            <div className="modal-footer" style={{ margin: '20px -24px -24px -24px' }}>
              <button className="btn btn-secondary" onClick={() => setIsDetailOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteName}" (ID #${deleteId})? This action cannot be undone if not referenced.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        loading={deleting}
      />
    </div>
  );
};

export default Products;
