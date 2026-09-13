import { contextBridge, ipcRenderer } from 'electron';

export interface PrintReceiptPayload {
  html: string;
  silent?: boolean;
  printerName?: string;
  pageSize?: '80mm' | '58mm' | 'A4' | 'A5';
}

export interface ElectronAPI {
  getPrinters: () => Promise<Array<{ name: string; isDefault: boolean; displayName?: string }>>;
  printReceipt: (payload: PrintReceiptPayload) => Promise<{ success: boolean; errorType?: string }>;
  minimize: () => Promise<void>;
  maximizeToggle: () => Promise<void>;
  close: () => Promise<void>;
  getVersion: () => Promise<string>;
  platform: string;
}

const electronAPI: ElectronAPI = {
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printReceipt: (payload) => ipcRenderer.invoke('print-receipt', payload),
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximizeToggle: () => ipcRenderer.invoke('window-maximize-toggle'),
  close: () => ipcRenderer.invoke('window-close'),
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
