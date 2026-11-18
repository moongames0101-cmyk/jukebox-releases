const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gelApi', {
  status: () => ipcRenderer.invoke('gel:status'),
  apply: payload => ipcRenderer.invoke('gel:apply', payload),
  restore: () => ipcRenderer.invoke('gel:restore'),
  launch: () => ipcRenderer.invoke('gel:launch'),
  shortcut: () => ipcRenderer.invoke('gel:shortcut'),
  installSpicetify: () => ipcRenderer.invoke('gel:install-spicetify'),
  upgradeSpicetify: () => ipcRenderer.invoke('gel:upgrade-spicetify'),
  open: key => ipcRenderer.invoke('gel:open', key),
  exportTheme: theme => ipcRenderer.invoke('gel:export', theme),
  importTheme: () => ipcRenderer.invoke('gel:import'),
  updateState: () => ipcRenderer.invoke('gel:update-state'),
  checkUpdates: () => ipcRenderer.invoke('gel:update-check'),
  installUpdate: () => ipcRenderer.invoke('gel:update-install'),
  onUpdate: cb => {
    const handler = (_e, msg) => cb(msg);
    ipcRenderer.on('gel:update', handler);
    return () => ipcRenderer.removeListener('gel:update', handler);
  },
  onLog: cb => {
    const handler = (_e, msg) => cb(msg);
    ipcRenderer.on('gel:log', handler);
    return () => ipcRenderer.removeListener('gel:log', handler);
  },
});
