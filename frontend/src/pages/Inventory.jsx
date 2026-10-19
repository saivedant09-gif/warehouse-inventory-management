import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Filter,
  Calendar,
  Layers,
  Thermometer,
  User,
  Package,
  AlertCircle
} from 'lucide-react';

import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorMessage from '../components/ErrorMessage';
import {
  getInventory,
  getInventoryItem,
  createInventory,
  updateInventory,
  deleteInventory,
  getProducts,
  getSections,
  getEmployees
} from '../api/api';
import {
  formatDate,
  formatInputDate,
  formatNumber,
  getStatusBadge
} from '../utils/formatters';

const initialFormData = {
  product_id: '',
  section_id: '',
  employee_id: '',
  quantity: '',
  entry_date: new Date().toISOString().split('T')[0],
  exit_date: '',
  status: 'Stored'
};

const Inventory = () => {
  const [inventoryList, setInventoryList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dropdown reference options fetched from APIs
  const [productsList, setProductsList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');

  // Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [detailItem, setDetailItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Delete Confirm
  const [deleteId, setDeleteId] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load dropdown lists once
  const loadDropdownReferences = async () => {
    try {
      const [prodRes, secRes, empRes] = await Promise.all([
        getProducts({}),
        getSections(),
        getEmployees()
      ]);
      setProductsList(prodRes.data?.data || []);
      setSectionsList(secRes.data?.data || []);
      setEmployeesList(empRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load reference dropdowns', err);
    }
  };

  const fetchInventoryList = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 10 };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'All') params.status = statusFilter;
      if (sectionFilter !== 'All') params.section_id = sectionFilter;
      if (productFilter !== 'All') params.product_id = productFilter;

      const res = await getInventory(params);
      const data = res.data;
      setInventoryList(data?.data || []);
      setPagination({
        page: data?.page || 1,
        totalPages: data?.totalPages || 1,
        total: data?.total || 0,
        limit: 10
      });
    } catch (err) {
      setError(err.message || 'Failed to load inventory records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDropdownReferences();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventoryList(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, sectionFilter, productFilter]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      ...initialFormData,
      entry_date: new Date().toISOString().split('T')[0]
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item, e) => {
    if (e) e.stopPropagation();
    setIsEditing(true);
    setEditingId(item.inventory_id);
    setFormData({
      product_id: item.product_id || '',
      section_id: item.section_id || '',
      employee_id: item.employee_id || '',
      quantity: item.quantity || '',
      entry_date: formatInputDate(item.entry_date),
      exit_date: formatInputDate(item.exit_date),
      status: item.status || 'Stored'
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (item) => {
    try {
      const res = await getInventoryItem(item.inventory_id);
      setDetailItem(res.data?.data || item);
      setIsDetailOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to load inventory batch details.');
    }
  };

  // Real-time capacity check for the currently selected section in the form modal
  const selectedSectionInfo = sectionsList.find(
    (s) => String(s.section_id) === String(formData.section_id)
  );

  const validate = () => {
    const errors = {};
    if (!formData.product_id) errors.product_id = 'Please select a product.';
    if (!formData.section_id) errors.section_id = 'Please select a warehouse section.';
    if (!formData.employee_id) errors.employee_id = 'Please select an assigning employee.';
    if (!formData.quantity || isNaN(formData.quantity) || Number(formData.quantity) <= 0) {
      errors.quantity = 'Quantity must be a positive integer.';
    }
    if (!formData.entry_date) errors.entry_date = 'Entry date is required.';
    if (formData.exit_date && formData.entry_date && formData.exit_date < formData.entry_date) {
      errors.exit_date = 'Exit date cannot precede entry date.';
    }

    // Capacity check in frontend (backed by strict DB transaction)
    if (!isEditing && formData.status === 'Stored' && selectedSectionInfo && formData.quantity) {
      const requestedQty = Number(formData.quantity);
      if (requestedQty > selectedSectionInfo.available_space) {
        errors.quantity = `Quantity (${requestedQty}) exceeds Section #${selectedSectionInfo.section_id} available space (${selectedSectionInfo.available_space} / Cap: ${selectedSectionInfo.capacity}).`;
      }
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
        await updateInventory(editingId, formData);
        setSuccessMsg(`Inventory batch #${editingId} updated successfully.`);
      } else {
        await createInventory(formData);
        setSuccessMsg('New inventory batch stored successfully.');
      }
      setIsFormOpen(false);
      fetchInventoryList(pagination.page);
      loadDropdownReferences(); // refresh section available capacities
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromptDelete = (item, e) => {
    if (e) e.stopPropagation();
    setDeleteId(item.inventory_id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setError('');
    setSuccessMsg('');
    try {
      await deleteInventory(deleteId);
      setSuccessMsg(`Inventory record #${deleteId} deleted and section space returned.`);
      setIsConfirmOpen(false);
      setDeleteId(null);
      fetchInventoryList(pagination.page);
      loadDropdownReferences();
    } catch (err) {
      setError(err.message || 'Failed to delete inventory record.');
      setIsConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Batch ID',
      accessor: 'inventory_id',
      width: '80px',
      render: (row) => <strong>#{row.inventory_id}</strong>
    },
    {
      header: 'Product (Stored In)',
      accessor: 'product_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.product_name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Category: {row.product_category}
          </div>
        </div>
      )
    },
    {
      header: 'Section (Contains)',
      accessor: 'section_id',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600 }}>Section {row.section_id}</span>
          <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>
            {row.section_temperature ? `${row.section_temperature}°C` : 'Ambient'}
          </div>
        </div>
      )
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      render: (row) => (
        <span style={{ fontSize: '0.925rem', fontWeight: 700 }}>
          {formatNumber(row.quantity)} units
        </span>
      )
    },
    {
      header: 'Entry Date',
      accessor: 'entry_date',
      render: (row) => formatDate(row.entry_date)
    },
    {
      header: 'Exit Date',
      accessor: 'exit_date',
      render: (row) => formatDate(row.exit_date)
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const badge = getStatusBadge(row.status);
        return <span className={`badge ${badge.class}`}>{badge.label}</span>;
      }
    },
    {
      header: 'Managed By',
      accessor: 'employee_name',
      render: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.825rem' }}>
          <User size={14} color="#64748b" />
          {row.employee_name}
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
            title="Edit Batch"
            onClick={(e) => handleOpenEdit(row, e)}
          >
            <Edit2 size={16} />
          </button>
          <button
            className="btn-icon btn-icon-danger"
            title="Delete Batch"
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
          <h2 className="page-title">Inventory Stock Management</h2>
          <p className="page-description">
            Safely manages stock allocation, transactions, and status updates while respecting section capacity constraints.
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} /> Store New Stock Batch
        </button>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError('')} />
      {successMsg && (
        <div className="success-banner">
          <span>{successMsg}</span>
        </div>
      )}

      {/* Toolbar / Search & Filters */}
      <div className="toolbar-card">
        <div className="search-input-wrapper">
          <Search size={16} className="search-input-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by product, category, or employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-group">
          {/* Status Filter */}
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Stored">Stored (In-Stock)</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Reserved">Reserved</option>
            <option value="Damaged">Damaged</option>
          </select>

          {/* Section Filter */}
          <select
            className="filter-select"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          >
            <option value="All">All Sections</option>
            {sectionsList.map((s) => (
              <option key={s.section_id} value={s.section_id}>
                Section {s.section_id} ({s.temperature ? `${s.temperature}°C` : 'Ambient'})
              </option>
            ))}
          </select>

          {/* Product Filter */}
          <select
            className="filter-select"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="All">All Products</option>
            {productsList.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory Table with Pagination */}
      <DataTable
        columns={columns}
        data={inventoryList}
        loading={loading}
        emptyTitle="No inventory records found"
        emptyDescription="No stock matches your search filter. Adjust filters or store a new stock batch."
        onRowClick={handleOpenDetail}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          onPageChange: (newPage) => fetchInventoryList(newPage)
        }}
      />

      {/* Add / Edit Inventory Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditing ? `Edit Inventory Batch #${editingId}` : 'Store New Stock Batch'}
        maxWidth="620px"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">
              Product <span className="required">*</span>
            </label>
            <select
              className={`form-control ${formErrors.product_id ? 'error' : ''}`}
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
            >
              <option value="">-- Select Product Catalog Item --</option>
              {productsList.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
            {formErrors.product_id && <div className="form-error">{formErrors.product_id}</div>}
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Warehouse Section (Contains) <span className="required">*</span>
              </label>
              <select
                className={`form-control ${formErrors.section_id ? 'error' : ''}`}
                value={formData.section_id}
                onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
              >
                <option value="">-- Select Section --</option>
                {sectionsList.map((s) => (
                  <option key={s.section_id} value={s.section_id}>
                    Section {s.section_id} — Avail: {s.available_space} / {s.capacity} (
                    {s.temperature ? `${s.temperature}°C` : 'Ambient'})
                  </option>
                ))}
              </select>
              {formErrors.section_id && <div className="form-error">{formErrors.section_id}</div>}
              {selectedSectionInfo && (
                <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '4px' }}>
                  Available space in Section {selectedSectionInfo.section_id}:{' '}
                  <strong>{selectedSectionInfo.available_space}</strong> units
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Managing Employee <span className="required">*</span>
              </label>
              <select
                className={`form-control ${formErrors.employee_id ? 'error' : ''}`}
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              >
                <option value="">-- Select Employee --</option>
                {employeesList.map((e) => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.name} ({e.designation})
                  </option>
                ))}
              </select>
              {formErrors.employee_id && <div className="form-error">{formErrors.employee_id}</div>}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Stock Quantity (Units) <span className="required">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                className={`form-control ${formErrors.quantity ? 'error' : ''}`}
                placeholder="e.g. 150"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
              {formErrors.quantity && <div className="form-error">{formErrors.quantity}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Status <span className="required">*</span>
              </label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Stored">Stored (Active in Section)</option>
                <option value="Dispatched">Dispatched (Exited Section)</option>
                <option value="Reserved">Reserved</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Entry Date <span className="required">*</span>
              </label>
              <input
                type="date"
                className={`form-control ${formErrors.entry_date ? 'error' : ''}`}
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
              />
              {formErrors.entry_date && <div className="form-error">{formErrors.entry_date}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Exit Date (Optional)</label>
              <input
                type="date"
                className={`form-control ${formErrors.exit_date ? 'error' : ''}`}
                value={formData.exit_date}
                onChange={(e) => setFormData({ ...formData, exit_date: e.target.value })}
              />
              {formErrors.exit_date && <div className="form-error">{formErrors.exit_date}</div>}
            </div>
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
              {submitting ? 'Saving...' : isEditing ? 'Update Batch' : 'Store Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Inventory Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={detailItem ? `Inventory Batch #${detailItem.inventory_id} Details` : 'Batch Details'}
        maxWidth="680px"
      >
        {detailItem && (
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
                <span className="section-stat-label">Product</span>
                <div style={{ fontWeight: 600 }}>{detailItem.product_name}</div>
              </div>
              <div>
                <span className="section-stat-label">Section</span>
                <div style={{ fontWeight: 600 }}>
                  Section {detailItem.section_id} ({detailItem.section_temperature ? `${detailItem.section_temperature}°C` : 'Ambient'})
                </div>
              </div>
              <div>
                <span className="section-stat-label">Quantity</span>
                <div style={{ fontWeight: 600 }}>{formatNumber(detailItem.quantity)} units</div>
              </div>
              <div>
                <span className="section-stat-label">Status</span>
                <div>
                  <span className={`badge ${getStatusBadge(detailItem.status).class}`}>
                    {detailItem.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="section-stat-label">Entry Date</span>
                <div style={{ fontWeight: 600 }}>{formatDate(detailItem.entry_date)}</div>
              </div>
              <div>
                <span className="section-stat-label">Exit Date</span>
                <div style={{ fontWeight: 600 }}>{formatDate(detailItem.exit_date)}</div>
              </div>
              <div>
                <span className="section-stat-label">Managing Staff</span>
                <div style={{ fontWeight: 600 }}>{detailItem.employee_name}</div>
              </div>
              <div>
                <span className="section-stat-label">Phone</span>
                <div><code>{detailItem.employee_phone || '—'}</code></div>
              </div>
            </div>

            {/* Associated Dispatches */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '10px' }}>
              Outbound Dispatches Linked to this Batch
            </h4>
            {detailItem.dispatches && detailItem.dispatches.length > 0 ? (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Dispatch ID</th>
                      <th>Date</th>
                      <th>Vehicle No</th>
                      <th>Destination</th>
                      <th>Handled By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailItem.dispatches.map((d) => (
                      <tr key={d.dispatch_id}>
                        <td><strong>#{d.dispatch_id}</strong></td>
                        <td>{formatDate(d.date)}</td>
                        <td><code>{d.vehicle_no}</code></td>
                        <td>{d.destination}</td>
                        <td>{d.employee_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No dispatches logged against this specific inventory batch yet.
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
        title="Delete Inventory Batch"
        message={`Are you sure you want to delete Inventory Batch #${deleteId}? If active, allocated capacity will be returned to the warehouse section. Dispatches linked to this batch will block deletion.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        loading={deleting}
      />
    </div>
  );
};

export default Inventory;
