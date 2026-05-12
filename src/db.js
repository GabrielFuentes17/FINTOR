const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { calcularPresupuesto, normalizeBudgetSnapshot } = require('./finance/budget.js');

const EMPTY_PROFILE = {
  name: '',
  email: '',
  career: '',
  income: 0,
  savingsGoal: 0,
  currency: 'USD',
  notificationsEnabled: false,
  alertBudget: false,
  alertReminders: false,
  alertMonthly: false,
};

let database;
const userDatabases = new Map();
const BUDGET_SNAPSHOT_META_KEY = 'budget_snapshot:v1';
const FINANCE_DATABASE_NAME = 'fintor.db';

function getLegacyDatabase(app) {
  if (!database) {
    const databasePath = path.join(app.getPath('userData'), FINANCE_DATABASE_NAME);
    database = new Database(databasePath);
    database.pragma('journal_mode = WAL');
    database.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS budgets (
        name TEXT PRIMARY KEY,
        limit_amount REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS savings_goals (
        name TEXT PRIMARY KEY,
        saved REAL NOT NULL,
        target REAL NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT 'green'
      );

      CREATE TABLE IF NOT EXISTS reminders (
        name TEXT PRIMARY KEY,
        description TEXT NOT NULL DEFAULT '',
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'próximo',
        days INTEGER NOT NULL DEFAULT 0,
        color TEXT NOT NULL DEFAULT 'gray'
      );

      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        career TEXT NOT NULL,
        income REAL NOT NULL,
        savings_goal REAL NOT NULL,
        currency TEXT NOT NULL,
        notifications_enabled INTEGER NOT NULL DEFAULT 1,
        alert_budget INTEGER NOT NULL DEFAULT 1,
        alert_reminders INTEGER NOT NULL DEFAULT 1,
        alert_monthly INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  return database;
}

function normalizeUsernameKey(username) {
  return String(username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'default';
}

function getUserDatabasePath(app, username) {
  return path.join(app.getPath('userData'), `fintor-${normalizeUsernameKey(username)}.db`);
}

function cloneDatabaseContent(sourceDb, targetDb) {
  targetDb.exec('BEGIN');
  try {
    const profileRow = sourceDb.prepare('SELECT * FROM profile LIMIT 1').get();
    if (profileRow) {
      targetDb.prepare('DELETE FROM profile').run();
      targetDb
        .prepare(
          `
          INSERT INTO profile (
            id, name, email, career, income, savings_goal, currency,
            notifications_enabled, alert_budget, alert_reminders, alert_monthly
          ) VALUES (
            @id, @name, @email, @career, @income, @savings_goal, @currency,
            @notifications_enabled, @alert_budget, @alert_reminders, @alert_monthly
          )
        `
        )
        .run(profileRow);
    }

    ['transactions', 'budgets', 'savings_goals', 'reminders'].forEach((table) => {
      const rows = sourceDb.prepare(`SELECT * FROM ${table}`).all();
      if (!rows.length) return;
      targetDb.prepare(`DELETE FROM ${table}`).run();

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((column) => `@${column}`).join(', ');
      const insertStatement = targetDb.prepare(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
      );
      rows.forEach((row) => insertStatement.run(row));
    });

    const metaRows = sourceDb.prepare('SELECT key, value FROM app_meta').all();
    if (metaRows.length) {
      targetDb.prepare('DELETE FROM app_meta').run();
      const insertMeta = targetDb.prepare(
        'INSERT INTO app_meta (key, value) VALUES (@key, @value)'
      );
      metaRows.forEach((row) => insertMeta.run(row));
    }

    targetDb.exec('COMMIT');
  } catch (error) {
    targetDb.exec('ROLLBACK');
    throw error;
  }
}

function getDatabase(app, username = '') {
  const cleanedUsername = normalizeText(username);
  if (!cleanedUsername) {
    return getLegacyDatabase(app);
  }

  const databasePath = getUserDatabasePath(app, cleanedUsername);
  if (userDatabases.has(databasePath)) {
    return userDatabases.get(databasePath);
  }

  if (!fs.existsSync(databasePath)) {
    const legacyDb = getLegacyDatabase(app);
    const legacyProfile = legacyDb.prepare('SELECT name FROM profile WHERE id = 1').get();
    if (legacyProfile && normalizeText(legacyProfile.name) === cleanedUsername) {
      const targetDb = new Database(databasePath);
      targetDb.pragma('journal_mode = WAL');
      targetDb.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS budgets (
          name TEXT PRIMARY KEY,
          limit_amount REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS savings_goals (
          name TEXT PRIMARY KEY,
          saved REAL NOT NULL,
          target REAL NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          color TEXT NOT NULL DEFAULT 'green'
        );

        CREATE TABLE IF NOT EXISTS reminders (
          name TEXT PRIMARY KEY,
          description TEXT NOT NULL DEFAULT '',
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'próximo',
          days INTEGER NOT NULL DEFAULT 0,
          color TEXT NOT NULL DEFAULT 'gray'
        );

        CREATE TABLE IF NOT EXISTS profile (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          career TEXT NOT NULL,
          income REAL NOT NULL,
          savings_goal REAL NOT NULL,
          currency TEXT NOT NULL,
          notifications_enabled INTEGER NOT NULL DEFAULT 1,
          alert_budget INTEGER NOT NULL DEFAULT 1,
          alert_reminders INTEGER NOT NULL DEFAULT 1,
          alert_monthly INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS app_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      cloneDatabaseContent(legacyDb, targetDb);
      userDatabases.set(databasePath, targetDb);
      return targetDb;
    }
  }

  const userDb = new Database(databasePath);
  userDb.pragma('journal_mode = WAL');
  userDb.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budgets (
      name TEXT PRIMARY KEY,
      limit_amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      name TEXT PRIMARY KEY,
      saved REAL NOT NULL,
      target REAL NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'green'
    );

    CREATE TABLE IF NOT EXISTS reminders (
      name TEXT PRIMARY KEY,
      description TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'próximo',
      days INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT 'gray'
    );

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      career TEXT NOT NULL,
      income REAL NOT NULL,
      savings_goal REAL NOT NULL,
      currency TEXT NOT NULL,
      notifications_enabled INTEGER NOT NULL DEFAULT 1,
      alert_budget INTEGER NOT NULL DEFAULT 1,
      alert_reminders INTEGER NOT NULL DEFAULT 1,
      alert_monthly INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  userDatabases.set(databasePath, userDb);
  return userDb;
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function listTransactions(app, username = '') {
  const db = getDatabase(app, username);
  return db
    .prepare(
      `
    SELECT id, type, description, amount, category, date
    FROM transactions
    ORDER BY date DESC, id DESC
  `
    )
    .all();
}

function createTransaction(app, payload, username = '') {
  const db = getDatabase(app, username);
  const transaction = {
    type: normalizeText(payload?.type),
    description: normalizeText(payload?.description),
    amount: normalizeNumber(payload?.amount),
    category: normalizeText(payload?.category),
    date: normalizeText(payload?.date),
  };

  const result = db
    .prepare(
      `
    INSERT INTO transactions (type, description, amount, category, date)
    VALUES (@type, @description, @amount, @category, @date)
  `
    )
    .run(transaction);

  return { id: result.lastInsertRowid, ...transaction };
}

function updateTransaction(app, id, payload, username = '') {
  const db = getDatabase(app, username);
  const transaction = {
    id: normalizeNumber(id),
    type: normalizeText(payload?.type),
    description: normalizeText(payload?.description),
    amount: normalizeNumber(payload?.amount),
    category: normalizeText(payload?.category),
    date: normalizeText(payload?.date),
  };

  db.prepare(
    `
    UPDATE transactions
    SET type = @type,
        description = @description,
        amount = @amount,
        category = @category,
        date = @date,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `
  ).run(transaction);

  return transaction;
}

function deleteTransaction(app, id, username = '') {
  const db = getDatabase(app, username);
  const numericId = normalizeNumber(id);
  db.prepare('DELETE FROM transactions WHERE id = ?').run(numericId);
  return true;
}

function listBudgets(app, username = '') {
  const db = getDatabase(app, username);
  const rows = db
    .prepare('SELECT name, limit_amount FROM budgets ORDER BY name COLLATE NOCASE')
    .all();
  return rows.reduce((accumulator, row) => {
    accumulator[row.name] = row.limit_amount;
    return accumulator;
  }, {});
}

function replaceBudgets(app, map, username = '') {
  const db = getDatabase(app, username);
  const entries = Object.entries(map || {})
    .map(([name, limitAmount]) => [normalizeText(name), normalizeNumber(limitAmount)])
    .filter(([name, limitAmount]) => name && limitAmount > 0);

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM budgets').run();
    const insertBudget = db.prepare('INSERT INTO budgets (name, limit_amount) VALUES (?, ?)');
    entries.forEach(([name, limitAmount]) => insertBudget.run(name, limitAmount));
  });

  transaction();
  return listBudgets(app, username);
}

function upsertBudget(app, payload, username = '') {
  const db = getDatabase(app, username);
  const name = normalizeText(payload?.name);
  const limitAmount = normalizeNumber(payload?.limitAmount);

  if (!name || limitAmount <= 0) {
    return listBudgets(app, username);
  }

  db.prepare(
    `
    INSERT INTO budgets (name, limit_amount)
    VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET limit_amount = excluded.limit_amount
  `
  ).run(name, limitAmount);

  return listBudgets(app, username);
}

function deleteBudget(app, name, username = '') {
  const db = getDatabase(app, username);
  db.prepare('DELETE FROM budgets WHERE name = ?').run(normalizeText(name));
  return listBudgets(app, username);
}

function getAppMetaValue(app, key, username = '') {
  const db = getDatabase(app, username);
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(normalizeText(key));
  return row ? row.value : null;
}

function setAppMetaValue(app, key, value, username = '') {
  const db = getDatabase(app, username);
  const normalizedKey = normalizeText(key);
  const normalizedValue = String(value ?? '');

  if (!normalizedKey) {
    return null;
  }

  db.prepare(
    `
    INSERT INTO app_meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `
  ).run(normalizedKey, normalizedValue);

  return normalizedValue;
}

function getBudgetSnapshot(app, username = '') {
  const rawValue = getAppMetaValue(app, BUDGET_SNAPSHOT_META_KEY, username);

  if (rawValue) {
    try {
      return normalizeBudgetSnapshot(JSON.parse(rawValue));
    } catch (error) {
      console.error('getBudgetSnapshot parse error', error);
    }
  }

  return calcularPresupuesto(getProfile(app, username).income);
}

function saveBudgetSnapshot(app, payload, username = '') {
  const snapshot = normalizeBudgetSnapshot(payload);
  setAppMetaValue(app, BUDGET_SNAPSHOT_META_KEY, JSON.stringify(snapshot), username);
  return snapshot;
}

function listSavingsGoals(app, username = '') {
  const db = getDatabase(app, username);
  return db
    .prepare(
      `
    SELECT name, saved, target, note, color
    FROM savings_goals
    ORDER BY rowid ASC
  `
    )
    .all();
}

function replaceSavingsGoals(app, goals, username = '') {
  const db = getDatabase(app, username);
  const entries = Array.isArray(goals) ? goals : [];

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM savings_goals').run();
    const insertGoal = db.prepare(`
      INSERT INTO savings_goals (name, saved, target, note, color)
      VALUES (@name, @saved, @target, @note, @color)
    `);
    entries.forEach((goal) => {
      const name = normalizeText(goal?.name);
      if (!name) return;
      insertGoal.run({
        name,
        saved: normalizeNumber(goal?.saved),
        target: Math.max(1, normalizeNumber(goal?.target, 1)),
        note: normalizeText(goal?.note),
        color: normalizeText(goal?.color) || 'green',
      });
    });
  });

  transaction();
  return listSavingsGoals(app, username);
}

function upsertSavingsGoal(app, payload, username = '') {
  const db = getDatabase(app, username);
  const name = normalizeText(payload?.name);
  if (!name) return listSavingsGoals(app, username);

  db.prepare(
    `
    INSERT INTO savings_goals (name, saved, target, note, color)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      saved = excluded.saved,
      target = excluded.target,
      note = excluded.note,
      color = excluded.color
  `
  ).run(
    name,
    normalizeNumber(payload?.saved),
    Math.max(1, normalizeNumber(payload?.target, 1)),
    normalizeText(payload?.note),
    normalizeText(payload?.color) || 'green'
  );

  return listSavingsGoals(app, username);
}

function deleteSavingsGoal(app, name, username = '') {
  const db = getDatabase(app, username);
  db.prepare('DELETE FROM savings_goals WHERE name = ?').run(normalizeText(name));
  return listSavingsGoals(app, username);
}

function listReminders(app, username = '') {
  const db = getDatabase(app, username);
  return db
    .prepare(
      `
    SELECT name, description, amount, date, category, status, days, color
    FROM reminders
    ORDER BY date ASC, name ASC
  `
    )
    .all();
}

function replaceReminders(app, reminders, username = '') {
  const db = getDatabase(app, username);
  const entries = Array.isArray(reminders) ? reminders : [];

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM reminders').run();
    const insertReminder = db.prepare(`
      INSERT INTO reminders (name, description, amount, date, category, status, days, color)
      VALUES (@name, @description, @amount, @date, @category, @status, @days, @color)
    `);
    entries.forEach((reminder) => {
      const name = normalizeText(reminder?.name);
      if (!name) return;
      insertReminder.run({
        name,
        description: normalizeText(reminder?.description),
        amount: normalizeNumber(reminder?.amount),
        date: normalizeText(reminder?.date),
        category: normalizeText(reminder?.category),
        status: normalizeText(reminder?.status) || 'próximo',
        days: Number.parseInt(reminder?.days, 10) || 0,
        color: normalizeText(reminder?.color) || 'gray',
      });
    });
  });

  transaction();
  return listReminders(app, username);
}

