import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    title: 'EMS Desktop ERP',
    backgroundColor: '#f8fafc',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.maximize();

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle external links in native browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── IPC Handlers: Printers & Hardware ──────────────────────────────────────────

// 1. Get list of installed system printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  return mainWindow.webContents.getPrintersAsync();
});

// 2. Direct Silent / Preview Receipt Printing
ipcMain.handle(
  'print-receipt',
  async (
    _event,
    {
      html,
      silent = true,
      printerName,
      pageSize = '80mm', // '80mm', '58mm', 'A4', 'A5'
    }: {
      html: string;
      silent?: boolean;
      printerName?: string;
      pageSize?: string;
    }
  ) => {
    return new Promise((resolve, reject) => {
      const printWindow = new BrowserWindow({
        show: false,
        width: 400,
        height: 600,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      printWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
      );

      printWindow.webContents.on('did-finish-load', () => {
        const printOptions: any = {
          silent: silent,
          printBackground: true,
          margins: { marginType: 'none' },
        };

        if (printerName && printerName.trim()) {
          printOptions.deviceName = printerName.trim();
        }

        if (pageSize === '80mm') {
          printOptions.pageSize = { width: 80000, height: 297000 }; // 80mm roll
        } else if (pageSize === '58mm') {
          printOptions.pageSize = { width: 58000, height: 297000 }; // 58mm roll
        } else if (pageSize === 'A5') {
          printOptions.pageSize = 'A5';
        } else {
          printOptions.pageSize = 'A4';
        }

        printWindow.webContents.print(printOptions, (success, errorType) => {
          printWindow.close();
          if (!success && errorType !== 'cancelled') {
            reject(new Error(`Print error: ${errorType}`));
          } else {
            resolve({ success, errorType });
          }
        });
      });
    });
  }
);

// 3. Window Actions
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize-toggle', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// App Lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
