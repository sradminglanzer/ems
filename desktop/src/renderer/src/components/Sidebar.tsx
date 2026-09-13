import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Layers,
  BarChart3,
  Wallet,
  BookOpen,
  Settings,
  LogOut,
  GraduationCap,
  BookMarked,
  CalendarRange,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type PageTab =
  | 'dashboard'
  | 'fee-counter'
  | 'students'
  | 'classes'
  | 'subjects'
  | 'academic-years'
  | 'reports'
  | 'expenses'
  | 'diary'
  | 'staff'
  | 'settings';

interface SidebarProps {
  activeTab: PageTab;
  setActiveTab: (tab: PageTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, entityName, logout } = useAuth();

  const navItems: { id: PageTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} /> },
    { id: 'fee-counter', label: 'Fee Counter POS', icon: <CreditCard size={19} />, badge: 'POS' },
    { id: 'students', label: 'Students Roster', icon: <Users size={19} /> },
    { id: 'classes', label: 'Classes & Fees', icon: <Layers size={19} /> },
    { id: 'subjects', label: 'Subjects Directory', icon: <BookMarked size={19} /> },
    { id: 'academic-years', label: 'Academic Years', icon: <CalendarRange size={19} /> },
    { id: 'reports', label: 'Business Reports', icon: <BarChart3 size={19} /> },
    { id: 'expenses', label: 'Expenses', icon: <Wallet size={19} /> },
    { id: 'diary', label: 'School Diary', icon: <BookOpen size={19} /> },
    { id: 'staff', label: 'Staff & Roles', icon: <Users size={19} /> },
    { id: 'settings', label: 'Settings & Hardware', icon: <Settings size={19} /> },
  ];

  return (
    <aside
      style={{
        width: '245px',
        backgroundColor: 'var(--bg-sidebar)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        userSelect: 'none',
        zIndex: 20,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '20px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)',
          }}
        >
          <GraduationCap size={24} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: 'var(--text-main)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              letterSpacing: '-0.2px',
            }}
          >
            {entityName}
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
            Desktop ERP Suite
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          flex: 1,
          padding: '16px 12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
        }}
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                background: isActive
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 600,
                fontSize: '13px',
                border: 'none',
                boxShadow: isActive ? '0 4px 14px rgba(37, 99, 235, 0.28)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(241, 245, 249, 0.9)';
                  e.currentTarget.style.color = '#1e293b';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <span style={{ color: isActive ? '#ffffff' : '#3b82f6' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(37, 99, 235, 0.1)',
                    color: isActive ? '#ffffff' : '#2563eb',
                    padding: '2px 7px',
                    borderRadius: '6px',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Cashier Footer Profile */}
      <div
        style={{
          padding: '16px 18px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(248, 250, 252, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
              fontWeight: 800,
              fontSize: '13px',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            }}
          >
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-main)',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.name || 'Administrator'}
            </p>
            <span style={{ fontSize: '10px', color: '#059669', fontWeight: 700 }}>● Online</span>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign Out"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-subtle)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-subtle)')}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
