const Database = require('better-sqlite3');
const path = require('node:path');

const DEFAULT_TRANSACTIONS = [
  { type: 'egreso', description: 'Café biblioteca UEES', amount: 7, category: 'Comida', date: '2026-04-28' },
  { type: 'egreso', description: 'Impresión proyecto final', amount: 8, category: 'Educación', date: '2026-04-26' },
  { type: 'egreso', description: 'Bus casa ↔ universidad', amount: 10, category: 'Transporte', date: '2026-04-24' },
  { type: 'egreso', description: 'Merienda entre clases', amount: 9, category: 'Comida', date: '2026-04-22' },
  { type: 'egreso', description: 'Streaming (plan estudiante)', amount: 8, category: 'Entretenimiento', date: '2026-04-18' },
  { type: 'egreso', description: 'Supermercado semanal', amount: 48, category: 'Comida', date: '2026-04-15' },
  { type: 'egreso', description: 'Cuadernos y materiales', amount: 22, category: 'Educación', date: '2026-04-12' },
  { type: 'egreso', description: 'Almuerzo comedor U', amount: 14, category: 'Comida', date: '2026-04-08' },
  { type: 'egreso', description: 'Mensualidad UEES', amount: 105, category: 'Educación', date: '2026-04-06' },
  { type: 'ingreso', description: 'Sueldo medio tiempo', amount: 400, category: 'Salario', date: '2026-04-04' },
];

const DEFAULT_BUDGETS = {
  Comida: 80,
  Transporte: 40,
  Educación: 50,
  Entretenimiento: 20,
  Salud: 30,
};

const DEFAULT_SAVINGS_GOALS = [
  { name: 'Nueva laptop', saved: 150, target: 800, note: 'Para clases y proyectos', color: 'green' },
  { name: 'Fondo emergencias', saved: 100, target: 200, note: 'Reserva de seguridad', color: 'blue' },
  { name: 'Viaje graduación', saved: 350, target: 500, note: 'Ahorro para el viaje', color: 'amber' },
];

const DEFAULT_REMINDERS = [
  { name: 'Mensualidad UEES', description: 'Recurrente mensual', amount: 105, date: '2026-04-10', category: 'Mensualidad', days: -1, color: 'red', status: 'mañana' },
  { name: 'Internet Claro 150MB', description: 'Recurrente mensual', amount: 27, date: '2026-04-15', category: 'Internet', days: 6, color: 'amber', status: 'próximo' },
  { name: 'Transporte mensual', description: 'Recurrente mensual', amount: 15, date: '2026-04-20', category: 'Transporte', days: 11, color: 'blue', status: 'próximo' },
  { name: 'Gimnasio', description: 'Recurrente mensual', amount: 20, date: '2026-04-30', category: 'Gimnasio', days: 21, color: 'gray', status: 'lejos' },
];

const DEFAULT_PROFILE = {
  name: 'Franklin M.',
  email: 'franklin.m@uees.edu.ec',
  career: 'Ingeniería - UEES',
  income: 400,
  savingsGoal: 120,
  currency: 'USD',
  notificationsEnabled: true,
  alertBudget: true,
  alertReminders: true,
  alertMonthly: true,
};

let database;

