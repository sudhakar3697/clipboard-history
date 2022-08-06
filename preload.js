const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  store: {
    get: (key) => ipcRenderer.invoke('readStore', [key]),
  },
  setClip: (content) => {
    ipcRenderer.invoke('setClip', [content]);
  },
  removeClip: (content) => {
    ipcRenderer.invoke('removeClip', [content]);
  },
  closeApp: () => {
    ipcRenderer.invoke('closeApp');
  },
  on: (e, cb) => {
    ipcRenderer.on(e, cb)
  }
});
