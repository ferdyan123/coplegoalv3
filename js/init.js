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

  /* ── Legacy sidebar nav ── */
  $$('.nav-item').forEach(btn =>
    btn.addEventListener('click', () => navigateTo(btn.dataset.page)));

  /* ── Topbar nav tabs ── */
  $$('.topbar-tab[data-page]').forEach(btn =>
    btn.addEventListener('click', () => navigateTo(btn.dataset.page)));

  /* ── Topbar logo → dashboard ── */
  $('topbar-logo-btn')?.addEventListener('click', () => navigateTo('dashboard'));

  /* ── Anggaran dropdown (topbar desktop) ──
     Dipindahkan ke <body> langsung agar bebas dari CSS mask & overflow clip
     yang ada di .topbar-nav-wrap. Position: fixed + koordinat dari JS.       */
  const anggaranBtn  = $('tnav-anggaran');
  const anggaranDrop = $('anggaran-dropdown');
  if (anggaranBtn && anggaranDrop) {
    // Pindahkan elemen dropdown ke body agar tidak ter-clip mask parent
    document.body.appendChild(anggaranDrop);

    function positionAnggaranDrop() {
      const rect = anggaranBtn.getBoundingClientRect();
      anggaranDrop.style.top  = (rect.bottom + 6) + 'px';
      anggaranDrop.style.left = rect.left + 'px';
    }

    function openAnggaranDrop() {
      positionAnggaranDrop();
      anggaranDrop.classList.add('open');
      anggaranBtn.setAttribute('aria-expanded', 'true');
    }

    function closeAnggaranDrop() {
      anggaranDrop.classList.remove('open');
      anggaranBtn.setAttribute('aria-expanded', 'false');
    }

    anggaranBtn.addEventListener('click', e => {
      e.stopPropagation();
      anggaranDrop.classList.contains('open') ? closeAnggaranDrop() : openAnggaranDrop();
    });

    anggaranDrop.querySelectorAll('.topbar-dropdown-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        navigateTo(item.dataset.page);
        closeAnggaranDrop();
      });
    });

    document.addEventListener('click', e => {
      if (!anggaranBtn.contains(e.target) && !anggaranDrop.contains(e.target)) {
        closeAnggaranDrop();
      }
    });

    window.addEventListener('resize', () => {
      if (anggaranDrop.classList.contains('open')) positionAnggaranDrop();
    }, { passive: true });
  }

  /* ── Bottom nav ── */
  $$('.bottom-tab[data-page]').forEach(btn =>
    btn.addEventListener('click', () => navigateTo(btn.dataset.page)));

  $('bnav-add')?.addEventListener('click', () => openAddTransaction());

  function openSheet(sheetId, overlayId) {
    $(sheetId)?.classList.add('open');
    $(overlayId)?.classList.add('show');
  }
  function closeSheet(sheetId, overlayId) {
    $(sheetId)?.classList.remove('open');
    $(overlayId)?.classList.remove('show');
  }

  /* Bottom tab Anggaran → sheet */
  $('bnav-anggaran-trigger')?.addEventListener('click', () => openSheet('anggaran-sheet', 'anggaran-sheet-overlay'));
  $('anggaran-sheet-overlay')?.addEventListener('click', () => closeSheet('anggaran-sheet', 'anggaran-sheet-overlay'));
  $$('#anggaran-sheet .bottom-sheet-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.page);
      closeSheet('anggaran-sheet', 'anggaran-sheet-overlay');
    });
  });

  /* Bottom tab Lainnya → sheet */
  $('bnav-more')?.addEventListener('click', () => openSheet('more-sheet', 'more-sheet-overlay'));
  $('more-sheet-overlay')?.addEventListener('click', () => closeSheet('more-sheet', 'more-sheet-overlay'));
  $$('#more-sheet .bottom-sheet-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.page);
      closeSheet('more-sheet', 'more-sheet-overlay');
    });
  });

  $('bsheet-settings')?.addEventListener('click', () => {
    openSettings();
    closeSheet('more-sheet', 'more-sheet-overlay');
  });

  $('bsheet-theme')?.addEventListener('click', () => {
    toggleTheme();
    const label = $('bsheet-theme-label');
    if (label) {
      const icons = { dark:'🖤 Drako', yuki:'❄️ Yuki', rose:'🩷 Pupi', ocean:'🌊 Ocean' };
      label.textContent = icons[state.settings.theme] || 'Tema';
    }
  });

  /* ── Mobile hamburger (sidebar legacy) ── */
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
