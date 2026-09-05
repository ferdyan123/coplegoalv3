/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — SETTINGS.JS
   Settings modal, Transaction modal, Budget modal, Data management
   ═══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════
   SETTINGS MODAL
══════════════════════════════════════════ */
function openSettings() {
  const s = state.settings;
  $('s-name1').value    = s.name1;
  $('s-name2').value    = s.name2;
  $('s-currency').value = s.currency;
  $('s-month').value    = s.month;
  $$('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === s.theme));
  $('settings-modal').classList.remove('hidden');
}

function closeSettings() { $('settings-modal').classList.add('hidden'); }

function saveSettings() {
  const s = state.settings;
  s.name1    = $('s-name1').value.trim() || s.name1;
  s.name2    = $('s-name2').value.trim() || s.name2;
  s.currency = $('s-currency').value;
  s.month    = $('s-month').value;
  saveState();
  applyTheme(s.theme);
  updateSidebarCouple();
  closeSettings();
  showToast('Pengaturan disimpan ✅');
  renderPage(currentPage);
}

async function resetAllData() {
  const ok = await showConfirm('Reset Semua Data?', 'Semua data budget, transaksi, goals, hutang, dan pengaturan akan dihapus!');
  if (!ok) return;
  state.budgetItems      = { income: [], fixed: [], variable: [], loan: [], savings: [], investments: [] };
  state.transactions     = [];
  state.goals            = [];
  state.splitHistory     = [];
  state.debts            = [];
  state.debtTransactions = [];
  await saveToSupabase();
  renderPage(currentPage);
  showToast('Data direset', 'info');
}

async function resetMonthData() {
  const month = state.settings.month;
  const ok = await showConfirm(`Reset Data ${monthLabel(month)}?`, `Semua transaksi bulan ${monthLabel(month)} akan dihapus.`);
  if (!ok) return;
  state.transactions = state.transactions.filter(t => t.date && t.date.substring(0, 7) !== month);
  saveState();
  closeSettings();
  renderPage(currentPage);
  showToast('Data bulan ini direset', 'info');
}

/* ══════════════════════════════════════════
   TRANSACTION MODAL (existing — diperlukan di tab Transaksi)
══════════════════════════════════════════ */
const TX_PLACEHOLDERS = {
  income:      'contoh: Gaji, Freelance, Transfer Masuk…',
  fixed:       'contoh: Sewa Rumah, Listrik, Internet…',
  variable:    'contoh: Makan Siang, Bensin, Belanja…',
  loan:        'contoh: Cicilan KPR, Bayar Paylater…',
  savings:     'contoh: Setor Tabungan, Dana Darurat…',
  investments: 'contoh: Beli Reksa Dana, Tambah Saham…',
  expense:     'contoh: Pengeluaran…',
};

function updateTxGoalField(type) {
  const field = $('tx-goal-field');
  const sel   = $('tx-goal-select');
  if (!field || !sel) return;
  const show = (type === 'savings' || type === 'investments') && (state.goals || []).length > 0;
  field.style.display = show ? '' : 'none';
  if (show) {
    sel.innerHTML = '<option value="">— Tidak terkait goal —</option>' +
      (state.goals || []).map(g =>
        `<option value="${g.id}">${g.icon || '🎯'} ${g.name} (${fmt(g.saved)} / ${fmt(g.target)})</option>`
      ).join('');
  }
}

function openAddTransaction(prefillType) {
  const today = new Date().toISOString().split('T')[0];
  const type  = prefillType || 'income';
  $('tx-date').value     = today;
  $('tx-type').value     = type;
  $('tx-assignee').value = 'shared';
  $('tx-desc').value     = '';
  $('tx-amount').value   = '';
  $('tx-currency-prefix').textContent = state.settings.currency;
  $('tx-desc').placeholder = TX_PLACEHOLDERS[type] || 'contoh: Gaji, Belanja…';
  updateTxGoalField(type);
  updateTxAssigneeNames();
  populateTxDescriptionOptions();
  $('tx-modal').classList.remove('hidden');
  setTimeout(() => $('tx-amount').focus(), 100);
}
window.openAddTransaction = openAddTransaction;

function closeTxModal() { $('tx-modal').classList.add('hidden'); }

function updateTxAssigneeNames() {
  const s = state.settings;
  $('tx-assignee-p1').textContent = '👤 ' + (s.name1 || 'Pasangan 1');
  $('tx-assignee-p2').textContent = '👤 ' + (s.name2 || 'Pasangan 2');
}

function populateTxDescriptionOptions() {
  const type = $('tx-type').value;
  const asn  = $('tx-assignee').value;
  const items = state.budgetItems[type] || [];
  const relevant = items.filter(i => i.assignee === asn || asn === 'shared' || i.assignee === 'shared');
  const dl = $('tx-desc-list');
  if (dl) dl.innerHTML = relevant.map(i => `<option value="${i.description}" data-id="${i.id}">`).join('');
}

function saveTransaction() {
  const date = $('tx-date').value;
  const type = $('tx-type').value;
  const asn  = $('tx-assignee').value;
  const desc = $('tx-desc').value.trim();
  const amt  = getRawValue($('tx-amount'));
  if (!desc) { showToast('Deskripsi tidak boleh kosong', 'error'); return; }
  if (amt <= 0) { showToast('Jumlah harus lebih dari 0', 'error'); return; }
  const items = state.budgetItems[type] || [];
  const matchedItem = items.find(i => i.description === desc && (i.assignee === asn || asn === 'shared'));
  const goalId = $('tx-goal-select')?.value || null;
  const tx = {
    id: generateId(), budgetItemId: matchedItem?.id || null,
    date, type, assignee: asn, description: desc, amount: amt, goalId,
  };
  state.transactions.unshift(tx);
  saveState();
  closeTxModal();
  showToast('Transaksi disimpan ✅');
  renderPage(currentPage);
}

async function deleteTx(id) {
  const idx = state.transactions.findIndex(t => t.id === id);
  if (idx < 0) return;
  const ok = await showConfirm('Hapus Transaksi?', 'Transaksi ini akan dihapus permanen.');
  if (!ok) return;
  state.transactions.splice(idx, 1);
  saveState();
  renderPage(currentPage);
  showToast('Transaksi dihapus', 'info');
}
window.deleteTx = deleteTx;

/* ══════════════════════════════════════════
   TRANSACTIONS PAGE
══════════════════════════════════════════ */
function renderTransactionsPage() {
  const typeFilter     = $('filter-type')?.value;
  const assigneeFilter = $('filter-assignee')?.value;
  const searchVal      = $('filter-search')?.value.toLowerCase();
  const sort           = $('sort-tx')?.value;
  const month          = state.settings.month;

  let txs = state.transactions.filter(t => {
    if (month && t.date && t.date.substring(0, 7) !== month) return false;
    if (typeFilter && t.type !== typeFilter) return false;
    if (assigneeFilter && t.assignee !== assigneeFilter) return false;
    if (searchVal && !t.description?.toLowerCase().includes(searchVal)) return false;
    return true;
  });

  txs.sort((a, b) => {
    if (sort === 'date-desc')   return new Date(b.date) - new Date(a.date);
    if (sort === 'date-asc')    return new Date(a.date) - new Date(b.date);
    if (sort === 'amount-desc') return b.amount - a.amount;
    if (sort === 'amount-asc')  return a.amount - b.amount;
    return 0;
  });

  $('tx-count-label').textContent = `${txs.length} transaksi`;

  const totalIn  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalOut = txs.filter(t => t.type !== 'income').reduce((s, t) => s + t.amount, 0);
  $('tx-stats-row').innerHTML = `
    <div class="tx-stat-card"><div class="tx-stat-val" style="color:var(--income-color)">+${fmt(totalIn)}</div><div class="tx-stat-label">Total Pemasukan</div></div>
    <div class="tx-stat-card"><div class="tx-stat-val" style="color:var(--expense-color)">${fmt(totalOut)}</div><div class="tx-stat-label">Total Pengeluaran</div></div>
    <div class="tx-stat-card"><div class="tx-stat-val" style="color:${totalIn - totalOut >= 0 ? '#10b981' : '#ef4444'}">${fmt(totalIn - totalOut)}</div><div class="tx-stat-label">Net Balance</div></div>
    <div class="tx-stat-card"><div class="tx-stat-val">${txs.length}</div><div class="tx-stat-label">Jumlah Transaksi</div></div>`;

  if (!txs.length) {
    $('tx-list-wrap').innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>Tidak ada transaksi yang cocok</p></div>`;
    return;
  }
  $('tx-list-wrap').innerHTML = `<div class="tx-list-card">${txs.map(t => renderTxItem(t)).join('')}</div>`;
}

/* ══════════════════════════════════════════
   BUDGET ITEM MODAL (existing — backward compat)
══════════════════════════════════════════ */
function openAddBudgetItem(cat) {
  $('bm-title').textContent   = 'Tambah Anggaran';
  $('bm-category').value      = cat;
  $('bm-edit-index').value    = -1;
  $('bm-item-id').value       = '';
  $('bm-desc').value          = '';
  $('bm-amount').value        = '';
  $('bm-assignee').value      = 'shared';
  $('bm-currency-prefix').textContent = state.settings.currency;
  const placeholders = {
    income: 'contoh: Gaji, Freelance…', fixed: 'contoh: Sewa Rumah, Internet…',
    variable: 'contoh: Makan, Bensin…', loan: 'contoh: KPR, Cicilan Motor…',
    savings: 'contoh: Dana Darurat, Tabungan Nikah…', investments: 'contoh: Reksa Dana, Saham…',
  };
  $('bm-desc').placeholder = placeholders[cat] || 'contoh: Gaji, Sewa Rumah…';
  updateBudgetModalAssigneeNames();
  $('budget-modal').classList.remove('hidden');
  setTimeout(() => $('bm-desc').focus(), 100);
}
window.openAddBudgetItem = openAddBudgetItem;

function openEditBudgetItem(cat, idx) {
  const item = state.budgetItems[cat][idx];
  if (!item) return;
  $('bm-title').textContent   = 'Edit Anggaran';
  const placeholders = {
    income:'contoh: Gaji, Freelance…', fixed:'contoh: Sewa Rumah, Internet…',
    variable:'contoh: Makan, Bensin…', loan:'contoh: KPR, Cicilan Motor…',
    savings:'contoh: Dana Darurat…', investments:'contoh: Reksa Dana, Saham…',
  };
  $('bm-desc').placeholder = placeholders[cat] || 'contoh: Gaji, Sewa Rumah…';
  $('bm-category').value    = cat;
  $('bm-edit-index').value  = idx;
  $('bm-item-id').value     = item.id || '';
  $('bm-desc').value        = item.description;
  $('bm-amount').value      = item.budget ? parseInt(item.budget).toLocaleString('id-ID') : '';
  $('bm-amount').dataset.rawValue = String(item.budget || 0);
  $('bm-assignee').value    = item.assignee;
  $('bm-currency-prefix').textContent = state.settings.currency;
  updateBudgetModalAssigneeNames();
  $('budget-modal').classList.remove('hidden');
  setTimeout(() => $('bm-desc').focus(), 100);
}
window.openEditBudgetItem = openEditBudgetItem;

function closeBudgetModal() { $('budget-modal').classList.add('hidden'); }

function saveBudgetItem() {
  const cat  = $('bm-category').value;
  const idx  = parseInt($('bm-edit-index').value);
  const id   = $('bm-item-id').value || generateId();
  const desc = $('bm-desc').value.trim();
  const amt  = getRawValue($('bm-amount'));
  const asn  = $('bm-assignee').value;
  if (!desc) { showToast('Deskripsi tidak boleh kosong', 'error'); return; }
  const item = { id, description: desc, assignee: asn, budget: amt };
  if (idx >= 0) { state.budgetItems[cat][idx] = item; showToast('Item diperbarui ✅'); }
  else          { state.budgetItems[cat].push(item); showToast('Item ditambahkan ✅'); }
  saveState();
  closeBudgetModal();
  renderPage(currentPage);
}

async function deleteBudgetItem(cat, idx) {
  const item = state.budgetItems[cat][idx];
  const ok   = await showConfirm('Hapus Item?', `Item "${item.description}" akan dihapus.`);
  if (!ok) return;
  state.budgetItems[cat].splice(idx, 1);
  saveState();
  renderPage(currentPage);
  showToast('Item dihapus', 'info');
}
window.deleteBudgetItem = deleteBudgetItem;

function updateBudgetModalAssigneeNames() {
  const s = state.settings;
  $('bm-assignee-p1').textContent = '👤 ' + (s.name1 || 'Pasangan 1');
  $('bm-assignee-p2').textContent = '👤 ' + (s.name2 || 'Pasangan 2');
}

function initSettingsListeners() {
  /* Confirm modal */
  $('confirm-cancel')?.addEventListener('click', () => {
    $('confirm-modal').classList.add('hidden');
    if (typeof confirmResolve === 'function') confirmResolve(false);
  });
  $('confirm-ok')?.addEventListener('click', () => {
    $('confirm-modal').classList.add('hidden');
    if (typeof confirmResolve === 'function') confirmResolve(true);
  });

  $('open-settings')?.addEventListener('click',   openSettings);
  $('topbar-settings')?.addEventListener('click', openSettings);
  $('settings-close')?.addEventListener('click',  closeSettings);
  $('settings-cancel')?.addEventListener('click', closeSettings);
  $('settings-save')?.addEventListener('click',   saveSettings);
  $('sidebar-theme-toggle')?.addEventListener('click', toggleTheme);
  $('topbar-theme-toggle')?.addEventListener('click',  toggleTheme);
  $$('.theme-btn').forEach(btn => btn.addEventListener('click', () => applyTheme(btn.dataset.theme)));

  $('tx-close')?.addEventListener('click',  closeTxModal);
  $('tx-cancel')?.addEventListener('click', closeTxModal);
  $('tx-save')?.addEventListener('click',   saveTransaction);
  $('tx-type')?.addEventListener('change', () => {
    const type = $('tx-type').value;
    $('tx-desc').placeholder = TX_PLACEHOLDERS[type] || 'contoh: Gaji, Belanja…';
    updateTxGoalField(type);
    populateTxDescriptionOptions();
  });
  $('tx-assignee')?.addEventListener('change', populateTxDescriptionOptions);

  $('bm-close')?.addEventListener('click',  closeBudgetModal);
  $('bm-cancel')?.addEventListener('click', closeBudgetModal);
  $('bm-save')?.addEventListener('click',   saveBudgetItem);

  $$('.add-item-btn').forEach(btn =>
    btn.addEventListener('click', () => openAddBudgetItem(btn.dataset.category)));

  ['filter-type','filter-assignee','filter-search','sort-tx'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', () => { if (currentPage === 'transactions') renderTransactionsPage(); });
  });

  $('export-btn')?.addEventListener('click',        exportData);
  $('dash-export-btn')?.addEventListener('click',   exportData);
  $('sidebar-export-btn')?.addEventListener('click', exportData);
  $('import-file')?.addEventListener('change', e => handleImportFile(e.target.files[0]));
  $('reset-btn')?.addEventListener('click',         resetAllData);
  $('reset-month-btn')?.addEventListener('click',   resetMonthData);
  $('import-cancel-btn')?.addEventListener('click', () => { $('import-modal').classList.add('hidden'); pendingImportData = null; });
  $('import-modal-close')?.addEventListener('click',() => { $('import-modal').classList.add('hidden'); pendingImportData = null; });
  $('import-confirm-btn')?.addEventListener('click', () => {
    if (pendingImportData) {
      state = deepMerge(state, pendingImportData);
      saveState();
      applyTheme(state.settings.theme);
      updateSidebarCouple();
      $('import-modal').classList.add('hidden');
      showToast('Data berhasil diimport ✅');
      renderPage(currentPage);
      pendingImportData = null;
    }
  });

  [$('tx-modal'),$('budget-modal'),$('settings-modal'),$('goal-modal')].forEach(modal => {
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
  });

  $('see-all-tx')?.addEventListener('click',  () => navigateTo('transactions'));
  $('add-tx-btn')?.addEventListener('click',  () => openAddTransaction());
  $('add-tx-btn2')?.addEventListener('click', () => openAddTransaction());

  const addBudgetBtn = $('add-budget-btn');
  if (addBudgetBtn) {
    addBudgetBtn.addEventListener('click', () => openAddBudgetItem(currentPage));
  }
}
