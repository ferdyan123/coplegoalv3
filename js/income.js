/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — INCOME.JS
   Tab Pemasukan — cards, form inline, chart, riwayat
   ═══════════════════════════════════════════════════════════ */

let incomeDailyChart = null;
let incomeDonutChart = null;

/* Emoji mapping per kategori */
const INCOME_CAT_ICONS = {
  'Gaji': '💼', 'Bisnis': '🏢', 'Freelance': '💻',
  'Investasi': '📈', 'Bonus': '🎁', 'Lainnya': '💰',
};

function getCatIcon(cat, map) {
  return (map && map[cat]) ? map[cat] : '💰';
}

/* ══════════════════════════════════════════
   MAIN RENDER
══════════════════════════════════════════ */
function renderIncomePage() {
  const s     = state.settings;
  const month = s.month;
  const txs   = state.transactions.filter(t =>
    t.type === 'income' && t.date && t.date.substring(0, 7) === month
  );

  const totalIncome  = txs.reduce((s, t) => s + t.amount, 0);
  const sharedIncome = txs.filter(t => t.assignee === 'shared').reduce((s, t) => s + t.amount, 0);
  const p1Income     = txs.filter(t => t.assignee === 'p1').reduce((s, t) => s + t.amount, 0);
  const p2Income     = txs.filter(t => t.assignee === 'p2').reduce((s, t) => s + t.amount, 0);

  /* Hitung perubahan vs bulan lalu */
  const [cy, cm]  = month ? month.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const prevDate  = new Date(cy, cm - 2, 1);
  const prevMonth = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0');
  const prevTxs   = state.transactions.filter(t =>
    t.type === 'income' && t.date && t.date.substring(0, 7) === prevMonth
  );
  const prevTotal = prevTxs.reduce((s, t) => s + t.amount, 0);
  const pctChange = prevTotal > 0 ? Math.round(((totalIncome - prevTotal) / prevTotal) * 100) : null;

  /* Kategori terbesar */
  const catGroups = {};
  txs.forEach(t => { catGroups[t.category || 'Lainnya'] = (catGroups[t.category || 'Lainnya'] || 0) + t.amount; });
  const topCat = Object.entries(catGroups).sort((a, b) => b[1] - a[1])[0];

  const el = $('page-income'); if (!el) return;
  el.innerHTML = `
    <!-- Summary Cards -->
    <div class="summary-cards-grid">
      ${summaryCard('Total Pemasukan', fmt(totalIncome), pctChange !== null ? `${pctChange > 0 ? '▲' : '▼'} ${Math.abs(pctChange)}%` : '—', pctChange !== null ? (pctChange >= 0 ? 'up' : 'down') : '', monthLabel(month))}
      ${summaryCard('Pemasukan Bersama', fmt(sharedIncome), '🤝', '', 'shared')}
      ${summaryCard(`Pemasukan ${s.name1}`, fmt(p1Income), '👤', '', s.name1)}
      ${summaryCard(`Pemasukan ${s.name2}`, fmt(p2Income), '👤', '', s.name2)}
    </div>

    <!-- Kategori Terbesar -->
    <div class="glass-card top-cat-card">
      <span class="top-cat-label">KATEGORI TERBESAR</span>
      <span class="top-cat-val">${topCat ? topCat[0] : '—'}</span>
      ${topCat ? `<span class="top-cat-amt">${fmt(topCat[1])}</span>` : ''}
    </div>

    <!-- Form Tambah Pemasukan -->
    <div class="glass-card section-card" id="income-form-card">
      <div class="section-header-row">
        <h2 class="section-title">💼 Tambah Pemasukan <span style="font-size:1.2rem">🧾</span></h2>
        <button class="btn btn-ghost btn-sm" onclick="openIncomeCategoryManager()">⚙️ Kategori</button>
      </div>
      ${renderIncomeForm()}
    </div>

    <!-- Breakdown per Kategori -->
    <div class="glass-card section-card">
      <h2 class="section-title">📊 Breakdown per Kategori</h2>
      <div class="chart-donut-wrap" id="income-donut-wrap">
        <canvas id="income-donut-chart" height="220"></canvas>
        <div id="income-donut-legend" class="donut-legend"></div>
      </div>
    </div>

    <!-- Breakdown per Pemilik -->
    <div class="glass-card section-card">
      <h2 class="section-title">👥 Breakdown per Pemilik</h2>
      <div id="income-owner-bars"></div>
    </div>

    <!-- Trend Harian -->
    <div class="glass-card section-card">
      <h2 class="section-title">📅 Tren Harian — ${monthLabel(month)}</h2>
      <p class="section-subtitle">Total pemasukan per hari selama sebulan</p>
      <canvas id="income-daily-chart" height="160"></canvas>
    </div>

    <!-- Riwayat -->
    <div class="glass-card section-card">
      <h2 class="section-title">📋 Riwayat Pemasukan — Bulan Ini</h2>
      <div id="income-history-list"></div>
    </div>
  `;

  renderIncomeCharts(txs, s, month);
  renderIncomeOwnerBars(txs, s);
  renderIncomeHistory(txs, s);
  initIncomeForm();
}

