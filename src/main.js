const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const auth = require('./src/auth/auth.js');

if (process.env.NODE_ENV !== 'production') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
  });
}

if (require('electron-squirrel-startup')) {
  app.quit();
}

let loginWindow;
let mainWindow;

const createLoginWindow = () => {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus();
    return loginWindow;
  }

  loginWindow = new BrowserWindow({
    width: 800,
    height: 800,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loginWindow.on('closed', () => {
    loginWindow = null;
  });

  loginWindow.loadFile(path.join(__dirname, 'login', 'login.html'));
  loginWindow.webContents.openDevTools();

  return loginWindow;
};

const createMainWindow = () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }

    if (loginWindow) {
      loginWindow.close();
      loginWindow = null;
    }
  });

  return mainWindow;
};

ipcMain.handle('auth:login', (_event, payload) => {
  const result = auth.authenticateUser(app, payload);

  if (result.ok) {
    setImmediate(() => {
      createMainWindow();
    });
  }

  return result;
});

ipcMain.handle('auth:register', (_event, payload) => auth.registerUser(app, payload));
ipcMain.handle('auth:get-remembered', () => auth.getRememberedUsername(app));
ipcMain.handle('auth:reset-password', (_event, payload) => auth.resetPassword(app, payload));
ipcMain.handle('auth:reset-with-code', (_event, payload) => auth.resetPasswordWithRecoveryCode(app, payload));
ipcMain.handle('auth:clear-remember', () => auth.clearRememberedUsername(app));
ipcMain.on('auth:logout', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }

  mainWindow = null;
  createLoginWindow();
});

app.whenReady().then(() => {
  createLoginWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createLoginWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});