function getDatabase(app) {
  if (!database) {
    const databasePath = path.join(app.getPath('userData'), 'fintor.db');
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
    `);

    seedIfEmpty(database);
  }

  return database;
}

function seedIfEmpty(db) {
  const seedTransactions = db.prepare('SELECT COUNT(*) AS count FROM transactions').get().count === 0;
  const seedBudgets = db.prepare('SELECT COUNT(*) AS count FROM budgets').get().count === 0;
  const seedSavings = db.prepare('SELECT COUNT(*) AS count FROM savings_goals').get().count === 0;
  const seedReminders = db.prepare('SELECT COUNT(*) AS count FROM reminders').get().count === 0;
  const seedProfile = db.prepare('SELECT COUNT(*) AS count FROM profile').get().count === 0;

  const seed = db.transaction(() => {
    if (seedTransactions) {
      const insertTransaction = db.prepare(`
        INSERT INTO transactions (type, description, amount, category, date)
        VALUES (@type, @description, @amount, @category, @date)
      `);
      DEFAULT_TRANSACTIONS.forEach(transaction => insertTransaction.run(transaction));
    }

    if (seedBudgets) {
      const insertBudget = db.prepare('INSERT INTO budgets (name, limit_amount) VALUES (?, ?)');
      Object.entries(DEFAULT_BUDGETS).forEach(([name, limitAmount]) => insertBudget.run(name, limitAmount));
    }

    if (seedSavings) {
      const insertSavings = db.prepare(`
        INSERT INTO savings_goals (name, saved, target, note, color)
        VALUES (@name, @saved, @target, @note, @color)
      `);
      DEFAULT_SAVINGS_GOALS.forEach(goal => insertSavings.run(goal));
    }

    if (seedReminders) {
      const insertReminder = db.prepare(`
        INSERT INTO reminders (name, description, amount, date, category, status, days, color)
        VALUES (@name, @description, @amount, @date, @category, @status, @days, @color)
      `);
      DEFAULT_REMINDERS.forEach(reminder => insertReminder.run(reminder));
    }

    if (seedProfile) {
      insertOrUpdateProfile(db, DEFAULT_PROFILE);
    }
  });

  seed();
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function listTransactions(app) {
  const db = getDatabase(app);
  return db.prepare(`
    SELECT id, type, description, amount, category, date
    FROM transactions
    ORDER BY date DESC, id DESC
  `).all();
}

function createTransaction(app, payload) {
  const db = getDatabase(app);
  const transaction = {
    type: normalizeText(payload?.type),
    description: normalizeText(payload?.description),
    amount: normalizeNumber(payload?.amount),
    category: normalizeText(payload?.category),
    date: normalizeText(payload?.date),
  };

  const result = db.prepare(`
    INSERT INTO transactions (type, description, amount, category, date)
    VALUES (@type, @description, @amount, @category, @date)
  `).run(transaction);

  return { id: result.lastInsertRowid, ...transaction };
}

function updateTransaction(app, id, payload) {
  const db = getDatabase(app);
  const transaction = {
    id: normalizeNumber(id),
    type: normalizeText(payload?.type),
    description: normalizeText(payload?.description),
    amount: normalizeNumber(payload?.amount),
    category: normalizeText(payload?.category),
    date: normalizeText(payload?.date),
  };

  db.prepare(`
    UPDATE transactions
    SET type = @type,
        description = @description,
        amount = @amount,
        category = @category,
        date = @date,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run(transaction);

  return transaction;
}

function deleteTransaction(app, id) {
  const db = getDatabase(app);
  const numericId = normalizeNumber(id);
  db.prepare('DELETE FROM transactions WHERE id = ?').run(numericId);
  return true;
}

function listBudgets(app) {
  const db = getDatabase(app);
  const rows = db.prepare('SELECT name, limit_amount FROM budgets ORDER BY name COLLATE NOCASE').all();
  return rows.reduce((accumulator, row) => {
    accumulator[row.name] = row.limit_amount;
    return accumulator;
  }, {});
}

function replaceBudgets(app, map) {
  const db = getDatabase(app);
  const entries = Object.entries(map || {})
    .map(([name, limitAmount]) => [normalizeText(name), normalizeNumber(limitAmount)])
    .filter(([name, limitAmount]) => name && limitAmount > 0);

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM budgets').run();
    const insertBudget = db.prepare('INSERT INTO budgets (name, limit_amount) VALUES (?, ?)');
    entries.forEach(([name, limitAmount]) => insertBudget.run(name, limitAmount));
  });

  transaction();
  return listBudgets(app);
}

function upsertBudget(app, payload) {
  const db = getDatabase(app);
  const name = normalizeText(payload?.name);
  const limitAmount = normalizeNumber(payload?.limitAmount);

  if (!name || limitAmount <= 0) {
    return listBudgets(app);
  }

  db.prepare(`
    INSERT INTO budgets (name, limit_amount)
    VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET limit_amount = excluded.limit_amount
  `).run(name, limitAmount);

  return listBudgets(app);
}