function upsertReminder(app, payload, username = '') {
  const db = getDatabase(app, username);
  const name = normalizeText(payload?.name);
  if (!name) return listReminders(app, username);

  db.prepare(
    `
    INSERT INTO reminders (name, description, amount, date, category, status, days, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      description = excluded.description,
      amount = excluded.amount,
      date = excluded.date,
      category = excluded.category,
      status = excluded.status,
      days = excluded.days,
      color = excluded.color
  `
  ).run(
    name,
    normalizeText(payload?.description),
    normalizeNumber(payload?.amount),
    normalizeText(payload?.date),
    normalizeText(payload?.category),
    normalizeText(payload?.status) || 'próximo',
    Number.parseInt(payload?.days, 10) || 0,
    normalizeText(payload?.color) || 'gray'
  );

  return listReminders(app, username);
}

function deleteReminder(app, name, username = '') {
  const db = getDatabase(app, username);
  db.prepare('DELETE FROM reminders WHERE name = ?').run(normalizeText(name));
  return listReminders(app, username);
}

function getProfile(app, username = '') {
  const db = getDatabase(app, username);
  const row = db
    .prepare(
      `
    SELECT name, email, career, income, savings_goal AS savingsGoal, currency,
           notifications_enabled AS notificationsEnabled,
           alert_budget AS alertBudget,
           alert_reminders AS alertReminders,
           alert_monthly AS alertMonthly
    FROM profile
    WHERE id = 1
  `
    )
    .get();

  if (!row) {
    return { ...EMPTY_PROFILE };
  }

  return {
    name: row.name,
    email: row.email,
    career: row.career,
    income: row.income,
    savingsGoal: row.savingsGoal,
    currency: row.currency,
    notificationsEnabled: Boolean(row.notificationsEnabled),
    alertBudget: Boolean(row.alertBudget),
    alertReminders: Boolean(row.alertReminders),
    alertMonthly: Boolean(row.alertMonthly),
  };
}

