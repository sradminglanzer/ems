import React, { useState, useEffect } from 'react';
import {
  CalendarRange,
  Plus,
  CheckCircle,
  Calendar,
  Trash2,
  Edit2,
  RefreshCw,
  Star,
  Eye,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { AcademicYearService } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AcademicYears: React.FC = () => {
  const { selectedYearId, setSelectedYearId } = useAuth();

  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Drawer / Sheet State
  const [showForm, setShowForm] = useState(false);
  const [editingYear, setEditingYear] = useState<any | null>(null);
  const [formName, setFormName] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsActive, setFormIsActive] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchYears = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await AcademicYearService.getAll();
      if (Array.isArray(res.data)) {
        setYears(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load academic years', err);
      setErrorMsg(err?.response?.data?.message || 'Failed to load academic years.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const openCreateModal = () => {
    setEditingYear(null);
    setFormName('');
    setFormStartDate('');
    setFormEndDate('');
    setFormIsActive(years.length === 0);
    setShowForm(true);
  };

  const openEditModal = (yr: any) => {
    setEditingYear(yr);
    setFormName(yr.name || '');
    setFormStartDate(yr.startDate ? new Date(yr.startDate).toISOString().slice(0, 10) : '');
    setFormEndDate(yr.endDate ? new Date(yr.endDate).toISOString().slice(0, 10) : '');
    setFormIsActive(!!yr.isActive);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formStartDate || !formEndDate) {
      setErrorMsg('Please fill in session name, start date, and end date.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      if (editingYear) {
        await AcademicYearService.update(editingYear._id, {
          name: formName.trim(),
          startDate: formStartDate,
          endDate: formEndDate,
          isActive: formIsActive,
        });
        setSuccessMsg(`Academic year "${formName}" updated successfully.`);
      } else {
        await AcademicYearService.create({
          name: formName.trim(),
          startDate: formStartDate,
          endDate: formEndDate,
          isActive: formIsActive,
        });
        setSuccessMsg(`Academic year "${formName}" created successfully.`);
      }
      setShowForm(false);
      await fetchYears();
    } catch (err: any) {
      console.error('Save failed', err);
      setErrorMsg(err?.response?.data?.message || 'Failed to save academic session.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (yr: any) => {
    try {
      await AcademicYearService.setActive(yr._id);
      setSelectedYearId(yr._id);
      setSuccessMsg(`"${yr.name}" is now set as the default active academic year.`);
      await fetchYears();
    } catch (err: any) {
      console.error('Failed to set active year', err);
      setErrorMsg(err?.response?.data?.message || 'Failed to set active year.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    setErrorMsg('');
    try {
      await AcademicYearService.delete(id);
      setSuccessMsg(`Academic year "${name}" deleted.`);
      if (selectedYearId === id) {
        setSelectedYearId(null);
      }
      await fetchYears();
    } catch (err: any) {
      console.error('Delete failed', err);
      setErrorMsg(err?.response?.data?.message || 'Cannot delete academic session.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>
            Academic Years & Sessions
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Manage institutional cohorts, annual terms, default active sessions, and multi-year viewing scopes
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus size={16} />
            <span>Add Academic Session</span>
          </button>
          <button onClick={fetchYears} className="btn btn-secondary" style={{ padding: '8px 12px' }} title="Refresh Sessions">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={17} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <CheckCircle size={17} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add / Edit Workspace Sheet */}
      {showForm && (
        <div
          className="erp-card"
          style={{
            padding: '22px 26px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
            border: '1px solid #93c5fd',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e40af', margin: 0 }}>
              {editingYear ? `Edit Academic Session: ${editingYear.name}` : 'New Academic Session'}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: 'none', border: 'none', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                Academic Session Name *
              </label>
              <input
                type="text"
                placeholder="e.g. 2024-2025"
                className="input-field"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                Start Date *
              </label>
              <input
                type="date"
                className="input-field"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                End Date *
              </label>
              <input
                type="date"
                className="input-field"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                />
                Set as Default Active Session
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
                <CheckCircle size={15} />
                <span>{saving ? 'Saving...' : editingYear ? 'Update Session' : 'Save Session'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Academic Year Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
        {years.length === 0 ? (
          <div
            className="erp-card"
            style={{
              gridColumn: '1 / -1',
              padding: '48px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <CalendarRange size={40} color="var(--text-subtle)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              No Academic Sessions Configured
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 16px 0' }}>
              Create an academic session to begin organizing classes, fees, and student admissions.
            </p>
            <button onClick={openCreateModal} className="btn btn-primary" style={{ margin: '0 auto' }}>
              <Plus size={16} />
              <span>Create First Session</span>
            </button>
          </div>
        ) : (
          years.map((yr) => {
            const isDefaultActive = !!yr.isActive;
            const isCurrentlyViewing = selectedYearId === yr._id;

            return (
              <div
                key={yr._id}
                className="erp-card"
                style={{
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  border: isCurrentlyViewing
                    ? '2px solid #3b82f6'
                    : isDefaultActive
                    ? '1.5px solid #10b981'
                    : '1px solid var(--border-subtle)',
                  background: isCurrentlyViewing
                    ? 'linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)'
                    : '#ffffff',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Header with Badges */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: isDefaultActive ? '#ecfdf5' : '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDefaultActive ? '#059669' : '#475569',
                      }}
                    >
                      <CalendarRange size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                        {yr.name}
                      </h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Annual Term
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {isDefaultActive && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#d1fae5',
                          color: '#065f46',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Star size={12} fill="#065f46" />
                        Default Active
                      </span>
                    )}
                    {isCurrentlyViewing && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#dbeafe',
                          color: '#1e40af',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Eye size={12} />
                        Viewing In ERP
                      </span>
                    )}
                  </div>
                </div>

                {/* Date Span */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(241, 245, 249, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="var(--text-subtle)" />
                    <span>
                      {yr.startDate ? new Date(yr.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  <ArrowRight size={13} color="var(--text-subtle)" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="var(--text-subtle)" />
                    <span>
                      {yr.endDate ? new Date(yr.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!isCurrentlyViewing && (
                      <button
                        onClick={() => setSelectedYearId(yr._id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 700 }}
                        title="Switch entire ERP desktop view to this session"
                      >
                        <Eye size={13} />
                        <span>Switch View</span>
                      </button>
                    )}

                    {!isDefaultActive && (
                      <button
                        onClick={() => handleSetActive(yr)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 700, color: '#059669' }}
                        title="Set as global active year for new entries"
                      >
                        <Star size={13} />
                        <span>Set Default</span>
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => openEditModal(yr)}
                      className="btn btn-secondary"
                      style={{ padding: '6px', color: '#3b82f6' }}
                      title="Edit Academic Session"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(yr._id, yr.name)}
                      disabled={deletingId === yr._id || isDefaultActive}
                      className="btn btn-secondary"
                      style={{ padding: '6px', color: isDefaultActive ? '#94a3b8' : '#ef4444' }}
                      title={isDefaultActive ? 'Cannot delete default active session' : 'Delete Academic Session'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
