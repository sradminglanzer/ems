import React, { useState } from 'react';
import { GraduationCap, Lock, Phone, Server, ArrowRight } from 'lucide-react';
import { AuthService } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem('ems_api_url') || 'https://smsapi.srglanzsoftware.com/api'
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = identifier.replace(/\D/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your 4-digit MPIN');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const entityId =
        localStorage.getItem('ems_entity_id') ||
        import.meta.env.VITE_ENTITY_ID ||
        undefined;

      const res = await AuthService.login({
        contactNumber: cleanPhone,
        mpin: password.trim(),
        entityId: entityId || undefined,
      });

      if (res.data && res.data.token) {
        login(res.data.token, res.data.user || res.data, res.data.entity);
      } else if (res.data?.requiresEntitySelection) {
        setError('Multiple organizations found. Please specify Entity ID in settings.');
      } else {
        setError('Invalid server response');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Login failed. Please check credentials & server connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiUrl = () => {
    localStorage.setItem('ems_api_url', apiUrl.trim());
    window.location.reload();
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-app-mesh)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="erp-card"
        style={{
          width: '420px',
          padding: '40px 36px',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.6)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 10px 25px rgba(37, 99, 235, 0.35)',
              marginBottom: '16px',
            }}
          >
            <GraduationCap size={34} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            EMS Desktop Software
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Education & Management System ERP
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(254, 226, 226, 0.9)',
              color: '#991b1b',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '20px',
              border: '1px solid rgba(239, 68, 68, 0.25)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Registered Mobile Number
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Phone size={17} style={{ position: 'absolute', left: '14px', color: '#64748b' }} />
              <input
                type="tel"
                className="input-field"
                placeholder="10-digit mobile (e.g. 9951818053)"
                value={identifier}
                maxLength={10}
                onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, '').slice(0, 10))}
                style={{ paddingLeft: '42px', height: '44px', letterSpacing: '1px', fontWeight: 600 }}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              4-Digit MPIN
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={17} style={{ position: 'absolute', left: '14px', color: '#64748b' }} />
              <input
                type="password"
                className="input-field"
                placeholder="••••"
                value={password}
                maxLength={4}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={{
                  paddingLeft: '42px',
                  height: '44px',
                  letterSpacing: '8px',
                  fontSize: '18px',
                  fontWeight: 800,
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '13px', fontSize: '14px', marginTop: '6px', borderRadius: '12px' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Desktop ERP'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Server endpoint setup */}
        <div style={{ marginTop: '26px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subtle)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
          >
            <Server size={12} />
            <span>{showServerConfig ? 'Hide Server Endpoint' : 'Configure Server Endpoint'}</span>
          </button>

          {showServerConfig && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://smsapi.srglanzsoftware.com/api"
                style={{ fontSize: '11px', padding: '7px 10px' }}
              />
              <button
                type="button"
                onClick={handleSaveApiUrl}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '7px 12px', whiteSpace: 'nowrap' }}
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
