import React, { useState, useEffect, useRef } from 'react';
import { Layers, Plus, Trash2, Users, FileSpreadsheet, RefreshCw, ChevronRight, Wallet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FeeService, MemberService } from '../api/client';
import { ClassDetail } from './ClassDetail';
import { StudentEnrollment } from './StudentEnrollment';

export const Classes: React.FC = () => {
  const [feeGroups, setFeeGroups] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Class detail selected state
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Modals
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const [showAddStructureModal, setShowAddStructureModal] = useState(false);
  const [structureName, setStructureName] = useState('');
  const [structureAmount, setStructureAmount] = useState('');
  const [structureFrequency, setStructureFrequency] = useState('monthly');
  const [structureGroupId, setStructureGroupId] = useState('');

  // Full-page enrollment state
  const [enrollClassId, setEnrollClassId] = useState<string | null>(null);

  // Bulk import target class
  const [bulkImportClassId, setBulkImportClassId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [grpRes, structRes, memRes] = await Promise.all([
        FeeService.getGroups(),
        FeeService.getStructures(),
        MemberService.getAll(),
      ]);
      if (grpRes.data) setFeeGroups(grpRes.data);
      if (structRes.data) setFeeStructures(structRes.data);

      if (memRes.data) {
        const counts: Record<string, number> = {};
        memRes.data.forEach((m: any) => {
          if (m.feeGroupId) {
            counts[m.feeGroupId] = (counts[m.feeGroupId] || 0) + 1;
          }
        });
        setMemberCounts(counts);
      }
    } catch (e) {
      console.error('Failed to load classes & fees', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (enrollClassId) {
    return (
      <StudentEnrollment
        initialFeeGroupId={enrollClassId}
        onBack={() => setEnrollClassId(null)}
        onSuccess={() => {
          setEnrollClassId(null);
          fetchData();
        }}
      />
    );
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert('Please enter a class / group name');
      return;
    }
    try {
      await FeeService.createGroup({
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
      });
      setShowAddGroupModal(false);
      setGroupName('');
      setGroupDescription('');
      fetchData();
    } catch (err: any) {
      alert('Failed to create class: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structureName.trim() || !structureAmount || Number(structureAmount) <= 0) {
      alert('Please provide a valid fee structure name and amount');
      return;
    }
    try {
      await FeeService.createStructure({
        name: structureName.trim(),
        amount: Number(structureAmount),
        frequency: structureFrequency,
        feeGroupId: structureGroupId || undefined,
      });
      setShowAddStructureModal(false);
      setStructureName('');
      setStructureAmount('');
      setStructureGroupId('');
      fetchData();
    } catch (err: any) {
      alert('Failed to create fee package: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleQuickEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim() || !enrollClassId) {
      alert('First name is required');
      return;
    }
    setEnrolling(true);
    try {
      await MemberService.create({
        firstName: fName.trim(),
        lastName: lName.trim(),
        admissionNo: admNo.trim() || undefined,
        rollNo: rollNo.trim() || undefined,
        feeGroupId: enrollClassId,
        fatherName: fatherName.trim() || undefined,
        fatherPhone: fatherPhone.replace(/\D/g, '').slice(0, 10) || undefined,
        phone: fatherPhone.replace(/\D/g, '').slice(0, 10) || undefined,
        bloodGroup,
        gender: 'Male',
      });

      setEnrollClassId(null);
      setFName('');
      setLName('');
      setAdmNo('');
      setRollNo('');
      setFatherName('');
      setFatherPhone('');
      fetchData();
    } catch (err: any) {
      alert('Enrollment failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setEnrolling(false);
    }
  };

  const triggerBulkImportForClass = (classId: string) => {
    setBulkImportClassId(classId);
    fileInputRef.current?.click();
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bulkImportClassId) return;

    const targetClass = feeGroups.find((g) => g._id === bulkImportClassId);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          alert('Uploaded Excel is empty');
          return;
        }

        const parsedMembers = rawData.map((row) => ({
          firstName: row['First Name'] || row['firstName'] || row['Name'] || 'Student',
          lastName: row['Last Name'] || row['lastName'] || '',
          admissionNo: String(row['Admission No'] || row['admissionNo'] || ''),
          rollNo: String(row['Roll No'] || row['rollNo'] || ''),
          phone: String(row['Phone'] || row['Mobile'] || ''),
          fatherName: row['Father Name'] || '',
          fatherPhone: String(row['Father Phone'] || row['Parent Phone'] || ''),
          gender: row['Gender'] || 'Male',
          feeGroupId: bulkImportClassId,
        }));

        await MemberService.bulkImport(parsedMembers);
        alert(`Successfully enrolled ${parsedMembers.length} students into ${targetClass?.name || 'Class'}!`);
        fetchData();
      } catch (err: any) {
        alert('Excel enrollment failed: ' + err.message);
      } finally {
        setBulkImportClassId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete class "${name}"?`)) {
      try {
        await FeeService.deleteGroup(id);
        fetchData();
      } catch (err: any) {
        alert('Failed to delete class: ' + err.message);
      }
    }
  };

  const handleDeleteStructure = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete fee structure "${name}"?`)) {
      try {
        await FeeService.deleteStructure(id);
        fetchData();
      } catch (err: any) {
        alert('Failed to delete fee structure: ' + err.message);
      }
    }
  };

  // If a class is selected, show its full 6-tab Classroom Workspace
  if (selectedClassId) {
    return <ClassDetail classId={selectedClassId} onBack={() => setSelectedClassId(null)} />;
  }

  return (
    <div style={{ padding: '28px', overflowY: 'auto', height: '100%' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleExcelUpload}
        accept=".xlsx, .xls, .csv"
        style={{ display: 'none' }}
      />

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Classrooms & Fee Structures Manager
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Configure classroom sections, enroll students, and manage fee installment schedules
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowAddGroupModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>+ Create New Class / Section</span>
          </button>
          <button onClick={() => setShowAddStructureModal(true)} className="btn btn-secondary">
            <Plus size={16} />
            <span>+ New Fee Package</span>
          </button>
          <button onClick={fetchData} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        {/* Left Column: Classroom & Fee Groups with Enroll Actions */}
        <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: '#2563eb' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                School Classrooms ({feeGroups.length})
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Click any class to open Class Hub</span>
          </div>

          <table className="erp-table">
            <thead>
              <tr>
                <th>Class / Section</th>
                <th>Enrolled</th>
                <th style={{ textAlign: 'right' }}>Enroll & Manage</th>
              </tr>
            </thead>
            <tbody>
              {feeGroups.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading classes...' : 'No classes configured yet.'}
                  </td>
                </tr>
              ) : (
                feeGroups.map((g) => {
                  const count = memberCounts[g._id] || 0;
                  return (
                    <tr key={g._id}>
                      <td>
                        <div
                          onClick={() => setSelectedClassId(g._id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '14px' }}>
                            {g.name}
                          </span>
                          <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                            {g.description || 'Standard Class'}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">{count} Students</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => setEnrollClassId(g._id)}
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '8px' }}
                            title={`Enroll student into ${g.name}`}
                          >
                            <Plus size={12} />
                            <span>Enroll</span>
                          </button>

                          <button
                            onClick={() => triggerBulkImportForClass(g._id)}
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '11px', borderRadius: '8px' }}
                            title={`Bulk Excel import into ${g.name}`}
                          >
                            <FileSpreadsheet size={13} style={{ color: '#059669' }} />
                          </button>

                          <button
                            onClick={() => setSelectedClassId(g._id)}
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '11px', borderRadius: '8px' }}
                            title="Open Full Class Hub (Attendance, Diary, Exams)"
                          >
                            <ChevronRight size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteGroup(g._id, g.name)}
                            className="btn btn-danger"
                            style={{ padding: '5px 8px', fontSize: '11px', borderRadius: '8px' }}
                            title="Delete Class"
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

        {/* Right Column: Fee Structure Packages */}
        <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={18} style={{ color: '#059669' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                Fee Packages & Schedules ({feeStructures.length})
              </h3>
            </div>
          </div>

          <table className="erp-table">
            <thead>
              <tr>
                <th>Package Name</th>
                <th>Frequency</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {feeStructures.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading fee packages...' : 'No fee structures configured.'}
                  </td>
                </tr>
              ) : (
                feeStructures.map((s) => {
                  return (
                    <tr key={s._id}>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</span>
                      </td>
                      <td>
                        <span className="badge badge-info">{s.frequency || 'Monthly'}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        ₹{Number(s.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteStructure(s._id, s.name)}
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px' }}
                          title="Delete Package"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Quick Enroll into Specific Class */}
      {enrollClassId && (
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
          <div
            className="erp-card"
            style={{
              width: '540px',
              padding: '28px',
              backgroundColor: 'rgba(255,255,255,0.98)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '18px' }}>
              Enroll Student into {feeGroups.find((g) => g._id === enrollClassId)?.name}
            </h3>

            <form onSubmit={handleQuickEnroll} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="First Name"
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Last Name"
                    value={lName}
                    onChange={(e) => setLName(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Admission Number
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. ADM-2026-01"
                    value={admNo}
                    onChange={(e) => setAdmNo(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Roll Number
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 1"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Father Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Father Name"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Parent Phone (10 Digits)
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="10-digit mobile"
                    maxLength={10}
                    value={fatherPhone}
                    onChange={(e) => setFatherPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Blood Group
                </label>
                <select
                  className="input-field"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                >
                  <option value="N/A">N/A (Not Available)</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEnrollClassId(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {enrolling ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Class */}
      {showAddGroupModal && (
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
          <div className="erp-card" style={{ width: '420px', padding: '26px', backgroundColor: 'rgba(255,255,255,0.95)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px' }}>
              Create New Class / Section
            </h3>

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Class / Section Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Grade 10 - Section A"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Senior Secondary Academic Batch"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Fee Package */}
      {showAddStructureModal && (
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
          <div className="erp-card" style={{ width: '440px', padding: '26px', backgroundColor: 'rgba(255,255,255,0.95)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px' }}>
              Create New Fee Package
            </h3>

            <form onSubmit={handleCreateStructure} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Package / Fee Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Tuition Fee (Term 1)"
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Fee Amount (₹)
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 15000"
                  value={structureAmount}
                  onChange={(e) => setStructureAmount(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Payment Schedule / Frequency
                </label>
                <select
                  className="input-field"
                  value={structureFrequency}
                  onChange={(e) => setStructureFrequency(e.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual / One-Time</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Assign to Class / Group
                </label>
                <select
                  className="input-field"
                  value={structureGroupId}
                  onChange={(e) => setStructureGroupId(e.target.value)}
                >
                  <option value="">All Classes (General Fee)</option>
                  {feeGroups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStructureModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Fee Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