function insertOrUpdateProfile(db, profile) {
  db.prepare(
    `
    INSERT INTO profile (
      id, name, email, career, income, savings_goal, currency,
      notifications_enabled, alert_budget, alert_reminders, alert_monthly
    ) VALUES (
      1, @name, @email, @career, @income, @savingsGoal, @currency,
      @notificationsEnabled, @alertBudget, @alertReminders, @alertMonthly
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      career = excluded.career,
      income = excluded.income,
      savings_goal = excluded.savings_goal,
      currency = excluded.currency,
      notifications_enabled = excluded.notifications_enabled,
      alert_budget = excluded.alert_budget,
      alert_reminders = excluded.alert_reminders,
      alert_monthly = excluded.alert_monthly
  `
  ).run({
    name: normalizeText(profile?.name),
    email: normalizeText(profile?.email),
    career: normalizeText(profile?.career),
    income: normalizeNumber(profile?.income),
    savingsGoal: normalizeNumber(profile?.savingsGoal),
    currency: normalizeText(profile?.currency) || 'USD',
    notificationsEnabled: profile?.notificationsEnabled ? 1 : 0,
    alertBudget: profile?.alertBudget ? 1 : 0,
    alertReminders: profile?.alertReminders ? 1 : 0,
    alertMonthly: profile?.alertMonthly ? 1 : 0,
  });
}

function saveProfile(app, profile, username = '') {
  const db = getDatabase(app, username);
  insertOrUpdateProfile(db, profile);
  return getProfile(app, username);
}

function getFinanceState(app, username = '') {
  const profile = getProfile(app, username);
  
  // Si el email del perfil está vacío, usamos el username (que es el email del login)
  if (!profile.email && username) {
    profile.email = username;
  }
  
  return {
    transactions: listTransactions(app, username),
    budgets: listBudgets(app, username),
    savings: listSavingsGoals(app, username),
    reminders: listReminders(app, username),
    profile: profile,
    budgetSnapshot: getBudgetSnapshot(app, username),
  };
}

module.exports = {
  getFinanceState,
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listBudgets,
  replaceBudgets,
  upsertBudget,
  deleteBudget,
  getBudgetSnapshot,
  saveBudgetSnapshot,
  listSavingsGoals,
  replaceSavingsGoals,
  upsertSavingsGoal,
  deleteSavingsGoal,
  listReminders,
  replaceReminders,
  upsertReminder,
  deleteReminder,
  getProfile,
  saveProfile,
};
