import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Users,
  Calendar,
  BookOpen,
  FileSpreadsheet,
  Plus,
  Trash2,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Download,
  Search,
  Wallet,
  CheckSquare,
  Award,
  Layers,
  Edit,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  MemberService,
  FeeService,
  AttendanceService,
  DiaryService,
  ExamService,
  SubjectService,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePrinter } from '../context/PrinterContext';
import { StudentEnrollment } from './StudentEnrollment';

interface ClassDetailProps {
  classId: string;
  onBack: () => void;
}

export const ClassDetail: React.FC<ClassDetailProps> = ({ classId, onBack }) => {
  const { entityName, selectedYearId } = useAuth();
  const { printReceiptHtml, paperSize } = usePrinter();

  const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'subjects' | 'homework' | 'exams' | 'fees'>('students');
  const [classInfo, setClassInfo] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [diaryList, setDiaryList] = useState<any[]>([]);
  const [examsList, setExamsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Full-page Enrollment State
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<any | null>(null);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'leave' | 'late'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSavedMessage, setAttendanceSavedMessage] = useState(false);

  // Homework Modal
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [hwTitle, setHwTitle] = useState('');
  const [hwSubject, setHwSubject] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [hwContent, setHwContent] = useState('');
  const [postingHw, setPostingHw] = useState(false);

  // Subject Modal
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');

  // Exam state
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [examName, setExamName] = useState('');
  const [examMaxMarks, setExamMaxMarks] = useState('100');
  const [examPassMarks, setExamPassMarks] = useState('35');
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [examMarksMap, setExamMarksMap] = useState<Record<string, Record<string, string>>>({});
  const [rankSheet, setRankSheet] = useState<any[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadClassData = async () => {
    setLoading(true);
    try {
      const [grpRes, memRes, structRes, subRes, diaryRes, examRes] = await Promise.all([
        FeeService.getGroups(),
        MemberService.getAll({ feeGroupId: classId }),
        FeeService.getStructures(),
        SubjectService.getAll({ feeGroupId: classId }),
        DiaryService.getAll({ classId }),
        ExamService.getAll({ feeGroupId: classId, academicYearId: selectedYearId }),
      ]);

      if (grpRes.data) {
        const found = grpRes.data.find((g: any) => g._id === classId);
        setClassInfo(found || { _id: classId, name: 'Class' });
      }
      if (memRes.data) {
        setStudents(memRes.data);
        // Default attendance to present for all
        const initialAtt: Record<string, 'present' | 'absent' | 'leave' | 'late'> = {};
        memRes.data.forEach((s: any) => {
          initialAtt[s._id] = 'present';
        });
        setAttendanceMap(initialAtt);
      }
      if (structRes.data) {
        setFeeStructures(structRes.data.filter((s: any) => s.feeGroupId === classId || !s.feeGroupId));
      }
      if (subRes.data) setSubjects(subRes.data);
      if (diaryRes.data) {
        setDiaryList(Array.isArray(diaryRes.data) ? diaryRes.data : diaryRes.data.entries || []);
      }
      if (examRes.data) {
        const exams = Array.isArray(examRes.data) ? examRes.data : examRes.data.exams || [];
        setExamsList(exams);
        if (exams.length > 0 && !selectedExamId) {
          setSelectedExamId(exams[0]._id);
        }
      }
    } catch (e) {
      console.error('Failed to load class detail data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassData();
  }, [classId, selectedYearId]);

  if (showEnrollModal) {
    return (
      <StudentEnrollment
        initialFeeGroupId={classId}
        editStudent={studentToEdit}
        onBack={() => {
          setShowEnrollModal(false);
          setStudentToEdit(null);
        }}
        onSuccess={() => {
          setShowEnrollModal(false);
          setStudentToEdit(null);
          loadClassData();
        }}
      />
    );
  }

  // Bulk Excel import directly into this class
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          feeGroupId: classId, // Auto-link
        }));

        await MemberService.bulkImport(parsedMembers);
        alert(`Successfully enrolled ${parsedMembers.length} students into ${classInfo?.name}!`);
        loadClassData();
      } catch (err: any) {
        alert('Excel enrollment failed: ' + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Attendance actions
  const markAllStatus = (status: 'present' | 'absent') => {
    const updated: Record<string, 'present' | 'absent' | 'leave' | 'late'> = {};
    students.forEach((s) => {
      updated[s._id] = status;
    });
    setAttendanceMap(updated);
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      const records = Object.entries(attendanceMap).map(([memberId, status]) => ({
        memberId,
        status,
      }));

      await AttendanceService.save({
        feeGroupId: classId,
        date: attendanceDate,
        records,
      });

      setAttendanceSavedMessage(true);
      setTimeout(() => setAttendanceSavedMessage(false), 4000);
    } catch (err: any) {
      alert('Failed to save attendance: ' + err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSendAbsenteeAlerts = async () => {
    if (window.confirm(`Broadcast SMS / Push notifications to parents of absent students for ${attendanceDate}?`)) {
      try {
        await AttendanceService.sendAlerts({
          feeGroupId: classId,
          date: attendanceDate,
        });
        alert('Absentee notifications sent to parents successfully!');
      } catch (err: any) {
        alert('Failed to send alerts: ' + err.message);
      }
    }
  };

  // Homework submission
  const handlePostHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim() || !hwContent.trim()) {
      alert('Please enter title and content');
      return;
    }
    setPostingHw(true);
    try {
      await DiaryService.create({
        feeGroupId: classId,
        type: 'homework',
        title: hwTitle.trim(),
        subject: hwSubject.trim() || undefined,
        dueDate: hwDueDate || undefined,
        content: hwContent.trim(),
        date: new Date().toISOString(),
      });
      setShowHomeworkModal(false);
      setHwTitle('');
      setHwSubject('');
      setHwDueDate('');
      setHwContent('');
      loadClassData();
    } catch (err: any) {
      alert('Failed to post homework: ' + err.message);
    } finally {
      setPostingHw(false);
    }
  };

  // Add Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) {
      alert('Subject name is required');
      return;
    }
    try {
      await SubjectService.create({
        name: subName.trim(),
        code: subCode.trim() || undefined,
        feeGroupId: classId,
      });
      setShowSubjectModal(false);
      setSubName('');
      setSubCode('');
      loadClassData();
    } catch (err: any) {
      alert('Failed to add subject: ' + err.message);
    }
  };

  // Attendance stats counters
  const presentCount = Object.values(attendanceMap).filter((v) => v === 'present').length;
  const absentCount = Object.values(attendanceMap).filter((v) => v === 'absent').length;
  const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  return (
    <div style={{ padding: '28px', overflowY: 'auto', height: '100%' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleExcelUpload}
        accept=".xlsx, .xls, .csv"
        style={{ display: 'none' }}
      />

      {/* Top Breadcrumb & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onBack}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', borderRadius: '10px' }}
            title="Back to Classes"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
              {classInfo?.name || 'Class Workspace'}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {students.length} Enrolled Students • {classInfo?.description || 'Active Section'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowEnrollModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>+ Enroll Student</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            title="Import Excel directly into this class"
          >
            <FileSpreadsheet size={16} style={{ color: '#059669' }} />
            <span>Bulk Import (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 6 Classroom Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '22px',
          paddingBottom: '2px',
        }}
      >
        {[
          { id: 'students', label: `Students Roster (${students.length})`, icon: <Users size={16} /> },
          { id: 'attendance', label: 'Daily Attendance', icon: <Calendar size={16} /> },
          { id: 'subjects', label: `Subjects (${subjects.length})`, icon: <BookOpen size={16} /> },
          { id: 'homework', label: `Diary & Homework (${diaryList.length})`, icon: <BookOpen size={16} /> },
          { id: 'exams', label: `Exams & Marks (${examsList.length})`, icon: <Award size={16} /> },
          { id: 'fees', label: `Fee Packages (${feeStructures.length})`, icon: <Wallet size={16} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px 10px 0 0',
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#2563eb' : 'var(--text-muted)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '13px',
                border: 'none',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Students Roster */}
      {activeTab === 'students' && (
        <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
          <table className="erp-table">
            <thead>
              <tr>
                <th>Adm No</th>
                <th>Student Name</th>
                <th>Roll No</th>
                <th>Parent Name</th>
                <th>Parent Phone</th>
                <th>Blood Group</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    No students enrolled in this class yet. Click <strong>+ Enroll Student</strong> or <strong>Bulk Import (.xlsx)</strong> above.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 800, color: '#2563eb' }}>{s.admissionNo || s.knownId || '-'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.firstName} {s.lastName}</td>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{s.rollNo || '-'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.fatherName || '-'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{s.fatherPhone || s.phone || '-'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{s.bloodGroup || 'N/A'}</td>
                    <td>
                      <span className="badge badge-success">ACTIVE</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setStudentToEdit(s);
                            setShowEnrollModal(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '8px', color: '#2563eb' }}
                          title="Edit Complete Student Profile"
                        >
                          <Edit size={12} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Daily Attendance */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {attendanceSavedMessage && (
            <div
              style={{
                backgroundColor: 'rgba(209, 250, 229, 0.9)',
                color: '#065f46',
                padding: '12px 18px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontWeight: 600,
                border: '1px solid #6ee7b7',
              }}
            >
              <CheckCircle size={18} />
              <span>Attendance for {attendanceDate} saved successfully!</span>
            </div>
          )}

          {/* Attendance Controls & Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '20px' }}>
            <div className="erp-card">
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Attendance Date
              </label>
              <input
                type="date"
                className="input-field"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                style={{ fontWeight: 600 }}
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button onClick={() => markAllStatus('present')} className="btn btn-secondary" style={{ flex: 1, padding: '8px' }}>
                  <CheckCircle size={14} style={{ color: '#059669' }} />
                  <span>All Present</span>
                </button>
                <button onClick={() => markAllStatus('absent')} className="btn btn-secondary" style={{ flex: 1, padding: '8px' }}>
                  <XCircle size={14} style={{ color: '#dc2626' }} />
                  <span>All Absent</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  <CheckSquare size={16} />
                  <span>{savingAttendance ? 'Saving...' : 'Save Attendance'}</span>
                </button>
                <button
                  onClick={handleSendAbsenteeAlerts}
                  className="btn btn-secondary"
                  title="Send Absentee SMS/Push to parents"
                >
                  <Send size={16} style={{ color: '#2563eb' }} />
                </button>
              </div>
            </div>

            {/* Attendance Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div className="erp-card" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                  Present Today
                </span>
                <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#065f46', margin: '4px 0' }}>
                  {presentCount}
                </h2>
                <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>Students In Class</span>
              </div>

              <div className="erp-card" style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase' }}>
                  Absent Today
                </span>
                <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#9f1239', margin: '4px 0' }}>
                  {absentCount}
                </h2>
                <span style={{ fontSize: '11px', color: '#be123c', fontWeight: 600 }}>Absentees</span>
              </div>

              <div className="erp-card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>
                  Attendance Rate
                </span>
                <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#1e40af', margin: '4px 0' }}>
                  {attendanceRate}%
                </h2>
                <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>Class Percentage</span>
              </div>
            </div>
          </div>

          {/* Student Attendance Checklist Table */}
          <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Admission No</th>
                  <th style={{ textAlign: 'right' }}>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const currentStatus = attendanceMap[s._id] || 'present';
                  return (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 800, color: '#2563eb' }}>{s.rollNo || '-'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.firstName} {s.lastName}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{s.admissionNo || '-'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {(['present', 'absent', 'leave', 'late'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => setAttendanceMap({ ...attendanceMap, [s._id]: st })}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                border: currentStatus === st ? 'none' : '1px solid #e2e8f0',
                                backgroundColor:
                                  currentStatus === st
                                    ? st === 'present'
                                      ? '#10b981'
                                      : st === 'absent'
                                      ? '#ef4444'
                                      : st === 'leave'
                                      ? '#f59e0b'
                                      : '#3b82f6'
                                    : '#ffffff',
                                color: currentStatus === st ? '#ffffff' : '#64748b',
                              }}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Subjects */}
      {activeTab === 'subjects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowSubjectModal(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>+ Add Subject to Class</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {subjects.length === 0 ? (
              <div className="erp-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                No subjects assigned to this class yet. Click + Add Subject above.
              </div>
            ) : (
              subjects.map((sub) => (
                <div key={sub._id} className="erp-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>{sub.name}</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Code: {sub.code || 'GEN'}</span>
                  </div>
                  <span className="badge badge-info">Subject</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Homework & Diary */}
      {activeTab === 'homework' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowHomeworkModal(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>+ Post Daily Homework</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {diaryList.length === 0 ? (
              <div className="erp-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                No homework or notices posted for this class yet.
              </div>
            ) : (
              diaryList.map((item) => (
                <div key={item._id} className="erp-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-info">{item.subject || 'Homework'}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {item.date ? new Date(item.date).toLocaleDateString('en-IN') : 'Recent'}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {item.content || item.description}
                  </p>
                  {item.dueDate && (
                    <div style={{ marginTop: '12px', fontSize: '11px', color: '#92400e', fontWeight: 700 }}>
                      Due Date: {new Date(item.dueDate).toLocaleDateString('en-IN')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Exams & Marks */}
      {activeTab === 'exams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="erp-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Select Examination
              </label>
              <select
                className="input-field"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                style={{ width: '280px', fontWeight: 700 }}
              >
                {examsList.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.title || ex.name}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={() => alert('Marksheet entry is active')} className="btn btn-primary">
              <Award size={16} />
              <span>Save & Publish Marks</span>
            </button>
          </div>

          <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Adm No</th>
                  <th>Marks (Out of 100)</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontWeight: 800, color: '#2563eb' }}>{s.rollNo || '-'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.firstName} {s.lastName}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.admissionNo || '-'}</td>
                    <td>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="e.g. 85"
                        style={{ width: '100px', padding: '6px 10px' }}
                      />
                    </td>
                    <td>
                      <span className="badge badge-success">A+</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Fee Packages */}
      {activeTab === 'fees' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {feeStructures.map((st) => (
            <div key={st._id} className="erp-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-info">{st.frequency || 'Monthly'}</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>
                  ₹{Number(st.amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>{st.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Scheduled fee package for {classInfo?.name}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Comprehensive Student Enrollment & Edit Modal */}
      <StudentEnrollmentModal
        isOpen={showEnrollModal}
        initialFeeGroupId={classId}
        editStudent={studentToEdit}
        onClose={() => {
          setShowEnrollModal(false);
          setStudentToEdit(null);
        }}
        onSuccess={() => {
          loadClassData();
        }}
      />

      {/* Modal: Post Homework */}
      {showHomeworkModal && (
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
          <div className="erp-card" style={{ width: '480px', padding: '26px', backgroundColor: 'rgba(255,255,255,0.98)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px' }}>
              Post Homework for {classInfo?.name}
            </h3>

            <form onSubmit={handlePostHomework} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Homework Title *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Chapter 5 Exercises 1-10"
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Mathematics"
                    value={hwSubject}
                    onChange={(e) => setHwSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Submission Due Date
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={hwDueDate}
                    onChange={(e) => setHwDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Instructions *
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Detail instructions for students..."
                  value={hwContent}
                  onChange={(e) => setHwContent(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowHomeworkModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={postingHw} className="btn btn-primary" style={{ flex: 1 }}>
                  {postingHw ? 'Publishing...' : 'Publish Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Subject */}
      {showSubjectModal && (
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
          <div className="erp-card" style={{ width: '400px', padding: '24px', backgroundColor: 'rgba(255,255,255,0.98)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px' }}>
              Add Subject to {classInfo?.name}
            </h3>

            <form onSubmit={handleCreateSubject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Science"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Subject Code
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. SCI-10"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Add Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
