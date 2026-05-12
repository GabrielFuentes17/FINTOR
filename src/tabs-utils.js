/* global document, module */

const MESES_CORTO = [
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

function parseMoneyValue(value) {
  const normalized = String(value ?? '')
    .replace(/,/g, '.')
    .trim();
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return Number.NaN;
  return Number.parseFloat(match[0]);
}

function hoyISO() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function fmtMoney(n) {
  return new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtMoneyCompact(n) {
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(rounded);
  }
  return fmtMoney(rounded);
}

function fmtFechaLista(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  const mi = Number.parseInt(m, 10) - 1;
  const dd = String(Number.parseInt(d, 10)).padStart(2, '0');
  return `${dd} ${MESES_CORTO[mi] ?? m}`;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function parseLocalDateISO(dateISO) {
  const [year, month, day] = String(dateISO)
    .split('-')
    .map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function deriveReminderStateFromDate(dateISO) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = parseLocalDateISO(dateISO);
  if (!target) {
    return { days: 0, status: 'próximo' };
  }

  const millisPerDay = 24 * 60 * 60 * 1000;
  const days = Math.round((target.getTime() - today.getTime()) / millisPerDay);

  if (days < 0) return { days, status: 'vencido' };
  if (days === 1) return { days, status: 'mañana' };
  if (days <= 7) return { days, status: 'próximo' };
  return { days, status: 'lejos' };
}

function reminderShortDate(date) {
  if (!date) return '—';
  const [year, month, day] = String(date).split('-');
  if (!year || !month || !day) return date;
  const monthIndex = Number.parseInt(month, 10) - 1;
  return `${String(Number.parseInt(day, 10)).padStart(
    2,
    '0'
  )}<br /><span class="text-2xs font-semibold uppercase">${
    MESES_CORTO[monthIndex] ?? month
  }</span>`;
}

function reminderDateFromDays(daysOffset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(daysOffset));
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

module.exports = {
  MESES_CORTO,
  parseMoneyValue,
  hoyISO,
  fmtMoney,
  fmtMoneyCompact,
  fmtFechaLista,
  escapeHtml,
  escapeAttr,
  parseLocalDateISO,
  deriveReminderStateFromDate,
  reminderShortDate,
  reminderDateFromDays,
};
