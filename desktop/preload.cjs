// ============================================================================
// DataHub Desktop - Secure Preload Bridge
// ============================================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('datahubDesktop', {
  isDesktop: true,
  platform: process.platform,
  version: '1.0.0',
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (_event, action) => callback(action));
  },
  onMenuNavigate: (callback) => {
    ipcRenderer.on('menu-navigate', (_event, tab) => callback(tab));
  }
});
