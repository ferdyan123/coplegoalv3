/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — INVESTMENTS.JS
   Tab Investasi — cards, form inline, chart, riwayat
   ═══════════════════════════════════════════════════════════ */

let investDonutChart = null;
let investDailyChart = null;

const INVEST_CAT_ICONS = {
  'Reksa Dana': '📊', 'Saham': '📈', 'Emas': '🥇',
  'Obligasi': '📜', 'Deposito': '🏦', 'Crypto': '🪙', 'Lainnya': '💹',
};

function getInvestCatIcon(cat) {
  return INVEST_CAT_ICONS[cat] || '💹';
}

function getInvestTxs() {
  const month = state.settings.month;
  return state.transactions.filter(t =>
    t.type === 'investments' && t.date && t.date.substring(0, 7) === month
  );
}

/* ══════════════════════════════════════════
   MAIN RENDER
══════════════════════════════════════════ */
function renderInvestmentsPage() {
  const s    = state.settings;
  const month = s.month;
  const txs   = getInvestTxs();

  const totalInvest  = txs.reduce((s, t) => s + t.amount, 0);
  const sharedInvest = txs.filter(t => t.assignee === 'shared').reduce((s, t) => s + t.amount, 0);
  const p1Invest     = txs.filter(t => t.assignee === 'p1').reduce((s, t) => s + t.amount, 0);
  const p2Invest     = txs.filter(t => t.assignee === 'p2').reduce((s, t) => s + t.amount, 0);

  /* Perubahan vs bulan lalu */
  const [cy, cm]  = month ? month.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const prevDate  = new Date(cy, cm - 2, 1);
  const prevMonth = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0');
  const prevTotal = state.transactions
    .filter(t => t.type === 'investments' && t.date && t.date.substring(0, 7) === prevMonth)
    .reduce((s, t) => s + t.amount, 0);
  const pctChange = prevTotal > 0 ? Math.round(((totalInvest - prevTotal) / prevTotal) * 100) : null;

  /* Kategori terbesar */
  const catGroups = {};
  txs.forEach(t => { catGroups[t.category || 'Lainnya'] = (catGroups[t.category || 'Lainnya'] || 0) + t.amount; });
  const topCat = Object.entries(catGroups).sort((a, b) => b[1] - a[1])[0];

  /* Budget investasi */
  const budgetInvest = calcBudget('investments');

  const el = $('page-investments'); if (!el) return;
  el.innerHTML = `
    <!-- Summary Cards -->
    <div class="summary-cards-grid">
      ${summaryCard('Total Investasi', fmt(totalInvest), pctChange !== null ? `${pctChange >= 0 ? '▲' : '▼'} ${Math.abs(pctChange)}%` : '—', pctChange !== null ? (pctChange >= 0 ? 'up' : 'down') : '', monthLabel(month))}
      ${summaryCard('Investasi Bersama', fmt(sharedInvest), '🤝', '', 'shared')}
      ${summaryCard(`Investasi ${s.name1}`, fmt(p1Invest), '👤', '', s.name1)}
      ${summaryCard(`Investasi ${s.name2}`, fmt(p2Invest), '👤', '', s.name2)}
    </div>

    <!-- Kategori Terbesar -->
    <div class="glass-card top-cat-card">
      <span class="top-cat-label">INSTRUMEN TERBESAR</span>
      <span class="top-cat-val">${topCat ? topCat[0] : '—'}</span>
      ${topCat ? `<span class="top-cat-amt">${fmt(topCat[1])}</span>` : ''}
    </div>

    <!-- Budget Neraca -->
    <div class="glass-card section-card">
      <h2 class="section-title">💰 Target Investasi Bulan Ini</h2>
      ${renderInvestBudgetBar(totalInvest, budgetInvest)}
    </div>

    <!-- Form Tambah Investasi -->
    <div class="glass-card section-card" id="invest-form-card">
      <div class="section-header-row">
        <h2 class="section-title">📈 Tambah Investasi <span style="font-size:1.2rem">💹</span></h2>
        <button class="btn btn-ghost btn-sm" onclick="openInvestCategoryManager()">⚙️ Kategori</button>
      </div>
      ${renderInvestForm(s)}
    </div>

    <!-- Breakdown per Kategori -->
    <div class="glass-card section-card">
      <h2 class="section-title">📊 Breakdown per Instrumen</h2>
      <div class="chart-donut-wrap">
        <canvas id="invest-donut-chart" height="220"></canvas>
        <div id="invest-donut-legend" class="donut-legend"></div>
      </div>
    </div>

    <!-- Breakdown per Pemilik -->
    <div class="glass-card section-card">
      <h2 class="section-title">👥 Breakdown per Pemilik</h2>
      <div id="invest-owner-bars"></div>
    </div>

    <!-- Trend Harian -->
    <div class="glass-card section-card">
      <h2 class="section-title">📅 Tren Harian — ${monthLabel(month)}</h2>
      <p class="section-subtitle">Total investasi per hari selama sebulan</p>
      <canvas id="invest-daily-chart" height="160"></canvas>
    </div>

    <!-- Riwayat -->
    <div class="glass-card section-card">
      <h2 class="section-title">📋 Riwayat Investasi — Bulan Ini</h2>
      <div id="invest-history-list"></div>
    </div>
  `;

  renderInvestCharts(txs, month);
  renderInvestOwnerBars(txs, s);
  renderInvestHistory(txs, s);
  initInvestForm();
}

