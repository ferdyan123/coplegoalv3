/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — CORE.JS
   State, Supabase init, helpers, data sync
   ═══════════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://dprrjhsifjmlpvcgsgco.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcnJqaHNpZmptbHB2Y2dzZ2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMjk5MjIsImV4cCI6MjEwMzcwNTkyMn0.ueOlIHdT3JSCEz_It4u6qRCChn7RZv-4mTrsBXMma4A';

/* ══════════════════════════════════════════
   SUPABASE CLIENT (init di DOMContentLoaded via init.js)
══════════════════════════════════════════ */
let sbClient = null;

/* ══════════════════════════════════════════
   GLOBAL STATE
══════════════════════════════════════════ */
let currentUser   = null;
let currentCouple = null;
let coupleDataId  = null;
let currentPage   = 'dashboard';
let sidebarOverlay;

/* ══════════════════════════════════════════
   CONSTANTS — kategori lama (masih dipakai dashboard/laporan)
══════════════════════════════════════════ */
/* Warna CATEGORIES: diambil dari tema saat dipakai via getThemeColors() */
const CATEGORIES = [
  { key: 'income',      label: 'Pemasukan',         icon: '💼', color: null },
  { key: 'fixed',       label: 'Pengeluaran Tetap',  icon: '🏠', color: null },
  { key: 'variable',    label: 'Variabel',            icon: '🛍️', color: null },
  { key: 'loan',        label: 'Cicilan',             icon: '💳', color: null },
  { key: 'savings',     label: 'Tabungan',            icon: '🐷', color: null },
  { key: 'investments', label: 'Investasi',           icon: '📈', color: null },
];
const EXPENSE_CATEGORIES = ['fixed', 'variable', 'loan'];

/* ══════════════════════════════════════════
   STATE — extended dengan data model baru
══════════════════════════════════════════ */
let state = {
  settings: {
    name1: '', name2: '', currency: 'Rp', month: '', theme: 'dark',
  },
  budgetItems: {
    income: [], fixed: [], variable: [], loan: [], savings: [], investments: [],
  },

  /* Kategori dinamis */
  incomeCategories: ['Gaji', 'Bisnis', 'Freelance', 'Investasi', 'Bonus', 'Lainnya'],
  expenseCategories: [
    'Makanan & Minuman', 'Transportasi', 'Belanja', 'Hiburan',
    'Kesehatan', 'Pendidikan', 'Tagihan', 'Lainnya',
  ],
  investmentCategories: [
    'Reksa Dana', 'Saham', 'Emas', 'Obligasi', 'Deposito', 'Crypto', 'Lainnya',
  ],

  /* Transactions — extended */
  transactions: [],
  /*
    Struktur transaction:
    { id, date, type, assignee, description, amount,
      category,   // BARU: kategori dinamis
      jenis,      // BARU: 'tetap' | 'tidak_tetap' (untuk pengeluaran)
      catatan,    // BARU: catatan opsional
      goalId,     // existing
      budgetItemId // existing (backward compat)
    }
  */

  /* Hutang & Piutang */
  debts: [],
  /*
    { id, nama, totalPokok, bungaTotal, cicilanPerBulan,
      sisaHutang, lunas, type: 'hutang'|'piutang', catatan }
  */
  debtTransactions: [],
  /*
    { id, debtId, tanggal, jumlah, catatan, type: 'hutang'|'piutang' }
  */

  goals:       [],  // existing
  splitHistory: [], // existing
};

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function fmt(n) {
  const cur = state.settings.currency || 'Rp';
  const num = Math.abs(n || 0);
  const formatted = num >= 1_000_000
    ? (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' jt'
    : num.toLocaleString('id-ID');
  return cur + ' ' + formatted;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function monthLabel(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric',
  });
}

function calcBudget(category, assignee) {
  return (state.budgetItems[category] || [])
    .filter(i => !assignee || i.assignee === assignee)
    .reduce((s, i) => s + (i.budget || 0), 0);
}

function calcActual(category, assignee) {
  const month = state.settings.month;
  return state.transactions.filter(t => {
    if (t.type !== category) return false;
    if (assignee && t.assignee !== assignee) return false;
    if (month && t.date && t.date.substring(0, 7) !== month) return false;
    return true;
  }).reduce((s, t) => s + (t.amount || 0), 0);
}

function calcTotalBudget(cats) { return cats.reduce((s, c) => s + calcBudget(c), 0); }
function calcTotalActual(cats) { return cats.reduce((s, c) => s + calcActual(c), 0); }

function calcActualForMonth(cat, month) {
  return state.transactions
    .filter(t => t.type === cat && t.date && t.date.substring(0, 7) === month)
    .reduce((s, t) => s + (t.amount || 0), 0);
}

function getMonthStats() {
  const month = state.settings.month;
  if (!month) return { pct: 0, passed: 0, left: 0, total: 0 };
  const [y, m] = month.split('-').map(Number);
  const now   = new Date();
  const first = new Date(y, m - 1, 1);
  const last  = new Date(y, m, 0);
  const total = last.getDate();
  let passed  = 0;
  if (now >= first && now <= last) passed = now.getDate();
  else if (now > last) passed = total;
  return { pct: Math.round((passed / total) * 100), passed, left: total - passed, total };
}

function getActualForItem(cat, item) {
  const month = state.settings.month;
  return state.transactions.filter(t => {
    if (t.type !== cat) return false;
    if (month && t.date && t.date.substring(0, 7) !== month) return false;
    if (t.budgetItemId) return t.budgetItemId === item.id;
    return t.assignee === item.assignee && t.description === item.description;
  }).reduce((s, t) => s + (t.amount || 0), 0);
}

