import React, { useState } from 'react';
import { Printer, Server, CheckCircle, RefreshCw, Send } from 'lucide-react';
import { usePrinter } from '../context/PrinterContext';
import { useAuth } from '../context/AuthContext';

export const Settings: React.FC = () => {
  const { entityName } = useAuth();
  const {
    printers,
    selectedPrinter,
    setSelectedPrinter,
    paperSize,
    setPaperSize,
    silentPrint,
    setSilentPrint,
    printReceiptHtml,
    refreshPrinters,
  } = usePrinter();

  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem('ems_api_url') || 'https://smsapi.srglanzsoftware.com/api'
  );
  const [testingPrint, setTestingPrint] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleTestPrint = async () => {
    setTestingPrint(true);
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 8px; width: ${paperSize === '58mm' ? '54mm' : '76mm'}; }
          .text-center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
        </style>
      </head>
      <body>
        <div class="text-center" style="font-weight: bold; font-size: 14px;">${entityName}</div>
        <div class="text-center" style="font-size: 10px;">TEST THERMAL PRINT</div>
        <div class="divider"></div>
        <div>Date: ${new Date().toLocaleString('en-IN')}</div>
        <div>Printer: ${selectedPrinter || 'Default System Printer'}</div>
        <div>Paper Format: ${paperSize}</div>
        <div class="divider"></div>
        <div class="text-center" style="font-size: 11px;">
          Hardware printing is working perfectly!
        </div>
      </body>
      </html>
    `;
    await printReceiptHtml(testHtml);
    setTestingPrint(false);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('ems_api_url', apiUrl.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ padding: '28px', overflowY: 'auto', height: '100%', maxWidth: '920px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
          Desktop ERP Settings & Hardware Hub
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Configure POS thermal receipt printers, paper sizing, and backend connectivity
        </p>
      </div>

      {savedSuccess && (
        <div
          style={{
            backgroundColor: 'rgba(209, 250, 229, 0.9)',
            color: '#065f46',
            padding: '12px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            border: '1px solid rgba(5, 150, 105, 0.25)',
            fontWeight: 600,
          }}
        >
          <CheckCircle size={18} />
          <span>Configuration saved successfully!</span>
        </div>
      )}

      {/* Card 1: Thermal & Receipt Printer Setup */}
      <div className="erp-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Printer size={20} style={{ color: '#2563eb' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
              Thermal Receipt & POS Printer
            </h3>
          </div>
          <button onClick={refreshPrinters} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
            <RefreshCw size={13} />
            <span>Scan Printers</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Printer Device Dropdown */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Target Receipt Printer
            </label>
            <select
              className="input-field"
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              style={{ fontWeight: 600 }}
            >
              <option value="">(Default Windows Printer)</option>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.displayName || p.name} {p.isDefault ? '★ (Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Paper Size Selector */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Receipt Paper Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { id: '80mm', label: '80mm Roll (POS)' },
                { id: '58mm', label: '58mm Mini Roll' },
                { id: 'A5', label: 'A5 Half Sheet' },
                { id: 'A4', label: 'A4 Standard' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaperSize(opt.id as any)}
                  className={`btn ${paperSize === opt.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '12px', fontSize: '12px' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Silent Printing Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              backgroundColor: 'rgba(241, 245, 249, 0.8)',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                Silent Direct Printing
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Print receipts immediately without displaying the Windows printer dialog prompt
              </p>
            </div>
            <input
              type="checkbox"
              checked={silentPrint}
              onChange={(e) => setSilentPrint(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
            />
          </div>

          {/* Test Print Action */}
          <div>
            <button
              onClick={handleTestPrint}
              disabled={testingPrint}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '12px' }}
            >
              <Send size={15} />
              <span>{testingPrint ? 'Sending to printer...' : 'Send Test Print to POS Printer'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Server API Endpoint */}
      <div className="erp-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Server size={20} style={{ color: '#2563eb' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
            Backend API Server Connection
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              REST API Base Endpoint
            </label>
            <input
              type="text"
              className="input-field"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://smsapi.srglanzsoftware.com/api"
            />
          </div>

          <button onClick={handleSaveSettings} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
