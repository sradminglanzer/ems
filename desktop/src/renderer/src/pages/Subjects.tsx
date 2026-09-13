import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Layers,
  Tag,
  GraduationCap,
  Filter,
} from 'lucide-react';
import { SubjectService, FeeService } from '../api/client';

export const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');

  // Form Drawer / Sheet State
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formAssignedClasses, setFormAssignedClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [subjRes, classRes] = await Promise.all([
        SubjectService.getAll(),
        FeeService.getGroups(),
      ]);
      if (Array.isArray(subjRes.data)) {
        setSubjects(subjRes.data);
      }
      if (Array.isArray(classRes.data)) {
        setClasses(classRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load subjects', err);
      setErrorMsg(err?.response?.data?.message || 'Failed to load subjects or class rosters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const classMap = new Map<string, string>();
  classes.forEach((c) => classMap.set(c._id, c.name));

  const openCreateModal = () => {
    setEditingSubject(null);
    setFormName('');
    setFormCode('');
    setFormAssignedClasses([]);
    setShowForm(true);
  };

  const openEditModal = (sub: any) => {
    setEditingSubject(sub);
    setFormName(sub.name || '');
    setFormCode(sub.code || '');
    const assigned = (sub.assignedClasses || []).map((id: any) => (typeof id === 'object' ? id._id || id.toString() : id));
    setFormAssignedClasses(assigned);
    setShowForm(true);
  };

  const toggleClassAssignment = (classId: string) => {
    if (formAssignedClasses.includes(classId)) {
      setFormAssignedClasses(formAssignedClasses.filter((id) => id !== classId));
    } else {
      setFormAssignedClasses([...formAssignedClasses, classId]);
    }
  };

  const toggleSelectAllClasses = () => {
    if (formAssignedClasses.length === classes.length) {
      setFormAssignedClasses([]);
    } else {
      setFormAssignedClasses(classes.map((c) => c._id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('Subject name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        name: formName.trim(),
        code: formCode.trim() || undefined,
        assignedClasses: formAssignedClasses,
      };

      if (editingSubject) {
        await SubjectService.update(editingSubject._id, payload);
        setSuccessMsg(`Subject "${formName}" updated successfully.`);
      } else {
        await SubjectService.create(payload);
        setSuccessMsg(`Subject "${formName}" created successfully.`);
      }
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      console.error('Save failed', err);
      setErrorMsg(err?.response?.data?.message || 'Failed to save subject.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the subject "${name}"?`)) {
      return;
    }
    setDeletingId(id);
    setErrorMsg('');
    try {
      await SubjectService.delete(id);
      setSuccessMsg(`Subject "${name}" deleted.`);
      await fetchData();
    } catch (err: any) {
      console.error('Delete failed', err);
      setErrorMsg(err?.response?.data?.message || 'Cannot delete subject.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Subjects
  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedClassFilter) {
      const assigned = (s.assignedClasses || []).map((id: any) =>
        typeof id === 'object' ? id._id || id.toString() : id
      );
      return assigned.includes(selectedClassFilter);
    }

    return true;
  });

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>
            Curriculum & Subjects Directory
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Configure academic subjects, syllabus codes, and class-level curriculum mappings
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus size={16} />
            <span>Add Subject</span>
          </button>
          <button onClick={fetchData} className="btn btn-secondary" style={{ padding: '8px 12px' }} title="Refresh Subjects">
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

      {/* Add / Edit Drawer Sheet */}
      {showForm && (
        <div
          className="erp-card"
          style={{
            padding: '24px 28px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
            border: '1px solid #93c5fd',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e40af', margin: 0 }}>
              {editingSubject ? `Edit Subject: ${editingSubject.name}` : 'New Curriculum Subject'}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: 'none', border: 'none', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics, General Science, English"
                  className="input-field"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Subject Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. MATH-101, ENG-01"
                  className="input-field"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                />
              </div>
            </div>

            {/* Assigned Classes Multi-Select */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Assign to Classes / Cohorts ({formAssignedClasses.length} selected)
                </label>
                <button
                  type="button"
                  onClick={toggleSelectAllClasses}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {formAssignedClasses.length === classes.length ? 'Deselect All' : 'Select All Classes'}
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '140px', overflowY: 'auto', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                {classes.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No classes available. Create classes first.</span>
                ) : (
                  classes.map((cls) => {
                    const isSelected = formAssignedClasses.includes(cls._id);
                    return (
                      <button
                        type="button"
                        key={cls._id}
                        onClick={() => toggleClassAssignment(cls._id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSelected ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#1d4ed8' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Layers size={13} color={isSelected ? '#2563eb' : '#94a3b8'} />
                        <span>{cls.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                <CheckCircle size={15} />
                <span>{saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Save Subject'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toolbar & Filters */}
      <div
        className="erp-card"
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-subtle)' }} />
          <input
            type="text"
            placeholder="Search subjects by name or code..."
            className="input-field"
            style={{ paddingLeft: '36px', height: '36px', fontSize: '13px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>Filter Class:</span>
          <select
            className="input-field"
            style={{ width: '170px', padding: '6px 10px', fontSize: '12px', height: '36px' }}
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table of Subjects */}
      <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafcff' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Configured Subjects ({filteredSubjects.length})
          </h3>
        </div>

        <table className="erp-table">
          <thead>
            <tr>
              <th>Subject Name</th>
              <th>Subject Code</th>
              <th>Assigned Classes / Cohorts</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubjects.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {loading ? 'Fetching subjects catalog...' : 'No subjects found matching criteria.'}
                </td>
              </tr>
            ) : (
              filteredSubjects.map((sub) => {
                const assigned = (sub.assignedClasses || []).map((id: any) =>
                  typeof id === 'object' ? id._id || id.toString() : id
                );

                return (
                  <tr key={sub._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#eff6ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#2563eb',
                          }}
                        >
                          <BookMarked size={16} />
                        </div>
                        <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '14px' }}>
                          {sub.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      {sub.code ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#f1f5f9',
                            color: '#475569',
                            letterSpacing: '0.3px',
                          }}
                        >
                          {sub.code}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {assigned.length === 0 ? (
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                            Unassigned to any class
                          </span>
                        ) : (
                          assigned.map((clsId: string) => {
                            const name = classMap.get(clsId) || 'Class';
                            return (
                              <span
                                key={clsId}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                }}
                              >
                                {name}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => openEditModal(sub)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 8px', color: '#3b82f6' }}
                          title="Edit Subject"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(sub._id, sub.name)}
                          disabled={deletingId === sub._id}
                          className="btn btn-secondary"
                          style={{ padding: '6px 8px', color: '#ef4444' }}
                          title="Delete Subject"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
