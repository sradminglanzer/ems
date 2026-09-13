import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, Phone, Lock, User, RefreshCw } from 'lucide-react';
import { StaffService } from '../api/client';

export const Staff: React.FC = () => {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New staff state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'staff' | 'teacher'>('staff');
  const [mpin, setMpin] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await StaffService.getAll();
      if (res.data) {
        setStaffList(Array.isArray(res.data) ? res.data : res.data.staff || []);
      }
    } catch (e) {
      console.error('Failed to load staff list', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '').trim();
    if (!name.trim() || cleanPhone.length < 10) {
      alert('Please enter a valid staff name and 10-digit mobile number');
      return;
    }

    setSaving(true);
    try {
      await StaffService.create({
        name: name.trim(),
        contactNumber: cleanPhone,
        role: role,
        mpin: mpin.replace(/\D/g, '').slice(0, 4) || '9999',
      });

      setShowAddModal(false);
      setName('');
      setPhone('');
      setMpin('');
      fetchStaff();
    } catch (err: any) {
      alert('Failed to add staff: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (id: string, staffName: string) => {
    if (window.confirm(`Remove staff member "${staffName}"?`)) {
      try {
        await StaffService.delete(id);
        fetchStaff();
      } catch (err: any) {
        alert('Failed to remove staff: ' + err.message);
      }
    }
  };

  return (
    <div style={{ padding: '28px', overflowY: 'auto', height: '100%' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Staff & Administrative Roles
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Manage school administrators, front-desk cashiers, and teaching staff credentials
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>+ Add Staff Member</span>
          </button>
          <button onClick={fetchStaff} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="erp-table">
          <thead>
            <tr>
              <th>Staff Name</th>
              <th>Role</th>
              <th>Contact Phone</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  {loading ? 'Loading staff records...' : 'No staff records found.'}
                </td>
              </tr>
            ) : (
              staffList.map((s) => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        {s.name ? s.name.slice(0, 2).toUpperCase() : 'ST'}
                      </div>
                      <span>{s.name}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        s.role === 'admin'
                          ? 'badge-danger'
                          : s.role === 'staff'
                          ? 'badge-info'
                          : 'badge-warning'
                      }`}
                    >
                      {s.role ? s.role.toUpperCase() : 'STAFF'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{s.contactNumber || s.phone || '-'}</td>
                  <td>
                    <span className="badge badge-success">ACTIVE</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleDeleteStaff(s._id, s.name)}
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px' }}
                      title="Remove Staff"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add Staff */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="erp-card" style={{ width: '440px', padding: '28px', backgroundColor: 'rgba(255,255,255,0.98)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '18px' }}>
              Add Staff / Teacher Member
            </h3>

            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Mobile Number (Login ID) *
                </label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Access Role
                </label>
                <select
                  className="input-field"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  <option value="staff">Staff / Cashier (Fee Collection & Rosters)</option>
                  <option value="teacher">Teacher (Attendance & Diary)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  4-Digit Login MPIN
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Default: 9999"
                  maxLength={4}
                  value={mpin}
                  onChange={(e) => setMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
                  {saving ? 'Adding...' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
