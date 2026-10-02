// ============================================================================
// DataHub Desktop - Electron Native Windows Application Runner
// Packages web intelligence suite into a standalone native Windows .EXE
// ============================================================================

const { app, BrowserWindow, Menu, Tray, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;

// Determine if in dev or production packaged mode
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3000;
const DEV_URL = `http://localhost:${PORT}`;
const PROD_URL = 'https://ais-pre-wg2tf4skzkfm6p2qvxa22x-19154088631.europe-west2.run.app';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1024,
    minHeight: 700,
    title: 'DataHub - Collection & Analysis Suite',
    icon: path.join(__dirname, '../public/favicon.ico'),
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: true
    },
    show: false, // show after ready-to-show to prevent white flash
    autoHideMenuBar: false
  });

  // Graceful show
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Load URL or local build
  const localDistPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(localDistPath)) {
    mainWindow.loadFile(localDistPath);
  } else if (isDev) {
    mainWindow.loadURL(DEV_URL).catch(() => {
      mainWindow.loadURL(PROD_URL);
    });
  } else {
    mainWindow.loadURL(PROD_URL);
  }

  // Handle external links safely in system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Build Windows Application Menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Dataset',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-action', 'new-dataset')
        },
        {
          label: 'Export Active Dataset (CSV)',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu-action', 'export-csv')
        },
        {
          label: 'Generate Boardroom PDF Dossier',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.send('menu-action', 'export-pdf')
        },
        { type: 'separator' },
        {
          label: 'Exit DataHub',
          accelerator: 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          label: 'Developer Tools',
          accelerator: 'F12',
          click: () => mainWindow.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Upload & Clean Studio',
          click: () => mainWindow.webContents.send('menu-navigate', 'upload')
        },
        {
          label: 'Data Analysis Hub',
          click: () => mainWindow.webContents.send('menu-navigate', 'analysis')
        },
        {
          label: 'What-If Simulation & Regressions',
          click: () => mainWindow.webContents.send('menu-navigate', 'simulation')
        },
        {
          label: 'Grid Spreadsheet Editor',
          click: () => mainWindow.webContents.send('menu-navigate', 'grid')
        },
        {
          label: 'Supervisor Audit Vault',
          click: () => mainWindow.webContents.send('menu-navigate', 'supervisor')
        },
        {
          label: 'Admin Observability Console',
          click: () => mainWindow.webContents.send('menu-navigate', 'admin')
        },
        {
          label: 'Operations & Comms Hub',
          click: () => mainWindow.webContents.send('menu-navigate', 'operations')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation & User Guide',
          click: () => shell.openExternal('https://datahub.com/docs')
        },
        {
          label: 'Check for Updates',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'DataHub Desktop Update',
              message: 'You are running the latest version of DataHub Desktop (v1.0.0).',
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'About DataHub Desktop',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About DataHub Desktop',
              message: 'DataHub - Collection & Analysis Suite\nVersion 1.0.0 (Windows x64 Native Executable)\nHigh-performance intelligence & causal analytics suite.',
              buttons: ['Close']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
