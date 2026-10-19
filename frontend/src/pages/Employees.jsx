import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Briefcase,
  Boxes,
  Truck,
  Eye,
  CheckCircle2
} from 'lucide-react';

import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorMessage from '../components/ErrorMessage';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from '../api/api';
import { formatDate, formatNumber } from '../utils/formatters';

const initialFormData = {
  name: '',
  designation: '',
  phone: ''
};

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Delete Confirm
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchEmployeeList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployees();
      setEmployees(res.data?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeList();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (emp, e) => {
    if (e) e.stopPropagation();
    setIsEditing(true);
    setEditingId(emp.employee_id);
    setFormData({
      name: emp.name || '',
      designation: emp.designation || '',
      phone: emp.phone || ''
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenDetail = async (emp) => {
    try {
      const res = await getEmployee(emp.employee_id);
      setDetailEmployee(res.data?.data || emp);
      setIsDetailOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to fetch employee details.');
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Employee name is required.';
    if (!formData.designation.trim()) errors.designation = 'Designation is required.';
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (formData.phone.trim().length < 7 || formData.phone.trim().length > 15) {
      errors.phone = 'Phone number must be between 7 and 15 digits.';
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
        await updateEmployee(editingId, formData);
        setSuccessMsg(`Employee #${editingId} updated successfully.`);
      } else {
        await createEmployee(formData);
        setSuccessMsg('New employee record created successfully.');
      }
      setIsFormOpen(false);
      fetchEmployeeList();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromptDelete = (emp, e) => {
    if (e) e.stopPropagation();
    setDeleteId(emp.employee_id);
    setDeleteName(emp.name);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setError('');
    setSuccessMsg('');
    try {
      await deleteEmployee(deleteId);
      setSuccessMsg(`Employee #${deleteId} ("${deleteName}") deleted successfully.`);
      setIsConfirmOpen(false);
      setDeleteId(null);
      fetchEmployeeList();
    } catch (err) {
      setError(err.message || 'Failed to delete employee.');
      setIsConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'employee_id',
      width: '70px',
      render: (row) => <strong>#{row.employee_id}</strong>
    },
    {
      header: 'Employee Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Registered: {formatDate(row.created_at)}
          </div>
        </div>
      )
    },
    {
      header: 'Designation / Role',
      accessor: 'designation',
      render: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Briefcase size={14} color="#64748b" />
          {row.designation}
        </span>
      )
    },
    {
      header: 'Phone Number',
      accessor: 'phone',
      render: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Phone size={14} color="#64748b" />
          <code>{row.phone}</code>
        </span>
      )
    },
    {
      header: 'Managed By Rel.',
      accessor: 'total_inventory_managed',
      render: (row) => (
        <span className="badge badge-info" title="Inventory Batches Managed By this employee">
          <Boxes size={12} /> {row.total_inventory_managed} batches
        </span>
      )
    },
    {
      header: 'Handles Rel.',
      accessor: 'total_dispatches_handled',
      render: (row) => (
        <span className="badge badge-warning" title="Dispatches Handled By this employee">
          <Truck size={12} /> {row.total_dispatches_handled} shipments
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
            title="View Managed Records"
            onClick={() => handleOpenDetail(row)}
          >
            <Eye size={16} />
          </button>
          <button
            className="btn-icon btn-icon-primary"
            title="Edit Employee"
            onClick={(e) => handleOpenEdit(row, e)}
          >
            <Edit2 size={16} />
          </button>
          <button
            className="btn-icon btn-icon-danger"
            title="Delete Employee"
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
          <h2 className="page-title">Employee & Staff Directory</h2>
          <p className="page-description">
            Tracks warehouse personnel managing inventory intake and handling outbound dispatches.
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} /> Add New Employee
        </button>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError('')} />
      {successMsg && (
        <div className="success-banner">
          <span>{successMsg}</span>
        </div>
      )}

      {/* Employees Table */}
      <DataTable
        columns={columns}
        data={employees}
        loading={loading}
        emptyTitle="No employee records found"
        emptyDescription="Add staff members to assign inventory management and dispatch duties."
        onRowClick={handleOpenDetail}
      />

      {/* Add / Edit Employee Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditing ? `Edit Employee #${editingId}` : 'Add New Employee'}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">
              Full Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${formErrors.name ? 'error' : ''}`}
              placeholder="e.g. Rajesh Kumar"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {formErrors.name && <div className="form-error">{formErrors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Designation / Role <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${formErrors.designation ? 'error' : ''}`}
              placeholder="e.g. Warehouse Operations Manager, Cold Chain Supervisor"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            />
            {formErrors.designation && <div className="form-error">{formErrors.designation}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Phone Number <span className="required">*</span>
            </label>
            <input
              type="tel"
              className={`form-control ${formErrors.phone ? 'error' : ''}`}
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            {formErrors.phone && <div className="form-error">{formErrors.phone}</div>}
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
              {submitting ? 'Saving...' : isEditing ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Employee Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={detailEmployee ? `${detailEmployee.name} - Assigned Responsibilities` : 'Employee Details'}
        maxWidth="720px"
      >
        {detailEmployee && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px'
              }}
            >
              <div>
                <span className="section-stat-label">Role</span>
                <div style={{ fontWeight: 600 }}>{detailEmployee.designation}</div>
              </div>
              <div>
                <span className="section-stat-label">Phone</span>
                <div style={{ fontWeight: 600 }}><code>{detailEmployee.phone}</code></div>
              </div>
              <div>
                <span className="section-stat-label">Employee ID</span>
                <div style={{ fontWeight: 600 }}>#{detailEmployee.employee_id}</div>
              </div>
            </div>

            {/* Managed By: Inventory Section */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '10px' }}>
              Inventory Managed By {detailEmployee.name}
            </h4>
            {detailEmployee.managed_inventory && detailEmployee.managed_inventory.length > 0 ? (
              <div className="table-responsive" style={{ marginBottom: '20px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Batch ID</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Entry Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailEmployee.managed_inventory.map((inv) => (
                      <tr key={inv.inventory_id}>
                        <td><strong>#{inv.inventory_id}</strong></td>
                        <td>{inv.product_name}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                No active inventory batches directly managed by this employee.
              </p>
            )}

            {/* Handles: Dispatches Section */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '10px' }}>
              Dispatches Handled By {detailEmployee.name}
            </h4>
            {detailEmployee.handled_dispatches && detailEmployee.handled_dispatches.length > 0 ? (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Dispatch ID</th>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Vehicle</th>
                      <th>Destination</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailEmployee.handled_dispatches.map((disp) => (
                      <tr key={disp.dispatch_id}>
                        <td><strong>#{disp.dispatch_id}</strong></td>
                        <td>{formatDate(disp.date)}</td>
                        <td>{disp.product_name}</td>
                        <td><code>{disp.vehicle_no}</code></td>
                        <td>{disp.destination}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No outbound dispatches logged under this employee.
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
        title="Delete Employee Record"
        message={`Are you sure you want to delete ${deleteName} (ID #${deleteId})? This will fail if the employee is referenced in inventory batches or dispatch logs.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        loading={deleting}
      />
    </div>
  );
};

export default Employees;
