const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('node:path');
const crypto = require('node:crypto');

let database;

function getDatabase(app) {
  if (!database) {
    const databasePath = path.join(app.getPath('userData'), 'login.db');
    database = new Database(databasePath);
    database.pragma('journal_mode = WAL');
    database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        recovery_code_hash TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const userColumns = database.prepare('PRAGMA table_info(users)').all();
    const hasRecoveryColumn = userColumns.some((column) => column.name === 'recovery_code_hash');
    if (!hasRecoveryColumn) {
      database.exec('ALTER TABLE users ADD COLUMN recovery_code_hash TEXT');
    }
  }

  return database;
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

function normalizePassword(password) {
  return String(password || '');
}

function validatePasswordStrength(password) {
  if (password.length < 8) {
    return { ok: false, message: 'La contrasena debe tener al menos 8 caracteres.' };
  }

  return { ok: true };
}

function generateRecoveryCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function saveSetting(app, key, value) {
  const db = getDatabase(app);
  const statement = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  statement.run({ key, value });
}

function clearSetting(app, key) {
  const db = getDatabase(app);
  db.prepare('DELETE FROM settings WHERE key = ?').run(key);
}

function getSetting(app, key) {
  const db = getDatabase(app);
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

function getRememberedUsername(app) {
  return getSetting(app, 'remembered_username');
}

function setRememberedUsername(app, username) {
  const cleanedUsername = normalizeUsername(username);
  if (!cleanedUsername) {
    clearSetting(app, 'remembered_username');
    return '';
  }

  saveSetting(app, 'remembered_username', cleanedUsername);
  return cleanedUsername;
}

function clearRememberedUsername(app) {
  clearSetting(app, 'remembered_username');
  return true;
}

function upsertUser(app, username, password) {
  const db = getDatabase(app);
  const passwordHash = bcrypt.hashSync(password, 10);
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

  if (existingUser) {
    db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE username = ?
    `).run(passwordHash, username);
    return 'updated';
  }

  db.prepare(`
    INSERT INTO users (username, password_hash)
    VALUES (?, ?)
  `).run(username, passwordHash);
  return 'created';
}

function registerUser(app, payload) {
  const username = normalizeUsername(payload?.username);
  const password = normalizePassword(payload?.password);

  if (!username || !password) {
    return { ok: false, message: 'Debes escribir usuario y contrasena.' };
  }

  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.ok) {
    return passwordValidation;
  }

  const db = getDatabase(app);
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

  if (existingUser) {
    return { ok: false, message: 'Ese usuario ya existe.' };
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const recoveryCode = generateRecoveryCode();
  const recoveryCodeHash = bcrypt.hashSync(recoveryCode, 10);

  db.prepare(`
    INSERT INTO users (username, password_hash, recovery_code_hash)
    VALUES (?, ?, ?)
  `).run(username, passwordHash, recoveryCodeHash);

  return { ok: true, username, recoveryCode };
}

function authenticateUser(app, payload) {
  const username = normalizeUsername(payload?.username);
  const password = normalizePassword(payload?.password);
  const rememberMe = Boolean(payload?.rememberMe);

  if (!username || !password) {
    return { ok: false, message: 'Debes escribir usuario y contraseña.' };
  }

  const db = getDatabase(app);
  const existingUser = db.prepare('SELECT password_hash FROM users WHERE username = ?').get(username);

  if (!existingUser) {
    return { ok: false, message: 'Usuario no encontrado. Debes registrarte primero.' };
  }

  const passwordMatches = bcrypt.compareSync(password, existingUser.password_hash);

  if (!passwordMatches) {
    return { ok: false, message: 'La contrasena no coincide con ese usuario.' };
  }

  db.prepare('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE username = ?').run(username);

  if (rememberMe) {
    setRememberedUsername(app, username);
  } else {
    clearRememberedUsername(app);
  }

  return { ok: true, username };
}

function resetPassword(app, payload) {
  const username = normalizeUsername(payload?.username);
  const currentPassword = normalizePassword(payload?.currentPassword);
  const newPassword = normalizePassword(payload?.newPassword);

  if (!username || !currentPassword || !newPassword) {
    return { ok: false, message: 'Debes escribir usuario, contrasena actual y nueva contrasena.' };
  }

  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.ok) {
    return passwordValidation;
  }

  const db = getDatabase(app);
  const existingUser = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username);

  if (!existingUser) {
    return { ok: false, message: 'No existe un usuario guardado con ese nombre.' };
  }

  const currentMatches = bcrypt.compareSync(currentPassword, existingUser.password_hash);
  if (!currentMatches) {
    return { ok: false, message: 'La contrasena actual no es correcta.' };
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE username = ?
  `).run(passwordHash, username);

  return { ok: true, username };
}

function resetPasswordWithRecoveryCode(app, payload) {
  const username = normalizeUsername(payload?.username);
  const recoveryCode = String(payload?.recoveryCode || '').trim().toUpperCase();
  const newPassword = normalizePassword(payload?.newPassword);

  if (!username || !recoveryCode || !newPassword) {
    return { ok: false, message: 'Debes escribir usuario, codigo de recuperacion y nueva contrasena.' };
  }

  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.ok) {
    return passwordValidation;
  }

  const db = getDatabase(app);
  const existingUser = db.prepare('SELECT id, recovery_code_hash FROM users WHERE username = ?').get(username);

  if (!existingUser) {
    return { ok: false, message: 'No existe un usuario guardado con ese nombre.' };
  }

  if (!existingUser.recovery_code_hash) {
    return { ok: false, message: 'Este usuario no tiene codigo de recuperacion configurado.' };
  }

  const recoveryCodeMatches = bcrypt.compareSync(recoveryCode, existingUser.recovery_code_hash);
  if (!recoveryCodeMatches) {
    return { ok: false, message: 'El codigo de recuperacion no es valido.' };
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  const nextRecoveryCode = generateRecoveryCode();
  const nextRecoveryCodeHash = bcrypt.hashSync(nextRecoveryCode, 10);

  db.prepare(`
    UPDATE users
    SET password_hash = ?, recovery_code_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE username = ?
  `).run(passwordHash, nextRecoveryCodeHash, username);

  return {
    ok: true,
    username,
    nextRecoveryCode,
    message: 'Contrasena actualizada con codigo de recuperacion.',
  };
}

module.exports = {
  authenticateUser,
  registerUser,
  getRememberedUsername,
  resetPassword,
  resetPasswordWithRecoveryCode,
  clearRememberedUsername,
  setRememberedUsername,
};