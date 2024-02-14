const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    on: (e, cb) => {
        ipcRenderer.on(e, cb)
    },
});
