/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — EXPENSE.JS
   Tab Pengeluaran (gabungan fixed + variable + loan)
   ═══════════════════════════════════════════════════════════ */

let expenseDailyChart = null;
let expenseDonutChart = null;

const EXPENSE_CAT_ICONS = {
  'Makanan & Minuman': '🍽️', 'Transportasi': '🚗', 'Belanja': '🛍️',
  'Hiburan': '🎬', 'Kesehatan': '💊', 'Pendidikan': '📚',
  'Tagihan': '📄', 'Lainnya': '💸',
  'Sewa/Kos': '🏠', 'Internet/WiFi': '📡', 'Bensin Harian': '⛽',
};

function getExpenseCatIcon(cat) {
  return EXPENSE_CAT_ICONS[cat] || '💸';
}

/* Tipe transaksi yang dianggap "pengeluaran" */
const EXPENSE_TYPES = ['fixed', 'variable', 'loan', 'expense'];

function getExpenseTxs() {
  const month = state.settings.month;
  return state.transactions.filter(t =>
    EXPENSE_TYPES.includes(t.type) && t.date && t.date.substring(0, 7) === month
  );
}

/* ══════════════════════════════════════════
   MAIN RENDER
══════════════════════════════════════════ */
function renderExpensePage() {
  const s    = state.settings;
  const month = s.month;
  const txs   = getExpenseTxs();

  const total         = txs.reduce((s, t) => s + t.amount, 0);
  const totalTetap    = txs.filter(t => t.jenis === 'tetap').reduce((s, t) => s + t.amount, 0);
  const totalTdkTetap = txs.filter(t => t.jenis !== 'tetap').reduce((s, t) => s + t.amount, 0);

  /* Kategori terbesar */
  const catGroups = {};
  txs.forEach(t => { catGroups[t.category || 'Lainnya'] = (catGroups[t.category || 'Lainnya'] || 0) + t.amount; });
  const topCat = Object.entries(catGroups).sort((a, b) => b[1] - a[1])[0];

  /* Budget dari budgetItems lama (backward compat) */
  const budgetTotal = calcTotalBudget(['fixed', 'variable', 'loan']);
  const sisaBudget  = budgetTotal - total;

  const el = $('page-expense'); if (!el) return;
  el.innerHTML = `
    <div class="summary-cards-grid">
      ${summaryCard('Total Pengeluaran', fmt(total), '', '', monthLabel(month))}
      ${summaryCard('Tetap', fmt(totalTetap), '', '', '')}
      ${summaryCard('Tidak Tetap', fmt(totalTdkTetap), '', '', '')}
      <div class="summary-card glass-card">
        <div class="summary-card-label">Terbesar</div>
        <div class="summary-card-val" style="font-size:1rem">${topCat ? topCat[0] : '—'}</div>
        ${topCat ? `<div class="summary-card-sub">${fmt(topCat[1])}</div>` : ''}
      </div>
    </div>
    <div class="tab-page-grid">
      <!-- Full: Budget neraca -->
      <div class="glass-card section-card tab-full-width">
        <div class="section-header-row">
          <h2 class="section-title">Budget Pengeluaran</h2>
          <div class="budget-toggle-wrap">
            <button class="btn btn-ghost btn-sm ${budgetTotal > 0 ? 'active' : ''}" onclick="showBudgetBreakdown()">Total</button>
            <button class="btn btn-ghost btn-sm" onclick="showBudgetByCategory()">Per Kategori</button>
          </div>
        </div>
        <div id="expense-budget-wrap">${renderBudgetNeraca(total, budgetTotal, sisaBudget)}</div>
      </div>
      <!-- Full: Form -->
      <div class="glass-card section-card tab-full-width" id="expense-form-card">
        <div class="section-header-row">
          <h2 class="section-title">Tambah Pengeluaran</h2>
          <button class="btn btn-ghost btn-sm" onclick="openExpenseCategoryManager()">⚙️ Kategori</button>
        </div>
        ${renderExpenseForm()}
      </div>
      <!-- Half: Donut -->
      <div class="glass-card section-card">
        <h2 class="section-title">Breakdown Kategori</h2>
        <canvas id="expense-donut-chart" height="200"></canvas>
        <div id="expense-donut-legend" class="donut-legend" style="margin-top:0.75rem"></div>
      </div>
      <!-- Half: Pemilik + Daily -->
      <div class="glass-card section-card">
        <h2 class="section-title">Per Pemilik</h2>
        <div id="expense-owner-bars" style="margin-bottom:1.25rem"></div>
        <h2 class="section-title" style="margin-top:0.5rem">Tren Harian</h2>
        <canvas id="expense-daily-chart" height="140"></canvas>
      </div>
      <!-- Full: Riwayat -->
      <div class="glass-card section-card tab-full-width">
        <h2 class="section-title">Riwayat Pengeluaran — Bulan Ini</h2>
        <div id="expense-history-list"></div>
      </div>
    </div>
  `;

  renderExpenseCharts(txs, month);
  renderExpenseOwnerBars(txs, s);
  renderExpenseHistory(txs, s);
  initExpenseForm();
}

