/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — DEBT.JS
   Tab Hutang & Piutang
   ═══════════════════════════════════════════════════════════ */

let debtDonutChart    = null;
let piutangDonutChart = null;

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function getDebtTxsThisMonth(type) {
  const month = state.settings.month;
  return (state.debtTransactions || []).filter(t =>
    t.type === type && t.tanggal && t.tanggal.substring(0, 7) === month
  );
}

function calcSisaHutang(debt) {
  const paid = (state.debtTransactions || [])
    .filter(t => t.debtId === debt.id && t.type === 'hutang')
    .reduce((s, t) => s + t.jumlah, 0);
  const total = (debt.totalPokok || 0) + (debt.bungaTotal || 0);
  return Math.max(0, total - paid);
}

function calcSisaPiutang(debt) {
  const received = (state.debtTransactions || [])
    .filter(t => t.debtId === debt.id && t.type === 'piutang')
    .reduce((s, t) => s + t.jumlah, 0);
  return Math.max(0, (debt.totalPokok || 0) - received);
}

/* ══════════════════════════════════════════
   MAIN RENDER
══════════════════════════════════════════ */
function renderDebtPage() {
  const s      = state.settings;
  const month  = s.month;
  const debts  = state.debts || [];
  const hutangs  = debts.filter(d => d.type === 'hutang');
  const piutangs = debts.filter(d => d.type === 'piutang');

  /* Bayar hutang bulan ini */
  const hutangTxsBulanIni  = getDebtTxsThisMonth('hutang');
  const piutangTxsBulanIni = getDebtTxsThisMonth('piutang');
  const totalHutangBulanIni  = hutangTxsBulanIni.reduce((s, t) => s + t.jumlah, 0);
  const totalPiutangBulanIni = piutangTxsBulanIni.reduce((s, t) => s + t.jumlah, 0);

  /* Budget hutang (dari budgetItems.loan lama) */
  const budgetHutang = calcBudget('loan');

  const el = $('page-debt'); if (!el) return;
  el.innerHTML = `
    <!-- HUTANG section -->
    <div style="padding:0.75rem 1.5rem 0;font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">💳 Hutang</div>
    <div class="summary-cards-grid" style="padding-top:0.5rem">
      ${summaryCard('Bayar Hutang Bulan Ini', fmt(totalHutangBulanIni), '', '', monthLabel(month))}
      ${summaryCard('Sisa Hutang Total', fmt(hutangs.reduce((s, d) => s + calcSisaHutang(d), 0)), '', '', `${hutangs.length} rencana`)}
    </div>
    <div class="tab-page-grid">
      <!-- Full: Budget -->
      <div class="glass-card section-card tab-full-width">
        <h2 class="section-title">Budget Hutang Bulan Ini</h2>
        ${renderDebtBudgetBar(totalHutangBulanIni, budgetHutang)}
      </div>
      <!-- Half: Rencana list -->
      <div class="glass-card section-card">
        <h2 class="section-title">Rencana Pelunasan</h2>
        <div id="debt-plans-list">${renderDebtPlansList(hutangs)}</div>
      </div>
      <!-- Half: Donut hutang -->
      <div class="glass-card section-card">
        <h2 class="section-title">Breakdown Hutang</h2>
        <canvas id="debt-donut-chart" height="180"></canvas>
        <div id="debt-donut-legend" class="donut-legend" style="margin-top:0.75rem"></div>
      </div>
      <!-- Half: Form rencana baru -->
      <div class="glass-card section-card" id="debt-plan-form-card">
        <h2 class="section-title">+ Rencana Hutang Baru</h2>
        ${renderDebtPlanForm('hutang')}
      </div>
      <!-- Half: Form bayar -->
      <div class="glass-card section-card" id="debt-pay-form-card">
        <h2 class="section-title">Catat Bayar Hutang</h2>
        ${renderDebtPayForm('hutang', hutangs)}
      </div>
    </div>

    <!-- PIUTANG section -->
    <div style="padding:1rem 1.5rem 0;font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">🤝 Piutang</div>
    <div class="summary-cards-grid" style="padding-top:0.5rem">
      ${summaryCard('Terima Piutang Bulan Ini', fmt(totalPiutangBulanIni), '', '', monthLabel(month))}
      ${summaryCard('Sisa Piutang Total', fmt(piutangs.reduce((s, d) => s + calcSisaPiutang(d), 0)), '', '', `${piutangs.length} rencana`)}
    </div>
    <div class="tab-page-grid">
      <!-- Half: Rencana piutang -->
      <div class="glass-card section-card">
        <h2 class="section-title">Rencana Penerimaan</h2>
        <div id="piutang-plans-list">${renderPiutangPlansList(piutangs)}</div>
      </div>
      <!-- Half: Donut piutang -->
      <div class="glass-card section-card">
        <h2 class="section-title">Breakdown Piutang</h2>
        <canvas id="piutang-donut-chart" height="180"></canvas>
        <div id="piutang-donut-legend" class="donut-legend" style="margin-top:0.75rem"></div>
      </div>
      <!-- Half: Form rencana piutang baru -->
      <div class="glass-card section-card">
        <h2 class="section-title">+ Rencana Piutang Baru</h2>
        ${renderDebtPlanForm('piutang')}
      </div>
      <!-- Half: Form catat piutang -->
      <div class="glass-card section-card" id="piutang-pay-form-card">
        <h2 class="section-title">Catat Piutang</h2>
        ${renderDebtPayForm('piutang', piutangs)}
      </div>
      <!-- Full: Riwayat gabungan -->
      <div class="glass-card section-card tab-full-width">
        <h2 class="section-title">Riwayat Hutang & Piutang</h2>
        <div id="debt-history-list"></div>
      </div>
    </div>
  `;

  renderDebtCharts(hutangs, piutangs);
  renderDebtHistory(debts);
  initDebtForms();
}

