const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const auth = require('./src/auth/auth.js');
const financeDb = require('./db.js');

if (process.env.NODE_ENV !== 'production') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    ignored: /output\.css/,
  });
}

if (require('electron-squirrel-startup')) {
  app.quit();
}

let loginWindow;
let mainWindow;
let activeUsername = null;   // ← AGREGAR

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
          contextIsolation: false,
          nodeIntegration: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // DevTools docked beside the app often looks like a “second sidebar”. Open with Ctrl+Shift+I if needed.

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
    activeUsername = result.username;                          // ← AGREGAR
    const p = financeDb.getProfile(app);                      // ← AGREGAR
    financeDb.saveProfile(app, { ...p, name: result.username }); // ← AGREGAR
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
ipcMain.handle('auth:current-user', () => activeUsername ?? '');
ipcMain.handle('finance:get-state', () => financeDb.getFinanceState(app));
ipcMain.handle('finance:transactions:create', (_event, payload) => financeDb.createTransaction(app, payload));
ipcMain.handle('finance:transactions:update', (_event, payload) => financeDb.updateTransaction(app, payload.id, payload.data));
ipcMain.handle('finance:transactions:delete', (_event, id) => financeDb.deleteTransaction(app, id));
ipcMain.handle('finance:budgets:set', (_event, payload) => financeDb.replaceBudgets(app, payload));
ipcMain.handle('finance:budgets:upsert', (_event, payload) => financeDb.upsertBudget(app, payload));
ipcMain.handle('finance:budgets:delete', (_event, name) => financeDb.deleteBudget(app, name));
ipcMain.handle('finance:savings:set', (_event, payload) => financeDb.replaceSavingsGoals(app, payload));
ipcMain.handle('finance:savings:upsert', (_event, payload) => financeDb.upsertSavingsGoal(app, payload));
ipcMain.handle('finance:savings:delete', (_event, name) => financeDb.deleteSavingsGoal(app, name));
ipcMain.handle('finance:reminders:set', (_event, payload) => financeDb.replaceReminders(app, payload));
ipcMain.handle('finance:reminders:upsert', (_event, payload) => financeDb.upsertReminder(app, payload));
ipcMain.handle('finance:reminders:delete', (_event, name) => financeDb.deleteReminder(app, name));
ipcMain.handle('finance:profile:get', () => financeDb.getProfile(app));
ipcMain.handle('finance:profile:save', (_event, payload) => financeDb.saveProfile(app, payload));
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