/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — SPLIT.JS
   Split Calculator (existing feature, preserved)
   ═══════════════════════════════════════════════════════════ */

function renderSplitPage() {
  const s = state.settings;
  $('split-currency').textContent  = s.currency;
  $('split-label-p1').textContent  = s.name1 || 'Pasangan 1';
  $('split-label-p2').textContent  = s.name2 || 'Pasangan 2';
  renderSplitHistory();
}

function renderSplitHistory() {
  const list    = $('split-history-list');
  const history = state.splitHistory || [];
  if (!history.length) {
    list.innerHTML = `<div class="split-history-empty">Belum ada riwayat split</div>`;
    return;
  }
  list.innerHTML = history.slice(0, 10).map(h => `
    <div class="split-history-item">
      <div>
        <div class="split-history-desc">${h.desc}</div>
        <div class="split-history-meta">${fmtDate(h.date)} · ${h.ratio}/${100 - h.ratio}</div>
      </div>
      <div class="split-history-total">${fmt(h.total)}</div>
    </div>`).join('');
}

function initSplitListeners() {
  $('split-ratio')?.addEventListener('input', () => {
    const v = $('split-ratio').value;
    $('split-ratio-display').textContent = `${v} : ${100 - v}`;
    $$('.preset-btn').forEach(b => b.classList.toggle('active', b.dataset.val === v));
  });

  $$('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('split-ratio').value = btn.dataset.val;
      $('split-ratio').dispatchEvent(new Event('input'));
    });
  });

  $('calc-split-btn')?.addEventListener('click', () => {
    const desc   = $('split-desc').value.trim();
    const total  = getRawValue($('split-amount'));
    const ratio  = parseInt($('split-ratio').value);
    const name1  = state.settings.name1 || 'P1';
    const name2  = state.settings.name2 || 'P2';

    if (total <= 0) { showToast('Masukkan jumlah yang valid', 'error'); return; }

    const amt1 = Math.round(total * (ratio / 100));
    const amt2 = total - amt1;

    $('split-result').classList.remove('hidden');
    $('split-result').innerHTML = `
      <div class="split-result-card">
        <div class="split-result-row">
          <span class="split-result-name">${name1}</span>
          <span class="split-result-amt">${fmt(amt1)}</span>
          <span class="split-result-pct">${ratio}%</span>
        </div>
        <div class="split-result-row">
          <span class="split-result-name">${name2}</span>
          <span class="split-result-amt">${fmt(amt2)}</span>
          <span class="split-result-pct">${100 - ratio}%</span>
        </div>
        <div class="split-result-divider"></div>
        <div class="split-total-row">
          <span>Total</span>
          <span class="split-total-val">${fmt(total)}</span>
        </div>
      </div>`;

    if (!state.splitHistory) state.splitHistory = [];
    state.splitHistory.unshift({
      id: generateId(),
      desc: desc || 'Pengeluaran',
      total, ratio, amt1, amt2, name1, name2,
      date: new Date().toISOString().split('T')[0],
    });
    if (state.splitHistory.length > 20) state.splitHistory = state.splitHistory.slice(0, 20);
    saveState();
    renderSplitHistory();
    showToast('Kalkulasi disimpan ✅');
  });
}