/* ── BUDGET BAR ── */
function renderDebtBudgetBar(actual, budget) {
  const pct  = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;
  const over = actual > budget && budget > 0;
  const status = budget === 0 ? '—' : over
    ? '⚠️ Sudah lewat budget hutang bulan ini!'
    : `✅ Masih aman, sisa ${fmt(budget - actual)}.`;
  return `
    <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
      <span>Hutang</span>
      <span style="color:var(--text-muted)">${fmt(actual)} / ${fmt(budget)}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill ${over ? 'over' : ''}" style="width:${pct}%;background:${over ? '#ef4444' : '#fb923c'};transition:width 0.5s"></div>
    </div>
    <div style="margin-top:0.4rem;color:${over ? '#ef4444' : '#34d399'};font-size:0.875rem">${status}</div>
  `;
}

/* ── HUTANG PLANS LIST ── */
function renderDebtPlansList(hutangs) {
  if (!hutangs.length) return `<div class="empty-state"><div class="empty-icon">💳</div><p>Belum ada rencana hutang. Tambah di bawah!</p></div>`;
  return hutangs.map(d => {
    const total   = (d.totalPokok || 0) + (d.bungaTotal || 0);
    const paid    = (state.debtTransactions || []).filter(t => t.debtId === d.id && t.type === 'hutang').reduce((s, t) => s + t.jumlah, 0);
    const sisa    = Math.max(0, total - paid);
    const pct     = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
    const lunas   = sisa === 0 && total > 0;
    return `
      <div class="debt-plan-item ${lunas ? 'lunas' : ''}">
        <div class="debt-plan-header">
          <div class="debt-plan-info">
            <div class="debt-plan-name">${d.nama}</div>
            <div class="debt-plan-meta">Total ${fmt(total)} · Cicilan ${fmt(d.cicilanPerBulan || 0)}/bln</div>
          </div>
          <div class="debt-plan-pct">${pct.toFixed(0)}%</div>
          <button class="btn-icon-sm danger" onclick="deleteDebtPlan('${d.id}')">🗑️</button>
        </div>
        <div class="progress-track" style="margin-top:0.5rem">
          <div class="progress-fill" style="width:${pct}%;background:${lunas ? '#34d399' : '#fb923c'};transition:width 0.5s"></div>
        </div>
        <div style="color:var(--text-muted);font-size:0.8rem;margin-top:0.25rem">
          ${lunas ? '🎉 Lunas!' : `Terbayar ${fmt(paid)} · Sisa ${fmt(sisa)}`}
        </div>
        ${d.catatan ? `<div style="color:var(--text-muted);font-size:0.8rem;margin-top:0.2rem">📝 ${d.catatan}</div>` : ''}
      </div>`;
  }).join('');
}