/* ══════════════════════════════════════════
   NUMBER INPUT FORMATTING
══════════════════════════════════════════ */
function formatNumberInput(input) {
  let raw = input.value.replace(/[^0-9]/g, '');
  if (!raw) { input.value = ''; input.dataset.rawValue = '0'; return; }
  input.dataset.rawValue = raw;
  input.value = parseInt(raw, 10).toLocaleString('id-ID');
}

function getRawValue(input) {
  return parseFloat((input.dataset.rawValue || input.value.replace(/[^0-9]/g, '')) || '0') || 0;
}

function initNumberInput(inputId) {
  const el = typeof inputId === 'string' ? $(inputId) : inputId;
  if (!el) return;
  el.setAttribute('type', 'text');
  el.setAttribute('inputmode', 'numeric');
  el.setAttribute('autocomplete', 'off');
  el.addEventListener('input', () => {
    const pos    = el.selectionStart;
    const oldLen = el.value.length;
    formatNumberInput(el);
    const newLen = el.value.length;
    el.selectionStart = el.selectionEnd = Math.max(0, pos + (newLen - oldLen));
  });
  el.addEventListener('focus', () => { if (el.value === '0') el.value = ''; });
  el.addEventListener('blur',  () => {
    formatNumberInput(el);
    if (el.dataset.rawValue === '0' || !el.dataset.rawValue) el.value = '';
  });
}

/* ══════════════════════════════════════════
   SUPABASE DATA SYNC
══════════════════════════════════════════ */
async function loadFromSupabase() {
  if (!currentCouple) return;
  const { data, error } = await sbClient
    .from('couple_data')
    .select('*')
    .eq('couple_id', currentCouple.id)
    .maybeSingle();

  if (error) { console.error('Load error:', error); return; }

  if (data) {
    coupleDataId = data.id;
    const parsed = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
    state = deepMerge(state, parsed);
    state.settings.name1     = currentCouple.name1;
    state.settings.name2     = currentCouple.name2;
    state.settings.currency  = currentCouple.currency || 'Rp';
    if (!state.settings.month) {
      const now = new Date();
      state.settings.month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    }
    /* Pastikan array baru ada (untuk user lama yg belum punya field baru) */
    if (!state.incomeCategories)    state.incomeCategories    = ['Gaji','Bisnis','Freelance','Investasi','Bonus','Lainnya'];
    if (!state.expenseCategories)   state.expenseCategories   = ['Makanan & Minuman','Transportasi','Belanja','Hiburan','Kesehatan','Pendidikan','Tagihan','Lainnya'];
    if (!state.investmentCategories) state.investmentCategories = ['Reksa Dana','Saham','Emas','Obligasi','Deposito','Crypto','Lainnya'];
    if (!state.debts)               state.debts               = [];
    if (!state.debtTransactions)    state.debtTransactions    = [];
  } else {
    const now = new Date();
    if (!state.settings.month)
      state.settings.month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    state.settings.name1    = currentCouple.name1;
    state.settings.name2    = currentCouple.name2;
    state.settings.currency = currentCouple.currency || 'Rp';
    await saveToSupabase();
  }
}

async function saveToSupabase() {
  if (!currentCouple) return;
  const payload = {
    couple_id:  currentCouple.id,
    data:       state,
    updated_at: new Date().toISOString(),
  };
  if (coupleDataId) {
    const { error } = await sbClient.from('couple_data').update(payload).eq('id', coupleDataId);
    if (error) console.error('Save error:', error);
  } else {
    const { data, error } = await sbClient.from('couple_data').insert(payload).select().single();
    if (error) { console.error('Insert error:', error); return; }
    coupleDataId = data.id;
  }
}

/* Debounced save */
let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveToSupabase(), 600);
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

function subscribeRealtime() {
  if (!currentCouple) return;
  sbClient
    .channel('couple-data-' + currentCouple.id)
    .on('postgres_changes', {
      event:  'UPDATE',
      schema: 'public',
      table:  'couple_data',
      filter: `couple_id=eq.${currentCouple.id}`,
    }, payload => {
      if (payload.new && payload.new.data) {
        const parsed = typeof payload.new.data === 'string'
          ? JSON.parse(payload.new.data) : payload.new.data;
        state = deepMerge(state, parsed);
        renderPage(currentPage);
        updateSidebarCouple();
      }
    })
    .subscribe();
}


/* ══════════════════════════════════════════
   EXPORT / IMPORT
══════════════════════════════════════════ */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `couplegoal-${state.settings.name1}-${state.settings.month || 'data'}.json`;
  a.click();
  showToast('Data berhasil diekspor ✅');
}

let pendingImportData = null;
function handleImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.settings || !data.budgetItems || !data.transactions)
        throw new Error('Format tidak valid');
      pendingImportData = data;
      const html = `
        <div class="import-preview-item"><span class="import-preview-label">Pasangan</span><span class="import-preview-val">${data.settings.name1} & ${data.settings.name2}</span></div>
        <div class="import-preview-item"><span class="import-preview-label">Bulan</span><span class="import-preview-val">${monthLabel(data.settings.month) || '-'}</span></div>
        <div class="import-preview-item"><span class="import-preview-label">Total Transaksi</span><span class="import-preview-val">${data.transactions.length}</span></div>
      `;
      $('import-preview-content').innerHTML = html;
      $('settings-modal').classList.add('hidden');
      $('import-modal').classList.remove('hidden');
    } catch { showToast('File JSON tidak valid', 'error'); }
  };
  reader.readAsText(file);
  $('import-file').value = '';
}
