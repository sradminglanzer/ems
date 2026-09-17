import React, { useState, useEffect } from 'react';
import {
  Search,
  Printer,
  CreditCard,
  User,
  CheckCircle,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { MemberService, FeeService } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePrinter } from '../context/PrinterContext';

export const FeeCounter: React.FC = () => {
  const { entityName, selectedYearId } = useAuth();
  const { printReceiptHtml, paperSize } = usePrinter();

  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [structures, setStructures] = useState<any[]>([]);
  const [selectedStructures, setSelectedStructures] = useState<string[]>([]);

  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'cheque'>('cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null);

  // Load students & fee structures
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [memRes, structRes] = await Promise.all([
          MemberService.getAll(),
          FeeService.getStructures(),
        ]);
        if (memRes.data) setStudents(memRes.data);
        if (structRes.data) setStructures(structRes.data);
      } catch (e) {
        console.error('Failed to load POS data', e);
      }
    };
    fetchData();
  }, []);

  // Handle student search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = students.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        (s.admissionNo && s.admissionNo.toLowerCase().includes(q)) ||
        (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.fatherPhone && s.fatherPhone.includes(q))
    );
    setFilteredStudents(matches.slice(0, 6));
  }, [searchQuery, students]);

  // Handle student selection
  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setFilteredStudents([]);
    setSuccessReceipt(null);

    // Auto-select student's assigned fee structure if available
    let baseAmount = 0;
    if (student.feeGroupId) {
      const match = structures.find((st) => st.feeGroupId === student.feeGroupId);
      if (match) {
        setSelectedStructures([match._id]);
        baseAmount = match.amount || 0;
        setPaymentAmount(baseAmount);
      } else if (structures.length > 0) {
        setSelectedStructures([structures[0]._id]);
        baseAmount = structures[0].amount || 0;
        setPaymentAmount(baseAmount);
      }
    } else if (structures.length > 0) {
      setSelectedStructures([structures[0]._id]);
      baseAmount = structures[0].amount || 0;
      setPaymentAmount(baseAmount);
    }

    // Auto-calculate concession discount if student has concession
    if (student.concessionType && student.concessionType !== 'none' && student.concessionValue > 0) {
      setDiscountAmount(Math.min(baseAmount, Number(student.concessionValue)));
    } else {
      setDiscountAmount(0);
    }
  };

  const toggleStructure = (structId: string, _amount: number) => {
    let updated: string[];
    if (selectedStructures.includes(structId)) {
      updated = selectedStructures.filter((id) => id !== structId);
    } else {
      updated = [...selectedStructures, structId];
    }
    setSelectedStructures(updated);

    const total = updated.reduce((sum, id) => {
      const st = structures.find((s) => s._id === id);
      return sum + (st ? st.amount : 0);
    }, 0);
    setPaymentAmount(total);
  };

  const finalPayable = Math.max(0, paymentAmount - discountAmount);

  // Generate Thermal Receipt HTML
  const generateReceiptHtml = (receiptNo: string, dateStr: string) => {
    const studentName = selectedStudent
      ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
      : 'Student';
    const admNo = selectedStudent?.admissionNo || selectedStudent?.knownId || 'N/A';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            color: #000;
            margin: 0;
            padding: 8px;
            width: ${paperSize === '58mm' ? '54mm' : '76mm'};
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .receipt-title { font-size: 14px; font-weight: bold; text-align: center; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 2px 0; }
        </style>
      </head>
      <body>
        <div class="receipt-title">${entityName}</div>
        <div class="text-center" style="font-size: 10px;">FEE PAYMENT RECEIPT</div>
        <div class="divider"></div>
        
        <table>
          <tr><td>Receipt #:</td><td class="text-right font-bold">${receiptNo}</td></tr>
          <tr><td>Date:</td><td class="text-right">${dateStr}</td></tr>
          <tr><td>Adm No:</td><td class="text-right font-bold">${admNo}</td></tr>
          <tr><td>Student:</td><td class="text-right font-bold">${studentName}</td></tr>
          <tr><td>Mode:</td><td class="text-right">${paymentMethod.toUpperCase()}</td></tr>
        </table>
        
        <div class="divider"></div>
        <table>
          <tr class="font-bold"><td>Item</td><td class="text-right">Amount</td></tr>
          ${selectedStructures
            .map((id) => {
              const st = structures.find((s) => s._id === id);
              return `<tr><td>${st ? st.name : 'Fee Installment'}</td><td class="text-right">₹${st ? st.amount : paymentAmount}</td></tr>`;
            })
            .join('')}
          ${discountAmount > 0 ? `<tr><td>Concession/Discount</td><td class="text-right">-₹${discountAmount}</td></tr>` : ''}
        </table>
        
        <div class="divider"></div>
        <table>
          <tr class="font-bold" style="font-size: 13px;">
            <td>TOTAL PAID:</td>
            <td class="text-right">₹${finalPayable}</td>
          </tr>
        </table>
        
        <div class="divider"></div>
        <div class="text-center" style="font-size: 10px; margin-top: 6px;">
          Thank You! Paid in Full.<br/>
          *** Computer Generated Slip ***
        </div>
      </body>
      </html>
    `;
  };

  const handleCollectAndPrint = async () => {
    if (!selectedStudent) {
      alert('Please select a student first');
      return;
    }
    if (finalPayable <= 0) {
      alert('Payable amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        memberId: selectedStudent._id,
        amount: finalPayable,
        discount: discountAmount,
        paymentMethod,
        feeStructureId: selectedStructures[0] || null,
        academicYearId: selectedYearId || null,
        notes: notes.trim() || undefined,
        paymentDate: new Date().toISOString(),
      };

      const res = await FeeService.createPayment(payload);
      const receiptNo = res.data?.receiptNo || `REC-${Math.floor(1000 + Math.random() * 9000)}`;
      const dateStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

      const receiptHtml = generateReceiptHtml(receiptNo, dateStr);
      setSuccessReceipt({ receiptNo, dateStr, html: receiptHtml, amount: finalPayable });

      // Direct Silent Hardware Printing
      await printReceiptHtml(receiptHtml);
    } catch (e: any) {
      console.error('Payment collection failed', e);
      alert('Payment collection failed: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setSelectedStructures([]);
    setPaymentAmount(0);
    setDiscountAmount(0);
    setNotes('');
    setSuccessReceipt(null);
  };

  return (
    <div style={{ padding: '28px', overflowY: 'auto', height: '100%' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Cashier POS Fee Counter
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Instant student billing, discount application, and 1-click thermal receipt printing
          </p>
        </div>
        <button onClick={handleReset} className="btn btn-secondary">
          <RotateCcw size={14} />
          <span>New Transaction</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
        {/* Left Column: Student Search & Payment Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Student Search Bar */}
          <div className="erp-card" style={{ padding: '18px 22px', position: 'relative' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Lookup Student
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', color: '#2563eb' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Type Admission No, Roll No, Student Name, or Parent Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '44px', fontSize: '14px', height: '46px', borderRadius: '12px' }}
                autoFocus
              />
            </div>

            {/* Autocomplete Dropdown */}
            {filteredStudents.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '22px',
                  right: '22px',
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid #bfdbfe',
                  borderRadius: '12px',
                  zIndex: 100,
                  boxShadow: '0 15px 35px rgba(0,0,0,0.12)',
                  marginTop: '6px',
                  overflow: 'hidden',
                }}
              >
                {filteredStudents.map((s) => (
                  <div
                    key={s._id}
                    onClick={() => handleSelectStudent(s)}
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>
                        {s.firstName} {s.lastName}
                      </span>
                      <span style={{ marginLeft: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Adm: <strong>{s.admissionNo || s.knownId || 'N/A'}</strong> | Roll: {s.rollNo || '-'}
                      </span>
                    </div>
                    <span className="badge badge-info">Select</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Student Profile Banner */}
          {selectedStudent ? (
            <div
              className="erp-card"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.9) 0%, rgba(255, 255, 255, 0.9) 100%)',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 6px 16px rgba(37, 99, 235, 0.25)',
                }}
              >
                <User size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h3>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>Adm No: <strong style={{ color: 'var(--text-main)' }}>{selectedStudent.admissionNo || selectedStudent.knownId || 'N/A'}</strong></span>
                  <span>Roll No: <strong style={{ color: 'var(--text-main)' }}>{selectedStudent.rollNo || '-'}</strong></span>
                  <span>Parent Phone: <strong style={{ color: 'var(--text-main)' }}>{selectedStudent.fatherPhone || selectedStudent.phone || 'N/A'}</strong></span>
                </div>
              </div>
              <span className="badge badge-success">Active</span>
            </div>
          ) : (
            <div
              className="erp-card"
              style={{ textAlign: 'center', padding: '34px', color: 'var(--text-subtle)', fontWeight: 500 }}
            >
              Search and select a student above to start collecting fee.
            </div>
          )}

          {/* Fee Installment Checklist */}
          {selectedStudent && (
            <div className="erp-card">
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px' }}>
                Select Fee Installments / Packages
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {structures.map((st) => {
                  const isChecked = selectedStructures.includes(st._id);
                  return (
                    <div
                      key={st._id}
                      onClick={() => toggleStructure(st._id, st.amount)}
                      style={{
                        padding: '13px 18px',
                        borderRadius: '10px',
                        backgroundColor: isChecked ? 'rgba(239, 246, 255, 0.95)' : 'rgba(255, 255, 255, 0.8)',
                        border: isChecked ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ cursor: 'pointer', width: '17px', height: '17px', accentColor: '#2563eb' }}
                        />
                        <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                          {st.name}
                        </span>
                      </div>
                      <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '14px' }}>
                        ₹{Number(st.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Details & Modes */}
          {selectedStudent && (
            <div className="erp-card">
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px' }}>
                Payment Options & Concessions
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Fee Amount (₹)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Discount / Concession (₹)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Payment Mode Pills */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Payment Method
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {(['cash', 'upi', 'card', 'cheque'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMethod(mode)}
                      className={`btn ${paymentMethod === mode ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, textTransform: 'uppercase', padding: '9px 0', fontSize: '12px', borderRadius: '10px' }}
                    >
                      {mode === 'upi' ? 'UPI QR' : mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Optional remarks or cheque number..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Receipt Preview & 1-Click Print */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="erp-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={18} style={{ color: '#2563eb' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Live Receipt Preview ({paperSize})
                </h3>
              </div>
              <span className="badge badge-info">POS Slip</span>
            </div>

            {/* Thermal Receipt Visual Container */}
            <div className="thermal-receipt-preview">
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>{entityName}</div>
              <div style={{ textAlign: 'center', fontSize: '10px', color: '#666' }}>FEE PAYMENT RECEIPT</div>
              <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Date:</span>
                <span>{new Date().toLocaleDateString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Student:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : '---'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Adm No:</span>
                <span>{selectedStudent?.admissionNo || selectedStudent?.knownId || '---'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mode:</span>
                <span>{paymentMethod.toUpperCase()}</span>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
                <span>Total Fee</span>
                <span>₹{paymentAmount}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                  <span>Discount</span>
                  <span>-₹{discountAmount}</span>
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                <span>NET PAYABLE:</span>
                <span>₹{finalPayable}</span>
              </div>

              <div style={{ textAlign: 'center', fontSize: '10px', color: '#666', marginTop: '12px' }}>
                *** Thank You! Paid in Full ***
              </div>
            </div>

            {/* Collect & Print Button */}
            <button
              onClick={handleCollectAndPrint}
              disabled={isSubmitting || !selectedStudent || finalPayable <= 0}
              className="btn btn-success"
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '15px',
                fontWeight: 800,
                marginTop: '22px',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
              }}
            >
              <Printer size={18} />
              <span>{isSubmitting ? 'Processing Payment...' : 'Collect & Print Receipt (F12)'}</span>
            </button>
          </div>

          {/* Success Notification */}
          {successReceipt && (
            <div
              className="erp-card"
              style={{
                background: 'linear-gradient(135deg, rgba(209, 250, 229, 0.9) 0%, rgba(255, 255, 255, 0.9) 100%)',
                border: '1px solid #6ee7b7',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <CheckCircle size={24} style={{ color: '#059669' }} />
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#065f46' }}>
                  Payment Successful!
                </h4>
                <p style={{ fontSize: '12px', color: '#047857' }}>
                  Receipt #{successReceipt.receiptNo} printed successfully.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
