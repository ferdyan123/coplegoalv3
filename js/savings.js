/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — SAVINGS.JS
   Tab Tabungan — goals, setor/tarik, chart, riwayat
   ═══════════════════════════════════════════════════════════ */

let savingsDonutChart = null;

function getSavingsTxs() {
  const month = state.settings.month;
  return state.transactions.filter(t =>
    t.type === 'savings' && t.date && t.date.substring(0, 7) === month
  );
}

/* ══════════════════════════════════════════
   MAIN RENDER
══════════════════════════════════════════ */
function renderSavingsPage() {
  const s    = state.settings;
  const month = s.month;
  const txs   = getSavingsTxs();
  const goals = state.goals || [];

  const nabungBersih = txs.filter(t => t.jenis !== 'tarik').reduce((s, t) => s + t.amount, 0);
  const ditarik      = txs.filter(t => t.jenis === 'tarik').reduce((s, t) => s + t.amount, 0);
  const totalTabungan = goals.reduce((s, g) => s + (g.saved || 0), 0);
  const totalTarget   = goals.reduce((s, g) => s + (g.target || 0), 0);

  /* Target nabung bulan ini = sum budgetItems savings */
  const targetBulanIni = calcBudget('savings');

  const el = $('page-savings'); if (!el) return;
  el.innerHTML = `
    <div class="summary-cards-grid">
      ${summaryCard('Nabung Bersih', fmt(nabungBersih), targetBulanIni > 0 ? `${Math.round((nabungBersih/targetBulanIni)*100)}%` : '—', nabungBersih >= targetBulanIni && targetBulanIni > 0 ? 'up' : '', monthLabel(month))}
      ${summaryCard('Ditarik', fmt(ditarik), ditarik > 0 ? '▼' : '—', ditarik > 0 ? 'down' : '', 'bulan ini')}
      ${summaryCard('Total Tabungan', fmt(totalTabungan), '', '', `${goals.length} tujuan`)}
      ${summaryCard('Total Target', fmt(totalTarget), '', '', '')}
    </div>
    <div class="tab-page-grid">
      <!-- Half: Target + Goals list -->
      <div class="glass-card section-card">
        <div class="section-header-row">
          <h2 class="section-title">Target Bulan Ini</h2>
          <button class="btn btn-ghost btn-sm" onclick="openGoalTargetSettings()">⚙️</button>
        </div>
        ${renderSavingsTargetBar(nabungBersih, targetBulanIni)}
        <h2 class="section-title" style="margin-top:1rem">Tujuan Tabungan</h2>
        <div id="savings-goals-list">${renderSavingsGoalsList(goals)}</div>
      </div>
      <!-- Half: Donut chart -->
      <div class="glass-card section-card">
        <h2 class="section-title">Tabungan per Tujuan</h2>
        <canvas id="savings-donut-chart" height="200"></canvas>
        <div id="savings-donut-legend" class="donut-legend" style="margin-top:0.75rem"></div>
      </div>
      <!-- Half: Form Tujuan Baru -->
      <div class="glass-card section-card">
        <h2 class="section-title">+ Tujuan Baru</h2>
        ${renderNewGoalForm(s)}
      </div>
      <!-- Half: Form Catat -->
      <div class="glass-card section-card" id="savings-form-card">
        <h2 class="section-title">Catat Tabungan</h2>
        ${renderSavingsForm(s, goals)}
      </div>
      <!-- Full: Riwayat -->
      <div class="glass-card section-card tab-full-width">
        <h2 class="section-title">Riwayat Tabungan Bulan Ini</h2>
        <div id="savings-history-list"></div>
      </div>
    </div>
  `;

  renderSavingsCharts(txs);
  renderSavingsHistory(txs, s);
  initSavingsForm();
  initNewGoalForm();
}

function renderSavingsTargetBar(actual, target) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const reached = actual >= target && target > 0;
  return `
    <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
      <span>Nabung Bersih</span>
      <span style="color:var(--text-muted)">${fmt(actual)} / ${fmt(target)}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" style="width:${pct}%;background:#38bdf8;transition:width 0.5s"></div>
    </div>
    ${reached ? '<div style="color:#34d399;margin-top:0.4rem;font-size:0.875rem">🎉 Target nabung bulan ini tercapai!</div>' : ''}
  `;
}