function renderInvestBudgetBar(actual, budget) {
  const pct = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;
  const reached = actual >= budget && budget > 0;
  return `
    <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
      <span>Realisasi Investasi</span>
      <span style="color:var(--text-muted)">${fmt(actual)} / ${fmt(budget)}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" style="width:${pct}%;background:#c084fc;transition:width 0.5s"></div>
    </div>
    ${reached
      ? '<div style="color:#34d399;margin-top:0.4rem;font-size:0.875rem">🎉 Target investasi bulan ini tercapai!</div>'
      : budget > 0
        ? `<div style="color:var(--text-muted);margin-top:0.4rem;font-size:0.875rem">Sisa ${fmt(budget - actual)} lagi untuk capai target</div>`
        : '<div style="color:var(--text-muted);margin-top:0.4rem;font-size:0.875rem">Belum ada target — atur di Pengaturan Anggaran</div>'}
  `;
}

/* ── FORM ── */
function renderInvestForm(s) {
  const cats  = state.investmentCategories || ['Reksa Dana','Saham','Emas','Obligasi','Deposito','Crypto','Lainnya'];
  const today = new Date().toISOString().split('T')[0];
  return `
    <div class="inline-form">
      <div class="form-grid-2">
        <div class="form-field">
          <label>Tanggal</label>
          <input type="date" id="inv-date" value="${today}">
        </div>
        <div class="form-field">
          <label>Instrumen</label>
          <select id="inv-category">
            ${cats.map(c => `<option value="${c}">${getInvestCatIcon(c)} ${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Jumlah (${s.currency})</label>
          <div class="input-prefix-wrap">
            <span class="input-prefix">${s.currency}</span>
            <input type="text" id="inv-amount" inputmode="numeric" placeholder="0" autocomplete="off">
          </div>
        </div>
        <div class="form-field">
          <label>Pemilik</label>
          <select id="inv-assignee">
            <option value="shared">🤝 Bersama</option>
            <option value="p1">👤 ${s.name1}</option>
            <option value="p2">👤 ${s.name2}</option>
          </select>
        </div>
        <div class="form-field">
          <label>Platform / Broker</label>
          <select id="inv-platform">
            <option>Bibit</option><option>Ajaib</option><option>Stockbit</option>
            <option>Pluang</option><option>Antam</option><option>Indodax</option>
            <option>Bank</option><option>Lainnya</option>
          </select>
        </div>
      </div>
      <div class="form-field">
        <label>Deskripsi</label>
        <input type="text" id="inv-desc" placeholder="Misal: Beli Reksa Dana Pasar Uang" autocomplete="off">
      </div>
      <div class="form-field">
        <label>Catatan (opsional)</label>
        <textarea id="inv-catatan" rows="2" placeholder="Opsional…" style="resize:vertical;min-height:60px"></textarea>
      </div>
      <button class="btn btn-primary btn-lg w-full" id="inv-submit-btn">+ Tambah Investasi</button>
    </div>
  `;
}

function initInvestForm() {
  initNumberInput('inv-amount');
  const btn = $('inv-submit-btn');
  if (btn) btn.addEventListener('click', submitInvestment);
}

function submitInvestment() {
  const date     = $('inv-date').value;
  const category = $('inv-category').value;
  const amount   = getRawValue($('inv-amount'));
  const assignee = $('inv-assignee').value;
  const desc     = $('inv-desc')?.value.trim();
  const catatan  = $('inv-catatan')?.value.trim();

  if (!date)      { showToast('Tanggal wajib diisi', 'error'); return; }
  if (amount <= 0){ showToast('Jumlah harus lebih dari 0', 'error'); return; }

  const tx = {
    id: generateId(), date, type: 'investments', assignee,
    description: desc || category, amount, category, catatan,
    budgetItemId: null, goalId: null,
  };
  state.transactions.unshift(tx);
  saveState();
  showToast('Investasi ditambahkan ✅');
  renderInvestmentsPage();
}

/* ── CHARTS ── */
function renderInvestCharts(txs, month) {
  /* Donut per instrumen */
  const catMap = {};
  txs.forEach(t => { catMap[t.category || 'Lainnya'] = (catMap[t.category || 'Lainnya'] || 0) + t.amount; });
  const catLabels = Object.keys(catMap);
  const catVals   = Object.values(catMap);
  const colors    = ['#c084fc','#38bdf8','#fbbf24','#34d399','#fb923c','#f87171','#f472b6','#a3e635'];

  const donutCtx = $('invest-donut-chart');
  if (donutCtx) {
    if (investDonutChart) investDonutChart.destroy();
    if (catLabels.length > 0) {
      investDonutChart = new Chart(donutCtx, {
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
  }

  const legend = $('invest-donut-legend');
  if (legend) {
    legend.innerHTML = catLabels.length
      ? catLabels.map((l, i) => `
          <div class="donut-legend-item">
            <span class="donut-legend-dot" style="background:${colors[i % colors.length]}"></span>
            <span class="donut-legend-label">${l}</span>
            <span class="donut-legend-val">${fmt(catVals[i])}</span>
          </div>`).join('')
      : '<div class="empty-state"><p>Belum ada investasi bulan ini</p></div>';
  }

  /* Daily trend */
  const [cy, cm] = month ? month.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const daysInMonth = new Date(cy, cm, 0).getDate();
  const dailyData   = Array(daysInMonth).fill(0);
  txs.forEach(t => {
    if (t.date) {
      const d = parseInt(t.date.split('-')[2], 10) - 1;
      if (d >= 0 && d < daysInMonth) dailyData[d] += t.amount;
    }
  });

  const dailyCtx = $('invest-daily-chart');
  if (dailyCtx) {
    if (investDailyChart) investDailyChart.destroy();
    investDailyChart = new Chart(dailyCtx, {
      type: 'line',
      data: {
        labels: Array.from({ length: daysInMonth }, (_, i) => i + 1),
        datasets: [{
          label: 'Investasi Harian',
          data: dailyData,
          borderColor: '#c084fc',
          backgroundColor: 'rgba(192,132,252,0.1)',
          tension: 0.3, fill: true,
          pointRadius: dailyData.map(v => v > 0 ? 4 : 0),
          pointBackgroundColor: '#c084fc',
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
function renderInvestOwnerBars(txs, s) {
  const wrap = $('invest-owner-bars'); if (!wrap) return;
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
        <div class="owner-bar-fill invest-bar" style="width:${pct}%"></div>
      </div>
      <div class="owner-bar-val">${fmt(g.amt)}</div>
    </div>`;
  }).join('');
}

