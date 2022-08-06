const { app, BrowserWindow, ipcMain, clipboard } = require('electron')
const path = require('path')
const clipboardListener = require('clipboard-event');
const Store = require('./db.js');
const crypto = require('crypto');

const store = new Store();
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 300,
    height: 360,
    frame: false,
    resizable: false,
    transparent: true,
    hasShadow: false,
    icon: 'clipboard.png',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true
    }
  })
  mainWindow.loadFile('index.html')
  // mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  clipboardListener.startListening();
  clipboardListener.on('change', () => {
    const content = clipboard.readText();
    if (content) {
      const clips = store.get('clips') || [];
      if (clips.length > 9) {
        clips.pop()
      }
      clips.unshift({
        id: crypto.randomUUID(),
        content,
        ts: Date.now()
      });
      store.set('clips', clips);
      mainWindow.webContents.send('clipboard-changed', {});
    }
  });

  ipcMain.handle('setClip', (e, content) => {
    clipboard.writeText((content[0]));
  });

  ipcMain.handle('removeClip', (e, content) => {
    const id = content[0];
    const clips = store.get('clips') || [];
    store.set('clips', clips.filter(c => c.id !== id));
    mainWindow.webContents.send('clipboard-changed', {});
  });

  ipcMain.handle('closeApp', () => {
    app.quit();
  });

  ipcMain.handle('readStore', (e, key) => {
    return store.get(key[0]);
  });

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