function renderSavingsGoalsList(goals) {
  if (!goals.length) return `<div class="empty-state"><div class="empty-icon">🎯</div><p>Belum ada tujuan tabungan. Tambah di bawah!</p></div>`;
  return goals.map(g => {
    const pct = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
    return `
      <div class="savings-goal-item">
        <div class="savings-goal-header">
          <div class="savings-goal-icon">${g.icon || '🎯'}</div>
          <div class="savings-goal-info">
            <div class="savings-goal-name">${g.name}</div>
            <div class="savings-goal-target">Target ${fmt(g.target)}</div>
          </div>
          <div class="savings-goal-pct">${pct.toFixed(0)}%</div>
          <button class="btn-icon-sm danger" onclick="deleteSavingsGoal('${g.id}')">🗑️</button>
        </div>
        <div class="progress-track" style="margin-top:0.5rem">
          <div class="progress-fill" style="width:${pct}%;background:#38bdf8;transition:width 0.5s"></div>
        </div>
        <div style="color:var(--text-muted);font-size:0.8rem;margin-top:0.25rem">Terkumpul ${fmt(g.saved || 0)}</div>
      </div>`;
  }).join('');
}

function renderNewGoalForm(s) {
  return `
    <div class="inline-form">
      <div class="form-field">
        <label>Nama Tujuan</label>
        <input type="text" id="sav-goal-name" placeholder="Misal: Dana Darurat">
      </div>
      <div class="form-field">
        <label>Target (${s.currency})</label>
        <div class="input-prefix-wrap">
          <span class="input-prefix">${s.currency}</span>
          <input type="text" id="sav-goal-target" inputmode="numeric" placeholder="0" autocomplete="off">
        </div>
      </div>
      <button class="btn btn-primary w-full" id="sav-goal-submit">Tambah Tujuan</button>
    </div>
  `;
}

