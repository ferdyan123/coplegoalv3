/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — INIT.JS
   Bootstrap, DOMContentLoaded, initApp
   ═══════════════════════════════════════════════════════════ */

function initApp() {
  updateSidebarCouple();

  /* Number inputs */
  ['tx-amount','bm-amount','goal-target','goal-saved','split-amount'].forEach(initNumberInput);

  /* Sidebar overlay */
  sidebarOverlay = document.createElement('div');
  sidebarOverlay.className = 'sidebar-overlay';
  document.body.appendChild(sidebarOverlay);
  sidebarOverlay.addEventListener('click', () => {
    $('sidebar').classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });

  /* Month picker di dashboard */
  const dashMonthPicker = $('dash-month-picker');
  if (dashMonthPicker) {
    dashMonthPicker.value = state.settings.month || '';
    dashMonthPicker.addEventListener('change', () => {
      state.settings.month = dashMonthPicker.value;
      const badge = $('sidebar-month-badge');
      if (badge) badge.textContent = monthLabel(state.settings.month);
      const greetMonth = $('dash-greeting-month');
      if (greetMonth) greetMonth.textContent = monthLabel(state.settings.month) || '—';
      const dashLabel = $('dash-month-label');
      if (dashLabel) dashLabel.textContent = monthLabel(state.settings.month);
      saveState();
      renderDashboard();
    });
  }

  /* Nav items */
  $$('.nav-item').forEach(btn =>
    btn.addEventListener('click', () => navigateTo(btn.dataset.page)));

  /* Mobile menu */
  $('menu-toggle')?.addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
    sidebarOverlay.classList.toggle('show');
  });

  /* Settings, export, data management */
  initSettingsListeners();

  /* Goals listeners */
  initGoalsListeners();

  /* Split listeners */
  initSplitListeners();

  /* Theme */
  /* Migrasi tema lama */
  if (!state.settings.theme || state.settings.theme === 'light' || state.settings.theme === 'sakura') {
    state.settings.theme = 'dark';
  }
  applyTheme(state.settings.theme);

  navigateTo('dashboard');
}

/* ══════════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { createClient } = window.supabase;
    sbClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    console.error('Supabase gagal load:', e);
  }

  initAuthTabs();
  initAllListeners();

  const isInvite = await checkInviteLink();
  if (isInvite) return;

  const restored = await restoreSession();
  if (!restored) {
    $('auth-screen').classList.remove('hidden');
  }
});
