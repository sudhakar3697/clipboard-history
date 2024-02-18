const { app, BrowserWindow, clipboard } = require('electron');
const path = require('path');
const clipboardListener = require('clipboard-event');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 300,
    height: 360,
    minWidth: 300,
    minHeight: 360,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    icon: '../icons/clipboard.png',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true
    }
  });
  // mainWindow.loadFile('../index.html');
  mainWindow.loadURL(`http://localhost:8080/clipboard-history`);
}

app.whenReady().then(() => {
  clipboardListener.startListening();
  clipboardListener.on('change', () => {
    const content = clipboard.readText();
    if (content) {
      mainWindow.webContents.send('clipboard-changed', { content });
    }
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
})
