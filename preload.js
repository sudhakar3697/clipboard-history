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
  on: (e, cb) => {
    ipcRenderer.on(e, cb)
  },
  setListeningMode: (listen) => {
    ipcRenderer.invoke('setListeningMode', [listen]);
  }
});