function renderBudgetNeraca(total, budget, sisa) {
  const pct  = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
  const over = sisa < 0;
  let status, statusColor;
  if (budget === 0) { status = '—'; statusColor = 'var(--text-muted)'; }
  else if (pct >= 100) { status = '⚠️ Over budget!'; statusColor = '#ef4444'; }
  else if (pct >= 80)  { status = '🟡 Mendekati batas'; statusColor = '#fbbf24'; }
  else                 { status = '✅ Masih aman, lanjutkan!'; statusColor = '#34d399'; }

  return `
    <div class="budget-neraca-grid">
      <div class="budget-neraca-item"><span class="budget-neraca-label">Total Pengeluaran</span><span class="budget-neraca-val expense">${fmt(total)}</span></div>
      <div class="budget-neraca-item"><span class="budget-neraca-label">Anggaran</span><span class="budget-neraca-val">${fmt(budget)}</span></div>
      <div class="budget-neraca-item"><span class="budget-neraca-label">Sisa</span><span class="budget-neraca-val" style="color:${over ? '#ef4444' : '#34d399'}">${fmt(Math.abs(sisa))} ${over ? '(OVER)' : ''}</span></div>
    </div>
    <div class="progress-track" style="margin-top:0.75rem">
      <div class="progress-fill ${over ? 'over' : ''}" style="width:${pct}%;background:${over ? '#ef4444' : '#38bdf8'};transition:width 0.5s"></div>
    </div>
    <div style="margin-top:0.5rem;color:${statusColor};font-size:0.875rem">${status} <span style="color:var(--text-muted)">Sisa ${fmt(Math.abs(sisa))}.</span></div>
  `;
}