function deleteBudget(app, name) {
  const db = getDatabase(app);
  db.prepare('DELETE FROM budgets WHERE name = ?').run(normalizeText(name));
  return listBudgets(app);
}

function listSavingsGoals(app) {
  const db = getDatabase(app);
  return db.prepare(`
    SELECT name, saved, target, note, color
    FROM savings_goals
    ORDER BY rowid ASC
  `).all();
}

function replaceSavingsGoals(app, goals) {
  const db = getDatabase(app);
  const entries = Array.isArray(goals) ? goals : [];

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM savings_goals').run();
    const insertGoal = db.prepare(`
      INSERT INTO savings_goals (name, saved, target, note, color)
      VALUES (@name, @saved, @target, @note, @color)
    `);
    entries.forEach(goal => {
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
  return listSavingsGoals(app);
}

function upsertSavingsGoal(app, payload) {
  const db = getDatabase(app);
  const name = normalizeText(payload?.name);
  if (!name) return listSavingsGoals(app);

  db.prepare(`
    INSERT INTO savings_goals (name, saved, target, note, color)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      saved = excluded.saved,
      target = excluded.target,
      note = excluded.note,
      color = excluded.color
  `).run(
    name,
    normalizeNumber(payload?.saved),
    Math.max(1, normalizeNumber(payload?.target, 1)),
    normalizeText(payload?.note),
    normalizeText(payload?.color) || 'green',
  );

  return listSavingsGoals(app);
}

function deleteSavingsGoal(app, name) {
  const db = getDatabase(app);
  db.prepare('DELETE FROM savings_goals WHERE name = ?').run(normalizeText(name));
  return listSavingsGoals(app);
}

function listReminders(app) {
  const db = getDatabase(app);
  return db.prepare(`
    SELECT name, description, amount, date, category, status, days, color
    FROM reminders
    ORDER BY date ASC, name ASC
  `).all();
}

function replaceReminders(app, reminders) {
  const db = getDatabase(app);
  const entries = Array.isArray(reminders) ? reminders : [];

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM reminders').run();
    const insertReminder = db.prepare(`
      INSERT INTO reminders (name, description, amount, date, category, status, days, color)
      VALUES (@name, @description, @amount, @date, @category, @status, @days, @color)
    `);
    entries.forEach(reminder => {
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
  return listReminders(app);
}

function upsertReminder(app, payload) {
  const db = getDatabase(app);
  const name = normalizeText(payload?.name);
  if (!name) return listReminders(app);

  db.prepare(`
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
  `).run(
    name,
    normalizeText(payload?.description),
    normalizeNumber(payload?.amount),
    normalizeText(payload?.date),
    normalizeText(payload?.category),
    normalizeText(payload?.status) || 'próximo',
    Number.parseInt(payload?.days, 10) || 0,
    normalizeText(payload?.color) || 'gray',
  );

  return listReminders(app);
}

function deleteReminder(app, name) {
  const db = getDatabase(app);
  db.prepare('DELETE FROM reminders WHERE name = ?').run(normalizeText(name));
  return listReminders(app);
}

function getProfile(app) {
  const db = getDatabase(app);
  const row = db.prepare(`
    SELECT name, email, career, income, savings_goal AS savingsGoal, currency,
           notifications_enabled AS notificationsEnabled,
           alert_budget AS alertBudget,
           alert_reminders AS alertReminders,
           alert_monthly AS alertMonthly
    FROM profile
    WHERE id = 1
  `).get();

  if (!row) {
    return { ...DEFAULT_PROFILE };
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
  db.prepare(`
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
  `).run({
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

function saveProfile(app, profile) {
  const db = getDatabase(app);
  insertOrUpdateProfile(db, profile);
  return getProfile(app);
}

function getFinanceState(app) {
  return {
    transactions: listTransactions(app),
    budgets: listBudgets(app),
    savings: listSavingsGoals(app),
    reminders: listReminders(app),
    profile: getProfile(app),
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