/* ── PIUTANG PLANS LIST ── */
function renderPiutangPlansList(piutangs) {
  if (!piutangs.length) return `<div class="empty-state"><div class="empty-icon">🤝</div><p>Belum ada rencana piutang. Tambah di bawah!</p></div>`;
  return piutangs.map(d => {
    const received = (state.debtTransactions || []).filter(t => t.debtId === d.id && t.type === 'piutang').reduce((s, t) => s + t.jumlah, 0);
    const sisa     = Math.max(0, (d.totalPokok || 0) - received);
    const pct      = d.totalPokok > 0 ? Math.min((received / d.totalPokok) * 100, 100) : 0;
    const lunas    = sisa === 0 && d.totalPokok > 0;
    return `
      <div class="debt-plan-item ${lunas ? 'lunas' : ''}">
        <div class="debt-plan-header">
          <div class="debt-plan-info">
            <div class="debt-plan-name">${d.nama}</div>
            <div class="debt-plan-meta">Total ${fmt(d.totalPokok)} · Cicilan ${fmt(d.cicilanPerBulan || 0)}/bln</div>
          </div>
          <div class="debt-plan-pct">${pct.toFixed(0)}%</div>
          <button class="btn-icon-sm danger" onclick="deleteDebtPlan('${d.id}')">🗑️</button>
        </div>
        <div class="progress-track" style="margin-top:0.5rem">
          <div class="progress-fill" style="width:${pct}%;background:${lunas ? '#34d399' : '#38bdf8'};transition:width 0.5s"></div>
        </div>
        <div style="color:var(--text-muted);font-size:0.8rem;margin-top:0.25rem">
          ${lunas ? '🎉 Lunas!' : `Diterima ${fmt(received)} · Sisa ${fmt(sisa)}`}
        </div>
        ${d.catatan ? `<div style="color:var(--text-muted);font-size:0.8rem;margin-top:0.2rem">📝 ${d.catatan}</div>` : ''}
      </div>`;
  }).join('');
}

/* ── FORM RENCANA BARU ── */
function renderDebtPlanForm(type) {
  const isHutang = type === 'hutang';
  const idPrefix = isHutang ? 'dp' : 'pp';
  return `
    <div class="inline-form">
      <p class="form-hint">
        ${isHutang
          ? 'Isi Nama + Pokok + Bunga (jika ada) → Cicilan per Bulan dihitung otomatis. Progress ditampilkan dari total bayar dibagi Pokok+Bunga.'
          : 'Isi nama peminjam + jumlah pokok piutang. Progress dihitung dari total yang sudah diterima.'}
      </p>
      <div class="form-field">
        <label>${isHutang ? 'Nama Hutang' : 'Nama / Peminjam'}</label>
        <input type="text" id="${idPrefix}-nama" placeholder="${isHutang ? 'Misal: Cicilan Laptop' : 'Misal: Pinjaman ke Budi'}">
      </div>
      <div class="form-grid-2">
        <div class="form-field">
          <label>Total Pokok (${state.settings.currency})</label>
          <div class="input-prefix-wrap">
            <span class="input-prefix">${state.settings.currency}</span>
            <input type="text" id="${idPrefix}-pokok" inputmode="numeric" placeholder="0" autocomplete="off">
          </div>
        </div>
        <div class="form-field">
          <label>Bunga Total (${state.settings.currency}, opsional)</label>
          <div class="input-prefix-wrap">
            <span class="input-prefix">${state.settings.currency}</span>
            <input type="text" id="${idPrefix}-bunga" inputmode="numeric" placeholder="0" autocomplete="off">
          </div>
        </div>
        <div class="form-field">
          <label>Cicilan per Bulan (${state.settings.currency}, opsional)</label>
          <div class="input-prefix-wrap">
            <span class="input-prefix">${state.settings.currency}</span>
            <input type="text" id="${idPrefix}-cicilan" inputmode="numeric" placeholder="0" autocomplete="off">
          </div>
        </div>
      </div>
      <div class="form-field">
        <label>Catatan (opsional)</label>
        <textarea id="${idPrefix}-catatan" rows="2" placeholder="Misal: hutang ke kakak, lunas 2025" style="resize:vertical;min-height:60px"></textarea>
      </div>
      <button class="btn btn-primary w-full" id="${idPrefix}-plan-submit">+ Buat Rencana</button>
    </div>
  `;
}

