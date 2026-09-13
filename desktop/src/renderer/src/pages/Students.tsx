import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  Printer,
  X,
  User,
  Receipt,
  Edit,
  DollarSign,
  FileText,
  Phone,
  Home,
  GraduationCap,
  CreditCard,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MemberService, FeeService } from '../api/client';
import { usePrinter } from '../context/PrinterContext';
import { useAuth } from '../context/AuthContext';
import { StudentEnrollment } from './StudentEnrollment';

export const Students: React.FC<{ onNavigateToPOSWithStudent?: (student: any) => void }> = ({
  onNavigateToPOSWithStudent,
}) => {
  const { entityName } = useAuth();
  const { printReceiptHtml, paperSize } = usePrinter();

  const [viewMode, setViewMode] = useState<'list' | 'enroll'>('list');
  const [students, setStudents] = useState<any[]>([]);
  const [feeGroups, setFeeGroups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  // Edit / Details State
  const [studentToEdit, setStudentToEdit] = useState<any | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any | null>(null);
  const [studentPayments, setStudentPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const [memRes, grpRes] = await Promise.all([
        MemberService.getAll({ feeGroupId: selectedGroup || undefined }),
        FeeService.getGroups(),
      ]);
      if (memRes.data) setStudents(memRes.data);
      if (grpRes.data) setFeeGroups(grpRes.data);
      if (selectedStudentDetail) {
        const updated = memRes.data?.find((m: any) => m._id === selectedStudentDetail._id);
        if (updated) setSelectedStudentDetail(updated);
      }
    } catch (e) {
      console.error('Failed to fetch students', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedGroup]);

  // View Student details & payment history
  const handleViewStudent = async (student: any) => {
    setSelectedStudentDetail(student);
    setLoadingPayments(true);
    try {
      const res = await FeeService.getPayments({ memberId: student._id });
      if (res.data) setStudentPayments(res.data);
    } catch (e) {
      console.error('Failed to load student payments', e);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Open Edit Workspace
  const handleEditStudent = (student: any) => {
    setStudentToEdit(student);
    setViewMode('enroll');
  };

  // Delete Student
  const handleDeleteStudent = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove student "${name}"?`)) {
      try {
        await MemberService.delete(id);
        if (selectedStudentDetail?._id === id) setSelectedStudentDetail(null);
        fetchStudents();
      } catch (err: any) {
        alert('Failed to remove student: ' + err.message);
      }
    }
  };

  // Filter students by search
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.admissionNo && s.admissionNo.toLowerCase().includes(q)) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.fatherPhone && s.fatherPhone.includes(q))
    );
  });

  // Handle Excel Bulk Import
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          alert('Uploaded Excel file is empty');
          setImporting(false);
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
          feeGroupId: selectedGroup || undefined,
        }));

        await MemberService.bulkImport(parsedMembers);
        alert(`Successfully imported ${parsedMembers.length} students!`);
        fetchStudents();
      } catch (err: any) {
        alert('Failed to import Excel file: ' + err.message);
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export current list to Excel
  const handleExportExcel = () => {
    const exportData = filteredStudents.map((s) => {
      const grp = feeGroups.find((g) => g._id === s.feeGroupId);
      return {
        'Admission No': s.admissionNo || s.knownId || '',
        'Roll No': s.rollNo || '',
        'First Name': s.firstName,
        'Last Name': s.lastName,
        'Class / Group': grp ? grp.name : 'Unassigned',
        'Parent Phone': s.fatherPhone || s.phone || '',
        'Father Name': s.fatherName || '',
        Status: s.status || 'Active',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students Roster');
    XLSX.writeFile(wb, `Students_Roster_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (viewMode === 'enroll') {
    return (
      <StudentEnrollment
        onBack={() => {
          setViewMode('list');
          setStudentToEdit(null);
        }}
        onSuccess={() => {
          setViewMode('list');
          setStudentToEdit(null);
          fetchStudents();
        }}
        editStudent={studentToEdit}
      />
    );
  }

  return (
    <div style={{ padding: '28px', overflowY: 'auto', height: '100%' }}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleExcelUpload}
        accept=".xlsx, .xls, .csv"
        style={{ display: 'none' }}
      />

      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Student Management Directory
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Complete administrative enrollment, family KYC, academic history, fee packages & POS ledger
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setStudentToEdit(null);
              setViewMode('enroll');
            }}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>+ Enroll New Student</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn btn-secondary"
            title="Upload .xlsx file with student records"
          >
            <FileSpreadsheet size={16} style={{ color: '#059669' }} />
            <span>{importing ? 'Importing...' : 'Import Excel (.xlsx)'}</span>
          </button>

          <button onClick={handleExportExcel} className="btn btn-secondary">
            <Download size={16} />
            <span>Export Roster</span>
          </button>

          <button onClick={fetchStudents} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className="erp-card"
        style={{
          padding: '16px 22px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Filter by name, admission no, roll no, aadhaar, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} style={{ color: 'var(--text-muted)' }} />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            style={{
              backgroundColor: '#ffffff',
              color: 'var(--text-main)',
              border: '1px solid var(--border-input)',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <option value="">All Classes / Groups</option>
            {feeGroups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Wide Data Table */}
      <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="erp-table">
          <thead>
            <tr>
              <th>Adm / SR No</th>
              <th>Student Name</th>
              <th>Roll No</th>
              <th>Class / Section</th>
              <th>Parent Mobile</th>
              <th>Father Name</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  {loading ? 'Loading student directory...' : 'No students found matching current filters.'}
                </td>
              </tr>
            ) : (
              filteredStudents.map((s) => {
                const group = feeGroups.find((g) => g._id === s.feeGroupId);
                return (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 800, color: '#2563eb' }}>
                      {s.admissionNo || s.knownId || '-'}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      <div>{s.firstName} {s.lastName}</div>
                      {s.gender && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {s.gender === 'male' ? '👦 Male' : s.gender === 'female' ? '👧 Female' : s.gender} {s.bloodGroup && s.bloodGroup !== 'N/A' ? `• ${s.bloodGroup}` : ''}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{s.rollNo || '-'}</td>
                    <td>
                      <span className="badge badge-info">{group ? group.name : 'General'}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {s.fatherPhone || s.contact || s.phone || '-'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.fatherName || '-'}</td>
                    <td>
                      <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                        {s.casteCategory || 'General'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handleViewStudent(s)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '8px' }}
                          title="View Complete Profile & Ledger"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleEditStudent(s)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 8px', fontSize: '11px', borderRadius: '8px', color: '#2563eb' }}
                          title="Edit Student Profile"
                        >
                          <Edit size={13} />
                        </button>
                        {onNavigateToPOSWithStudent && (
                          <button
                            onClick={() => onNavigateToPOSWithStudent(s)}
                            className="btn btn-primary"
                            style={{ padding: '5px 9px', fontSize: '11px', borderRadius: '8px' }}
                            title="Collect Fee via POS"
                          >
                            <DollarSign size={13} />
                            <span>Pay</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteStudent(s._id, `${s.firstName} ${s.lastName}`)}
                          className="btn btn-danger"
                          style={{ padding: '5px 8px', fontSize: '11px', borderRadius: '8px' }}
                          title="Delete Student"
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



      {/* Student Profile Drawer */}
      {selectedStudentDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: '640px',
              maxWidth: '92vw',
              height: '100%',
              backgroundColor: '#ffffff',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.12)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Student Profile & KYC Ledger
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    handleEditStudent(selectedStudentDetail);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Edit size={14} />
                  <span>Edit Profile</span>
                </button>
                {onNavigateToPOSWithStudent && (
                  <button
                    onClick={() => onNavigateToPOSWithStudent(selectedStudentDetail)}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    <DollarSign size={14} />
                    <span>POS Counter</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedStudentDetail(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Profile Header Card */}
            <div
              className="erp-card"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, #ffffff 100%)',
                border: '1px solid #bfdbfe',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <User size={28} />
                </div>
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {selectedStudentDetail.firstName} {selectedStudentDetail.middleName || ''} {selectedStudentDetail.lastName}
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Adm / SR: <strong>{selectedStudentDetail.admissionNo || selectedStudentDetail.knownId || 'N/A'}</strong> | Roll No: <strong>{selectedStudentDetail.rollNo || '-'}</strong> | Class: <strong>{feeGroups.find(g => g._id === selectedStudentDetail.feeGroupId)?.name || 'General'}</strong>
                  </p>
                </div>
              </div>

              {/* Demographics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <div>Gender: <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{selectedStudentDetail.gender || 'Male'}</strong></div>
                <div>DOB: <strong style={{ color: 'var(--text-main)' }}>{selectedStudentDetail.dob ? selectedStudentDetail.dob.slice(0, 10) : '-'}</strong></div>
                <div>Blood Group: <strong style={{ color: 'var(--text-main)' }}>{selectedStudentDetail.bloodGroup || 'N/A'}</strong></div>
                <div>Category: <strong style={{ color: 'var(--text-main)' }}>{selectedStudentDetail.casteCategory || 'General'}</strong></div>
                <div>Religion: <strong style={{ color: 'var(--text-main)' }}>{selectedStudentDetail.religion || '-'}</strong></div>
                <div>Mother Tongue: <strong style={{ color: 'var(--text-main)' }}>{selectedStudentDetail.motherTongue || '-'}</strong></div>
                <div>Aadhaar UID: <strong style={{ color: 'var(--text-main)' }}>{selectedStudentDetail.aadhaarNo || '-'}</strong></div>
                <div>APAAR ID: <strong style={{ color: 'var(--text-main)' }}>{selectedStudentDetail.apaarId || '-'}</strong></div>
                <div>Nationality: <strong style={{ color: 'var(--text-main)' }}>{selectedStudentDetail.nationality || 'Indian'}</strong></div>
              </div>

              {selectedStudentDetail.medicalNotes && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#b91c1c', backgroundColor: '#fef2f2', padding: '6px 10px', borderRadius: '6px' }}>
                  ⚠️ Medical Notes: {selectedStudentDetail.medicalNotes}
                </div>
              )}
            </div>

            {/* Family & Contact Details */}
            <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', marginBottom: '8px', textTransform: 'uppercase' }}>
                👨‍👩‍👧 Parents & Guardians
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div>Father: <strong>{selectedStudentDetail.fatherName || '-'}</strong></div>
                <div>Father Mobile: <strong>{selectedStudentDetail.fatherPhone || selectedStudentDetail.contact || '-'}</strong></div>
                <div>Father Occ: <strong>{selectedStudentDetail.fatherOccupation || '-'}</strong></div>
                <div>Father Qual: <strong>{selectedStudentDetail.fatherQualification || '-'}</strong></div>
                <div>Mother: <strong>{selectedStudentDetail.motherName || '-'}</strong></div>
                <div>Mother Mobile: <strong>{selectedStudentDetail.motherPhone || selectedStudentDetail.altContact || '-'}</strong></div>
                {selectedStudentDetail.guardianName && (
                  <div style={{ gridColumn: 'span 2' }}>
                    Guardian: <strong>{selectedStudentDetail.guardianName} ({selectedStudentDetail.guardianRelation || 'Local'}) - {selectedStudentDetail.guardianPhone || ''}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Address & Emergency */}
            <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', marginBottom: '8px', textTransform: 'uppercase' }}>
                🏠 Address & Emergency Contact
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-main)', marginBottom: '4px' }}>
                Present: <strong>{selectedStudentDetail.presentAddress || selectedStudentDetail.address || '-'}</strong>
                {selectedStudentDetail.city && `, ${selectedStudentDetail.city}`}
                {selectedStudentDetail.pincode && ` - ${selectedStudentDetail.pincode}`}
              </div>
              {selectedStudentDetail.emergencyContactName && (
                <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>
                  🚨 SOS Contact: <strong>{selectedStudentDetail.emergencyContactName} ({selectedStudentDetail.emergencyContactRelation || 'Contact'}) - {selectedStudentDetail.emergencyContactPhone}</strong>
                </div>
              )}
            </div>

            {/* Documents & KYC */}
            {selectedStudentDetail.documents && selectedStudentDetail.documents.length > 0 && (
              <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', marginBottom: '8px', textTransform: 'uppercase' }}>
                  📁 Attached KYC Documents ({selectedStudentDetail.documents.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedStudentDetail.documents.map((doc: any, i: number) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FileText size={12} color="#2563eb" />
                      <strong>{doc.title}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Payment History */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Fee Payment History ({studentPayments.length})
                </h4>
              </div>

              {loadingPayments ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Loading payment ledger...
                </div>
              ) : studentPayments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-subtle)', background: '#f8fafc', borderRadius: '10px' }}>
                  No payments recorded for this student yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {studentPayments.map((p) => (
                    <div
                      key={p._id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                          ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {p.receiptNo || 'REC-GEN'} • {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN')} • {(p.paymentMethod || 'cash').toUpperCase()}
                        </div>
                      </div>

                      <button
                        onClick={() => handleReprintReceipt(p)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '11px' }}
                        title="Reprint POS Receipt"
                      >
                        <Printer size={13} />
                        <span>Print Receipt</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
