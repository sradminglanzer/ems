import React from 'react';
import { Calendar, Search, Minus, Square, X, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenFeeCounter?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenFeeCounter }) => {
  const { academicYears, selectedYearId, setSelectedYearId } = useAuth();

  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimize();
  };

  const handleMaximize = () => {
    if (window.electronAPI) window.electronAPI.maximizeToggle();
  };

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.close();
  };

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: 'var(--bg-header)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        userSelect: 'none',
        zIndex: 10,
      }}
    >
      {/* Left: Academic Year Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: '4px 10px',
            borderRadius: '10px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
          }}
        >
          <Calendar size={15} style={{ color: '#2563eb' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Academic Session:
          </span>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              color: '#2563eb',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All Academic Years</option>
            {academicYears.map((ay) => (
              <option key={ay._id} value={ay._id}>
                {ay.name} {ay.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Middle: Global Search bar */}
      <div style={{ flex: 1, maxWidth: '450px', margin: '0 24px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Quick search student by name, admission no, or phone (Ctrl + K)..."
            style={{
              width: '100%',
              padding: '8px 14px 8px 38px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid #cbd5e1',
              borderRadius: '20px',
              color: 'var(--text-main)',
              fontSize: '12px',
              outline: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          />
        </div>
      </div>

      {/* Right: Quick Action & Window Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onOpenFeeCounter && (
          <button
            onClick={onOpenFeeCounter}
            className="btn btn-primary"
            style={{ padding: '7px 16px', fontSize: '12px', borderRadius: '20px' }}
          >
            <CreditCard size={15} />
            <span>Collect Fee (F12)</span>
          </button>
        )}

        {/* Window Controls (Electron) */}
        {window.electronAPI && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginLeft: '12px',
              borderLeft: '1px solid var(--border-subtle)',
              paddingLeft: '12px',
            }}
          >
            <button
              onClick={handleMinimize}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
              }}
              title="Minimize"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={handleMaximize}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
              }}
              title="Maximize / Restore"
            >
              <Square size={13} />
            </button>
            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
