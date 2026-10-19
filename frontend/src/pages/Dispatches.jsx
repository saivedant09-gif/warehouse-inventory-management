import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  MapPin,
  User,
  Package,
  CheckCircle2
} from 'lucide-react';

import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorMessage from '../components/ErrorMessage';
import {
  getDispatches,
  getDispatch,
  createDispatch,
  updateDispatch,
  deleteDispatch,
  getEmployees,
  getInventory
} from '../api/api';
import { formatDate, formatInputDate, formatNumber } from '../utils/formatters';

const initialFormData = {
  employee_id: '',
  inventory_id: '',
  vehicle_no: '',
  date: new Date().toISOString().split('T')[0],
  destination: '',
  markAsDispatched: true
};

const Dispatches = () => {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dropdown reference lists
  const [employeesList, setEmployeesList] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('All');

  // Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [detailDispatch, setDetailDispatch] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Delete Confirm
  const [deleteId, setDeleteId] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadDropdownReferences = async () => {
    try {
      const [empRes, invRes] = await Promise.all([
        getEmployees(),
        getInventory({ limit: 'all' })
      ]);
      setEmployeesList(empRes.data?.data || []);
      setInventoryList(invRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load references', err);
    }
  };

  const fetchDispatchList = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (dateFilter) params.date = dateFilter;
      if (employeeFilter !== 'All') params.employee_id = employeeFilter;

      const res = await getDispatches(params);
      setDispatches(res.data?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load dispatches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDropdownReferences();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDispatchList();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, dateFilter, employeeFilter]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      ...initialFormData,
      date: new Date().toISOString().split('T')[0]
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (disp, e) => {
    if (e) e.stopPropagation();
    setIsEditing(true);
    setEditingId(disp.dispatch_id);
    setFormData({
      employee_id: disp.employee_id || '',
      inventory_id: disp.inventory_id || '',
      vehicle_no: disp.vehicle_no || '',
      date: formatInputDate(disp.date),
      destination: disp.destination || '',
      markAsDispatched: false
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (disp) => {
    try {
      const res = await getDispatch(disp.dispatch_id);
      setDetailDispatch(res.data?.data || disp);
      setIsDetailOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to fetch dispatch details.');
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.employee_id) errors.employee_id = 'Please select a dispatch handler employee.';
    if (!formData.inventory_id) errors.inventory_id = 'Please select an inventory batch.';
    if (!formData.vehicle_no.trim()) errors.vehicle_no = 'Vehicle number is required.';
    if (!formData.date) errors.date = 'Dispatch date is required.';
    if (!formData.destination.trim()) errors.destination = 'Destination address is required.';
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
        await updateDispatch(editingId, formData);
        setSuccessMsg(`Dispatch #${editingId} updated successfully.`);
      } else {
        await createDispatch(formData);
        setSuccessMsg('New outbound dispatch recorded and stock status updated.');
      }
      setIsFormOpen(false);
      fetchDispatchList();
      loadDropdownReferences();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromptDelete = (disp, e) => {
    if (e) e.stopPropagation();
    setDeleteId(disp.dispatch_id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setError('');
    setSuccessMsg('');
    try {
      await deleteDispatch(deleteId);
      setSuccessMsg(`Dispatch record #${deleteId} deleted successfully.`);
      setIsConfirmOpen(false);
      setDeleteId(null);
      fetchDispatchList();
    } catch (err) {
      setError(err.message || 'Failed to delete dispatch record.');
      setIsConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'dispatch_id',
      width: '70px',
      render: (row) => <strong>#{row.dispatch_id}</strong>
    },
    {
      header: 'Dispatch Date',
      accessor: 'date',
      render: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} color="#64748b" />
          {formatDate(row.date)}
        </span>
      )
    },
    {
      header: 'Product Dispatched',
      accessor: 'product_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.product_name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Batch #{row.inventory_id} • {formatNumber(row.batch_quantity)} units
          </div>
        </div>
      )
    },
    {
      header: 'Vehicle Number',
      accessor: 'vehicle_no',
      render: (row) => <code>{row.vehicle_no}</code>
    },
    {
      header: 'Destination',
      accessor: 'destination',
      render: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} title={row.destination}>
          <MapPin size={14} color="#64748b" style={{ flexShrink: 0 }} />
          <span>{row.destination}</span>
        </span>
      )
    },
    {
      header: 'Handled By (Handles Rel.)',
      accessor: 'employee_name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.employee_name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.employee_designation}
          </div>
        </div>
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
            title="Edit Dispatch"
            onClick={(e) => handleOpenEdit(row, e)}
          >
            <Edit2 size={16} />
          </button>
          <button
            className="btn-icon btn-icon-danger"
            title="Delete Dispatch"
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
          <h2 className="page-title">Outbound Dispatch Logistics</h2>
          <p className="page-description">
            Records vehicle shipments, destination delivery hubs, and employee dispatch handlers.
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} /> Record New Dispatch
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
            placeholder="Search by vehicle, destination, product, or employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-group">
          <input
            type="date"
            className="filter-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            title="Filter by Dispatch Date"
          />
          {dateFilter && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setDateFilter('')}
              title="Clear date filter"
            >
              Clear Date
            </button>
          )}

          <select
            className="filter-select"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          >
            <option value="All">All Dispatch Officers</option>
            {employeesList.map((e) => (
              <option key={e.employee_id} value={e.employee_id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dispatches Table */}
      <DataTable
        columns={columns}
        data={dispatches}
        loading={loading}
        emptyTitle="No dispatches found"
        emptyDescription="No outbound shipments match your search criteria."
        onRowClick={handleOpenDetail}
      />

      {/* Add / Edit Dispatch Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditing ? `Edit Dispatch #${editingId}` : 'Record Outbound Dispatch'}
        maxWidth="600px"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">
              Handling Employee (Handles Relationship) <span className="required">*</span>
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

          <div className="form-group">
            <label className="form-label">
              Inventory Batch to Dispatch <span className="required">*</span>
            </label>
            <select
              className={`form-control ${formErrors.inventory_id ? 'error' : ''}`}
              value={formData.inventory_id}
              onChange={(e) => setFormData({ ...formData, inventory_id: e.target.value })}
            >
              <option value="">-- Select Inventory Batch --</option>
              {inventoryList.map((inv) => (
                <option key={inv.inventory_id} value={inv.inventory_id}>
                  Batch #{inv.inventory_id}: {inv.product_name} ({inv.quantity} units in Section {inv.section_id}) [{inv.status}]
                </option>
              ))}
            </select>
            {formErrors.inventory_id && <div className="form-error">{formErrors.inventory_id}</div>}
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Vehicle Number <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${formErrors.vehicle_no ? 'error' : ''}`}
                placeholder="e.g. KA-01-AB-1234"
                value={formData.vehicle_no}
                onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })}
              />
              {formErrors.vehicle_no && <div className="form-error">{formErrors.vehicle_no}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Dispatch Date <span className="required">*</span>
              </label>
              <input
                type="date"
                className={`form-control ${formErrors.date ? 'error' : ''}`}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
              {formErrors.date && <div className="form-error">{formErrors.date}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Destination Address <span className="required">*</span>
            </label>
            <textarea
              rows="2"
              className={`form-control ${formErrors.destination ? 'error' : ''}`}
              placeholder="e.g. Metro Supermarket Central Hub, Bangalore"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
            ></textarea>
            {formErrors.destination && <div className="form-error">{formErrors.destination}</div>}
          </div>

          {!isEditing && (
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={formData.markAsDispatched}
                  onChange={(e) => setFormData({ ...formData, markAsDispatched: e.target.checked })}
                />
                <span>
                  <strong>Mark inventory status as 'Dispatched'</strong> (automatically releases section capacity and sets batch exit date)
                </span>
              </label>
            </div>
          )}

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
              {submitting ? 'Saving...' : isEditing ? 'Update Dispatch' : 'Confirm Dispatch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Dispatch Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={detailDispatch ? `Dispatch Manifest #${detailDispatch.dispatch_id}` : 'Dispatch Details'}
        maxWidth="640px"
      >
        {detailDispatch && (
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
                <span className="section-stat-label">Dispatch ID</span>
                <div style={{ fontWeight: 600 }}>#{detailDispatch.dispatch_id}</div>
              </div>
              <div>
                <span className="section-stat-label">Dispatch Date</span>
                <div style={{ fontWeight: 600 }}>{formatDate(detailDispatch.date)}</div>
              </div>
              <div>
                <span className="section-stat-label">Vehicle No</span>
                <div><code>{detailDispatch.vehicle_no}</code></div>
              </div>
              <div>
                <span className="section-stat-label">Handled By</span>
                <div style={{ fontWeight: 600 }}>{detailDispatch.employee_name}</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>Destination</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px' }}>
                {detailDispatch.destination}
              </p>
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
              Inventory Batch Details
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '14px',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px'
              }}
            >
              <div>
                <span className="section-stat-label">Product Name</span>
                <div style={{ fontWeight: 600 }}>{detailDispatch.product_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {detailDispatch.product_category}
                </div>
              </div>
              <div>
                <span className="section-stat-label">Quantity Shipped</span>
                <div style={{ fontWeight: 700, color: '#2563eb', fontSize: '1.05rem' }}>
                  {formatNumber(detailDispatch.batch_quantity)} units
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  From Section {detailDispatch.section_id}
                </div>
              </div>
            </div>

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
        title="Delete Dispatch Record"
        message={`Are you sure you want to delete Dispatch Record #${deleteId}? This will remove the shipment log.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        loading={deleting}
      />
    </div>
  );
};

export default Dispatches;
