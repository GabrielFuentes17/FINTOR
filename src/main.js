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
let activeUsername = null;

function normalizeString(value) {
  return String(value ?? '').trim();
}

function normalizeNumber(value, fallback = NaN) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeLoginPayload(payload) {
  return {
    username: normalizeString(payload?.username),
    password: String(payload?.password ?? ''),
    rememberMe: Boolean(payload?.rememberMe),
  };
}

function sanitizeRegisterPayload(payload) {
  return {
    username: normalizeString(payload?.username),
    password: String(payload?.password ?? ''),
  };
}

function sanitizeResetPayload(payload) {
  return {
    username: normalizeString(payload?.username),
    currentPassword: String(payload?.currentPassword ?? ''),
    newPassword: String(payload?.newPassword ?? ''),
  };
}

function sanitizeResetCodePayload(payload) {
  return {
    username: normalizeString(payload?.username),
    recoveryCode: normalizeString(payload?.recoveryCode),
    newPassword: String(payload?.newPassword ?? ''),
  };
}

function sanitizeTransactionPayload(payload) {
  return {
    type: normalizeString(payload?.type),
    description: normalizeString(payload?.description),
    amount: normalizeNumber(payload?.amount, 0),
    category: normalizeString(payload?.category),
    date: normalizeString(payload?.date),
  };
}

function sanitizeTransactionUpdatePayload(payload) {
  const id = normalizeNumber(payload?.id);
  if (!Number.isFinite(id)) return null;

  return {
    id,
    data: sanitizeTransactionPayload(payload?.data || {}),
  };
}

function hardenWindow(webContents) {
  webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });
}

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
      sandbox: true,
      webSecurity: true,
      devTools: process.env.NODE_ENV !== 'production',
    },
  });

  loginWindow.on('closed', () => {
    loginWindow = null;
  });

  hardenWindow(loginWindow.webContents);
  loginWindow.loadFile(path.join(__dirname, 'login', 'login.html'));
  if (process.env.NODE_ENV !== 'production') {
    loginWindow.webContents.openDevTools();
  }

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
      sandbox: true,
      webSecurity: true,
      devTools: process.env.NODE_ENV !== 'production',
    },
  });

  hardenWindow(mainWindow.webContents);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

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
  const result = auth.authenticateUser(app, sanitizeLoginPayload(payload));

  if (result.ok) {
    activeUsername = result.username;
    const profile = financeDb.getProfile(app);
    financeDb.saveProfile(app, { ...profile, name: result.username });
    setImmediate(() => {
      createMainWindow();
    });
  }

  return result;
});

ipcMain.handle('auth:register', (_event, payload) => auth.registerUser(app, sanitizeRegisterPayload(payload)));
ipcMain.handle('auth:get-remembered', () => auth.getRememberedUsername(app));
ipcMain.handle('auth:reset-password', (_event, payload) => auth.resetPassword(app, sanitizeResetPayload(payload)));
ipcMain.handle('auth:reset-with-code', (_event, payload) => auth.resetPasswordWithRecoveryCode(app, sanitizeResetCodePayload(payload)));
ipcMain.handle('auth:clear-remember', () => auth.clearRememberedUsername(app));
ipcMain.handle('auth:current-user', () => activeUsername ?? '');
ipcMain.handle('finance:get-state', () => financeDb.getFinanceState(app));
ipcMain.handle('finance:transactions:create', (_event, payload) => financeDb.createTransaction(app, sanitizeTransactionPayload(payload)));
ipcMain.handle('finance:transactions:update', (_event, payload) => {
  const safe = sanitizeTransactionUpdatePayload(payload);
  if (!safe) return null;
  return financeDb.updateTransaction(app, safe.id, safe.data);
});
ipcMain.handle('finance:transactions:delete', (_event, id) => {
  const safeId = normalizeNumber(id);
  if (!Number.isFinite(safeId)) return false;
  return financeDb.deleteTransaction(app, safeId);
});
ipcMain.handle('finance:budgets:set', (_event, payload) => financeDb.replaceBudgets(app, isPlainObject(payload) ? payload : {}));
ipcMain.handle('finance:budgets:upsert', (_event, payload) => financeDb.upsertBudget(app, isPlainObject(payload) ? payload : {}));
ipcMain.handle('finance:budgets:delete', (_event, name) => financeDb.deleteBudget(app, normalizeString(name)));
ipcMain.handle('finance:savings:set', (_event, payload) => financeDb.replaceSavingsGoals(app, Array.isArray(payload) ? payload : []));
ipcMain.handle('finance:savings:upsert', (_event, payload) => financeDb.upsertSavingsGoal(app, isPlainObject(payload) ? payload : {}));
ipcMain.handle('finance:savings:delete', (_event, name) => financeDb.deleteSavingsGoal(app, normalizeString(name)));
ipcMain.handle('finance:reminders:set', (_event, payload) => financeDb.replaceReminders(app, Array.isArray(payload) ? payload : []));
ipcMain.handle('finance:reminders:upsert', (_event, payload) => financeDb.upsertReminder(app, isPlainObject(payload) ? payload : {}));
ipcMain.handle('finance:reminders:delete', (_event, name) => financeDb.deleteReminder(app, normalizeString(name)));
ipcMain.handle('finance:profile:get', () => financeDb.getProfile(app));
ipcMain.handle('finance:profile:save', (_event, payload) => financeDb.saveProfile(app, isPlainObject(payload) ? payload : {}));
ipcMain.on('auth:logout', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }

  mainWindow = null;
  activeUsername = null;
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