/* ── FORM ── */
function renderExpenseForm() {
  const s    = state.settings;
  const cats = state.expenseCategories || [];
  const today = new Date().toISOString().split('T')[0];
  return `
    <div class="inline-form">
      <div class="form-grid-2">
        <div class="form-field">
          <label>Tanggal</label>
          <input type="date" id="exp-date" value="${today}">
        </div>
        <div class="form-field">
          <label>Kategori</label>
          <select id="exp-category">
            ${cats.map(c => `<option value="${c}">${getExpenseCatIcon(c)} ${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Jumlah (${s.currency})</label>
          <div class="input-prefix-wrap">
            <span class="input-prefix">${s.currency}</span>
            <input type="text" id="exp-amount" inputmode="numeric" placeholder="0" autocomplete="off">
          </div>
        </div>
        <div class="form-field">
          <label>Jenis</label>
          <select id="exp-jenis">
            <option value="tidak_tetap">Tidak Tetap</option>
            <option value="tetap">Tetap</option>
          </select>
        </div>
        <div class="form-field">
          <label>Pemilik</label>
          <select id="exp-assignee">
            <option value="shared">🤝 Bersama</option>
            <option value="p1">👤 ${s.name1}</option>
            <option value="p2">👤 ${s.name2}</option>
          </select>
        </div>
        <div class="form-field">
          <label>Bank / Metode</label>
          <select id="exp-bank">
            <option>Bank BCA</option><option>Bank Mandiri</option><option>Bank BRI</option>
            <option>GoPay</option><option>OVO</option><option>Dana</option>
            <option>ShopeePay</option><option>Tunai</option><option>Lainnya</option>
          </select>
        </div>
      </div>
      <div class="form-field">
        <label>Catatan (opsional)</label>
        <textarea id="exp-catatan" rows="2" placeholder="Misal: gaji bulan ini" style="resize:vertical;min-height:60px"></textarea>
      </div>
      <button class="btn btn-primary btn-lg w-full" id="exp-submit-btn">+ Tambah Pengeluaran</button>
    </div>
  `;
}

function initExpenseForm() {
  initNumberInput('exp-amount');
  const btn = $('exp-submit-btn');
  if (btn) btn.addEventListener('click', submitExpense);
}

function submitExpense() {
  const date     = $('exp-date').value;
  const category = $('exp-category').value;
  const amount   = getRawValue($('exp-amount'));
  const jenis    = $('exp-jenis').value;
  const assignee = $('exp-assignee').value;
  const catatan  = $('exp-catatan').value.trim();

  if (!date)      { showToast('Tanggal wajib diisi', 'error'); return; }
  if (amount <= 0){ showToast('Jumlah harus lebih dari 0', 'error'); return; }

  /* type tetap pakai 'expense' agar backward compat, tapi bisa juga 'variable'/'fixed' */
  const type = jenis === 'tetap' ? 'fixed' : 'variable';
  const tx = {
    id: generateId(), date, type, assignee,
    description: category, amount, category, jenis, catatan,
    budgetItemId: null, goalId: null,
  };
  state.transactions.unshift(tx);
  saveState();
  showToast('Pengeluaran ditambahkan ✅');
  renderExpensePage();
}

/* ── CHARTS ── */
function renderExpenseCharts(txs, month) {
  const catMap = {};
  txs.forEach(t => { catMap[t.category || 'Lainnya'] = (catMap[t.category || 'Lainnya'] || 0) + t.amount; });
  const catLabels = Object.keys(catMap);
  const catVals   = Object.values(catMap);
  const themeC = getThemeColors();
  const colors = [themeC[1], themeC[2], themeC[3], themeC[0], themeC[4], themeC[5], themeC[1]+'aa', themeC[2]+'aa'];

  const donutCtx = $('expense-donut-chart');
  if (donutCtx) {
    if (expenseDonutChart) expenseDonutChart.destroy();
    expenseDonutChart = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{ data: catVals, backgroundColor: colors.slice(0, catLabels.length), borderWidth: 2, borderColor: 'transparent', hoverOffset: 6 }],
      },
      options: {
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}` } },
        },
      },
    });
  }

  const legend = $('expense-donut-legend');
  if (legend) {
    legend.innerHTML = catLabels.map((l, i) => `
      <div class="donut-legend-item">
        <span class="donut-legend-dot" style="background:${colors[i % colors.length]}"></span>
        <span class="donut-legend-label">${l}</span>
        <span class="donut-legend-val">${fmt(catVals[i])}</span>
      </div>`).join('');
  }

  /* Daily chart */
  const [cy, cm] = month ? month.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const daysInMonth = new Date(cy, cm, 0).getDate();
  const dailyData   = Array(daysInMonth).fill(0);
  txs.forEach(t => {
    if (t.date) {
      const d = parseInt(t.date.split('-')[2], 10) - 1;
      if (d >= 0 && d < daysInMonth) dailyData[d] += t.amount;
    }
  });

  const dailyCtx = $('expense-daily-chart');
  if (dailyCtx) {
    if (expenseDailyChart) expenseDailyChart.destroy();
    expenseDailyChart = new Chart(dailyCtx, {
      type: 'line',
      data: {
        labels: Array.from({ length: daysInMonth }, (_, i) => i + 1),
        datasets: [{
          label: 'Pengeluaran Harian',
          data: dailyData,
          borderColor: '#f87171',
          backgroundColor: 'rgba(248,113,113,0.1)',
          tension: 0.3, fill: true,
          pointRadius: dailyData.map(v => v > 0 ? 4 : 0),
          pointBackgroundColor: '#f87171',
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed.y)}` } },
        },
        scales: {
          x: { ticks: { color: getAxisColor(), maxTicksLimit: 10 }, grid: { color: getGridColor() } },
          y: { ticks: { color: getAxisColor(), callback: v => fmt(v) }, grid: { color: getGridColor() } },
        },
      },
    });
  }
}

/* ── OWNER BARS ── */
function renderExpenseOwnerBars(txs, s) {
  const wrap = $('expense-owner-bars'); if (!wrap) return;
  const groups = {
    shared: { label: '🤝 Bersama', amt: 0 },
    p1:     { label: s.name1,      amt: 0 },
    p2:     { label: s.name2,      amt: 0 },
  };
  txs.forEach(t => { if (groups[t.assignee]) groups[t.assignee].amt += t.amount; });
  const max = Math.max(...Object.values(groups).map(g => g.amt), 1);

  wrap.innerHTML = Object.entries(groups).map(([, g]) => {
    const pct = Math.round((g.amt / max) * 100);
    return `<div class="owner-bar-item">
      <div class="owner-bar-label">${g.label}</div>
      <div class="owner-bar-track">
        <div class="owner-bar-fill expense-bar" style="width:${pct}%"></div>
      </div>
      <div class="owner-bar-val">${fmt(g.amt)}</div>
    </div>`;
  }).join('');
}

/* ── HISTORY ── */
function renderExpenseHistory(txs, s) {
  const list = $('expense-history-list'); if (!list) return;
  const sorted = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!sorted.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada pengeluaran bulan ini</p></div>`;
    return;
  }

  let lastDate = '';
  list.innerHTML = sorted.map(t => {
    const dateHeader = t.date !== lastDate
      ? `<div class="history-date-header">${fmtDate(t.date)}</div>` : '';
    lastDate = t.date;
    const owner   = t.assignee === 'p1' ? s.name1 : t.assignee === 'p2' ? s.name2 : '🤝 Bersama';
    const icon    = getExpenseCatIcon(t.category);
    const jenisLbl = t.jenis === 'tetap' ? 'Tetap' : 'Tidak Tetap';
    return `${dateHeader}
      <div class="history-item" id="ehist-${t.id}">
        <div class="history-item-main" onclick="toggleExpenseDetail('${t.id}')">
          <div class="history-item-icon expense-icon">${icon}</div>
          <div class="history-item-body">
            <div class="history-item-desc">${t.description || t.category || '—'}</div>
            <div class="history-item-cat">🏷️ ${t.category || '—'} · ${jenisLbl}</div>
          </div>
          <div class="history-item-amt expense">-${fmt(t.amount)}</div>
        </div>
        <div class="history-item-detail hidden" id="edetail-${t.id}">
          <div class="detail-grid">
            <span class="detail-label">Kategori</span><span>${t.category || '—'}</span>
            <span class="detail-label">Jenis</span><span>${jenisLbl}</span>
            <span class="detail-label">Pemilik</span><span>${owner}</span>
            <span class="detail-label">Tanggal</span><span>${fmtDate(t.date)}</span>
            <span class="detail-label">Jumlah</span><span style="color:#f87171">-${fmt(t.amount)}</span>
            ${t.catatan ? `<span class="detail-label">Catatan</span><span>${t.catatan}</span>` : ''}
          </div>
          <div class="detail-actions">
            <button class="btn btn-ghost btn-sm" onclick="editExpenseTx('${t.id}')">✏️ Edit</button>
            <button class="btn btn-ghost btn-sm danger" onclick="deleteExpenseTx('${t.id}')">🗑️ Hapus Catatan</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleExpenseDetail(id) {
  const el = $(`edetail-${id}`);
  if (el) el.classList.toggle('hidden');
}
window.toggleExpenseDetail = toggleExpenseDetail;

async function deleteExpenseTx(id) {
  const ok = await showConfirm('Hapus Pengeluaran?', 'Transaksi ini akan dihapus permanen.');
  if (!ok) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveState();
  showToast('Pengeluaran dihapus', 'info');
  renderExpensePage();
}
window.deleteExpenseTx = deleteExpenseTx;

function editExpenseTx(id) {
  const t = state.transactions.find(x => x.id === id);
  if (!t) return;
  const dateEl = $('exp-date');     if (dateEl)  dateEl.value = t.date || '';
  const catEl  = $('exp-category'); if (catEl)   catEl.value  = t.category || '';
  const amtEl  = $('exp-amount');
  if (amtEl)  { amtEl.value = t.amount ? parseInt(t.amount).toLocaleString('id-ID') : ''; amtEl.dataset.rawValue = String(t.amount || 0); }
  const jenEl  = $('exp-jenis');    if (jenEl)   jenEl.value  = t.jenis || 'tidak_tetap';
  const asnEl  = $('exp-assignee'); if (asnEl)   asnEl.value  = t.assignee || 'shared';
  const catan  = $('exp-catatan');  if (catan)   catan.value  = t.catatan || '';

  const btn = $('exp-submit-btn');
  if (btn) {
    btn.textContent = '💾 Update Pengeluaran';
    btn.onclick = () => {
      t.date        = $('exp-date').value;
      t.category    = $('exp-category').value;
      t.amount      = getRawValue($('exp-amount'));
      t.jenis       = $('exp-jenis').value;
      t.type        = t.jenis === 'tetap' ? 'fixed' : 'variable';
      t.assignee    = $('exp-assignee').value;
      t.description = t.category;
      t.catatan     = $('exp-catatan').value.trim();
      saveState();
      showToast('Pengeluaran diperbarui ✅');
      renderExpensePage();
    };
  }
  $('expense-form-card')?.scrollIntoView({ behavior: 'smooth' });
}
window.editExpenseTx = editExpenseTx;

/* ── CATEGORY MANAGER ── */
function openExpenseCategoryManager() {
  const cats     = state.expenseCategories || [];
  const defaults = ['Makanan & Minuman','Transportasi','Belanja','Hiburan','Kesehatan','Pendidikan','Tagihan','Lainnya'];

  showModal('⚙️ Kategori Pengeluaran', `
    <div class="cat-manager">
      <div id="expense-cat-list" class="cat-list">
        ${cats.map(c => `
          <div class="cat-list-item">
            <span>${getExpenseCatIcon(c)} ${c}</span>
            ${!defaults.includes(c)
              ? `<button class="btn-icon-sm" onclick="removeExpenseCategory('${c}')">✕</button>`
              : '<span class="cat-protected">🔒</span>'}
          </div>`).join('')}
      </div>
      <div class="form-row" style="margin-top:1rem;gap:0.5rem">
        <input type="text" id="new-expense-cat" placeholder="Nama kategori baru…" class="flex-1" style="padding:0.5rem 0.75rem;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text)">
        <button class="btn btn-primary btn-sm" onclick="addExpenseCategory()">+ Tambah</button>
      </div>
    </div>
  `);
}
window.openExpenseCategoryManager = openExpenseCategoryManager;

function addExpenseCategory() {
  const val = $('new-expense-cat')?.value.trim();
  if (!val) return;
  if ((state.expenseCategories || []).includes(val)) { showToast('Kategori sudah ada', 'error'); return; }
  state.expenseCategories = [...(state.expenseCategories || []), val];
  saveState();
  showToast(`Kategori "${val}" ditambahkan`);
  closeModal();
  renderExpensePage();
}
window.addExpenseCategory = addExpenseCategory;

async function removeExpenseCategory(cat) {
  const ok = await showConfirm('Hapus Kategori?', `Kategori "${cat}" akan dihapus.`);
  if (!ok) return;
  state.expenseCategories = (state.expenseCategories || []).filter(c => c !== cat);
  saveState();
  closeModal();
  renderExpensePage();
}
window.removeExpenseCategory = removeExpenseCategory;

/* Budget breakdown helpers */
function showBudgetBreakdown() { renderExpensePage(); }
window.showBudgetBreakdown = showBudgetBreakdown;
function showBudgetByCategory() {
  const wrap = $('expense-budget-wrap'); if (!wrap) return;
  const cats  = state.expenseCategories || [];
  const txs   = getExpenseTxs();
  const catTotals = {};
  txs.forEach(t => { catTotals[t.category || 'Lainnya'] = (catTotals[t.category || 'Lainnya'] || 0) + t.amount; });
  const rows = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => `
    <div class="owner-bar-item">
      <div class="owner-bar-label">${getExpenseCatIcon(cat)} ${cat}</div>
      <div class="owner-bar-track"><div class="owner-bar-fill expense-bar" style="width:${Math.min((amt / Math.max(...Object.values(catTotals))) * 100, 100)}%"></div></div>
      <div class="owner-bar-val">${fmt(amt)}</div>
    </div>`).join('');
  wrap.innerHTML = rows || '<div class="empty-state"><p>Belum ada data</p></div>';
}
window.showBudgetByCategory = showBudgetByCategory;
