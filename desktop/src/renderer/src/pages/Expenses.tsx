import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { ExpenseService } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Expenses: React.FC = () => {
  const { selectedYearId } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Salaries');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await ExpenseService.getAll({ academicYearId: selectedYearId });
      if (res.data?.expenses) {
        setExpenses(res.data.expenses);
      } else if (Array.isArray(res.data)) {
        setExpenses(res.data);
      }
    } catch (e) {
      console.error('Failed to load expenses', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedYearId]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) {
      alert('Please provide a valid title and amount');
      return;
    }

    try {
      await ExpenseService.create({
        title: title.trim(),
        amount: Number(amount),
        category,
        expenseDate,
        notes: notes.trim() || undefined,
        academicYearId: selectedYearId || undefined,
      });

      setShowAddModal(false);
      setTitle('');
      setAmount('');
      setNotes('');
      fetchExpenses();
    } catch (err: any) {
      alert('Failed to save expense: ' + err.message);
    }
  };

  const totalExpenseSum = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <div style={{ padding: '28px', overflowY: 'auto', height: '100%' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Institutional Expenses
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Record staff salaries, facility maintenance, utility bills, and expenditures
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Record New Expense</span>
          </button>
          <button onClick={fetchExpenses} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Header Total Card */}
      <div
        className="erp-card"
        style={{
          marginBottom: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(255, 241, 242, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%)',
          border: '1px solid #fecdd3',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase' }}>
            Total Recorded Expenses
          </span>
          <h2 style={{ fontSize: '30px', fontWeight: 800, color: '#9f1239', marginTop: '4px' }}>
            ₹{totalExpenseSum.toLocaleString('en-IN')}
          </h2>
        </div>
        <span className="badge badge-danger">{expenses.length} Records</span>
      </div>

      {/* Expense Data Grid */}
      <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="erp-table">
          <thead>
            <tr>
              <th>Title / Description</th>
              <th>Category</th>
              <th>Date</th>
              <th>Notes</th>
              <th style={{ textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  {loading ? 'Loading expenses...' : 'No expenses recorded for this period.'}
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp._id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{exp.title}</td>
                  <td>
                    <span className="badge badge-warning">{exp.category || 'General'}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString('en-IN') : '-'}
                  </td>
                  <td style={{ color: 'var(--text-subtle)', fontSize: '12px' }}>{exp.notes || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#e11d48' }}>
                    ₹{Number(exp.amount || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
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
          <div className="erp-card" style={{ width: '440px', padding: '28px', backgroundColor: 'rgba(255,255,255,0.95)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '18px' }}>
              Record New Expense
            </h3>

            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Title / Reason
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Science Lab Supplies or Electricity Bill"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Amount (₹)
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Salaries">Staff Salaries</option>
                  <option value="Utilities">Electricity / Water / Internet</option>
                  <option value="Maintenance">Maintenance & Repairs</option>
                  <option value="Supplies">Books & Stationery</option>
                  <option value="Transport">Transport & Fuel</option>
                  <option value="Events">School Events & Sports</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Date
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Notes
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Optional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
