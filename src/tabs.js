// ------- Notifications for reminders -------
const NOTIFIED_REMINDERS_KEY = 'fintor:notifiedReminders:v1';

function _loadNotifiedMap() {
  try {
    const raw = localStorage.getItem(NOTIFIED_REMINDERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

function _saveNotifiedMap(map) {
  try {
    localStorage.setItem(NOTIFIED_REMINDERS_KEY, JSON.stringify(map || {}));
  } catch (err) {
    // ignore
  }
}

function _reminderUniqueId(reminder) {
  return `${String(reminder.name || '')}|${String(reminder.date || '')}`;
}

function checkAndNotifyReminders() {
  try {
    const profile = getProfileData();
    if (!profile || !profile.alertReminders) return;

    const reminders = getReminders();
    const map = _loadNotifiedMap();

    // Cleanup entries for removed/changed reminders
    const currentIds = new Set(reminders.map((r) => _reminderUniqueId(r)));
    Object.keys(map).forEach((k) => {
      if (!currentIds.has(k)) delete map[k];
    });

    reminders.forEach((reminder) => {
      const id = _reminderUniqueId(reminder);
      if (map[id]) return; // already notified

      // notify for overdue or upcoming within 7 days
      if (Number(reminder.days) < 0 || (Number(reminder.days) >= 0 && Number(reminder.days) <= 7)) {
        const title = `Recordatorio: ${reminder.name}`;
        const bodyParts = [];
        if (reminder.description) bodyParts.push(reminder.description);
        bodyParts.push(fmtMoneyCompact(Number(reminder.amount) || 0));
        bodyParts.push(reminder.date || '');
        const body = bodyParts.filter(Boolean).join(' · ');

        try {
          window.electronAPI?.notifications?.notify?.({ title, body });
        } catch (err) {
          console.error('notify error', err);
        }

        map[id] = Date.now();
      }
    });

    _saveNotifiedMap(map);
  } catch (err) {
    console.error('checkAndNotifyReminders error', err);
  }
}

function switchTab(tabName) {
  const trigger = document.querySelector(`.nav-link[data-tab="${tabName}"]`);
  openTab({ currentTarget: trigger }, tabName);
}

function formatMonthLabel(date = new Date()) {
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  return `${months[date.getMonth()] ?? 'mes'} ${date.getFullYear()}`;
}

const THEME_STORAGE_KEY = 'fintor:theme:v1';

function getStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'dark' ? 'dark' : 'light';
  } catch (error) {
    console.error('getStoredTheme error', error);
    return 'light';
  }
}

function setTheme(theme) {
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('theme-dark', nextTheme === 'dark');
  document.body.setAttribute('data-theme', nextTheme);

  const toggleButton = document.getElementById('theme-toggle-btn');
  const toggleLabel = document.getElementById('theme-toggle-label');
  if (toggleButton) {
    toggleButton.setAttribute('aria-pressed', nextTheme === 'dark' ? 'true' : 'false');
    toggleButton.classList.toggle('text-slate-100', nextTheme === 'dark');
    toggleButton.classList.toggle('hover:bg-slate-800', nextTheme === 'dark');
    toggleButton.classList.toggle('hover:bg-slate-50', nextTheme !== 'dark');
  }
  if (toggleLabel) {
    toggleLabel.textContent = nextTheme === 'dark' ? 'Modo claro' : 'Modo oscuro';
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch (error) {
    console.error('setTheme error', error);
  }
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

function refreshPage() {
  window.location.reload();
}

function renderStaticMetadata() {
  const profile = getProfileData();
  const monthLabel = formatMonthLabel();

  const dashboardMonthLabel = document.getElementById('dashboard-month-label');
  const dashboardSubtitle = document.getElementById('dashboard-income-note');
  const dashboardExpenseNote = document.getElementById('dashboard-expense-note');
  const dashboardBalanceNote = document.getElementById('dashboard-balance-note');
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  const sidebarUsername = document.getElementById('sidebar-username');
  const sidebarRemindersBadge = document.getElementById('sidebar-reminders-badge');
  const transactionsSubtitle = document.getElementById('transactions-subtitle');
  const budgetSubtitle = document.getElementById('budget-subtitle');
  const reportsSubtitle = document.getElementById('reports-subtitle');
  const reportsMonthLabel = document.getElementById('reports-month-label');
  const reportAnalysisMonthChip = document.getElementById('report-analysis-month-chip');

  const reminders = getReminders();
  const dueAttentionCount = reminders.filter((reminder) => reminder.days <= 7).length;

  if (dashboardMonthLabel) dashboardMonthLabel.textContent = monthLabel;
  if (dashboardSubtitle)
    dashboardSubtitle.textContent = `Ingreso mensual · ${profile.currency || 'USD'}`;
  if (dashboardExpenseNote) dashboardExpenseNote.textContent = `Gastos registrados · ${monthLabel}`;
  if (dashboardBalanceNote) dashboardBalanceNote.textContent = `Balance actual · ${monthLabel}`;
  if (sidebarAvatar) sidebarAvatar.textContent = profileInitials(profile.name);
  if (sidebarUsername) sidebarUsername.textContent = profile.name || '';
  if (sidebarRemindersBadge) sidebarRemindersBadge.textContent = String(dueAttentionCount);
  if (transactionsSubtitle)
    transactionsSubtitle.textContent = `Historial de movimientos · ${monthLabel}`;
  if (budgetSubtitle) budgetSubtitle.textContent = `Límites de gasto · ${monthLabel}`;
  if (reportsSubtitle)
    reportsSubtitle.textContent = `Ingresos vs gastos, distribución y análisis de ${monthLabel}.`;
  if (reportsMonthLabel) reportsMonthLabel.textContent = monthLabel;
  if (reportAnalysisMonthChip) reportAnalysisMonthChip.textContent = monthLabel;
}

function renderDashboardRecentList() {
  const list = document.getElementById('dashboard-recent-list');
  if (!list) return;

  const recent = [...transacciones]
    .sort(
      (a, b) =>
        String(b.fecha).localeCompare(String(a.fecha)) || Number(b.id || 0) - Number(a.id || 0)
    )
    .slice(0, 5);

  if (recent.length === 0) {
    list.innerHTML =
      '<li class="py-6 text-center text-sm text-slate-500">Sin movimientos recientes.</li>';
    return;
  }

  list.innerHTML = recent
    .map((tx) => {
      const isIncome = tx.tipo === 'ingreso';
      const amountClass = isIncome ? 'text-green-600' : 'text-red-500';
      const amountSign = isIncome ? '+' : '−';
      const iconBg = txIconBg(tx);
      return `
      <li class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconBg}">
          <span class="text-xs font-bold text-white">${escapeHtml(
            (tx.cat || tx.desc || 'Tx').slice(0, 2).toUpperCase()
          )}</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-slate-900">${escapeHtml(
            tx.desc || 'Movimiento'
          )}</p>
          <p class="text-xs text-slate-500">${fmtFechaLista(tx.fecha)}</p>
        </div>
        <p class="shrink-0 text-sm font-semibold ${amountClass}">${amountSign}${fmtMoneyCompact(
        tx.monto
      )}</p>
      </li>
    `;
    })
    .join('');
}

function renderDashboardUpcomingList() {
  const list = document.getElementById('dashboard-upcoming-list');
  if (!list) return;

  const upcoming = getReminders()
    .filter((reminder) => reminder.days >= 0)
    .sort(
      (a, b) =>
        String(a.date).localeCompare(String(b.date)) || String(a.name).localeCompare(String(b.name))
    )
    .slice(0, 3);

  if (upcoming.length === 0) {
    list.innerHTML =
      '<div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No hay pagos próximos.</div>';
    return;
  }

  list.innerHTML = upcoming
    .map((reminder) => {
      const colors = REMINDER_COLORS[reminder.color] || REMINDER_COLORS.gray;
      return `
      <div class="flex items-center gap-4 rounded-xl border p-4 shadow-sm ${colors.card}">
        <p class="w-14 shrink-0 text-center text-sm font-bold leading-tight ${
          colors.amount
        }">${reminderShortDate(reminder.date)}</p>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-slate-900">${escapeHtml(reminder.name)}</p>
          <p class="mt-0.5 text-sm font-bold ${colors.amount}">${fmtMoneyCompact(
        reminder.amount
      )}</p>
        </div>
      </div>
    `;
    })
    .join('');
}

function renderDashboardWeekChart() {
  const chart = document.getElementById('dashboard-week-chart');
  if (!chart) return;

  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    days.push({
      iso,
      weekday: d.getDay(),
      income: 0,
      expense: 0,
      isToday: i === 0,
    });
  }

  const byDate = new Map(days.map((item) => [item.iso, item]));
  transacciones.forEach((tx) => {
    const bucket = byDate.get(String(tx.fecha));
    if (!bucket) return;
    if (tx.tipo === 'ingreso') bucket.income += Number(tx.monto) || 0;
    if (tx.tipo === UI_EXPENSE_TYPE) bucket.expense += Number(tx.monto) || 0;
  });

  const maxValue = Math.max(...days.map((item) => Math.max(item.income, item.expense)), 1);

  chart.innerHTML = days
    .map((item) => {
      const incomeHeight = Math.max(10, Math.round((item.income / maxValue) * 100));
      const expenseHeight = Math.max(10, Math.round((item.expense / maxValue) * 100));
      const labelClass = item.isToday ? 'text-green-800' : 'text-slate-400';
      const dayIndex = item.weekday === 0 ? 6 : item.weekday - 1;
      return `
        <div class="flex flex-1 flex-col items-center gap-2">
          <div class="flex w-full max-w-10 flex-1 flex-col justify-end gap-0.5">
            <div class="w-full rounded-t-md ${
              item.isToday ? 'bg-green-700 shadow-sm' : 'bg-green-300/90'
            }" style="height: ${incomeHeight}%"></div>
            <div class="w-full rounded-t-md ${
              item.isToday ? 'bg-red-400/95' : 'bg-red-300/90'
            }" style="height: ${expenseHeight}%"></div>
          </div>
          <span class="text-2xs font-semibold ${labelClass}">${dayLabels[dayIndex]}</span>
        </div>
      `;
    })
    .join('');
}

function renderDashboard() {
  const profile = getProfileData();
  const totalExpenses = transacciones
    .filter((tx) => tx.tipo === UI_EXPENSE_TYPE)
    .reduce((sum, tx) => sum + (Number(tx.monto) || 0), 0);
  const balance = Number(profile.income || 0) - totalExpenses;
  const presupuesto = budgetSnapshotState
    ? normalizeBudgetSnapshot(budgetSnapshotState)
    : calcularPresupuesto(profile.income || 0);

  const incomeValue = document.getElementById('dashboard-income-value');
  const incomeNote = document.getElementById('dashboard-income-note');
  const expenseValue = document.getElementById('dashboard-expense-value');
  const expenseNote = document.getElementById('dashboard-expense-note');
  const balanceValue = document.getElementById('dashboard-balance-value');
  const balanceNote = document.getElementById('dashboard-balance-note');

  if (incomeValue) incomeValue.textContent = fmtMoneyCompact(profile.income || 0);
  if (incomeNote) incomeNote.textContent = `Ingreso mensual · ${profile.currency || 'USD'}`;
  if (expenseValue) expenseValue.textContent = fmtMoneyCompact(totalExpenses);
  if (expenseNote) expenseNote.textContent = 'Gastos registrados';
  if (balanceValue) balanceValue.textContent = fmtMoneyCompact(balance);
  if (balanceNote) balanceNote.textContent = balance >= 0 ? 'Saldo disponible' : 'Saldo negativo';
  if (incomeNote) incomeNote.title = generarResumen(presupuesto);

  renderDashboardWeekChart();
  renderDashboardRecentList();
  renderDashboardUpcomingList();
}

function refreshDashboardIfVisible() {
  if (isTabActive('tab1')) {
    renderDashboard();
  }
}

function refreshPresupuestoIfVisible() {
  if (isTabActive('tab3')) {
    renderPresupuesto();
  }
}

function isTabActive(tabId) {
  return document.getElementById(tabId)?.classList.contains('active');
}

function refreshFinanceViews() {
  renderTxList();
  if (isTabActive('tab6')) renderReportes();
  refreshPresupuestoIfVisible();
  refreshDashboardIfVisible();
}

var txTipo = 'ingreso';
var filtroActual = 'todas';
var transacciones = [];
var budgetState = {};
var savingsGoalsState = [];
var remindersState = [];
var profileState = null;
var budgetSnapshotState = null;
var editingTxId = null;

function toUiTransaction(row) {
  return toUiTransactionState(row, {
    DB_EXPENSE_TYPE,
    UI_EXPENSE_TYPE,
    clasificarGasto,
    hoyISO,
  });
}

function toDbTransactionType(uiType) {
  return uiType === UI_EXPENSE_TYPE ? DB_EXPENSE_TYPE : uiType;
}

function normalizeBudgetMap(map) {
  const normalized = normalizeBudgetMapState(map);
  const filtered = {};
  Object.entries(normalized).forEach(([name, value]) => {
    if (GASTO_CATS.has(name)) {
      filtered[name] = value;
    }
  });
  return filtered;
}

function normalizeSavingsGoal(goal, index = 0) {
  return normalizeSavingsGoalState(goal, index, Object.keys(SAVINGS_COLORS));
}

function normalizeReminder(reminder) {
  return normalizeReminderState(reminder, { hoyISO, deriveReminderStateFromDate });
}

function parseLocalDateISO(dateISO) {
  return parseLocalDateISOUtil(dateISO);
}

function deriveReminderStateFromDate(dateISO) {
  return deriveReminderStateFromDateUtil(dateISO);
}

async function hydrateFinanceState() {
  const financeAPI = window.electronAPI?.finance;

  if (!financeAPI) {
    budgetState = {};
    savingsGoalsState = [];
    remindersState = [];
    budgetSnapshotState = calcularPresupuesto(0);
    profileState = {
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
    transacciones = [];
    return;
  }

  try {
    const state = await financeAPI.getState();
    transacciones = Array.isArray(state?.transactions)
      ? state.transactions.map(toUiTransaction)
      : [];
    budgetState = normalizeBudgetMap(state?.budgets);
    savingsGoalsState = Array.isArray(state?.savings)
      ? state.savings.map((goal, index) => normalizeSavingsGoal(goal, index))
      : [];
    remindersState = Array.isArray(state?.reminders) ? state.reminders.map(normalizeReminder) : [];
    budgetSnapshotState = normalizeBudgetSnapshot(state?.budgetSnapshot ?? state?.profile?.income);
    profileState = state?.profile
      ? { ...DEFAULT_PROFILE, ...state.profile }
      : {
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
  } catch (error) {
    console.error('hydrateFinanceState error', error);
    budgetState = {};
    savingsGoalsState = [];
    remindersState = [];
    budgetSnapshotState = calcularPresupuesto(0);
    profileState = {
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
    transacciones = [];
  }
}

/** Datos de prueba: estudiante UEES con sueldo $400 (abril 2026). Orden: más reciente primero. */
// Datos se cargan desde SQLite al iniciar la ventana.

const INGRESO_CATS = new Set(['Salario', 'Freelance', 'Beca', 'Inversión', 'Ingresos']);
const GASTO_CATS = new Set([
  'Comida',
  'Transporte',
  'Vivienda',
  'Salud',
  'Educación',
  'Entretenimiento',
  'Cuidado personal',
  'Limpieza del hogar',
  'Ropa',
  'Mascotas',
  'Servicios financieros',
  'Otro',
]);
const UI_EXPENSE_TYPE = 'gasto';
const DB_EXPENSE_TYPE = 'egreso';
const {
  calcularPresupuesto,
  generarResumen,
  normalizeBudgetSnapshot,
} = require('./finance/budget.js');
const {
  clasificarGasto: clasificarGastoBase,
  isExpenseCategory,
} = require('./finance/classification.js');
const {
  MESES_CORTO,
  parseMoneyValue: parseMoneyValueUtil,
  hoyISO: hoyISOUtil,
  fmtMoney: fmtMoneyUtil,
  fmtMoneyCompact: fmtMoneyCompactUtil,
  fmtFechaLista: fmtFechaListaUtil,
  escapeHtml: escapeHtmlUtil,
  escapeAttr: escapeAttrUtil,
  parseLocalDateISO: parseLocalDateISOUtil,
  deriveReminderStateFromDate: deriveReminderStateFromDateUtil,
  reminderShortDate: reminderShortDateUtil,
  reminderDateFromDays: reminderDateFromDaysUtil,
} = require('./tabs-utils.js');
const {
  DEFAULT_PROFILE,
  normalizeBudgetMap: normalizeBudgetMapState,
  normalizeSavingsGoal: normalizeSavingsGoalState,
  normalizeReminder: normalizeReminderState,
  toUiTransaction: toUiTransactionState,
} = require('./tabs-state.js');

function clasificarGasto(texto, categoriaActual = '') {
  return clasificarGastoBase(texto, categoriaActual);
}

function parseMoneyValue(value) {
  return parseMoneyValueUtil(value);
}

function parseExpenseInput(descRaw, montoRaw, catRaw) {
  const descInput = String(descRaw ?? '').trim();
  const amountText = String(montoRaw ?? '').trim();
  const categoryInput = String(catRaw ?? '').trim();
  const parsedAmount = parseMoneyValue(amountText || descInput);

  let desc = descInput;
  if (!desc && amountText) {
    desc = amountText
      .replace(/[$€£₡]/g, ' ')
      .replace(/\b\d+(?:[.,]\d+)?\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const cat = clasificarGasto(
    [descInput, amountText, categoryInput].filter(Boolean).join(' '),
    categoryInput
  );

  return {
    monto: parsedAmount,
    desc,
    cat,
  };
}

function hoyISO() {
  return hoyISOUtil();
}

function abrirModal(txId) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  overlay.setAttribute('aria-hidden', 'false');
  const descEl = document.getElementById('tx-desc');
  const montoEl = document.getElementById('tx-monto');
  const catEl = document.getElementById('tx-cat');
  const fechaEl = document.getElementById('tx-fecha');
  if (typeof txId !== 'undefined' && txId !== null) {
    // editar transacción existente
    const tx = transacciones.find((t) => Number(t.id) === Number(txId));
    if (tx) {
      editingTxId = Number(tx.id);
      setTipo(tx.tipo || 'ingreso');
      if (descEl) descEl.value = tx.desc || '';
      if (montoEl) montoEl.value = String(tx.monto || '');
      if (catEl) catEl.value = tx.cat || '';
      if (fechaEl) fechaEl.value = tx.fecha || hoyISO();
    }
  } else {
    // nueva transacción
    editingTxId = null;
    if (descEl) descEl.value = '';
    if (montoEl) montoEl.value = '';
    if (catEl) catEl.value = '';
    if (fechaEl) fechaEl.value = hoyISO();
    setTipo(txTipo);
  }
  ['err-desc', 'err-monto', 'err-cat'].forEach(limpiar);
}

function cerrarModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
  overlay.setAttribute('aria-hidden', 'true');
}

function cerrarModalOverlay(e) {
  if (e.target.id === 'modal-overlay') cerrarModal();
}

function setTipo(t) {
  txTipo = t;
  const ing = document.getElementById('btn-ing');
  const eg = document.getElementById('btn-eg');
  const ingresoOn = 'bg-green-700 text-white shadow-sm ring-1 ring-black/5';
  const ingresoOff = 'bg-transparent text-slate-600 hover:bg-white/60';
  const egresoOn = 'bg-rose-600 text-white shadow-sm ring-1 ring-black/5';
  const egresoOff = 'bg-transparent text-slate-600 hover:bg-white/60';

  if (t === 'ingreso') {
    ing.className = `tipo-btn rounded-lg px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1 ${ingresoOn}`;
    eg.className = `tipo-btn rounded-lg px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 ${egresoOff}`;
  } else {
    ing.className = `tipo-btn rounded-lg px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1 ${ingresoOff}`;
    eg.className = `tipo-btn rounded-lg px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 ${egresoOn}`;
  }

  const cat = document.getElementById('tx-cat');
  const v = cat.value;
  const ok =
    (t === 'ingreso' && INGRESO_CATS.has(v)) || (t === UI_EXPENSE_TYPE && GASTO_CATS.has(v));
  if (!ok) cat.value = '';
}

function limpiar(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function mostrarError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

async function guardarTx() {
  const desc = document.getElementById('tx-desc').value.trim();
  const montoRaw = document.getElementById('tx-monto').value;
  const catInput = document.getElementById('tx-cat').value;
  let fecha = document.getElementById('tx-fecha').value;
  if (!fecha) fecha = hoyISO();

  const expenseInput =
    txTipo === UI_EXPENSE_TYPE ? parseExpenseInput(desc, montoRaw, catInput) : null;
  const monto = txTipo === UI_EXPENSE_TYPE ? expenseInput.monto : parseMoneyValue(montoRaw);
  const effectiveDesc = txTipo === UI_EXPENSE_TYPE ? expenseInput.desc || desc : desc;
  const effectiveCat = txTipo === UI_EXPENSE_TYPE ? expenseInput.cat : catInput;

  let ok = true;
  if (!effectiveDesc) {
    mostrarError('err-desc');
    ok = false;
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    mostrarError('err-monto');
    ok = false;
  }
  if (txTipo === 'ingreso') {
    if (!catInput) {
      mostrarError('err-cat');
      ok = false;
    }
    if (catInput && !INGRESO_CATS.has(catInput)) {
      mostrarError('err-cat');
      ok = false;
    }
  } else {
    const inferredCategory = effectiveCat;
    if (!isExpenseCategory(inferredCategory)) {
      mostrarError('err-cat');
      ok = false;
    }
  }
  if (!ok) return;

  const cat = txTipo === UI_EXPENSE_TYPE ? effectiveCat : catInput;

  const newTransaction = {
    tipo: txTipo,
    desc: effectiveDesc,
    monto,
    cat,
    fecha,
  };
  // si editingTxId está seteado, actualizar; si no, crear
  if (editingTxId) {
    // update locally for immediate feedback
    const idx = transacciones.findIndex((t) => Number(t.id) === Number(editingTxId));
    const updatedLocal = {
      id: editingTxId,
      tipo: newTransaction.tipo,
      desc: newTransaction.desc,
      monto: newTransaction.monto,
      cat: newTransaction.cat,
      fecha: newTransaction.fecha,
    };
    if (idx >= 0) transacciones[idx] = updatedLocal;
    refreshFinanceViews();
    cerrarModal();

    try {
      const saved = await window.electronAPI?.finance?.transactions?.update({
        id: editingTxId,
        data: {
          type: toDbTransactionType(newTransaction.tipo),
          description: newTransaction.desc,
          amount: newTransaction.monto,
          category: newTransaction.cat,
          date: newTransaction.fecha,
        },
      });
      if (saved) {
        const i = transacciones.findIndex((t) => Number(t.id) === Number(editingTxId));
        if (i >= 0) transacciones[i] = toUiTransaction(saved);
        refreshFinanceViews();
      }
    } catch (error) {
      console.error('guardarTx update error', error);
    } finally {
      editingTxId = null;
    }
  } else {
    transacciones.unshift(newTransaction);
    refreshFinanceViews();
    cerrarModal();

    try {
      const saved = await window.electronAPI?.finance?.transactions?.create({
        type: toDbTransactionType(newTransaction.tipo),
        description: newTransaction.desc,
        amount: newTransaction.monto,
        category: newTransaction.cat,
        date: newTransaction.fecha,
      });
      if (saved && Number.isFinite(Number(saved.id))) {
        // replace the temporary first element
        transacciones[0] = toUiTransaction(saved);
        refreshFinanceViews();
      }
    } catch (error) {
      console.error('guardarTx create error', error);
    }
  }
}

async function eliminarTx(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return;
  const confirmed = window.confirm('¿Eliminar esta transacción?');
  if (!confirmed) return;
  try {
    await window.electronAPI?.finance?.transactions?.delete(numericId);
    transacciones = transacciones.filter((t) => Number(t.id) !== numericId);
    refreshFinanceViews();
  } catch (error) {
    console.error('eliminarTx error', error);
  }
}

function editarTx(id) {
  abrirModal(id);
}

function filtrar(tipo, btn) {
  filtroActual = tipo;
  document.querySelectorAll('.filtro-btn').forEach((b) => {
    b.classList.remove('border-slate-200', 'bg-white', 'text-green-800', 'shadow-sm');
    b.classList.add('border-transparent', 'bg-slate-100', 'text-slate-600');
  });
  btn.classList.add('border-slate-200', 'bg-white', 'text-green-800', 'shadow-sm');
  btn.classList.remove('border-transparent', 'bg-slate-100', 'text-slate-600');
  renderTxList();
}

function fmtMoney(n) {
  return fmtMoneyUtil(n);
}

function fmtMoneyCompact(n) {
  return fmtMoneyCompactUtil(n);
}

function fmtFechaLista(iso) {
  return fmtFechaListaUtil(iso);
}

function txIconBg(tx) {
  if (tx.tipo === 'ingreso') return 'bg-blue-500';
  const desc = tx.desc.toLowerCase();
  if (desc.includes('aliment') || tx.cat === 'Comida') return 'bg-pink-400';
  if (desc.includes('material') || tx.cat === 'Educación') return 'bg-red-500';
  if (tx.cat === 'Transporte') return 'bg-sky-500';
  if (tx.cat === 'Entretenimiento') return 'bg-orange-400';
  if (tx.cat === 'Salud') return 'bg-fuchsia-400';
  return 'bg-slate-400';
}

function renderTxList() {
  const lista = document.getElementById('tx-lista');
  if (!lista) return;

  const tipoFiltrado = filtroActual === 'egreso' ? UI_EXPENSE_TYPE : filtroActual;
  const filtradas = transacciones.filter((tx) =>
    tipoFiltrado === 'todas'
      ? true
      : tipoFiltrado === UI_EXPENSE_TYPE
        ? tx.tipo === UI_EXPENSE_TYPE || tx.tipo === DB_EXPENSE_TYPE
        : tx.tipo === tipoFiltrado
  );

  if (filtradas.length === 0) {
    lista.innerHTML =
      '<div class="tx-empty px-6 py-14 text-center text-sm text-slate-500">No hay transacciones en esta vista. Añade una o cambia el filtro.</div>';
    return;
  }

  lista.innerHTML = filtradas
    .map((tx) => {
      const sign = tx.tipo === 'ingreso' ? '+' : '−';
      const amountClass = tx.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600';
      const iconBg = txIconBg(tx);
      return `
      <div class="flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50/90">
        <div class="h-11 w-11 shrink-0 rounded-lg ${iconBg}" aria-hidden="true"></div>
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-slate-900">${escapeHtml(tx.desc)}</p>
          <p class="mt-0.5 text-xs text-slate-500">${fmtFechaLista(tx.fecha)}</p>
        </div>
        <div class="flex shrink-0 items-center gap-3">
          <div class="text-right">
            <p class="text-sm font-semibold tabular-nums ${amountClass}">${sign}${fmtMoneyCompact(
        tx.monto
      )}</p>
          </div>
          <div class="flex flex-col gap-2">
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50" onclick="editarTx(${escapeAttr(
              String(tx.id || '')
            )})">Editar</button>
            <button type="button" class="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50" onclick="eliminarTx(${escapeAttr(
              String(tx.id || '')
            )})">Eliminar</button>
          </div>
        </div>
      </div>`;
    })
    .join('');
}

function escapeHtml(s) {
  return escapeHtmlUtil(s);
}

function escapeAttr(s) {
  return escapeAttrUtil(s);
}

const BUDGET_COLORS = [
  'bg-yellow-400',
  'bg-blue-500',
  'bg-purple-400',
  'bg-red-500',
  'bg-pink-400',
  'bg-green-600',
  'bg-amber-500',
  'bg-sky-500',
  'bg-fuchsia-400',
  'bg-slate-400',
];

function getBudgetMap() {
  return normalizeBudgetMap(budgetState);
}

async function saveBudgetMap(map) {
  budgetState = normalizeBudgetMap(map);
  try {
    const saved = await window.electronAPI?.finance?.budgets?.set(budgetState);
    if (saved && typeof saved === 'object') {
      budgetState = normalizeBudgetMap(saved);
    }
  } catch (error) {
    console.error('saveBudgetMap error', error);
  }
}

function budgetColorFor(name) {
  const names = Object.keys(getBudgetMap());
  const index = Math.max(0, names.indexOf(name));
  return BUDGET_COLORS[index % BUDGET_COLORS.length];
}

const SAVINGS_COLORS = {
  green: {
    ring: 'text-green-700',
    bar: 'bg-green-700',
    track: 'bg-green-100',
    badge: 'bg-lime-50 text-green-800 border-green-100',
  },
  blue: {
    ring: 'text-blue-600',
    bar: 'bg-blue-500',
    track: 'bg-blue-100',
    badge: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  amber: {
    ring: 'text-amber-500',
    bar: 'bg-amber-500',
    track: 'bg-amber-100',
    badge: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  red: {
    ring: 'text-red-500',
    bar: 'bg-red-500',
    track: 'bg-red-100',
    badge: 'bg-red-50 text-red-700 border-red-100',
  },
};

function getSavingsGoals() {
  return savingsGoalsState.map((goal, index) => normalizeSavingsGoal(goal, index));
}

async function saveSavingsGoals(goals) {
  savingsGoalsState = Array.isArray(goals)
    ? goals.map((goal, index) => normalizeSavingsGoal(goal, index))
    : [];
  try {
    const saved = await window.electronAPI?.finance?.savings?.set(savingsGoalsState);
    if (Array.isArray(saved)) {
      savingsGoalsState = saved.map((goal, index) => normalizeSavingsGoal(goal, index));
    }
  } catch (error) {
    console.error('saveSavingsGoals error', error);
  }
}

function savingsColorFor(goal, index = 0) {
  const key =
    goal.color && SAVINGS_COLORS[goal.color]
      ? goal.color
      : Object.keys(SAVINGS_COLORS)[index % Object.keys(SAVINGS_COLORS).length];
  return SAVINGS_COLORS[key];
}

function openSavingsModal(goalName = '') {
  const overlay = document.getElementById('savings-modal-overlay');
  const nameInput = document.getElementById('savings-name');
  const savedInput = document.getElementById('savings-saved');
  const targetInput = document.getElementById('savings-target');
  const noteInput = document.getElementById('savings-note');
  const originalInput = document.getElementById('savings-original-name');
  const message = document.getElementById('savings-form-message');
  const title = document.getElementById('savings-modal-title');

  if (
    !overlay ||
    !nameInput ||
    !savedInput ||
    !targetInput ||
    !noteInput ||
    !originalInput ||
    !message ||
    !title
  )
    return;

  const goals = getSavingsGoals();
  const current = goals.find((goal) => goal.name === goalName);

  originalInput.value = current ? current.name : '';
  nameInput.value = current ? current.name : '';
  savedInput.value = current ? String(current.saved) : '';
  targetInput.value = current ? String(current.target) : '';
  noteInput.value = current ? current.note : '';
  title.textContent = current ? 'Editar meta' : 'Nueva meta';
  message.textContent = '';

  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  overlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => nameInput.focus(), 0);
}

function closeSavingsModal(event) {
  if (event && event.target && event.target.id !== 'savings-modal-overlay') return;

  const overlay = document.getElementById('savings-modal-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
  overlay.setAttribute('aria-hidden', 'true');
}

async function saveSavingsGoal() {
  const nameInput = document.getElementById('savings-name');
  const savedInput = document.getElementById('savings-saved');
  const targetInput = document.getElementById('savings-target');
  const noteInput = document.getElementById('savings-note');
  const originalInput = document.getElementById('savings-original-name');
  const message = document.getElementById('savings-form-message');

  if (!nameInput || !savedInput || !targetInput || !noteInput || !originalInput || !message) return;

  const name = nameInput.value.trim();
  const saved = Number.parseFloat(savedInput.value);
  const target = Number.parseFloat(targetInput.value);
  const note = noteInput.value.trim();
  const originalName = originalInput.value.trim();

  if (!name) {
    message.textContent = 'Escribe un nombre para la meta.';
    return;
  }

  if (!Number.isFinite(saved) || saved < 0) {
    message.textContent = 'Ingresa un valor ahorrado válido.';
    return;
  }

  if (!Number.isFinite(target) || target <= 0) {
    message.textContent = 'Ingresa una meta válida mayor que cero.';
    return;
  }

  const goals = getSavingsGoals();
  const existingIndex = goals.findIndex((goal) => goal.name === originalName);
  const colorSource =
    existingIndex >= 0
      ? goals[existingIndex].color
      : Object.keys(SAVINGS_COLORS)[goals.length % Object.keys(SAVINGS_COLORS).length];

  const updatedGoal = {
    name,
    saved,
    target,
    note,
    color: colorSource,
  };

  const duplicateIndex = goals.findIndex((goal) => goal.name === name);
  if (duplicateIndex >= 0 && duplicateIndex !== existingIndex) {
    message.textContent = 'Ya existe una meta con ese nombre.';
    return;
  }

  if (existingIndex >= 0) {
    goals[existingIndex] = updatedGoal;
  } else {
    goals.push(updatedGoal);
  }

  await saveSavingsGoals(goals);
  closeSavingsModal();
  renderAhorros();
}

async function removeSavingsGoal(name) {
  const goals = getSavingsGoals();
  const index = goals.findIndex((goal) => goal.name === name);
  if (index < 0) return;

  const confirmed = window.confirm(`¿Eliminar la meta "${name}"?`);
  if (!confirmed) return;

  goals.splice(index, 1);
  await saveSavingsGoals(goals);
  renderAhorros();
}

function openBudgetModal(name = '') {
  const overlay = document.getElementById('budget-modal-overlay');
  const nameInput = document.getElementById('budget-name');
  const limitInput = document.getElementById('budget-limit');
  const originalInput = document.getElementById('budget-original-name');
  const message = document.getElementById('budget-form-message');
  const title = document.getElementById('budget-modal-title');

  if (!overlay || !nameInput || !limitInput || !originalInput || !message || !title) return;

  const map = getBudgetMap();
  const existingName = String(name || '').trim();
  const currentLimit = existingName ? map[existingName] : '';

  const options = ['<option value="">- Selecciona -</option>'];
  Array.from(GASTO_CATS).forEach((category) => {
    const selected = category === existingName ? ' selected' : '';
    options.push(
      `<option value="${escapeAttr(category)}"${selected}>${escapeHtml(category)}</option>`
    );
  });
  nameInput.innerHTML = options.join('');

  originalInput.value = existingName;
  nameInput.value = existingName;
  limitInput.value = existingName ? String(currentLimit ?? '') : '';
  title.textContent = existingName ? 'Editar categoría' : 'Asignar categoría';
  message.textContent = '';

  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  overlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => nameInput.focus(), 0);
}

function closeBudgetModal(event) {
  if (event && event.target && event.target.id !== 'budget-modal-overlay') {
    return;
  }

  const overlay = document.getElementById('budget-modal-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
  overlay.setAttribute('aria-hidden', 'true');
}

async function saveBudgetCategory() {
  const nameInput = document.getElementById('budget-name');
  const limitInput = document.getElementById('budget-limit');
  const originalInput = document.getElementById('budget-original-name');
  const message = document.getElementById('budget-form-message');

  if (!nameInput || !limitInput || !originalInput || !message) return;

  const rawName = nameInput.value.trim();
  const limit = Number.parseFloat(limitInput.value);
  const originalName = originalInput.value.trim();

  if (!rawName) {
    message.textContent = 'Selecciona una categoría.';
    return;
  }

  if (!GASTO_CATS.has(rawName)) {
    message.textContent = 'Solo puedes usar categorías de gasto existentes.';
    return;
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    message.textContent = 'Ingresa un límite válido mayor que cero.';
    return;
  }

  const map = getBudgetMap();
  if (originalName && originalName !== rawName) {
    delete map[originalName];
  }
  map[rawName] = limit;

  await saveBudgetMap(map);
  closeBudgetModal();
  renderPresupuesto();
}

async function removeBudgetCategory(name) {
  const map = getBudgetMap();
  if (!(name in map)) return;

  const confirmed = window.confirm(`¿Eliminar la categoría "${name}"?`);
  if (!confirmed) return;

  delete map[name];
  await saveBudgetMap(map);
  renderPresupuesto();
}

/* —— Presupuesto (tab3) —— */
function renderPresupuesto() {
  const panel = document.getElementById('tab3');
  if (!panel) return;
  const monthLabel = formatMonthLabel();

  const budgets = getBudgetMap();
  const budgetEntries = Object.entries(budgets);
  const spent = {};
  const nameMap = {};
  budgetEntries.forEach(([k]) => {
    spent[k] = 0;
    nameMap[String(k).toLowerCase().trim()] = k;
  });

  transacciones.forEach((tx) => {
    // accept both UI and DB expense type markers
    const tipo = String(tx.tipo || '').toLowerCase();
    if (
      tipo !== String(UI_EXPENSE_TYPE).toLowerCase() &&
      tipo !== String(DB_EXPENSE_TYPE).toLowerCase()
    )
      return;

    const rawCat = String(tx.cat || '').trim();
    const key = rawCat.toLowerCase();
    if (key && key in nameMap) {
      const canonical = nameMap[key];
      spent[canonical] += Number(tx.monto) || 0;
      return;
    }

    // map Educación materials into Educación (case-insensitive)
    if (key === 'educación' || key === 'educacion' || key.includes('material')) {
      if ('Educación' in spent) spent['Educación'] += Number(tx.monto) || 0;
    }
  });

  const totalBudget = budgetEntries.reduce((sum, [, limit]) => sum + Number(limit || 0), 0);
  const totalSpent = budgetEntries.reduce((sum, [name]) => sum + Number(spent[name] || 0), 0);
  const totalAvailable = Math.max(0, totalBudget - totalSpent);

  // build HTML
  const parts = [];
  parts.push(`
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Presupuesto</h2>
        <p class="mt-2 text-sm text-slate-600">Límites de gasto - ${monthLabel}</p>
      </div>
      <button type="button" class="ml-4 inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700" onclick="openBudgetModal()">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"/></svg>
        Asignar categoría
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-6">
      <div class="rounded-xl bg-white p-4 shadow">
        <p class="text-xs text-slate-500">PRESUPUESTADO</p>
        <div class="mt-2 text-2xl font-bold text-slate-900">${fmtMoneyCompact(totalBudget)}</div>
      </div>
      <div class="rounded-xl bg-white p-4 shadow">
        <p class="text-xs text-slate-500">GASTADO</p>
        <div id="pres-gastado" class="mt-2 text-2xl font-bold text-red-500">${fmtMoneyCompact(
          totalSpent
        )}</div>
      </div>
      <div class="rounded-xl bg-white p-4 shadow">
        <p class="text-xs text-slate-500">DISPONIBLE</p>
        <div id="pres-disponible" class="mt-2 text-2xl font-bold text-green-600">${fmtMoneyCompact(
          totalAvailable
        )}</div>
      </div>
    </div>

    <div class="rounded-xl bg-white p-6 shadow">
      <div class="space-y-6" id="pres-list"></div>
    </div>
  `);

  panel.innerHTML = parts.join('');

  // render each budget row
  const listEl = document.getElementById('pres-list');
  if (!listEl) return;
  const rows = budgetEntries.map(([cat, limit]) => {
    const s = Math.round((spent[cat] || 0) * 100) / 100;
    const pctRaw = limit > 0 ? (s / limit) * 100 : 0;
    const pct = Math.min(100, Math.round(pctRaw));
    const over = pctRaw > 100;
    const color = budgetColorFor(cat);
    const remaining = Math.max(0, Math.round((limit - s) * 100) / 100);
    const exceeded = Math.max(0, Math.round((s - limit) * 100) / 100);

    return `
      <div class="rounded-xl border border-slate-100 bg-slate-50/40 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-3 h-3 rounded-full ${color}"></span>
            <div class="min-w-0">
              <p class="truncate font-medium text-slate-800">${escapeHtml(cat)}</p>
              <p class="text-xs text-slate-500">Límite mensual</p>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50" onclick='openBudgetModal(${JSON.stringify(
              cat
            )})'>Editar</button>
            <button type="button" class="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50" onclick='removeBudgetCategory(${JSON.stringify(
              cat
            )})'>Eliminar</button>
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between gap-3">
          <div class="text-sm font-semibold ${
            over ? 'text-red-500' : 'text-slate-700'
          }">${fmtMoneyCompact(s)} / ${fmtMoneyCompact(limit)}</div>
          <div class="text-xs ${over ? 'text-red-600 font-semibold' : 'text-slate-500'}">${
      over ? `Excediste ${fmtMoneyCompact(exceeded)}` : `Quedan ${fmtMoneyCompact(remaining)}`
    }</div>
        </div>

        <div class="mt-3 h-2.5 w-full rounded-full bg-slate-100">
          <div class="h-2.5 rounded-full ${
            over ? 'bg-red-500' : color
          }" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  });

  listEl.innerHTML = rows.join('');
}

function renderAhorros() {
  const panel = document.getElementById('tab4');
  if (!panel) return;

  const goals = getSavingsGoals();
  const totalSaved = goals.reduce((sum, goal) => sum + (Number(goal.saved) || 0), 0);
  const totalTarget = goals.reduce((sum, goal) => sum + (Number(goal.target) || 0), 0);
  const totalPercent =
    totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const activeGoal = goals[0] || {
    name: 'Sin metas',
    saved: 0,
    target: 1,
    note: '',
    color: 'green',
  };
  const activeColor = savingsColorFor(activeGoal, 0);

  panel.innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Ahorros</h2>
        <p class="mt-2 text-sm text-slate-600">Metas de ahorro activas</p>
      </div>
      <button type="button" class="inline-flex items-center gap-2 rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2" onclick="openSavingsModal()">
        <span class="text-base font-light leading-none">+</span>
        Nueva meta
      </button>
    </div>

    <div class="mt-6 flex flex-col gap-3 rounded-2xl border border-lime-200 bg-lime-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-200 text-lime-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 10a.75.75 0 0 1 .75-.75h6.69l-2.72-2.72a.75.75 0 1 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06-1.06l2.72-2.72H5.75A.75.75 0 0 1 5 10Z" clip-rule="evenodd" /></svg>
        </div>
        <div>
          <p class="text-sm font-semibold text-lime-900">Método activo: Regla 50/30/20</p>
          <p class="text-xs text-lime-900/80">50% necesidades · 30% deseos · 20% ahorro</p>
        </div>
      </div>
      <div id="savings-month-badge" class="self-start rounded-full bg-lime-200 px-3 py-1 text-xs font-semibold text-lime-900 sm:self-center">${fmtMoneyCompact(
        totalSaved
      )} ahorrado este mes</div>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      ${goals
        .map((goal, index) => {
          const current = Number(goal.saved) || 0;
          const target = Math.max(1, Number(goal.target) || 1);
          const pct = Math.min(100, Math.round((current / target) * 100));
          const remaining = Math.max(0, target - current);
          const colors = savingsColorFor(goal, index);
          const ringPct = `${pct}%`;
          return `
          <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <button type="button" class="flex items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50" onclick='openSavingsModal(${JSON.stringify(
                goal.name
              )})'>Editar</button>
              <button type="button" class="rounded-full border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50" onclick='removeSavingsGoal(${JSON.stringify(
                goal.name
              )})'>Eliminar</button>
            </div>

            <div class="mt-2 flex items-center justify-center">
              <div class="relative h-24 w-24 rounded-full ${
                colors.track
              }" style="background: conic-gradient(currentColor ${ringPct}, #e5e7eb ${ringPct} 100%); color: ${
            colors.bar === 'bg-green-700'
              ? '#4d8b2b'
              : colors.bar === 'bg-blue-500'
              ? '#3b82f6'
              : colors.bar === 'bg-amber-500'
              ? '#f59e0b'
              : '#6b7280'
          };">
                <div class="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
                  <p class="text-lg font-bold text-slate-900">${pct}%</p>
                  <p class="text-2xs font-medium uppercase tracking-wide text-slate-400">logrado</p>
                </div>
              </div>
            </div>

            <div class="mt-4 text-center">
              <p class="text-base font-bold text-slate-900">${escapeHtml(goal.name)}</p>
              ${
                goal.note
                  ? `<p class="mt-1 text-xs text-slate-500">${escapeHtml(goal.note)}</p>`
                  : ''
              }
              <p class="mt-2 text-xs text-slate-400">${fmtMoneyCompact(
                current
              )} / ${fmtMoneyCompact(target)}</p>
            </div>

            <div class="mt-5 h-1.5 w-full rounded-full bg-slate-100">
              <div class="h-1.5 rounded-full ${colors.bar}" style="width: ${pct}%"></div>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs ${
              pct >= 100 ? 'text-green-700 font-semibold' : 'text-slate-500'
            }">
              <span>${
                pct >= 100 ? 'Meta completada' : `${fmtMoneyCompact(remaining)} restantes`
              }</span>
              <span>${fmtMoneyCompact(current)} ahorrado</span>
            </div>
          </div>
        `;
        })
        .join('')}
    </div>

    <div class="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-slate-900">Resumen general</p>
          <p class="mt-1 text-xs text-slate-500">Suma total y progreso global de tus metas</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold text-slate-900">${fmtMoneyCompact(
            totalSaved
          )} / ${fmtMoneyCompact(totalTarget)}</p>
          <p class="text-xs text-slate-500">${totalPercent}% del objetivo total</p>
        </div>
      </div>
      <div class="mt-4 h-2.5 w-full rounded-full bg-slate-100">
        <div class="h-2.5 rounded-full ${activeColor.bar}" style="width: ${totalPercent}%"></div>
      </div>
    </div>
  `;
}

function getProfileData() {
  return profileState ? { ...DEFAULT_PROFILE, ...profileState } : { ...DEFAULT_PROFILE };
}

async function saveProfileDataToStorage(profile) {
  profileState = { ...DEFAULT_PROFILE, ...profile };
  try {
    const saved = await window.electronAPI?.finance?.profile?.save(profileState);
    if (saved && typeof saved === 'object') {
      profileState = { ...DEFAULT_PROFILE, ...saved };
    }
    const snapshot = calcularPresupuesto(profileState.income);
    budgetSnapshotState = snapshot;
    await window.electronAPI?.finance?.budgetSnapshot?.save(snapshot);
  } catch (error) {
    console.error('saveProfileDataToStorage error', error);
  }
}

function profileInitials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

async function toggleProfileNotifications() {
  const data = getProfileData();
  data.notificationsEnabled = !data.notificationsEnabled;
  await saveProfileDataToStorage(data);
  renderPerfil();
}

async function saveProfileData() {
  const nameInput = document.getElementById('profile-name');
  const emailInput = document.getElementById('profile-email');
  const careerInput = document.getElementById('profile-career');
  const incomeInput = document.getElementById('profile-income');
  const savingsGoalInput = document.getElementById('profile-savings-goal');
  const currencyInput = document.getElementById('profile-currency');
  const notificationsButton = document.getElementById('profile-notifications');
  const alertBudgetInput = document.getElementById('profile-alert-budget');
  const alertRemindersInput = document.getElementById('profile-alert-reminders');
  const alertMonthlyInput = document.getElementById('profile-alert-monthly');
  const message = document.getElementById('profile-form-message');

  if (
    !nameInput ||
    !emailInput ||
    !careerInput ||
    !incomeInput ||
    !savingsGoalInput ||
    !currencyInput ||
    !notificationsButton ||
    !alertBudgetInput ||
    !alertRemindersInput ||
    !alertMonthlyInput ||
    !message
  )
    return;

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const career = careerInput.value.trim();
  const income = Number.parseFloat(incomeInput.value);
  const savingsGoal = Number.parseFloat(savingsGoalInput.value);
  const currency = currencyInput.value;

  if (!name) {
    message.textContent = 'Escribe tu nombre.';
    return;
  }

  if (!email || !email.includes('@')) {
    message.textContent = 'Ingresa un correo válido.';
    return;
  }

  if (!career) {
    message.textContent = 'Escribe tu carrera o rol.';
    return;
  }

  if (!Number.isFinite(income) || income < 0) {
    message.textContent = 'Ingresa un ingreso mensual válido.';
    return;
  }

  if (!Number.isFinite(savingsGoal) || savingsGoal < 0) {
    message.textContent = 'Ingresa una meta de ahorro válida.';
    return;
  }

  const profile = getProfileData();
  profile.name = name;
  profile.email = email;
  profile.career = career;
  profile.income = income;
  profile.savingsGoal = savingsGoal;
  profile.currency = currency;
  profile.notificationsEnabled = Boolean(
    notificationsButton.getAttribute('aria-pressed') === 'true'
  );
  profile.alertBudget = alertBudgetInput.checked;
  profile.alertReminders = alertRemindersInput.checked;
  profile.alertMonthly = alertMonthlyInput.checked;

  await saveProfileDataToStorage(profile);
  message.textContent = 'cambios guardados correctamente';
  message.classList.remove('text-red-600');
  message.classList.add('text-green-700');
  renderDashboard();
  renderPerfil();
}

function renderReportes() {
  const panel = document.getElementById('tab6');
  if (!panel) return;
  const profile = getProfileData();

  const months = [];
  const dateCursor = new Date();
  dateCursor.setDate(1);
  for (let i = 3; i >= 0; i -= 1) {
    const d = new Date(dateCursor.getFullYear(), dateCursor.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${MESES_CORTO[d.getMonth()] ?? d.getMonth() + 1}`,
      income: 0,
      expense: 0,
    });
  }

  const byMonth = new Map(months.map((item) => [item.key, item]));
  const categoryTotals = new Map();

  transacciones.forEach((tx) => {
    const monthKey = tx.fecha?.slice(0, 7);
    const monthBucket = byMonth.get(monthKey);
    if (monthBucket) {
      if (tx.tipo === 'ingreso') monthBucket.income += Number(tx.monto) || 0;
      if (tx.tipo === UI_EXPENSE_TYPE) monthBucket.expense += Number(tx.monto) || 0;
    }

    if (tx.tipo === UI_EXPENSE_TYPE) {
      const current = categoryTotals.get(tx.cat) || 0;
      categoryTotals.set(tx.cat, current + (Number(tx.monto) || 0));
    }
  });

  const incomeTotal = months.reduce((sum, item) => sum + item.income, 0);
  const expenseTotal = months.reduce((sum, item) => sum + item.expense, 0);
  const balanceTotal = incomeTotal - expenseTotal;
  const savingsRate =
    incomeTotal > 0 ? Math.max(0, Math.round((balanceTotal / incomeTotal) * 1000) / 10) : 0;
  const topCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];

  const monthChart = document.getElementById('report-month-chart');
  const categoryChart = document.getElementById('report-category-chart');
  const incomeEl = document.getElementById('report-income');
  const expenseEl = document.getElementById('report-expenses');
  const balanceEl = document.getElementById('report-balance');
  const savingsRateEl = document.getElementById('report-savings-rate');
  const insightEl = document.getElementById('report-insight');
  const topCategoryEl = document.getElementById('report-top-category');

  if (incomeEl) incomeEl.textContent = fmtMoneyCompact(incomeTotal);
  if (expenseEl) expenseEl.textContent = fmtMoneyCompact(expenseTotal);
  if (balanceEl) balanceEl.textContent = fmtMoneyCompact(balanceTotal);
  if (savingsRateEl) savingsRateEl.textContent = `${savingsRate}%`;
  if (topCategoryEl)
    topCategoryEl.textContent = topCategory ? `Mayor gasto: ${topCategory[0]}` : 'Sin gastos';

  if (monthChart) {
    const maxValue = Math.max(...months.map((item) => Math.max(item.income, item.expense)), 1);
    monthChart.innerHTML = months
      .map((item) => {
        const incomeHeight = Math.max(6, Math.round((item.income / maxValue) * 100));
        const expenseHeight = Math.max(6, Math.round((item.expense / maxValue) * 100));
        return `
          <div class="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <div class="flex h-full w-full max-w-10 items-end justify-center gap-1">
              <div class="flex h-full flex-1 items-end justify-center"><div class="w-3 rounded-t-md bg-green-600" style="height:${incomeHeight}%"></div></div>
              <div class="flex h-full flex-1 items-end justify-center"><div class="w-3 rounded-t-md bg-red-400" style="height:${expenseHeight}%"></div></div>
            </div>
            <div class="text-center">
              <p class="text-2xs font-semibold text-slate-400">${escapeHtml(item.label)}</p>
              <p class="mt-1 text-[11px] font-semibold text-slate-700">${fmtMoneyCompact(
                item.income
              )} / ${fmtMoneyCompact(item.expense)}</p>
            </div>
          </div>
        `;
      })
      .join('');
  }

  if (categoryChart) {
    const categoryEntries = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
    const maxCategory = Math.max(...categoryEntries.map(([, value]) => value), 1);
    categoryChart.innerHTML = categoryEntries.length
      ? categoryEntries
          .map(([name, value], index) => {
            const width = Math.round((value / maxCategory) * 100);
            const color = budgetColorFor(name);
            return `
              <div>
                <div class="flex items-center justify-between gap-3 text-sm">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="h-3 w-3 rounded-full ${color}"></span>
                    <span class="truncate font-medium text-slate-800">${escapeHtml(name)}</span>
                  </div>
                  <span class="shrink-0 font-semibold text-slate-700">${fmtMoneyCompact(
                    value
                  )}</span>
                </div>
                <div class="mt-2 h-2.5 w-full rounded-full bg-slate-100">
                  <div class="h-2.5 rounded-full ${color}" style="width:${width}%"></div>
                </div>
              </div>
            `;
          })
          .join('')
      : '<div class="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Aún no hay gastos para mostrar.</div>';
  }

  if (insightEl) {
    const topName = topCategory ? topCategory[0] : 'ninguna categoría';
    const topValue = topCategory ? fmtMoneyCompact(topCategory[1]) : fmtMoneyCompact(0);
    const savingsMessage =
      balanceTotal >= 0
        ? `Este mes ahorraste ${fmtMoneyCompact(
            balanceTotal
          )}, un ${savingsRate}% de tus ingresos totales.`
        : `Este mes gastaste ${fmtMoneyCompact(Math.abs(balanceTotal))} más de lo que ingresaste.`;
    insightEl.innerHTML = `
      <p class="font-medium">${savingsMessage}</p>
      <p class="mt-2">Tu categoría de mayor gasto es <strong>${escapeHtml(
        topName
      )}</strong> con ${topValue}. Considera reducir entretenimiento para mantenerte dentro del límite.</p>
    `;
  }
}

function renderPerfil() {
  const panel = document.getElementById('tab7');
  if (!panel) return;

  const profile = getProfileData();
  const avatar = document.getElementById('profile-avatar');
  const summaryName = document.getElementById('profile-summary-name');
  const summaryCareer = document.getElementById('profile-summary-career');
  const nameInput = document.getElementById('profile-name');
  const emailInput = document.getElementById('profile-email');
  const careerInput = document.getElementById('profile-career');
  const incomeInput = document.getElementById('profile-income');
  const savingsGoalInput = document.getElementById('profile-savings-goal');
  const currencyInput = document.getElementById('profile-currency');
  const notificationsButton = document.getElementById('profile-notifications');
  const alertBudgetInput = document.getElementById('profile-alert-budget');
  const alertRemindersInput = document.getElementById('profile-alert-reminders');
  const alertMonthlyInput = document.getElementById('profile-alert-monthly');
  const message = document.getElementById('profile-form-message');
  const sideIncome = document.getElementById('profile-side-income');
  const sideSavings = document.getElementById('profile-side-savings');
  const sideCurrency = document.getElementById('profile-side-currency');

  if (avatar) avatar.textContent = profileInitials(profile.name);
  if (summaryName) summaryName.textContent = profile.name;
  if (summaryCareer) summaryCareer.textContent = profile.career;
  if (nameInput) nameInput.value = profile.name;
  if (emailInput) emailInput.value = profile.email;
  if (careerInput) careerInput.value = profile.career;
  if (incomeInput) incomeInput.value = String(profile.income);
  if (savingsGoalInput) savingsGoalInput.value = String(profile.savingsGoal);
  if (currencyInput) currencyInput.value = profile.currency;
  if (notificationsButton)
    notificationsButton.setAttribute(
      'aria-pressed',
      profile.notificationsEnabled ? 'true' : 'false'
    );
  if (notificationsButton) {
    notificationsButton.classList.toggle('bg-green-600', profile.notificationsEnabled);
    notificationsButton.classList.toggle('bg-slate-200', !profile.notificationsEnabled);
    notificationsButton.classList.toggle('border-green-700', profile.notificationsEnabled);
    notificationsButton.classList.toggle('border-slate-200', !profile.notificationsEnabled);
  }
  if (alertBudgetInput) alertBudgetInput.checked = Boolean(profile.alertBudget);
  if (alertRemindersInput) alertRemindersInput.checked = Boolean(profile.alertReminders);
  if (alertMonthlyInput) alertMonthlyInput.checked = Boolean(profile.alertMonthly);
  if (message) {
    message.textContent = '';
    message.classList.remove('text-green-700');
    message.classList.add('text-red-600');
  }
  if (sideIncome) sideIncome.textContent = fmtMoneyCompact(profile.income);
  if (sideSavings) sideSavings.textContent = fmtMoneyCompact(profile.savingsGoal);
  if (sideCurrency) sideCurrency.textContent = profile.currency;
}

const REMINDER_COLORS = {
  red: {
    card: 'border-red-200 bg-red-50/55',
    date: 'bg-red-500 text-white',
    amount: 'text-red-500',
    chip: 'bg-red-100 text-red-600',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50/50',
    date: 'bg-amber-400 text-white',
    amount: 'text-amber-500',
    chip: 'bg-amber-100 text-amber-600',
  },
  blue: {
    card: 'border-blue-200 bg-blue-50/50',
    date: 'bg-blue-500 text-white',
    amount: 'text-blue-500',
    chip: 'bg-blue-100 text-blue-600',
  },
  gray: {
    card: 'border-slate-200 bg-white',
    date: 'bg-slate-300 text-white',
    amount: 'text-slate-700',
    chip: 'bg-slate-100 text-slate-500',
  },
  green: {
    card: 'border-green-200 bg-green-50/55',
    date: 'bg-green-600 text-white',
    amount: 'text-green-700',
    chip: 'bg-green-100 text-green-700',
  },
};

function updateRemindersCount() {
  const badge = document.getElementById('reminders-badge');
  if (!badge) return;

  const reminders = getReminders();
  const count = reminders.length;

  if (count > 0) {
    badge.textContent = count;
    badge.classList.add('flex');
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
    badge.classList.remove('flex');
  }
}

function getReminders() {
  return remindersState
    .map(normalizeReminder)
    .sort(
      (a, b) =>
        String(a.date).localeCompare(String(b.date)) || String(a.name).localeCompare(String(b.name))
    );
}

async function saveReminders(reminders) {
  remindersState = Array.isArray(reminders) ? reminders.map(normalizeReminder) : [];
  try {
    const saved = await window.electronAPI?.finance?.reminders?.set(remindersState);
    if (Array.isArray(saved)) {
      remindersState = saved.map(normalizeReminder);
    }
  } catch (error) {
    console.error('saveReminders error', error);
  }
  // Update badge count
  updateRemindersCount();
  // After saving reminders, run notification checks (if enabled)
  try {
    checkAndNotifyReminders();
  } catch (e) {
    /* ignore */
  }
}

function reminderBadgeText(days, status) {
  if (status === 'mañana') return 'Mañana';
  if (status === 'vencido') return 'Vencido';
  if (status === 'próximo') {
    if (days === 0) return 'Hoy';
    if (days === 1) return 'En 1 día';
    return `En ${days} días`;
  }
  if (status === 'lejos') {
    if (days < 0) return `Vencido ${Math.abs(days)} d`;
    return `En ${days} días`;
  }
  return 'Programado';
}

function reminderShortDate(date) {
  return reminderShortDateUtil(date);
}

function reminderDateFromDays(daysOffset) {
  return reminderDateFromDaysUtil(daysOffset);
}

function syncReminderDateFromDays() {
  const daysInput = document.getElementById('reminder-days');
  const dateInput = document.getElementById('reminder-date');
  const statusInput = document.getElementById('reminder-status');

  if (!daysInput || !dateInput || !statusInput) return;

  const rawDays = daysInput.value.trim();
  if (!rawDays) {
    dateInput.value = '';
    statusInput.value = 'próximo';
    return;
  }

  const days = Number.parseInt(rawDays, 10);
  if (!Number.isFinite(days)) return;

  dateInput.value = reminderDateFromDays(days);
  const derived = deriveReminderStateFromDate(dateInput.value);
  statusInput.value = derived.status;
}

function syncReminderDaysFromDate() {
  const dateInput = document.getElementById('reminder-date');
  const daysInput = document.getElementById('reminder-days');
  const statusInput = document.getElementById('reminder-status');

  if (!dateInput || !daysInput || !statusInput) return;

  if (!dateInput.value) {
    daysInput.value = '';
    statusInput.value = 'próximo';
    return;
  }

  const derived = deriveReminderStateFromDate(dateInput.value);
  daysInput.value = String(derived.days);
  statusInput.value = derived.status;
}

function openReminderModal(name = '') {
  const overlay = document.getElementById('reminder-modal-overlay');
  const nameInput = document.getElementById('reminder-name');
  const descriptionInput = document.getElementById('reminder-description');
  const amountInput = document.getElementById('reminder-amount');
  const dateInput = document.getElementById('reminder-date');
  const categoryInput = document.getElementById('reminder-category');
  const statusInput = document.getElementById('reminder-status');
  const daysInput = document.getElementById('reminder-days');
  const colorInput = document.getElementById('reminder-color');
  const originalInput = document.getElementById('reminder-original-name');
  const message = document.getElementById('reminder-form-message');
  const title = document.getElementById('reminder-modal-title');

  if (
    !overlay ||
    !nameInput ||
    !descriptionInput ||
    !amountInput ||
    !dateInput ||
    !categoryInput ||
    !statusInput ||
    !daysInput ||
    !colorInput ||
    !originalInput ||
    !message ||
    !title
  )
    return;

  const reminders = getReminders();
  const current = reminders.find((reminder) => reminder.name === name);

  originalInput.value = current ? current.name : '';
  nameInput.value = current ? current.name : '';
  descriptionInput.value = current ? current.description : '';
  amountInput.value = current ? String(current.amount) : '';
  dateInput.value = current ? current.date : hoyISO();
  categoryInput.value = current ? current.category : 'Mensualidad';
  statusInput.value = current ? current.status : 'próximo';
  daysInput.value = current ? String(current.days) : '0';
  colorInput.value = current ? current.color : 'red';
  title.textContent = current ? 'Editar recordatorio' : 'Nuevo recordatorio';
  message.textContent = '';
  syncReminderDaysFromDate();

  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  overlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => nameInput.focus(), 0);
}

function closeReminderModal(event) {
  if (event && event.target && event.target.id !== 'reminder-modal-overlay') return;

  const overlay = document.getElementById('reminder-modal-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
  overlay.setAttribute('aria-hidden', 'true');
}

async function saveReminder() {
  const nameInput = document.getElementById('reminder-name');
  const descriptionInput = document.getElementById('reminder-description');
  const amountInput = document.getElementById('reminder-amount');
  const dateInput = document.getElementById('reminder-date');
  const categoryInput = document.getElementById('reminder-category');
  const statusInput = document.getElementById('reminder-status');
  const daysInput = document.getElementById('reminder-days');
  const colorInput = document.getElementById('reminder-color');
  const originalInput = document.getElementById('reminder-original-name');
  const message = document.getElementById('reminder-form-message');

  if (
    !nameInput ||
    !descriptionInput ||
    !amountInput ||
    !dateInput ||
    !categoryInput ||
    !statusInput ||
    !daysInput ||
    !colorInput ||
    !originalInput ||
    !message
  )
    return;

  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();
  const amount = Number.parseFloat(amountInput.value);
  const date = dateInput.value;
  const category = categoryInput.value;
  const color = colorInput.value;
  const originalName = originalInput.value.trim();

  if (!name) {
    message.textContent = 'Escribe un nombre.';
    return;
  }

  if (!Number.isFinite(amount) || amount < 0) {
    message.textContent = 'Ingresa un monto válido.';
    return;
  }

  const parsedDays = Number.parseInt(daysInput.value, 10);
  const resolvedDate =
    date || (Number.isFinite(parsedDays) ? reminderDateFromDays(parsedDays) : '');

  if (!resolvedDate) {
    message.textContent = 'Selecciona una fecha o escribe días restantes.';
    return;
  }

  const derived = deriveReminderStateFromDate(resolvedDate);
  dateInput.value = resolvedDate;
  daysInput.value = String(derived.days);
  statusInput.value = derived.status;

  const reminders = getReminders();
  const existingIndex = reminders.findIndex((reminder) => reminder.name === originalName);
  const duplicateIndex = reminders.findIndex((reminder) => reminder.name === name);
  if (duplicateIndex >= 0 && duplicateIndex !== existingIndex) {
    message.textContent = 'Ya existe un recordatorio con ese nombre.';
    return;
  }

  const payload = {
    name,
    description,
    amount,
    date: resolvedDate,
    category,
    status: derived.status,
    days: derived.days,
    color,
  };

  if (existingIndex >= 0) {
    reminders[existingIndex] = payload;
  } else {
    reminders.push(payload);
  }

  await saveReminders(reminders);
  closeReminderModal();
  renderRecordatorios();
}

async function removeReminder(name) {
  const reminders = getReminders();
  const index = reminders.findIndex((reminder) => reminder.name === name);
  if (index < 0) return;

  const confirmed = window.confirm(`¿Eliminar el recordatorio "${name}"?`);
  if (!confirmed) return;

  reminders.splice(index, 1);
  await saveReminders(reminders);
  renderRecordatorios();
}

function renderRecordatorios() {
  const panel = document.getElementById('tab5');
  if (!panel) return;

  const reminders = getReminders();
  const overdueCount = reminders.filter(
    (reminder) => reminder.days < 0 || reminder.status === 'vencido'
  ).length;
  const soonCount = reminders.filter(
    (reminder) => reminder.days >= 0 && reminder.days <= 7 && reminder.status !== 'vencido'
  ).length;
  const totalAmount = reminders.reduce((sum, reminder) => sum + (Number(reminder.amount) || 0), 0);

  panel.innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Recordatorios</h2>
        <p class="mt-2 text-sm text-slate-600">Pagos programados</p>
      </div>
      <button type="button" class="inline-flex items-center gap-2 rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2" onclick="openReminderModal()">
        <span class="text-base font-light leading-none">+</span>
        Nuevo recordatorio
      </button>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-red-100 bg-red-50/60 p-5 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-red-400">Vencidos</p>
        <p id="reminders-overdue" class="mt-2 text-2xl font-bold text-red-600">${overdueCount}</p>
        <p class="mt-1 text-xs text-red-500">Pagos atrasados</p>
      </div>
      <div class="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-amber-500">Próximos 7 días</p>
        <p id="reminders-soon" class="mt-2 text-2xl font-bold text-amber-600">${soonCount}</p>
        <p class="mt-1 text-xs text-amber-600">Alertas cercanas</p>
      </div>
      <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Total mensual</p>
        <p id="reminders-total" class="mt-2 text-2xl font-bold text-slate-900">${fmtMoneyCompact(
          totalAmount
        )}</p>
        <p class="mt-1 text-xs text-slate-500">Suma programada</p>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section class="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <p class="text-sm font-semibold text-slate-900">Programados</p>
          <span id="reminders-count" class="text-xs font-semibold text-slate-500">${
            reminders.length
          } recordatorios</span>
        </div>
        <div id="reminders-list" class="divide-y divide-slate-100"></div>
      </section>

      <aside class="space-y-4">
        <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Consejo</p>
          <p class="mt-3 text-sm leading-relaxed text-slate-600">Mantén visibles tus pagos más próximos para evitar recargos y no romper tu presupuesto mensual.</p>
        </div>
        <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Notificaciones</p>
          <p class="mt-3 text-sm leading-relaxed text-slate-600">Si en Perfil activas recordatorios, esta lista será la base para tus alertas.</p>
        </div>
      </aside>
    </div>
  `;

  const list = document.getElementById('reminders-list');
  if (!list) return;

  list.innerHTML = reminders.length
    ? reminders
        .map((reminder) => {
          const colors = REMINDER_COLORS[reminder.color] || REMINDER_COLORS.gray;
          return `
            <div class="flex flex-col gap-3 px-6 py-4 ${colors.card}">
              <div class="flex items-stretch gap-4">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  colors.date
                } text-center leading-tight shadow-sm">
                  <span class="block text-sm font-bold">${String(
                    reminder.date.split('-')[2] || ''
                  ).padStart(2, '0')}</span>
                  <span class="block text-2xs font-semibold uppercase">${(
                    MESES_CORTO[Number.parseInt(reminder.date.split('-')[1], 10) - 1] || 'abr'
                  ).toUpperCase()}</span>
                </div>
                <div class="min-w-0 flex-1 py-0.5">
                  <p class="font-semibold text-slate-900">${escapeHtml(reminder.name)}</p>
                  <p class="text-xs text-slate-500">${escapeHtml(
                    reminder.description || 'Recurrente mensual'
                  )}</p>
                </div>
                <div class="flex shrink-0 flex-col items-end justify-between gap-2 text-right">
                  <div>
                    <p class="text-base font-bold ${colors.amount}">${fmtMoneyCompact(
            reminder.amount
          )}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold ${
                      colors.chip
                    }">${reminderBadgeText(reminder.days, reminder.status)}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-2">
                <button type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50" onclick='openReminderModal(${JSON.stringify(
                  reminder.name
                )})'>Editar</button>
                <button type="button" class="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50" onclick='removeReminder(${JSON.stringify(
                  reminder.name
                )})'>Eliminar</button>
              </div>
            </div>
          `;
        })
        .join('')
    : '<div class="px-6 py-12 text-center text-sm text-slate-500">No hay recordatorios todavía.</div>';
}

document.addEventListener('DOMContentLoaded', async () => {
  setTheme(getStoredTheme());

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.electronAPI.logout();
    });
  }

  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.remove('bg-green-100', 'text-green-800', 'font-semibold', 'nav-active');
    link.classList.add('font-medium', 'text-slate-600', 'nav-inactive');
    link.querySelectorAll('svg').forEach((svg) => {
      svg.classList.remove('text-green-800');
      svg.classList.add('text-slate-400');
    });
  });

  const activeNav = document.querySelector('.nav-link[data-tab="tab1"]');
  if (activeNav) {
    activeNav.classList.add('bg-green-100', 'text-green-800', 'font-semibold', 'nav-active');
    activeNav.classList.remove('text-slate-600', 'nav-inactive');
    activeNav.querySelectorAll('svg').forEach((svg) => {
      svg.classList.remove('text-slate-400');
      svg.classList.add('text-green-800');
    });
  }

  const primeraFiltro = document.querySelector('.filtro-btn[data-filtro="todas"]');
  if (primeraFiltro) {
    primeraFiltro.classList.add('border-slate-200', 'bg-white', 'text-green-800', 'shadow-sm');
    primeraFiltro.classList.remove('border-transparent', 'bg-slate-100', 'text-slate-600');
  }

  setTipo('ingreso');
  await hydrateFinanceState();
  updateRemindersCount();
  renderStaticMetadata();
  renderDashboard();
  renderTxList();
  renderPresupuesto();
  renderAhorros();
  renderReportes();
  renderPerfil();
  renderRecordatorios();

  // Run reminder notifications check now and periodically
  try {
    checkAndNotifyReminders();
  } catch (e) {
    /* ignore */
  }
  try {
    setInterval(checkAndNotifyReminders, 5 * 60 * 1000);
  } catch (e) {
    /* ignore */
  }

  const reminderDateInput = document.getElementById('reminder-date');
  const reminderDaysInput = document.getElementById('reminder-days');
  if (reminderDateInput) reminderDateInput.addEventListener('input', syncReminderDaysFromDate);
  if (reminderDaysInput) reminderDaysInput.addEventListener('input', syncReminderDateFromDays);
});

function openTab(evt, tabId) {
  document.querySelectorAll('.content').forEach((tab) => {
    tab.style.display = 'none';
    tab.classList.remove('active');
  });

  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.remove('bg-green-100', 'text-green-800', 'font-semibold');

    link.classList.add('text-slate-600');
  });

  const currentTab = document.getElementById(tabId);

  if (currentTab) {
    currentTab.style.display = 'flex';
    currentTab.classList.add('active');
  }

  if (tabId === 'tab3') {
    renderPresupuesto();
  }

  if (evt?.currentTarget) {
    evt.currentTarget.classList.add('bg-green-100', 'text-green-800', 'font-semibold');
  }
}

window.openTab = openTab;
