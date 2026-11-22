const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gelApi', {
  status: () => ipcRenderer.invoke('gel:status'),
  win: action => ipcRenderer.send('gel:win', action),
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

contextBridge.exposeInMainWorld('youtubeApi', {
  status: () => ipcRenderer.invoke('youtube:status'),
  apply: payload => ipcRenderer.invoke('youtube:apply', payload),
  off: () => ipcRenderer.invoke('youtube:off'),
  openFolder: () => ipcRenderer.invoke('youtube:open-folder'),
  openYoutube: () => ipcRenderer.invoke('youtube:open-youtube'),
  savePicture: payload => ipcRenderer.invoke('youtube:save-picture', payload),
  pictureData: kind => ipcRenderer.invoke('youtube:picture-data', kind),
  clearPicture: kind => ipcRenderer.invoke('youtube:clear-picture', kind),
  ackReload: () => ipcRenderer.invoke('youtube:ack-reload'),
  setAdblock: on => ipcRenderer.invoke('youtube:set-adblock', on),
});

contextBridge.exposeInMainWorld('robloxApi', {
  status: () => ipcRenderer.invoke('roblox:status'),
  apply: payload => ipcRenderer.invoke('roblox:apply', payload),
  restore: () => ipcRenderer.invoke('roblox:restore'),
  assets: () => ipcRenderer.invoke('roblox:assets'),
  saveAsset: payload => ipcRenderer.invoke('roblox:save-asset', payload),
  assetData: id => ipcRenderer.invoke('roblox:asset-data', id),
  deleteAsset: id => ipcRenderer.invoke('roblox:delete-asset', id),
  openFolder: () => ipcRenderer.invoke('roblox:open-folder'),
  onEvent: cb => {
    const handler = (_e, msg) => cb(msg);
    ipcRenderer.on('roblox:event', handler);
    return () => ipcRenderer.removeListener('roblox:event', handler);
  },
});