function renderSavingsForm(s, goals) {
  const today = new Date().toISOString().split('T')[0];
  return `
    <div class="inline-form">
      <div class="form-grid-2">
        <div class="form-field">
          <label>Jenis</label>
          <select id="sav-jenis">
            <option value="setor">💰 Setor (nabung)</option>
            <option value="tarik">💸 Tarik</option>
          </select>
        </div>
        <div class="form-field">
          <label>Tujuan</label>
          <select id="sav-goal-id">
            <option value="">— Umum / Tidak terkait tujuan —</option>
            ${goals.map(g => `<option value="${g.id}">${g.icon || '🎯'} ${g.name} (${fmt(g.saved||0)} / ${fmt(g.target)})</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Tanggal</label>
          <input type="date" id="sav-date" value="${today}">
        </div>
        <div class="form-field">
          <label>Jumlah (${s.currency})</label>
          <div class="input-prefix-wrap">
            <span class="input-prefix">${s.currency}</span>
            <input type="text" id="sav-amount" inputmode="numeric" placeholder="0" autocomplete="off">
          </div>
        </div>
        <div class="form-field">
          <label>Dari Bank</label>
          <select id="sav-bank">
            <option>Bank BCA</option><option>Bank Mandiri</option><option>Bank BRI</option>
            <option>GoPay</option><option>OVO</option><option>Tunai</option><option>Lainnya</option>
          </select>
        </div>
      </div>
      <div class="form-field">
        <label>Catatan (opsional)</label>
        <textarea id="sav-catatan" rows="2" placeholder="Misal: dana darurat kepakai buat servis motor" style="resize:vertical;min-height:60px"></textarea>
      </div>
      <button class="btn btn-primary btn-lg w-full" id="sav-submit-btn">+ Tambah</button>
    </div>
  `;
}

function initSavingsForm() {
  initNumberInput('sav-amount');
  const btn = $('sav-submit-btn');
  if (btn) btn.addEventListener('click', submitSavings);
}

function initNewGoalForm() {
  initNumberInput('sav-goal-target');
  const btn = $('sav-goal-submit');
  if (btn) btn.addEventListener('click', submitNewGoal);
}

function submitNewGoal() {
  const name   = $('sav-goal-name')?.value.trim();
  const target = getRawValue($('sav-goal-target'));
  if (!name)      { showToast('Nama tujuan wajib diisi', 'error'); return; }
  if (target <= 0){ showToast('Target harus lebih dari 0', 'error'); return; }
  if (!state.goals) state.goals = [];
  state.goals.push({ id: generateId(), name, target, saved: 0, icon: '🎯' });
  saveState();
  showToast(`Tujuan "${name}" ditambahkan ✅`);
  renderSavingsPage();
}

function submitSavings() {
  const jenis   = $('sav-jenis').value;
  const goalId  = $('sav-goal-id').value;
  const date    = $('sav-date').value;
  const amount  = getRawValue($('sav-amount'));
  const catatan = $('sav-catatan')?.value.trim();

  if (!date)      { showToast('Tanggal wajib diisi', 'error'); return; }
  if (amount <= 0){ showToast('Jumlah harus lebih dari 0', 'error'); return; }

  const tx = {
    id: generateId(), date, type: 'savings', assignee: 'shared',
    description: jenis === 'tarik' ? 'Penarikan Tabungan' : 'Setor Tabungan',
    amount, category: 'Tabungan', jenis, catatan, goalId: goalId || null, budgetItemId: null,
  };
  state.transactions.unshift(tx);

  /* Update goal.saved jika terkait tujuan */
  if (goalId && state.goals) {
    const g = state.goals.find(g => g.id === goalId);
    if (g) {
      if (jenis === 'tarik') g.saved = Math.max(0, (g.saved || 0) - amount);
      else                   g.saved = (g.saved || 0) + amount;
    }
  }

  saveState();
  showToast(jenis === 'tarik' ? 'Penarikan dicatat ✅' : 'Tabungan dicatat ✅');
  renderSavingsPage();
}

async function deleteSavingsGoal(id) {
  const ok = await showConfirm('Hapus Tujuan?', 'Tujuan tabungan ini akan dihapus.');
  if (!ok) return;
  state.goals = (state.goals || []).filter(g => g.id !== id);
  saveState();
  showToast('Tujuan dihapus', 'info');
  renderSavingsPage();
}
window.deleteSavingsGoal = deleteSavingsGoal;

function openGoalTargetSettings() {
  showToast('Atur target di halaman Savings Goals ✅', 'info');
}
window.openGoalTargetSettings = openGoalTargetSettings;

/* ── CHARTS ── */
function renderSavingsCharts(txs) {
  /* Donut per tujuan */
  const goals  = state.goals || [];
  const goalMap = {};
  txs.filter(t => t.goalId && t.jenis !== 'tarik').forEach(t => {
    goalMap[t.goalId] = (goalMap[t.goalId] || 0) + t.amount;
  });
  const hasGeneral = txs.filter(t => !t.goalId && t.jenis !== 'tarik').reduce((s, t) => s + t.amount, 0);
  if (hasGeneral > 0) goalMap['__general__'] = hasGeneral;

  const catLabels = Object.keys(goalMap).map(id => {
    if (id === '__general__') return 'Umum';
    const g = goals.find(g => g.id === id);
    return g ? g.name : '—';
  });
  const catVals = Object.values(goalMap);
  const themeC = getThemeColors();
  const colors = [themeC[0], themeC[1], themeC[2], themeC[3], themeC[4], themeC[5]];

  const donutCtx = $('savings-donut-chart');
  if (donutCtx) {
    if (savingsDonutChart) savingsDonutChart.destroy();
    if (catVals.length > 0) {
      savingsDonutChart = new Chart(donutCtx, {
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

  const legend = $('savings-donut-legend');
  if (legend) {
    legend.innerHTML = catLabels.length
      ? catLabels.map((l, i) => `
          <div class="donut-legend-item">
            <span class="donut-legend-dot" style="background:${colors[i % colors.length]}"></span>
            <span class="donut-legend-label">${l}</span>
            <span class="donut-legend-val">${fmt(catVals[i])}</span>
          </div>`).join('')
      : '<div class="empty-state"><p>Belum ada tabungan bulan ini</p></div>';
  }
}

/* ── HISTORY ── */
function renderSavingsHistory(txs, s) {
  const list = $('savings-history-list'); if (!list) return;
  const sorted = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!sorted.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada catatan tabungan bulan ini</p></div>`;
    return;
  }

  list.innerHTML = sorted.map(t => {
    const goal    = (state.goals || []).find(g => g.id === t.goalId);
    const isTarik = t.jenis === 'tarik';
    return `
      <div class="history-item" id="savhist-${t.id}">
        <div class="history-item-main" onclick="toggleSavingsDetail('${t.id}')">
          <div class="history-item-icon" style="background:rgba(56,189,248,0.15);color:#38bdf8">${isTarik ? '💸' : '💰'}</div>
          <div class="history-item-body">
            <div class="history-item-desc">${goal ? `${goal.icon || '🎯'} ${goal.name}` : 'Tabungan Umum'}</div>
            <div class="history-item-cat">${isTarik ? 'Penarikan' : 'Setoran'} · ${fmtDate(t.date)}</div>
          </div>
          <div class="history-item-amt ${isTarik ? 'expense' : 'income'}">${isTarik ? '-' : '+'}${fmt(t.amount)}</div>
        </div>
        <div class="history-item-detail hidden" id="savdetail-${t.id}">
          <div class="detail-grid">
            <span class="detail-label">Tujuan</span><span>${goal ? goal.name : 'Umum'}</span>
            <span class="detail-label">Jenis</span><span>${isTarik ? 'Penarikan' : 'Setoran'}</span>
            <span class="detail-label">Bank / Metode</span><span>${t.bank || '—'}</span>
            <span class="detail-label">Catatan (opsional)</span><span>${t.catatan || '—'}</span>
          </div>
          <div class="detail-actions">
            <button class="btn btn-ghost btn-sm" onclick="editSavingsTx('${t.id}')">✏️ Edit</button>
            <button class="btn btn-ghost btn-sm danger" onclick="deleteSavingsTx('${t.id}')">🗑️ Hapus Catatan</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleSavingsDetail(id) {
  const el = $(`savdetail-${id}`);
  if (el) el.classList.toggle('hidden');
}
window.toggleSavingsDetail = toggleSavingsDetail;

async function deleteSavingsTx(id) {
  const t  = state.transactions.find(x => x.id === id);
  const ok = await showConfirm('Hapus Catatan?', 'Catatan tabungan ini akan dihapus.');
  if (!ok) return;

  /* Rollback goal.saved */
  if (t && t.goalId && state.goals) {
    const g = state.goals.find(g => g.id === t.goalId);
    if (g) {
      if (t.jenis === 'tarik') g.saved = (g.saved || 0) + t.amount;
      else                     g.saved = Math.max(0, (g.saved || 0) - t.amount);
    }
  }

  state.transactions = state.transactions.filter(x => x.id !== id);
  saveState();
  showToast('Catatan dihapus', 'info');
  renderSavingsPage();
}
window.deleteSavingsTx = deleteSavingsTx;

function editSavingsTx(id) {
  const t = state.transactions.find(x => x.id === id);
  if (!t) return;
  const jenEl  = $('sav-jenis');   if (jenEl)   jenEl.value  = t.jenis || 'setor';
  const goalEl = $('sav-goal-id'); if (goalEl)  goalEl.value = t.goalId || '';
  const dateEl = $('sav-date');    if (dateEl)  dateEl.value = t.date || '';
  const amtEl  = $('sav-amount');
  if (amtEl) { amtEl.value = t.amount ? parseInt(t.amount).toLocaleString('id-ID') : ''; amtEl.dataset.rawValue = String(t.amount || 0); }
  const catEl  = $('sav-catatan'); if (catEl)   catEl.value  = t.catatan || '';

  const btn = $('sav-submit-btn');
  if (btn) {
    btn.textContent = '💾 Update Tabungan';
    btn.onclick = () => {
      t.jenis   = $('sav-jenis').value;
      t.goalId  = $('sav-goal-id').value || null;
      t.date    = $('sav-date').value;
      t.amount  = getRawValue($('sav-amount'));
      t.catatan = $('sav-catatan')?.value.trim();
      saveState();
      showToast('Tabungan diperbarui ✅');
      renderSavingsPage();
    };
  }
  $('savings-form-card')?.scrollIntoView({ behavior: 'smooth' });
}
window.editSavingsTx = editSavingsTx;
