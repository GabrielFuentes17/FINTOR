/* global module */

const DEFAULT_PROFILE = {
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

function normalizeBudgetMap(map) {
  const output = {};
  Object.entries(map || {}).forEach(([name, value]) => {
    const limit = Number(value);
    if (name && Number.isFinite(limit) && limit > 0) {
      output[name] = limit;
    }
  });
  return output;
}

function normalizeSavingsGoal(goal, index = 0, colorKeys = []) {
  const keys = Array.isArray(colorKeys) && colorKeys.length ? colorKeys : ['green'];
  return {
    name: String(goal?.name ?? ''),
    saved: Number(goal?.saved) || 0,
    target: Math.max(1, Number(goal?.target) || 1),
    note: String(goal?.note ?? ''),
    color: goal?.color || keys[index % keys.length],
  };
}

function normalizeReminder(reminder, deps) {
  const todayISO = deps?.hoyISO || (() => '');
  const deriveState = deps?.deriveReminderStateFromDate || (() => ({ days: 0, status: 'próximo' }));

  const date = String(reminder?.date ?? todayISO());
  const derived = deriveState(date);

  return {
    name: String(reminder?.name ?? ''),
    description: String(reminder?.description ?? ''),
    amount: Number(reminder?.amount) || 0,
    date,
    category: String(reminder?.category ?? 'Otro'),
    days: derived.days,
    color: ['red', 'amber', 'blue', 'gray', 'green'].includes(reminder?.color)
      ? reminder.color
      : 'gray',
    status: derived.status,
  };
}

function toUiTransaction(row, deps) {
  const rawType = String(row?.type ?? row?.tipo ?? 'ingreso');
  const desc = String(row?.description ?? row?.desc ?? '');
  const rawCategory = String(row?.category ?? row?.cat ?? '');

  const dbExpenseType = deps?.DB_EXPENSE_TYPE;
  const uiExpenseType = deps?.UI_EXPENSE_TYPE;
  const clasificarGasto = deps?.clasificarGasto || ((text, category) => category);
  const todayISO = deps?.hoyISO || (() => '');

  return {
    id: row?.id,
    tipo: rawType === dbExpenseType ? uiExpenseType : rawType,
    desc,
    monto: Number(row?.amount ?? row?.monto) || 0,
    cat: rawType === dbExpenseType ? clasificarGasto(desc, rawCategory) : rawCategory,
    fecha: String(row?.date ?? row?.fecha ?? todayISO()),
  };
}

module.exports = {
  DEFAULT_PROFILE,
  normalizeBudgetMap,
  normalizeSavingsGoal,
  normalizeReminder,
  toUiTransaction,
};
