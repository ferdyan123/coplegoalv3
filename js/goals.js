/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — GOALS.JS
   Savings Goals page (existing feature, preserved)
   ═══════════════════════════════════════════════════════════ */

function renderGoalsPage() {
  const goals = state.goals || [];
  if (!goals.length) {
    $('goals-grid').innerHTML = `<div class="goal-empty"><div class="goal-empty-icon">🎯</div><p>Belum ada savings goal.<br>Tambah goal pertama kalian!</p></div>`;
    return;
  }
  $('goals-grid').innerHTML = goals.map(g => {
    const pct       = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
    const remaining = Math.max(0, g.target - g.saved);
    const deadline  = g.deadline ? fmtDate(g.deadline) : '—';
    const monthlyAvg = calcBudget('savings') + calcBudget('investments');
    const estMonths  = monthlyAvg > 0 && remaining > 0 ? Math.ceil(remaining / monthlyAvg) : null;
    return `<div class="goal-card">
      <div class="goal-header">
        <div class="goal-icon-wrap">${g.icon || '🎯'}</div>
        <div class="goal-actions">
          <button class="goal-action-btn" onclick="openEditGoal('${g.id}')" title="Edit">✏️</button>
          <button class="goal-action-btn" onclick="deleteGoal('${g.id}')" title="Hapus">🗑️</button>
        </div>
      </div>
      <div class="goal-name">${g.name}</div>
      <div class="goal-deadline">🗓️ Target: ${deadline}</div>
      <div class="goal-amounts">
        <div class="goal-saved">${fmt(g.saved)}</div>
        <div class="goal-target">dari ${fmt(g.target)}</div>
      </div>
      <div class="goal-progress-track">
        <div class="goal-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="goal-footer">
        <span class="goal-pct">${pct.toFixed(0)}% tercapai</span>
        <span>${estMonths ? `~${estMonths} bln lagi` : remaining > 0 ? fmt(remaining) + ' lagi' : '🎉 Tercapai!'}</span>
      </div>
    </div>`;
  }).join('');
}

function openAddGoal() {
  $('goal-modal-title').textContent = 'Tambah Goal';
  $('goal-edit-id').value   = '';
  $('goal-name').value      = '';
  $('goal-target').value    = '';
  $('goal-saved').value     = '';
  $('goal-deadline').value  = '';
  $('goal-icon').value      = '';
  $('goal-currency').textContent  = state.settings.currency;
  $('goal-currency2').textContent = state.settings.currency;
  $('goal-modal').classList.remove('hidden');
  setTimeout(() => $('goal-name').focus(), 100);
}
window.openAddGoal = openAddGoal;

function openEditGoal(id) {
  const g = (state.goals || []).find(g => g.id === id);
  if (!g) return;
  $('goal-modal-title').textContent = 'Edit Goal';
  $('goal-edit-id').value   = g.id;
  $('goal-name').value      = g.name;
  $('goal-target').value    = g.target ? parseInt(g.target).toLocaleString('id-ID') : '';
  $('goal-target').dataset.rawValue = String(g.target || 0);
  $('goal-saved').value     = g.saved ? parseInt(g.saved).toLocaleString('id-ID') : '';
  $('goal-saved').dataset.rawValue  = String(g.saved || 0);
  $('goal-deadline').value  = g.deadline || '';
  $('goal-icon').value      = g.icon || '';
  $('goal-currency').textContent  = state.settings.currency;
  $('goal-currency2').textContent = state.settings.currency;
  $('goal-modal').classList.remove('hidden');
}
window.openEditGoal = openEditGoal;

async function deleteGoal(id) {
  const ok = await showConfirm('Hapus Goal?', 'Goal ini akan dihapus permanen.');
  if (!ok) return;
  state.goals = (state.goals || []).filter(g => g.id !== id);
  saveState();
  renderGoalsPage();
  showToast('Goal dihapus', 'info');
}
window.deleteGoal = deleteGoal;

function initGoalsListeners() {
  $('add-goal-btn')?.addEventListener('click', openAddGoal);

  $('goal-save')?.addEventListener('click', () => {
    const name     = $('goal-name').value.trim();
    const target   = getRawValue($('goal-target'));
    const saved    = getRawValue($('goal-saved'));
    const deadline = $('goal-deadline').value;
    const icon     = $('goal-icon').value.trim() || '🎯';
    const editId   = $('goal-edit-id').value;
    if (!name || target <= 0) { showToast('Nama dan target wajib diisi', 'error'); return; }

    if (!state.goals) state.goals = [];
    if (editId) {
      const idx = state.goals.findIndex(g => g.id === editId);
      if (idx >= 0) state.goals[idx] = { ...state.goals[idx], name, target, saved, deadline, icon };
      showToast('Goal diperbarui ✅');
    } else {
      state.goals.push({ id: generateId(), name, target, saved, deadline, icon });
      showToast('Goal ditambahkan ✅');
    }
    saveState();
    $('goal-modal').classList.add('hidden');
    renderGoalsPage();
  });

  $('goal-modal-close')?.addEventListener('click', () => $('goal-modal').classList.add('hidden'));
  $('goal-cancel')?.addEventListener('click',       () => $('goal-modal').classList.add('hidden'));
}
