import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  Plus,
  Edit2,
  Trash2,
  Thermometer,
  Layers,
  Percent,
  CheckCircle2,
  Info
} from 'lucide-react';

import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import {
  getSections,
  getSection,
  createSection,
  updateSection,
  deleteSection
} from '../api/api';
import { formatNumber, formatTemperature, formatDate } from '../utils/formatters';

const initialFormData = {
  temperature: '',
  capacity: '',
  available_space: ''
};

const WarehouseSections = () => {
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionDetails, setSectionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm
  const [deleteId, setDeleteId] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSectionsList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSections();
      const list = res.data?.data || [];
      setSections(list);
      // Auto-select first section if none selected
      if (!selectedSection && list.length > 0) {
        handleSelectSection(list[0]);
      } else if (selectedSection) {
        const refreshed = list.find((s) => s.section_id === selectedSection.section_id);
        if (refreshed) handleSelectSection(refreshed);
      }
    } catch (err) {
      setError(err.message || 'Failed to load warehouse sections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectionsList();
  }, []);

  const handleSelectSection = async (sec) => {
    setSelectedSection(sec);
    setDetailsLoading(true);
    try {
      const res = await getSection(sec.section_id);
      setSectionDetails(res.data?.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load section details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (sec, e) => {
    if (e) e.stopPropagation();
    setIsEditing(true);
    setEditingId(sec.section_id);
    setFormData({
      temperature: sec.temperature !== null && sec.temperature !== undefined ? sec.temperature : '',
      capacity: sec.capacity || '',
      available_space: sec.available_space !== null && sec.available_space !== undefined ? sec.available_space : ''
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validate = () => {
    const errors = {};
    if (!formData.capacity || isNaN(formData.capacity) || Number(formData.capacity) <= 0) {
      errors.capacity = 'Capacity must be a positive integer greater than 0.';
    }
    if (formData.temperature !== '' && isNaN(formData.temperature)) {
      errors.temperature = 'Temperature must be a valid number.';
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
        await updateSection(editingId, formData);
        setSuccessMsg(`Warehouse Section #${editingId} updated successfully.`);
      } else {
        await createSection(formData);
        setSuccessMsg('New warehouse section created successfully.');
      }
      setIsFormOpen(false);
      fetchSectionsList();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromptDelete = (sec, e) => {
    if (e) e.stopPropagation();
    setDeleteId(sec.section_id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setError('');
    setSuccessMsg('');
    try {
      await deleteSection(deleteId);
      setSuccessMsg(`Section #${deleteId} deleted successfully.`);
      setIsConfirmOpen(false);
      if (selectedSection?.section_id === deleteId) {
        setSelectedSection(null);
        setSectionDetails(null);
      }
      fetchSectionsList();
    } catch (err) {
      setError(err.message || 'Failed to delete section.');
      setIsConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading && sections.length === 0) {
    return <Loading message="Loading warehouse sections and capacity models..." />;
  }

  return (
    <div>
      <div className="page-header-row">
        <div className="page-intro">
          <h2 className="page-title">Warehouse Sections & Capacity Management</h2>
          <p className="page-description">
            Monitors section capacity invariants: <code>available_space = capacity - active stock units</code>.
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} /> Add New Section
        </button>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError('')} />
      {successMsg && (
        <div className="success-banner">
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid of Sections Cards */}
      <div className="sections-card-grid">
        {sections.map((sec) => {
          const isSelected = selectedSection?.section_id === sec.section_id;
          const utilPct = Number(sec.utilization_percentage || 0);
          const barClass = utilPct >= 90 ? 'danger' : utilPct >= 75 ? 'warning' : '';

          return (
            <div
              key={sec.section_id}
              className={`section-box-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelectSection(sec)}
            >
              <div className="section-box-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Warehouse size={20} color="#2563eb" />
                  <span className="section-box-id">Section #{sec.section_id}</span>
                </div>
                <div className="section-temp-tag">
                  <Thermometer size={14} />
                  <span>{formatTemperature(sec.temperature)}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="capacity-progress-container">
                <div className="capacity-progress-labels">
                  <span>Capacity Utilization</span>
                  <strong>{utilPct}%</strong>
                </div>
                <div className="capacity-progress-bar-bg">
                  <div
                    className={`capacity-progress-bar-fill ${barClass}`}
                    style={{ width: `${Math.min(utilPct, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats Box */}
              <div className="section-stats-row">
                <div className="section-stat-item">
                  <span className="section-stat-label">Total Capacity</span>
                  <span className="section-stat-val">{formatNumber(sec.capacity)}</span>
                </div>
                <div className="section-stat-item">
                  <span className="section-stat-label">Allocated Stock</span>
                  <span className="section-stat-val" style={{ color: '#2563eb' }}>
                    {formatNumber(sec.allocated_stock)}
                  </span>
                </div>
                <div className="section-stat-item">
                  <span className="section-stat-label">Available Space</span>
                  <span className="section-stat-val" style={{ color: '#10b981' }}>
                    {formatNumber(sec.available_space)}
                  </span>
                </div>
                <div className="section-stat-item">
                  <span className="section-stat-label">Total Batches</span>
                  <span className="section-stat-val">{sec.total_inventory_batches}</span>
                </div>
              </div>

              {/* Card Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <button
                  className="btn-icon btn-icon-primary"
                  title="Edit Section"
                  onClick={(e) => handleOpenEdit(sec, e)}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="btn-icon btn-icon-danger"
                  title="Delete Section"
                  onClick={(e) => handlePromptDelete(sec, e)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Section Details & Associated Inventory */}
      {selectedSection && (
        <div className="detail-card">
          <div className="detail-card-header">
            <div>
              <h3 className="detail-card-title">
                Section #{selectedSection.section_id} Inventory Batches (Contains Relationship)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Products currently stored inside this physical warehouse zone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleSelectSection(selectedSection)}
              >
                Refresh Batches
              </button>
            </div>
          </div>

          {detailsLoading ? (
            <Loading message="Loading section stock batches..." />
          ) : sectionDetails?.inventory && sectionDetails.inventory.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Weight</th>
                    <th>Quantity</th>
                    <th>Entry Date</th>
                    <th>Status</th>
                    <th>Managed By</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionDetails.inventory.map((inv) => (
                    <tr key={inv.inventory_id}>
                      <td><strong>#{inv.inventory_id}</strong></td>
                      <td>
                        <strong>{inv.product_name}</strong>
                      </td>
                      <td>
                        <span className="badge badge-default">{inv.product_category}</span>
                      </td>
                      <td>{inv.product_weight ? `${inv.product_weight} kg` : '—'}</td>
                      <td>
                        <strong>{formatNumber(inv.quantity)}</strong> units
                      </td>
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
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Info size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '0.9rem' }}>No inventory batches currently stored in Section #{selectedSection.section_id}.</p>
              <p style={{ fontSize: '0.8rem' }}>All {formatNumber(selectedSection.capacity)} units of capacity are available for allocation.</p>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Section Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditing ? `Edit Warehouse Section #${editingId}` : 'Add Warehouse Section'}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">
              Storage Capacity (Max Stock Units) <span className="required">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              className={`form-control ${formErrors.capacity ? 'error' : ''}`}
              placeholder="e.g. 1000"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            />
            {formErrors.capacity ? (
              <div className="form-error">{formErrors.capacity}</div>
            ) : (
              <div className="form-hint">
                Backend transaction verifies capacity reductions cannot be lower than existing active stock.
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Target Temperature (°C)</label>
            <input
              type="number"
              step="0.1"
              className={`form-control ${formErrors.temperature ? 'error' : ''}`}
              placeholder="e.g. -18.5 for Deep Freeze, 4.0 for Cold Chain, 24.0 for Dry"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
            />
            <div className="form-hint">Leave blank for ambient / non-refrigerated sections.</div>
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
              {submitting ? 'Saving...' : isEditing ? 'Update Section' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Warehouse Section"
        message={`Are you sure you want to delete Warehouse Section #${deleteId}? Foreign Key constraints will prevent deletion if inventory batches exist.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        loading={deleting}
      />
    </div>
  );
};

export default WarehouseSections;
