const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  store: {
    get: (key) => ipcRenderer.invoke('readStore', [key]),
    setSavedClips: (value) => ipcRenderer.invoke('setSavedClips', [value]),
    setSavedClipContent: (value) => ipcRenderer.invoke('setSavedClipContent', [value]),
    deleteTab: (value) => ipcRenderer.invoke('deleteTab', [value])
  },
  setClip: (id, tab) => {
    ipcRenderer.invoke('setClip', [id, tab]);
  },
  removeClip: (id, tab) => {
    ipcRenderer.invoke('removeClip', [id, tab]);
  },
  on: (e, cb) => {
    ipcRenderer.on(e, cb)
  },
  setListeningMode: (listen) => {
    ipcRenderer.invoke('setListeningMode', [listen]);
  }
});
