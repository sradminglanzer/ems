import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { PrinterProvider } from './context/PrinterContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <PrinterProvider>
        <App />
      </PrinterProvider>
    </AuthProvider>
  </React.StrictMode>
);