function summaryCard(label, val, badge, badgeCls, sub) {
  const badgeColor = badgeCls === 'up' ? '#34d399' : badgeCls === 'down' ? '#f87171' : 'var(--text-muted)';
  return `<div class="summary-card glass-card">
    <div class="summary-card-label">${label}</div>
    <div class="summary-card-val">${val}</div>
    ${badge ? `<div class="summary-card-badge" style="color:${badgeColor}">${badge}</div>` : ''}
    ${sub ? `<div class="summary-card-sub">${sub}</div>` : ''}
  </div>`;
}

/* ── FORM HTML ── */
function renderIncomeForm() {
  const s    = state.settings;
  const cats = state.incomeCategories || [];
  const today = new Date().toISOString().split('T')[0];
  return `
    <div class="inline-form">
      <div class="form-grid-2">
        <div class="form-field">
          <label>Tanggal</label>
          <input type="date" id="inc-date" value="${today}">
        </div>
        <div class="form-field">
          <label>Kategori</label>
          <select id="inc-category">
            ${cats.map(c => `<option value="${c}">${getCatIcon(c, INCOME_CAT_ICONS)} ${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Jumlah (${s.currency})</label>
          <div class="input-prefix-wrap">
            <span class="input-prefix">${s.currency}</span>
            <input type="text" id="inc-amount" inputmode="numeric" placeholder="0" autocomplete="off">
          </div>
        </div>
        <div class="form-field">
          <label>Pemilik</label>
          <select id="inc-assignee">
            <option value="shared">🤝 Bersama</option>
            <option value="p1">👤 ${s.name1}</option>
            <option value="p2">👤 ${s.name2}</option>
          </select>
        </div>
      </div>
      <div class="form-field">
        <label>Deskripsi</label>
        <input type="text" id="inc-desc" placeholder="Misal: Gaji bulan ini" autocomplete="off">
      </div>
      <div class="form-field">
        <label>Catatan (opsional)</label>
        <textarea id="inc-catatan" rows="2" placeholder="Misal: transfer tgl 25" style="resize:vertical;min-height:60px"></textarea>
      </div>
      <button class="btn btn-primary btn-lg w-full" id="inc-submit-btn">+ Tambah Pemasukan</button>
    </div>
  `;
}

function initIncomeForm() {
  initNumberInput('inc-amount');
  const btn = $('inc-submit-btn');
  if (btn) btn.addEventListener('click', submitIncome);
}

function submitIncome() {
  const date     = $('inc-date').value;
  const category = $('inc-category').value;
  const amount   = getRawValue($('inc-amount'));
  const assignee = $('inc-assignee').value;
  const desc     = $('inc-desc').value.trim();
  const catatan  = $('inc-catatan').value.trim();

  if (!date)      { showToast('Tanggal wajib diisi', 'error'); return; }
  if (amount <= 0){ showToast('Jumlah harus lebih dari 0', 'error'); return; }

  const tx = {
    id: generateId(), date, type: 'income', assignee,
    description: desc || category, amount, category, catatan,
    budgetItemId: null, goalId: null,
  };
  state.transactions.unshift(tx);
  saveState();
  showToast('Pemasukan ditambahkan ✅');
  renderIncomePage();
}

/* ── CHARTS ── */
function renderIncomeCharts(txs, s, month) {
  /* Donut per kategori */
  const catMap = {};
  txs.forEach(t => { catMap[t.category || 'Lainnya'] = (catMap[t.category || 'Lainnya'] || 0) + t.amount; });
  const catLabels = Object.keys(catMap);
  const catVals   = Object.values(catMap);
  const colors    = ['#34d399','#38bdf8','#fbbf24','#fb923c','#c084fc','#f87171','#a3e635','#f472b6'];

  const donutCtx = $('income-donut-chart');
  if (donutCtx) {
    if (incomeDonutChart) incomeDonutChart.destroy();
    incomeDonutChart = new Chart(donutCtx, {
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

  /* Legend manual */
  const legend = $('income-donut-legend');
  if (legend) {
    legend.innerHTML = catLabels.map((l, i) => `
      <div class="donut-legend-item">
        <span class="donut-legend-dot" style="background:${colors[i % colors.length]}"></span>
        <span class="donut-legend-label">${l}</span>
        <span class="donut-legend-val">${fmt(catVals[i])}</span>
      </div>`).join('');
  }

  /* Daily trend */
  const [cy, cm] = month ? month.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const daysInMonth = new Date(cy, cm, 0).getDate();
  const dailyData = Array(daysInMonth).fill(0);
  txs.forEach(t => {
    if (t.date) {
      const d = parseInt(t.date.split('-')[2], 10) - 1;
      if (d >= 0 && d < daysInMonth) dailyData[d] += t.amount;
    }
  });
  const dailyLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const dailyCtx = $('income-daily-chart');
  if (dailyCtx) {
    if (incomeDailyChart) incomeDailyChart.destroy();
    incomeDailyChart = new Chart(dailyCtx, {
      type: 'line',
      data: {
        labels: dailyLabels,
        datasets: [{
          label: 'Pemasukan Harian',
          data: dailyData,
          borderColor: '#34d399',
          backgroundColor: 'rgba(52,211,153,0.1)',
          tension: 0.3, fill: true,
          pointRadius: dailyData.map(v => v > 0 ? 4 : 0),
          pointBackgroundColor: '#34d399',
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
function renderIncomeOwnerBars(txs, s) {
  const wrap = $('income-owner-bars'); if (!wrap) return;
  const groups = {
    shared: { label: '🤝 Bersama', amt: 0 },
    p1:     { label: s.name1,      amt: 0 },
    p2:     { label: s.name2,      amt: 0 },
  };
  txs.forEach(t => { if (groups[t.assignee]) groups[t.assignee].amt += t.amount; });
  const max = Math.max(...Object.values(groups).map(g => g.amt), 1);

  wrap.innerHTML = Object.entries(groups).map(([key, g]) => {
    const pct = Math.round((g.amt / max) * 100);
    return `<div class="owner-bar-item">
      <div class="owner-bar-label">${g.label}</div>
      <div class="owner-bar-track">
        <div class="owner-bar-fill income-bar" style="width:${pct}%"></div>
      </div>
      <div class="owner-bar-val">${fmt(g.amt)}</div>
    </div>`;
  }).join('');
}

/* ── HISTORY ── */
function renderIncomeHistory(txs, s) {
  const list = $('income-history-list'); if (!list) return;
  const sorted = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!sorted.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada pemasukan bulan ini</p></div>`;
    return;
  }

  let lastDate = '';
  list.innerHTML = sorted.map(t => {
    const dateHeader = t.date !== lastDate
      ? `<div class="history-date-header">${fmtDate(t.date)}</div>`
      : '';
    lastDate = t.date;
    const owner = t.assignee === 'p1' ? s.name1 : t.assignee === 'p2' ? s.name2 : '🤝 Bersama';
    const icon  = getCatIcon(t.category, INCOME_CAT_ICONS);
    return `${dateHeader}
      <div class="history-item" id="hist-${t.id}">
        <div class="history-item-main" onclick="toggleHistoryDetail('${t.id}')">
          <div class="history-item-icon income-icon">${icon}</div>
          <div class="history-item-body">
            <div class="history-item-desc">${t.description || t.category || '—'}</div>
            <div class="history-item-cat">🏷️ ${t.category || '—'}</div>
          </div>
          <div class="history-item-amt income">+${fmt(t.amount)}</div>
        </div>
        <div class="history-item-detail hidden" id="detail-${t.id}">
          <div class="detail-grid">
            <span class="detail-label">Kategori</span><span>${t.category || '—'}</span>
            <span class="detail-label">Pemilik</span><span>${owner}</span>
            <span class="detail-label">Tanggal</span><span>${fmtDate(t.date)}</span>
            <span class="detail-label">Jumlah</span><span style="color:#34d399">+${fmt(t.amount)}</span>
            ${t.catatan ? `<span class="detail-label">Catatan</span><span>${t.catatan}</span>` : ''}
          </div>
          <div class="detail-actions">
            <button class="btn btn-ghost btn-sm" onclick="editIncomeTx('${t.id}')">✏️ Edit</button>
            <button class="btn btn-ghost btn-sm danger" onclick="deleteIncomeTx('${t.id}')">🗑️ Hapus</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleHistoryDetail(id) {
  const el = $(`detail-${id}`);
  if (el) el.classList.toggle('hidden');
}
window.toggleHistoryDetail = toggleHistoryDetail;

async function deleteIncomeTx(id) {
  const ok = await showConfirm('Hapus Pemasukan?', 'Transaksi ini akan dihapus permanen.');
  if (!ok) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveState();
  showToast('Pemasukan dihapus', 'info');
  renderIncomePage();
}
window.deleteIncomeTx = deleteIncomeTx;

function editIncomeTx(id) {
  const t = state.transactions.find(x => x.id === id);
  if (!t) return;
  /* Isi form dengan data existing */
  const dateEl = $('inc-date');         if (dateEl) dateEl.value = t.date || '';
  const catEl  = $('inc-category');     if (catEl)  catEl.value  = t.category || '';
  const amtEl  = $('inc-amount');
  if (amtEl) { amtEl.value = t.amount ? parseInt(t.amount).toLocaleString('id-ID') : ''; amtEl.dataset.rawValue = String(t.amount || 0); }
  const asnEl  = $('inc-assignee');     if (asnEl)  asnEl.value  = t.assignee || 'shared';
  const descEl = $('inc-desc');         if (descEl) descEl.value = t.description || '';
  const catEl2 = $('inc-catatan');      if (catEl2) catEl2.value = t.catatan || '';

  /* Ganti tombol jadi update */
  const btn = $('inc-submit-btn');
  if (btn) {
    btn.textContent = '💾 Update Pemasukan';
    btn.onclick = () => {
      t.date        = $('inc-date').value;
      t.category    = $('inc-category').value;
      t.amount      = getRawValue($('inc-amount'));
      t.assignee    = $('inc-assignee').value;
      t.description = $('inc-desc').value.trim() || t.category;
      t.catatan     = $('inc-catatan').value.trim();
      saveState();
      showToast('Pemasukan diperbarui ✅');
      renderIncomePage();
    };
  }
  $('income-form-card')?.scrollIntoView({ behavior: 'smooth' });
}
window.editIncomeTx = editIncomeTx;

/* ── CATEGORY MANAGER ── */
function openIncomeCategoryManager() {
  const cats     = state.incomeCategories || [];
  const defaults = ['Gaji','Bisnis','Freelance','Investasi','Bonus','Lainnya'];

  const html = `
    <div class="cat-manager">
      <h3 style="margin-bottom:1rem">⚙️ Kategori Pemasukan</h3>
      <div id="income-cat-list" class="cat-list">
        ${cats.map(c => `
          <div class="cat-list-item">
            <span>${getCatIcon(c, INCOME_CAT_ICONS)} ${c}</span>
            ${!defaults.includes(c)
              ? `<button class="btn-icon-sm" onclick="removeIncomeCategory('${c}')">✕</button>`
              : '<span class="cat-protected">🔒</span>'}
          </div>`).join('')}
      </div>
      <div class="form-row" style="margin-top:1rem;gap:0.5rem">
        <input type="text" id="new-income-cat" placeholder="Nama kategori baru…" class="flex-1" style="padding:0.5rem 0.75rem;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text)">
        <button class="btn btn-primary btn-sm" onclick="addIncomeCategory()">+ Tambah</button>
      </div>
    </div>
  `;

  showModal('⚙️ Kategori', html);
}
window.openIncomeCategoryManager = openIncomeCategoryManager;

function addIncomeCategory() {
  const inp = $('new-income-cat');
  const val = inp?.value.trim();
  if (!val) return;
  if ((state.incomeCategories || []).includes(val)) { showToast('Kategori sudah ada', 'error'); return; }
  state.incomeCategories = [...(state.incomeCategories || []), val];
  saveState();
  showToast(`Kategori "${val}" ditambahkan`);
  closeModal();
  renderIncomePage();
}
window.addIncomeCategory = addIncomeCategory;

async function removeIncomeCategory(cat) {
  const ok = await showConfirm('Hapus Kategori?', `Kategori "${cat}" akan dihapus.`);
  if (!ok) return;
  state.incomeCategories = (state.incomeCategories || []).filter(c => c !== cat);
  saveState();
  closeModal();
  renderIncomePage();
}
window.removeIncomeCategory = removeIncomeCategory;

/* ── Generic Modal Helper (dipakai income, expense, dll) ── */
function showModal(title, bodyHtml) {
  let m = $('generic-modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'generic-modal';
    m.className = 'modal-overlay';
    m.innerHTML = `<div class="modal glass-card animate-fadeInUp" style="max-width:480px">
      <div class="modal-header-bar">
        <h2 id="generic-modal-title"></h2>
        <button class="btn-icon" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body" id="generic-modal-body"></div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) closeModal(); });
  }
  $('generic-modal-title').textContent = title;
  $('generic-modal-body').innerHTML = bodyHtml;
  m.classList.remove('hidden');
}
window.showModal = showModal;

function closeModal() {
  const m = $('generic-modal');
  if (m) m.classList.add('hidden');
}
window.closeModal = closeModal;
