import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  AlertCircle,
  Users,
  Wallet,
  ArrowUpRight,
  Receipt,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { DashboardService } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface DashboardStats {
  totalMembers: number;
  totalFeeGroups: number;
  totalFeeStructures: number;
  totalPendingAmount: number;
  collectionToday: number;
  collectionThisMonth: number;
  collectionLastMonth: number;
}

interface PaymentRecord {
  _id: string;
  amount: number;
  paymentDate: string;
  memberName: string;
  structureName: string;
  notes?: string;
}

export const Dashboard: React.FC<{ onNavigateToPOS: () => void }> = ({ onNavigateToPOS }) => {
  const { selectedYearId } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, reportsRes] = await Promise.all([
        DashboardService.getStats(selectedYearId),
        DashboardService.getReports(selectedYearId),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (reportsRes.data?.paymentHistory) {
        setRecentPayments(reportsRes.data.paymentHistory.slice(0, 8));
      }
    } catch (e) {
      console.error('Failed to load dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedYearId]);

  const formatINR = (val: number = 0) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  return (
    <div style={{ padding: '28px', overflowY: 'auto', height: '100%' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Executive Overview
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Real-time operations, fee collections, and institutional metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadDashboardData} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={onNavigateToPOS} className="btn btn-primary">
            <Receipt size={16} />
            <span>Open Fee Counter (POS)</span>
          </button>
        </div>
      </div>

      {/* 4 Main KPI Cards with Glassmorphism */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
          marginBottom: '26px',
        }}
      >
        {/* Card 1: Today Collection (Emerald Tint) */}
        <div
          className="erp-card"
          style={{
            background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.85) 0%, rgba(255, 255, 255, 0.8) 100%)',
            border: '1px solid rgba(167, 243, 208, 0.8)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Today's Collection
              </span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#065f46', margin: '6px 0 2px 0' }}>
                {formatINR(stats?.collectionToday)}
              </h2>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <TrendingUp size={22} />
            </div>
          </div>
          <span style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>
            This Month: <strong>{formatINR(stats?.collectionThisMonth)}</strong>
          </span>
        </div>

        {/* Card 2: Pending Deficits (Rose Tint) */}
        <div
          className="erp-card"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 241, 242, 0.85) 0%, rgba(255, 255, 255, 0.8) 100%)',
            border: '1px solid rgba(254, 205, 211, 0.8)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pending Deficits
              </span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#9f1239', margin: '6px 0 2px 0' }}>
                {formatINR(stats?.totalPendingAmount)}
              </h2>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e11d48',
              }}
            >
              <AlertCircle size={22} />
            </div>
          </div>
          <span style={{ fontSize: '12px', color: '#be123c', fontWeight: 600 }}>Active student fee dues</span>
        </div>

        {/* Card 3: Total Enrolled (Sky Blue Tint) */}
        <div
          className="erp-card"
          style={{
            background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.85) 0%, rgba(255, 255, 255, 0.8) 100%)',
            border: '1px solid rgba(186, 230, 253, 0.8)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Enrolled
              </span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0369a1', margin: '6px 0 2px 0' }}>
                {stats?.totalMembers || 0}
              </h2>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(2, 132, 199, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
              }}
            >
              <Users size={22} />
            </div>
          </div>
          <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>
            Across {stats?.totalFeeGroups || 0} Classes / Groups
          </span>
        </div>

        {/* Card 4: Fee Packages (Indigo Tint) */}
        <div
          className="erp-card"
          style={{
            background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.85) 0%, rgba(255, 255, 255, 0.8) 100%)',
            border: '1px solid rgba(199, 210, 254, 0.8)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Fee Packages
              </span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#3730a3', margin: '6px 0 2px 0' }}>
                {stats?.totalFeeStructures || 0}
              </h2>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(79, 70, 229, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5',
              }}
            >
              <Wallet size={22} />
            </div>
          </div>
          <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600 }}>Configured Fee Schedules</span>
        </div>
      </div>

      {/* Main Content Grid: Quick Actions + Recent Transactions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '22px' }}>
        {/* Left: Recent Fee Transactions Data Table */}
        <div className="erp-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 22px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Receipt size={18} style={{ color: '#2563eb' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                Recent Fee Collections
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: 500 }}>Live transaction feed</span>
          </div>

          <table className="erp-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Fee Structure</th>
                <th>Payment Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No recent payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                recentPayments.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.memberName}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.structureName}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(p.paymentDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ fontWeight: 800, color: '#059669' }}>{formatINR(p.amount)}</td>
                    <td>
                      <span className="badge badge-success">PAID</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Right: Quick Action Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="erp-card">
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px' }}>
              Quick POS Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={onNavigateToPOS}
                className="btn btn-primary"
                style={{ justifyContent: 'space-between', padding: '13px 18px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Receipt size={18} />
                  <span>New Fee Collection (F12)</span>
                </div>
                <ArrowUpRight size={16} />
              </button>

              <button
                onClick={() => alert('Press Students tab to import bulk roster')}
                className="btn btn-secondary"
                style={{ justifyContent: 'space-between', padding: '13px 18px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={18} />
                  <span>Bulk Student Import (.xlsx)</span>
                </div>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>

          <div
            className="erp-card"
            style={{
              background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.8) 0%, rgba(255, 255, 255, 0.9) 100%)',
              border: '1px solid #c7d2fe',
            }}
          >
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#3730a3', marginBottom: '8px' }}>
              💡 Cashier Pro Tip
            </h4>
            <p style={{ fontSize: '12px', color: '#4338ca', lineHeight: '1.5', fontWeight: 500 }}>
              Press <strong>F12</strong> from any screen to jump straight into the cashier fee counter for rapid student billing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
