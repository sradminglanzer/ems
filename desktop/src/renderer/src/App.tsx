import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar, PageTab } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { FeeCounter } from './pages/FeeCounter';
import { Students } from './pages/Students';
import { Classes } from './pages/Classes';
import { Subjects } from './pages/Subjects';
import { AcademicYears } from './pages/AcademicYears';
import { Reports } from './pages/Reports';
import { Expenses } from './pages/Expenses';
import { Diary } from './pages/Diary';
import { Staff } from './pages/Staff';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  const { token, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<PageTab>('dashboard');

  // Global Keyboard Shortcuts (e.g. F12 for Fee Counter POS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        setActiveTab('fee-counter');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-muted)',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        Initializing EMS Desktop Suite...
      </div>
    );
  }

  if (!token) {
    return <Login />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Header onOpenFeeCounter={() => setActiveTab('fee-counter')} />

        <main style={{ flex: 1, overflow: 'hidden', backgroundColor: 'var(--bg-app)' }}>
          {activeTab === 'dashboard' && <Dashboard onNavigateToPOS={() => setActiveTab('fee-counter')} />}
          {activeTab === 'fee-counter' && <FeeCounter />}
          {activeTab === 'students' && <Students />}
          {activeTab === 'classes' && <Classes />}
          {activeTab === 'subjects' && <Subjects />}
          {activeTab === 'academic-years' && <AcademicYears />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'expenses' && <Expenses />}
          {activeTab === 'diary' && <Diary />}
          {activeTab === 'staff' && <Staff />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
};
