const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const path = require('node:path');
const crypto = require('node:crypto');

dotenv.config();

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

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
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

function getMailer() {
  const host = normalizeUsername(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT || 587);
  const user = normalizeUsername(process.env.SMTP_USER);
  const pass = normalizeUsername(process.env.SMTP_PASS);
  const from = normalizeUsername(process.env.SMTP_FROM) || user;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    from,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
      auth: {
        user,
        pass,
      },
    }),
  };
}

async function sendRecoveryCodeEmail(email, recoveryCode, contextLabel = 'FINTOR') {
  const mailer = getMailer();
  if (!mailer) {
    return {
      ok: false,
      message:
        'Configura SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y SMTP_FROM para enviar correos de recuperacion.',
    };
  }

  await mailer.transporter.sendMail({
    from: mailer.from,
    to: email,
    subject: `${contextLabel} - Codigo de recuperacion`,
    text: [
      'Hola,',
      '',
      `Tu codigo de recuperacion es: ${recoveryCode}`,
      '',
      'Si no solicitaste este codigo, puedes ignorar este correo.',
    ].join('\n'),
  });

  return { ok: true };
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

function registerUser(app, payload) {
  const email = normalizeEmail(payload?.email ?? payload?.username);
  const password = normalizePassword(payload?.password);

  if (!email || !password) {
    return { ok: false, message: 'Debes escribir correo y contrasena.' };
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: 'Debes escribir un correo valido.' };
  }

  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.ok) {
    return passwordValidation;
  }

  const db = getDatabase(app);
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(email);

  if (existingUser) {
    return { ok: false, message: 'Ese correo ya existe.' };
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(
    `
    INSERT INTO users (username, password_hash, recovery_code_hash)
    VALUES (?, ?, ?)
  `
  ).run(email, passwordHash, null);

  return { ok: true, username: email };
}

function authenticateUser(app, payload) {
  const email = normalizeEmail(payload?.email ?? payload?.username);
  const password = normalizePassword(payload?.password);
  const rememberMe = Boolean(payload?.rememberMe);

  if (!email || !password) {
    return { ok: false, message: 'Debes escribir correo y contraseña.' };
  }

  const db = getDatabase(app);
  const existingUser = db
    .prepare('SELECT password_hash FROM users WHERE username = ?')
    .get(email);

  if (!existingUser) {
    return { ok: false, message: 'Correo no encontrado. Debes registrarte primero.' };
  }

  const passwordMatches = bcrypt.compareSync(password, existingUser.password_hash);

  if (!passwordMatches) {
    return { ok: false, message: 'La contrasena no coincide con ese correo.' };
  }

  db.prepare('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE username = ?').run(email);

  if (rememberMe) {
    setRememberedUsername(app, email);
  } else {
    clearRememberedUsername(app);
  }

  return { ok: true, username: email };
}

function resetPassword(app, payload) {
  const email = normalizeEmail(payload?.email ?? payload?.username);
  const currentPassword = normalizePassword(payload?.currentPassword);
  const newPassword = normalizePassword(payload?.newPassword);

  if (!email || !currentPassword || !newPassword) {
    return { ok: false, message: 'Debes escribir correo, contrasena actual y nueva contrasena.' };
  }

  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.ok) {
    return passwordValidation;
  }

  const db = getDatabase(app);
  const existingUser = db
    .prepare('SELECT id, password_hash FROM users WHERE username = ?')
    .get(email);

  if (!existingUser) {
    return { ok: false, message: 'No existe una cuenta guardada con ese correo.' };
  }

  const currentMatches = bcrypt.compareSync(currentPassword, existingUser.password_hash);
  if (!currentMatches) {
    return { ok: false, message: 'La contrasena actual no es correcta.' };
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare(
    `
    UPDATE users
    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE username = ?
  `
  ).run(passwordHash, email);

  return { ok: true, username: email };
}

function resetPasswordWithRecoveryCode(app, payload) {
  const email = normalizeEmail(payload?.email ?? payload?.username);
  const recoveryCode = String(payload?.recoveryCode || '')
    .trim()
    .toUpperCase();
  const newPassword = normalizePassword(payload?.newPassword);

  if (!email || !recoveryCode || !newPassword) {
    return {
      ok: false,
      message: 'Debes escribir correo, codigo de recuperacion y nueva contrasena.',
    };
  }

  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.ok) {
    return passwordValidation;
  }

  const db = getDatabase(app);
  const existingUser = db
    .prepare('SELECT id, recovery_code_hash FROM users WHERE username = ?')
    .get(email);

  if (!existingUser) {
    return { ok: false, message: 'No existe una cuenta guardada con ese correo.' };
  }

  if (!existingUser.recovery_code_hash) {
    return { ok: false, message: 'Esta cuenta no tiene codigo de recuperacion configurado.' };
  }

  const recoveryCodeMatches = bcrypt.compareSync(recoveryCode, existingUser.recovery_code_hash);
  if (!recoveryCodeMatches) {
    return { ok: false, message: 'El codigo de recuperacion no es valido.' };
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  const nextRecoveryCode = generateRecoveryCode();
  const nextRecoveryCodeHash = bcrypt.hashSync(nextRecoveryCode, 10);

  return sendRecoveryCodeEmail(email, nextRecoveryCode)
    .then((mailResult) => {
      if (!mailResult.ok) {
        return mailResult;
      }

      db.prepare(
        `
        UPDATE users
        SET password_hash = ?, recovery_code_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE username = ?
      `
      ).run(passwordHash, nextRecoveryCodeHash, email);

      return {
        ok: true,
        username: email,
        message: 'Contrasena actualizada. Te enviamos un nuevo codigo al correo.',
      };
    })
    .catch((error) => {
      console.error('resetPasswordWithRecoveryCode send email error', error);
      return { ok: false, message: 'No se pudo enviar el correo de recuperacion.' };
    });
}

async function requestRecoveryCode(app, payload) {
  const email = normalizeEmail(payload?.email ?? payload?.username);

  if (!email) {
    return { ok: false, message: 'Debes escribir un correo valido.' };
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: 'Debes escribir un correo valido.' };
  }

  const db = getDatabase(app);
  const existingUser = db
    .prepare('SELECT id FROM users WHERE username = ?')
    .get(email);

  if (!existingUser) {
    return { ok: false, message: 'No existe una cuenta guardada con ese correo.' };
  }

  const recoveryCode = generateRecoveryCode();
  const recoveryCodeHash = bcrypt.hashSync(recoveryCode, 10);
  const mailResult = await sendRecoveryCodeEmail(email, recoveryCode);

  if (!mailResult.ok) {
    return mailResult;
  }

  db.prepare(
    `
    UPDATE users
    SET recovery_code_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE username = ?
  `
  ).run(recoveryCodeHash, email);

  return {
    ok: true,
    username: email,
    message: 'Te enviamos un codigo de recuperacion al correo.',
  };
}

module.exports = {
  authenticateUser,
  registerUser,
  getRememberedUsername,
  requestRecoveryCode,
  resetPassword,
  resetPasswordWithRecoveryCode,
  clearRememberedUsername,
  setRememberedUsername,
};
