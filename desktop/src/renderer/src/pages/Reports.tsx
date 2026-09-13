import React, { useState, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  Search,
  Filter,
  Layers,
  PieChart,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ReportService, AcademicYearService } from '../api/client';
import { useAuth } from '../context/AuthContext';

type ReportTab = 'payments' | 'plans' | 'expenses';

export const Reports: React.FC = () => {
  const { selectedYearId, setSelectedYearId } = useAuth();

  const [activeTab, setActiveTab] = useState<ReportTab>('payments');
  const [loading, setLoading] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [academicYears, setAcademicYears] = useState<any[]>([]);

  // Data States
  const [summary, setSummary] = useState<{ collections: number; expenses: number; netBalance: number }>({
    collections: 0,
    expenses: 0,
    netBalance: 0,
  });

  // Payments Report State
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [totalPayments, setTotalPayments] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Plans & Addons State
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);

  // Expenses Breakdown State
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);

  // Fetch Academic Years list for selector
  useEffect(() => {
    const loadYears = async () => {
      try {
        const res = await AcademicYearService.getAll();
        if (Array.isArray(res.data)) {
          setAcademicYears(res.data);
        }
      } catch (err) {
        console.error('Failed to load academic years', err);
      }
    };
    loadYears();
  }, []);

  // Fetch KPI Summary
  const fetchSummary = async () => {
    try {
      const res = await ReportService.getSummary({
        academicYearId: selectedYearId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.data) {
        setSummary({
          collections: res.data.collections || 0,
          expenses: res.data.expenses || 0,
          netBalance: res.data.netBalance || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch report summary', err);
    }
  };

  // Fetch Payments Tab
  const fetchPayments = async () => {
    try {
      const res = await ReportService.getPayments({
        academicYearId: selectedYearId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        paymentMethod: paymentMethod !== 'all' ? paymentMethod : undefined,
        search: searchQuery || undefined,
        page,
        limit: 50,
      });
      if (res.data) {
        setPaymentsData(res.data.payments || []);
        setTotalPayments(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch payments report', err);
    }
  };

  // Fetch Plans Breakdown Tab
  const fetchPlans = async () => {
    try {
      const res = await ReportService.getPlansBreakdown({
        academicYearId: selectedYearId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.data) {
        setPlans(res.data.plans || []);
        setAddons(res.data.addons || []);
      }
    } catch (err) {
      console.error('Failed to fetch plans breakdown', err);
    }
  };

  // Fetch Expenses Breakdown Tab
  const fetchExpenses = async () => {
    try {
      const res = await ReportService.getExpenseBreakdown({
        academicYearId: selectedYearId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.data && Array.isArray(res.data.expenses)) {
        setExpenseCategories(res.data.expenses);
      }
    } catch (err) {
      console.error('Failed to fetch expense breakdown', err);
    }
  };

  const loadAllReports = async () => {
    setLoading(true);
    await Promise.all([
      fetchSummary(),
      activeTab === 'payments' ? fetchPayments() : Promise.resolve(),
      activeTab === 'plans' ? fetchPlans() : Promise.resolve(),
      activeTab === 'expenses' ? fetchExpenses() : Promise.resolve(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllReports();
  }, [selectedYearId, startDate, endDate, activeTab, paymentMethod, page]);

  // Search debounce for payments
  useEffect(() => {
    const handler = setTimeout(() => {
      if (activeTab === 'payments') {
        fetchPayments();
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const formatINR = (val: number = 0) => '₹' + Number(val || 0).toLocaleString('en-IN');

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (activeTab === 'payments') {
      const exportData = paymentsData.map((p) => ({
        'Receipt No': p.receiptNo || 'REC-GEN',
        'Student Name': p.memberName,
        'Fee Structure': p.structureName,
        'Fee Type': p.isAddon ? 'Addon Fee' : 'Tuition / Plan Fee',
        'Payment Mode': (p.paymentMethod || 'cash').toUpperCase(),
        Date: new Date(p.paymentDate).toLocaleDateString('en-IN'),
        Amount: p.amount,
        Notes: p.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Collections Audit');
      XLSX.writeFile(wb, `Fee_Collections_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (activeTab === 'plans') {
      const plansData = [
        ...plans.map((p) => ({
          Category: 'Regular Fee Plan',
          Name: p.name,
          Frequency: p.frequency,
          'Base Rate': p.amount,
          'Active Students': p.memberCount,
          'Total Collected': p.collectedAmount,
        })),
        ...addons.map((a) => ({
          Category: 'Addon Fee Package',
          Name: a.name,
          Frequency: a.frequency,
          'Base Rate': a.amount,
          'Active Students': a.memberCount,
          'Total Collected': a.collectedAmount,
        })),
      ];
      const ws = XLSX.utils.json_to_sheet(plansData);
      XLSX.utils.book_append_sheet(wb, ws, 'Plans Breakdown');
      XLSX.writeFile(wb, `Fee_Plans_Breakdown_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (activeTab === 'expenses') {
      const expData = expenseCategories.map((e) => ({
        Category: e._id,
        'Total Spent (INR)': e.total,
      }));
      const ws = XLSX.utils.json_to_sheet(expData);
      XLSX.utils.book_append_sheet(wb, ws, 'Expense Categories');
      XLSX.writeFile(wb, `Expense_Categories_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  };

  const handleQuickPreset = (type: 'this_month' | 'last_30' | 'all') => {
    const today = new Date();
    if (type === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (type === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (type === 'last_30') {
      const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setStartDate(past30);
      setEndDate(today.toISOString().slice(0, 10));
    }
  };

  const totalExpensesSum = expenseCategories.reduce((s, c) => s + c.total, 0) || 1;

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>
            Business & Financial Reports
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Comprehensive institutional collections, fee structure revenue ledgers, and expense audits
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={handleExportExcel} className="btn btn-secondary" title="Export current report tab to Excel">
            <Download size={16} color="#059669" />
            <span style={{ fontWeight: 700 }}>Export Sheet (.xlsx)</span>
          </button>
          <button onClick={loadAllReports} className="btn btn-secondary" style={{ padding: '8px 12px' }} title="Refresh reports">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div
        className="erp-card"
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>Period:</span>
          </div>

          <input
            type="date"
            className="input-field"
            style={{ width: '135px', padding: '6px 10px', fontSize: '12px' }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>to</span>
          <input
            type="date"
            className="input-field"
            style={{ width: '135px', padding: '6px 10px', fontSize: '12px' }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
            <button
              onClick={() => handleQuickPreset('this_month')}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: '#f8fafc',
                cursor: 'pointer',
                color: '#334155',
              }}
            >
              This Month
            </button>
            <button
              onClick={() => handleQuickPreset('last_30')}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: '#f8fafc',
                cursor: 'pointer',
                color: '#334155',
              }}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleQuickPreset('all')}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: !startDate && !endDate ? '#e2e8f0' : '#f8fafc',
                cursor: 'pointer',
                color: '#334155',
              }}
            >
              All Time
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>Session:</span>
          <select
            className="input-field"
            style={{ width: '170px', padding: '6px 10px', fontSize: '12px', fontWeight: 600 }}
            value={selectedYearId || ''}
            onChange={(e) => setSelectedYearId(e.target.value || null)}
          >
            <option value="">All Academic Years</option>
            {academicYears.map((ay) => (
              <option key={ay._id} value={ay._id}>
                {ay.name} {ay.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
        {/* Total Collections */}
        <div
          className="erp-card"
          style={{
            background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
            border: '1px solid #a7f3d0',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Collections
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(5, 150, 105, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#065f46', margin: '12px 0 4px 0' }}>
            {formatINR(summary.collections)}
          </h2>
          <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>
            Fee receipts deposited across all modes
          </span>
        </div>

        {/* Total Expenses */}
        <div
          className="erp-card"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 241, 242, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
            border: '1px solid #fecdd3',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Expenses
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(225, 29, 72, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#9f1239', margin: '12px 0 4px 0' }}>
            {formatINR(summary.expenses)}
          </h2>
          <span style={{ fontSize: '11px', color: '#be123c', fontWeight: 600 }}>
            Operational disbursements & utility bills
          </span>
        </div>

        {/* Net Balance */}
        <div
          className="erp-card"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
            border: '1px solid #bfdbfe',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Net Institutional Balance
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Scale size={18} />
            </div>
          </div>
          <h2
            style={{
              fontSize: '30px',
              fontWeight: 800,
              color: summary.netBalance >= 0 ? '#1e40af' : '#b91c1c',
              margin: '12px 0 4px 0',
            }}
          >
            {formatINR(summary.netBalance)}
          </h2>
          <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>
            Operating surplus / net cash flow
          </span>
        </div>
      </div>

      {/* Tab Navigation Ribbon */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', gap: '24px', marginTop: '4px' }}>
        <button
          onClick={() => {
            setActiveTab('payments');
            setPage(1);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 4px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'payments' ? 800 : 600,
            color: activeTab === 'payments' ? '#2563eb' : 'var(--text-muted)',
            borderBottom: activeTab === 'payments' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          }}
        >
          <Receipt size={17} />
          <span>Collections Audit Register</span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '10px',
              background: activeTab === 'payments' ? '#dbeafe' : '#f1f5f9',
              color: activeTab === 'payments' ? '#1d4ed8' : '#64748b',
              fontWeight: 700,
            }}
          >
            {totalPayments}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 4px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'plans' ? 800 : 600,
            color: activeTab === 'plans' ? '#2563eb' : 'var(--text-muted)',
            borderBottom: activeTab === 'plans' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={17} />
          <span>Fee Plans & Addon Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 4px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'expenses' ? 800 : 600,
            color: activeTab === 'expenses' ? '#2563eb' : 'var(--text-muted)',
            borderBottom: activeTab === 'expenses' ? '3px solid #2563eb' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          }}
        >
          <PieChart size={17} />
          <span>Expense Categories</span>
        </button>
      </div>

      {/* TAB 1: COLLECTIONS AUDIT REGISTER */}
      {activeTab === 'payments' && (
        <div className="erp-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Subheader Toolbar */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: '#fafcff',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                placeholder="Search student, receipt # or notes..."
                className="input-field"
                style={{ paddingLeft: '36px', height: '36px', fontSize: '13px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Payment Method Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={14} color="var(--text-muted)" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>Payment Mode:</span>
              <select
                className="input-field"
                style={{ width: '130px', padding: '6px 10px', fontSize: '12px', height: '36px' }}
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Modes</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI / QR</option>
                <option value="card">Card / POS</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Student Name</th>
                  <th>Fee Structure / Addon</th>
                  <th>Payment Mode</th>
                  <th>Transaction Date</th>
                  <th>Remarks / Notes</th>
                  <th style={{ textAlign: 'right' }}>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {paymentsData.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      {loading ? 'Fetching fee collection records...' : 'No payment transactions found matching criteria.'}
                    </td>
                  </tr>
                ) : (
                  paymentsData.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '12px' }}>
                          {p.receiptNo || 'REC-GEN'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                          {p.memberName}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: 500, fontSize: '13px' }}>
                            {p.structureName}
                          </span>
                          {p.isAddon && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: '#fef3c7',
                                color: '#b45309',
                                fontWeight: 700,
                              }}
                            >
                              Addon
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background:
                              p.paymentMethod === 'upi'
                                ? '#ecfdf5'
                                : p.paymentMethod === 'cash'
                                ? '#f1f5f9'
                                : '#eff6ff',
                            color:
                              p.paymentMethod === 'upi'
                                ? '#059669'
                                : p.paymentMethod === 'cash'
                                ? '#475569'
                                : '#2563eb',
                          }}
                        >
                          {p.paymentMethod || 'cash'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {new Date(p.paymentDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td style={{ color: 'var(--text-subtle)', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.notes || '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '13px' }}>
                        {formatINR(p.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fafcff',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Showing {paymentsData.length} of {totalPayments} payments (Page {page} of {totalPages})
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PLANS & ADDONS BREAKDOWN */}
      {activeTab === 'plans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Regular Fee Plans */}
          <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafcff' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Class Fee Plans & Tuition Structures
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Standard base fees assigned to classes & cohorts
              </p>
            </div>

            <table className="erp-table">
              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Billing Frequency</th>
                  <th>Rate (INR)</th>
                  <th>Enrolled Students</th>
                  <th style={{ textAlign: 'right' }}>Total Collections Generated</th>
                </tr>
              </thead>
              <tbody>
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No class fee plans found.
                    </td>
                  </tr>
                ) : (
                  plans.map((pl) => (
                    <tr key={pl.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{pl.name}</td>
                      <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {pl.frequency}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatINR(pl.amount)}</td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#eff6ff',
                            color: '#2563eb',
                          }}
                        >
                          {pl.memberCount} Students
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        {formatINR(pl.collectedAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Addon Fee Packages */}
          <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafcff' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Addon & Optional Services (Transport, Hostel, Books, Lab)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Supplementary recurring or one-time fee attachments
              </p>
            </div>

            <table className="erp-table">
              <thead>
                <tr>
                  <th>Addon Package Name</th>
                  <th>Billing Frequency</th>
                  <th>Rate (INR)</th>
                  <th>Subscribed Students</th>
                  <th style={{ textAlign: 'right' }}>Total Collections Generated</th>
                </tr>
              </thead>
              <tbody>
                {addons.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No addon fee packages found.
                    </td>
                  </tr>
                ) : (
                  addons.map((ad) => (
                    <tr key={ad.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{ad.name}</td>
                      <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {ad.frequency}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatINR(ad.amount)}</td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#fef3c7',
                            color: '#b45309',
                          }}
                        >
                          {ad.memberCount} Students
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        {formatINR(ad.collectedAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: EXPENSE BREAKDOWN */}
      {activeTab === 'expenses' && (
        <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafcff' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Institutional Expenses by Category
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Aggregated disbursements across infrastructure, salaries, utilities, and events
            </p>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {expenseCategories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                No expense entries recorded for this period.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {expenseCategories.map((exp) => {
                  const percentage = Math.round((exp.total / totalExpensesSum) * 100);
                  return (
                    <div
                      key={exp._id}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>
                          {exp._id}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {percentage}% of total
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '15px', color: '#e11d48' }}>
                            {formatINR(exp.total)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, percentage)}%`,
                            height: '100%',
                            borderRadius: '4px',
                            backgroundColor: '#e11d48',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
