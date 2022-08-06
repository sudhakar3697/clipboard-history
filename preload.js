const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  store: {
    get: (key) => ipcRenderer.invoke('readStore', [key]),
  },
  setClip: (id) => {
    ipcRenderer.invoke('setClip', [id]);
  },
  removeClip: (id) => {
    ipcRenderer.invoke('removeClip', [id]);
  },
  closeApp: () => {
    ipcRenderer.invoke('closeApp');
  },
  on: (e, cb) => {
    ipcRenderer.on(e, cb)
  }
});