/* ── HISTORY ── */
function renderInvestHistory(txs, s) {
  const list = $('invest-history-list'); if (!list) return;
  const sorted = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!sorted.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada investasi bulan ini</p></div>`;
    return;
  }

  let lastDate = '';
  list.innerHTML = sorted.map(t => {
    const dateHeader = t.date !== lastDate
      ? `<div class="history-date-header">${fmtDate(t.date)}</div>` : '';
    lastDate = t.date;
    const owner = t.assignee === 'p1' ? s.name1 : t.assignee === 'p2' ? s.name2 : '🤝 Bersama';
    const icon  = getInvestCatIcon(t.category);
    return `${dateHeader}
      <div class="history-item" id="invhist-${t.id}">
        <div class="history-item-main" onclick="toggleInvestDetail('${t.id}')">
          <div class="history-item-icon invest-icon">${icon}</div>
          <div class="history-item-body">
            <div class="history-item-desc">${t.description || t.category || '—'}</div>
            <div class="history-item-cat">📈 ${t.category || '—'}</div>
          </div>
          <div class="history-item-amt income">+${fmt(t.amount)}</div>
        </div>
        <div class="history-item-detail hidden" id="invdetail-${t.id}">
          <div class="detail-grid">
            <span class="detail-label">Instrumen</span><span>${t.category || '—'}</span>
            <span class="detail-label">Pemilik</span><span>${owner}</span>
            <span class="detail-label">Tanggal</span><span>${fmtDate(t.date)}</span>
            <span class="detail-label">Jumlah</span><span style="color:#c084fc">+${fmt(t.amount)}</span>
            ${t.catatan ? `<span class="detail-label">Catatan</span><span>${t.catatan}</span>` : ''}
          </div>
          <div class="detail-actions">
            <button class="btn btn-ghost btn-sm" onclick="editInvestTx('${t.id}')">✏️ Edit</button>
            <button class="btn btn-ghost btn-sm danger" onclick="deleteInvestTx('${t.id}')">🗑️ Hapus</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleInvestDetail(id) {
  const el = $(`invdetail-${id}`);
  if (el) el.classList.toggle('hidden');
}
window.toggleInvestDetail = toggleInvestDetail;

async function deleteInvestTx(id) {
  const ok = await showConfirm('Hapus Investasi?', 'Transaksi ini akan dihapus permanen.');
  if (!ok) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveState();
  showToast('Investasi dihapus', 'info');
  renderInvestmentsPage();
}
window.deleteInvestTx = deleteInvestTx;

function editInvestTx(id) {
  const t = state.transactions.find(x => x.id === id);
  if (!t) return;
  const dateEl = $('inv-date');     if (dateEl)  dateEl.value = t.date || '';
  const catEl  = $('inv-category'); if (catEl)   catEl.value  = t.category || '';
  const amtEl  = $('inv-amount');
  if (amtEl)   { amtEl.value = t.amount ? parseInt(t.amount).toLocaleString('id-ID') : ''; amtEl.dataset.rawValue = String(t.amount || 0); }
  const asnEl  = $('inv-assignee'); if (asnEl)   asnEl.value  = t.assignee || 'shared';
  const descEl = $('inv-desc');     if (descEl)  descEl.value = t.description || '';
  const catan  = $('inv-catatan');  if (catan)   catan.value  = t.catatan || '';

  const btn = $('inv-submit-btn');
  if (btn) {
    btn.textContent = '💾 Update Investasi';
    btn.onclick = () => {
      t.date        = $('inv-date').value;
      t.category    = $('inv-category').value;
      t.amount      = getRawValue($('inv-amount'));
      t.assignee    = $('inv-assignee').value;
      t.description = $('inv-desc')?.value.trim() || t.category;
      t.catatan     = $('inv-catatan')?.value.trim();
      saveState();
      showToast('Investasi diperbarui ✅');
      renderInvestmentsPage();
    };
  }
  $('invest-form-card')?.scrollIntoView({ behavior: 'smooth' });
}
window.editInvestTx = editInvestTx;

/* ── CATEGORY MANAGER ── */
function openInvestCategoryManager() {
  const cats     = state.investmentCategories || [];
  const defaults = ['Reksa Dana','Saham','Emas','Obligasi','Deposito','Crypto','Lainnya'];
  showModal('⚙️ Kategori Investasi', `
    <div class="cat-manager">
      <div id="invest-cat-list" class="cat-list">
        ${cats.map(c => `
          <div class="cat-list-item">
            <span>${getInvestCatIcon(c)} ${c}</span>
            ${!defaults.includes(c)
              ? `<button class="btn-icon-sm" onclick="removeInvestCategory('${c}')">✕</button>`
              : '<span class="cat-protected">🔒</span>'}
          </div>`).join('')}
      </div>
      <div class="form-row" style="margin-top:1rem;gap:0.5rem">
        <input type="text" id="new-invest-cat" placeholder="Nama instrumen baru…" class="flex-1" style="padding:0.5rem 0.75rem;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text)">
        <button class="btn btn-primary btn-sm" onclick="addInvestCategory()">+ Tambah</button>
      </div>
    </div>
  `);
}
window.openInvestCategoryManager = openInvestCategoryManager;

function addInvestCategory() {
  const val = $('new-invest-cat')?.value.trim();
  if (!val) return;
  if ((state.investmentCategories || []).includes(val)) { showToast('Kategori sudah ada', 'error'); return; }
  state.investmentCategories = [...(state.investmentCategories || []), val];
  saveState();
  showToast(`Instrumen "${val}" ditambahkan`);
  closeModal();
  renderInvestmentsPage();
}
window.addInvestCategory = addInvestCategory;

async function removeInvestCategory(cat) {
  const ok = await showConfirm('Hapus Kategori?', `Instrumen "${cat}" akan dihapus.`);
  if (!ok) return;
  state.investmentCategories = (state.investmentCategories || []).filter(c => c !== cat);
  saveState();
  closeModal();
  renderInvestmentsPage();
}
window.removeInvestCategory = removeInvestCategory;