/* ── FORM TAMBAH TRANSAKSI ── */
function renderDebtPayForm(type, plans) {
  const isHutang = type === 'hutang';
  const idPrefix = isHutang ? 'dpt' : 'ppt';
  const today    = new Date().toISOString().split('T')[0];
  const catOptions = isHutang
    ? ['Cicilan Kredit', 'KPR', 'KTA', 'Paylater', 'Cicilan Motor', 'Cicilan HP', 'Lainnya']
    : ['Cicilan Piutang Diterima', 'Pinjaman Dikembalikan', 'Cash/Dampet', 'Transfer', 'Lainnya'];

  return `
    <div class="inline-form">
      <div class="form-grid-2">
        <div class="form-field">
          <label>Tanggal</label>
          <input type="date" id="${idPrefix}-tanggal" value="${today}">
        </div>
        <div class="form-field">
          <label>Kategori</label>
          <select id="${idPrefix}-kategori">
            ${catOptions.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Jumlah (${state.settings.currency})</label>
          <div class="input-prefix-wrap">
            <span class="input-prefix">${state.settings.currency}</span>
            <input type="text" id="${idPrefix}-jumlah" inputmode="numeric" placeholder="0" autocomplete="off">
          </div>
        </div>
        <div class="form-field">
          <label>Rencana ${isHutang ? 'Hutang' : 'Piutang'} (opsional)</label>
          <select id="${idPrefix}-rencana">
            <option value="">— Umum / tidak terkait rencana —</option>
            ${plans.map(d => `<option value="${d.id}">${d.nama}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Bank / Metode</label>
          <select id="${idPrefix}-bank">
            <option>Bank BCA</option><option>Bank Mandiri</option><option>Bank BRI</option>
            <option>GoPay</option><option>OVO</option><option>Tunai</option><option>Lainnya</option>
          </select>
        </div>
      </div>
      <div class="form-field">
        <label>Catatan (opsional)</label>
        <textarea id="${idPrefix}-catatan" rows="2" style="resize:vertical;min-height:60px" placeholder="Opsional…"></textarea>
      </div>
      <button class="btn btn-primary btn-lg w-full" id="${idPrefix}-submit">+ Tambah</button>
    </div>
  `;
}

/* ── INIT FORMS ── */
function initDebtForms() {
  /* Rencana hutang */
  ['dp-pokok','dp-bunga','dp-cicilan'].forEach(initNumberInput);
  const dpBtn = $('dp-plan-submit');
  if (dpBtn) dpBtn.addEventListener('click', () => submitDebtPlan('hutang'));

  /* Bayar hutang */
  initNumberInput('dpt-jumlah');
  const dptBtn = $('dpt-submit');
  if (dptBtn) dptBtn.addEventListener('click', () => submitDebtTx('hutang'));

  /* Rencana piutang */
  ['pp-pokok','pp-bunga','pp-cicilan'].forEach(initNumberInput);
  const ppBtn = $('pp-plan-submit');
  if (ppBtn) ppBtn.addEventListener('click', () => submitDebtPlan('piutang'));

  /* Tambah piutang */
  initNumberInput('ppt-jumlah');
  const pptBtn = $('ppt-submit');
  if (pptBtn) pptBtn.addEventListener('click', () => submitDebtTx('piutang'));
}

function submitDebtPlan(type) {
  const isHutang = type === 'hutang';
  const pref     = isHutang ? 'dp' : 'pp';
  const nama     = $(`${pref}-nama`)?.value.trim();
  const pokok    = getRawValue($(`${pref}-pokok`));
  const bunga    = getRawValue($(`${pref}-bunga`));
  const cicilan  = getRawValue($(`${pref}-cicilan`));
  const catatan  = $(`${pref}-catatan`)?.value.trim();

  if (!nama)     { showToast('Nama wajib diisi', 'error'); return; }
  if (pokok <= 0){ showToast('Total pokok harus lebih dari 0', 'error'); return; }

  if (!state.debts) state.debts = [];
  state.debts.push({
    id: generateId(), nama, totalPokok: pokok, bungaTotal: bunga,
    cicilanPerBulan: cicilan, sisaHutang: pokok + bunga, lunas: false,
    type, catatan,
  });
  saveState();
  showToast(`Rencana ${type} ditambahkan ✅`);
  renderDebtPage();
}

function submitDebtTx(type) {
  const isHutang = type === 'hutang';
  const pref     = isHutang ? 'dpt' : 'ppt';
  const tanggal  = $(`${pref}-tanggal`)?.value;
  const kategori = $(`${pref}-kategori`)?.value;
  const jumlah   = getRawValue($(`${pref}-jumlah`));
  const debtId   = $(`${pref}-rencana`)?.value || null;
  const catatan  = $(`${pref}-catatan`)?.value.trim();

  if (!tanggal)  { showToast('Tanggal wajib diisi', 'error'); return; }
  if (jumlah <= 0){ showToast('Jumlah harus lebih dari 0', 'error'); return; }

  if (!state.debtTransactions) state.debtTransactions = [];
  state.debtTransactions.unshift({
    id: generateId(), debtId, tanggal, jumlah, kategori, catatan, type,
  });

  /* Mark lunas jika sisa = 0 */
  if (debtId && state.debts) {
    const d = state.debts.find(x => x.id === debtId);
    if (d) {
      const sisa = type === 'hutang' ? calcSisaHutang(d) : calcSisaPiutang(d);
      if (sisa <= 0) d.lunas = true;
    }
  }

  saveState();
  showToast(`${isHutang ? 'Bayar hutang' : 'Terima piutang'} dicatat ✅`);
  renderDebtPage();
}

async function deleteDebtPlan(id) {
  const ok = await showConfirm('Hapus Rencana?', 'Rencana ini dan semua transaksinya akan dihapus.');
  if (!ok) return;
  state.debts             = (state.debts || []).filter(d => d.id !== id);
  state.debtTransactions  = (state.debtTransactions || []).filter(t => t.debtId !== id);
  saveState();
  showToast('Rencana dihapus', 'info');
  renderDebtPage();
}
window.deleteDebtPlan = deleteDebtPlan;

/* ── CHARTS ── */
function renderDebtCharts(hutangs, piutangs) {
  const themeC = getThemeColors();
  const colors = [themeC[3], themeC[1], themeC[2], themeC[4], themeC[0], themeC[5]];

  /* Donut hutang */
  const dCtx = $('debt-donut-chart');
  if (dCtx) {
    if (debtDonutChart) debtDonutChart.destroy();
    const dLabels = hutangs.map(d => d.nama);
    const dVals   = hutangs.map(d => {
      return (state.debtTransactions || [])
        .filter(t => t.debtId === d.id && t.type === 'hutang')
        .reduce((s, t) => s + t.jumlah, 0);
    });
    if (dLabels.length > 0) {
      debtDonutChart = new Chart(dCtx, {
        type: 'doughnut',
        data: {
          labels: dLabels,
          datasets: [{ data: dVals, backgroundColor: colors.slice(0, dLabels.length), borderWidth: 2, borderColor: 'transparent', hoverOffset: 6 }],
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
    const dLegend = $('debt-donut-legend');
    if (dLegend) {
      dLegend.innerHTML = dLabels.length
        ? dLabels.map((l, i) => `
            <div class="donut-legend-item">
              <span class="donut-legend-dot" style="background:${colors[i % colors.length]}"></span>
              <span class="donut-legend-label">${l}</span>
              <span class="donut-legend-val">${fmt(dVals[i])}</span>
            </div>`).join('')
        : '<div class="empty-state" style="padding:1rem"><p>Belum ada data hutang</p></div>';
    }
  }

  /* Donut piutang */
  const pCtx = $('piutang-donut-chart');
  if (pCtx) {
    if (piutangDonutChart) piutangDonutChart.destroy();
    const pLabels = piutangs.map(d => d.nama);
    const pVals   = piutangs.map(d => {
      return (state.debtTransactions || [])
        .filter(t => t.debtId === d.id && t.type === 'piutang')
        .reduce((s, t) => s + t.jumlah, 0);
    });
    if (pLabels.length > 0) {
      piutangDonutChart = new Chart(pCtx, {
        type: 'doughnut',
        data: {
          labels: pLabels,
          datasets: [{ data: pVals, backgroundColor: ['#38bdf8','#34d399','#c084fc','#fbbf24','#f472b6'].slice(0, pLabels.length), borderWidth: 2, borderColor: 'transparent', hoverOffset: 6 }],
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
    const pLegend = $('piutang-donut-legend');
    if (pLegend) {
      pLegend.innerHTML = pLabels.length
        ? pLabels.map((l, i) => `
            <div class="donut-legend-item">
              <span class="donut-legend-dot" style="background:${['#38bdf8','#34d399','#c084fc','#fbbf24','#f472b6'][i % 5]}"></span>
              <span class="donut-legend-label">${l}</span>
              <span class="donut-legend-val">${fmt(pVals[i])}</span>
            </div>`).join('')
        : '<div class="empty-state" style="padding:1rem"><p>Belum ada data piutang</p></div>';
    }
  }
}

/* ── HISTORY GABUNGAN ── */
function renderDebtHistory(debts) {
  const list = $('debt-history-list'); if (!list) return;
  const allTxs = [...(state.debtTransactions || [])]
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
    .slice(0, 30);

  if (!allTxs.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada riwayat hutang & piutang</p></div>`;
    return;
  }

  list.innerHTML = allTxs.map(t => {
    const plan     = (state.debts || []).find(d => d.id === t.debtId);
    const isHutang = t.type === 'hutang';
    return `
      <div class="history-item" id="debthist-${t.id}">
        <div class="history-item-main" onclick="toggleDebtDetail('${t.id}')">
          <div class="history-item-icon" style="background:${isHutang ? 'rgba(251,146,60,0.15)' : 'rgba(56,189,248,0.15)'};color:${isHutang ? '#fb923c' : '#38bdf8'}">
            ${isHutang ? '💳' : '🤝'}
          </div>
          <div class="history-item-body">
            <div class="history-item-desc">${t.kategori || (isHutang ? 'Bayar Hutang' : 'Terima Piutang')}</div>
            <div class="history-item-cat">${plan ? plan.nama : '—'} · ${isHutang ? 'Hutang' : 'Piutang'}</div>
          </div>
          <div class="history-item-amt ${isHutang ? 'expense' : 'income'}">
            ${isHutang ? '-' : '+'}${fmt(t.jumlah)}
          </div>
        </div>
        <div class="history-item-detail hidden" id="debtdetail-${t.id}">
          <div class="detail-grid">
            <span class="detail-label">Jenis Catatan</span><span>${isHutang ? 'Hutang' : 'Piutang'}</span>
            <span class="detail-label">Kategori</span><span>${t.kategori || '—'}</span>
            <span class="detail-label">Rencana</span><span>${plan ? plan.nama : '—'}</span>
            <span class="detail-label">Tanggal</span><span>${fmtDate(t.tanggal)}</span>
            <span class="detail-label">Jumlah</span><span>${fmt(t.jumlah)}</span>
            ${t.catatan ? `<span class="detail-label">Catatan</span><span>${t.catatan}</span>` : ''}
          </div>
          <div class="detail-actions">
            <button class="btn btn-ghost btn-sm danger" onclick="deleteDebtTx('${t.id}')">🗑️ Hapus Catatan</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleDebtDetail(id) {
  const el = $(`debtdetail-${id}`);
  if (el) el.classList.toggle('hidden');
}
window.toggleDebtDetail = toggleDebtDetail;

async function deleteDebtTx(id) {
  const ok = await showConfirm('Hapus Catatan?', 'Catatan ini akan dihapus permanen.');
  if (!ok) return;
  state.debtTransactions = (state.debtTransactions || []).filter(t => t.id !== id);
  saveState();
  showToast('Catatan dihapus', 'info');
  renderDebtPage();
}
window.deleteDebtTx = deleteDebtTx;
