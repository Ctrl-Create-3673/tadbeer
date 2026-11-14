const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tadbeerDesktop', { openApp: () => ipcRenderer.send('open-app'), closeWidget: () => ipcRenderer.send('close-widget') });
