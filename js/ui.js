/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — UI.JS
   Toast, Confirm, Theme, Navigation, Sidebar, renderPage
   ═══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
let toastContainer;
function showToast(msg, type = 'success', dur = 2800) {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  t.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(40px)';
    t.style.transition = '0.3s';
    setTimeout(() => t.remove(), 300);
  }, dur);
}

/* ══════════════════════════════════════════
   CONFIRM DIALOG
══════════════════════════════════════════ */
let confirmResolve = null;
function showConfirm(title, message) {
  return new Promise(resolve => {
    $('confirm-title').textContent   = title;
    $('confirm-message').textContent = message;
    $('confirm-modal').classList.remove('hidden');
    confirmResolve = resolve;
    setTimeout(() => $('confirm-ok').focus(), 100);
  });
}
/* confirm listeners are wired in initAllListeners() via settings.js */

/* ══════════════════════════════════════════
   THEME
══════════════════════════════════════════ */
function applyTheme(theme) {
  /* Migrasi tema lama → baru */
  if (theme === 'light' || theme === 'sakura') theme = 'yuki';

  state.settings.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  $$('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));

  const icons  = { dark: '🖤', yuki: '❄️', rose: '🩷', ocean: '🌊' };
  const labels = { dark: '🖤 Drako', yuki: '❄️ Yuki', rose: '🩷 Pupi', ocean: '🌊 Ocean' };
  const icon   = icons[theme] || '🖤';

  const sidebarBtn = document.querySelector('#sidebar-theme-toggle');
  if (sidebarBtn) sidebarBtn.innerHTML = `<span id="sidebar-theme-icon">${icon}</span> ${labels[theme] || ''}`;
  const topbarIcon = $('topbar-theme-icon');
  if (topbarIcon) topbarIcon.textContent = icon;

  setTimeout(() => {
    if (typeof renderDonutChart === 'function') renderDonutChart();
    if (typeof renderBarChart === 'function') renderBarChart();
    if (typeof renderFinanceSticker === 'function') renderFinanceSticker();
  }, 150);
}

function toggleTheme() {
  const themes = ['dark', 'yuki', 'rose', 'ocean'];
  const idx = themes.indexOf(state.settings.theme);
  applyTheme(themes[(idx + 1) % themes.length]);
  saveState();
}

/* ══════════════════════════════════════════
   SIDEBAR COUPLE
══════════════════════════════════════════ */
function updateSidebarCouple() {
  const s = state.settings;
  $('av1').textContent           = (s.name1[0] || '?').toUpperCase();
  $('av2').textContent           = (s.name2[0] || '?').toUpperCase();
  $('sidebar-name1').textContent = s.name1;
  $('sidebar-name2').textContent = s.name2;
  $('sidebar-month-badge').textContent = monthLabel(s.month);

  const filterP1 = $('filter-p1'); if (filterP1) filterP1.textContent = s.name1;
  const filterP2 = $('filter-p2'); if (filterP2) filterP2.textContent = s.name2;
  updateBudgetModalAssigneeNames();
  updateTxAssigneeNames();

  $('split-currency').textContent = s.currency;
  const sl1 = $('split-label-p1'); if (sl1) sl1.textContent = s.name1;
  const sl2 = $('split-label-p2'); if (sl2) sl2.textContent = s.name2;
  const gc  = $('goal-currency');  if (gc)  gc.textContent  = s.currency;
  const gc2 = $('goal-currency2'); if (gc2) gc2.textContent = s.currency;
}

/* ══════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════ */
const ANGGARAN_PAGES = ['income','fixed','variable','loan','savings','investments','expense','debt'];

function navigateTo(page) {
  currentPage = page;

  /* Pages */
  $$('.page').forEach(p => p.classList.remove('active'));
  $(`page-${page}`)?.classList.add('active');

  /* Sidebar legacy nav */
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $(`nav-${page}`)?.classList.add('active');

  /* Topbar tabs */
  $$('.topbar-tab[data-page]').forEach(t =>
    t.classList.toggle('active', t.dataset.page === page));
  const anggaranTab = $('tnav-anggaran');
  if (anggaranTab) anggaranTab.classList.toggle('active', ANGGARAN_PAGES.includes(page));
  /* Tutup dropdown */
  const drop = $('anggaran-dropdown');
  if (drop) {
    drop.classList.remove('open');
    if (anggaranTab) anggaranTab.setAttribute('aria-expanded', 'false');
  }

  /* Bottom nav */
  $$('.bottom-tab[data-page]').forEach(t =>
    t.classList.toggle('active', t.dataset.page === page));
  const bAnggaranTab = $('bnav-anggaran-trigger');
  if (bAnggaranTab) bAnggaranTab.classList.toggle('active', ANGGARAN_PAGES.includes(page));

  /* Tutup sidebar */
  $('sidebar')?.classList.remove('open');
  if (sidebarOverlay) sidebarOverlay.classList.remove('show');

  renderPage(page);
}

function renderPage(page) {
  if      (page === 'home')         renderHomePage();
  else if (page === 'dashboard')    renderDashboard();
  else if (page === 'transactions') renderTransactionsPage();
  else if (page === 'report')       renderMonthlyReport();
  else if (page === 'goals')        renderGoalsPage();
  else if (page === 'split')        renderSplitPage();
  else if (page === 'income')       renderIncomePage();
  else if (page === 'expense')      renderExpensePage();
  else if (page === 'savings')      renderSavingsPage();
  else if (page === 'debt')         renderDebtPage();
  else if (page === 'investments')  renderInvestmentsPage();
  /* Legacy pages dari sidebar lama — redirect ke tab baru */
  else if (page === 'fixed' || page === 'variable' || page === 'loan') renderExpensePage();
}

/* ══════════════════════════════════════════
   INIT ALL LISTENERS
══════════════════════════════════════════ */
function initAllListeners() {

  /* ── LOGIN ── */
  $('login-btn').addEventListener('click', async () => {
    const email    = $('login-email').value.trim();
    const password = $('login-password').value;
    if (!email || !password) { showToast('Isi email dan password', 'error'); return; }
    setAuthLoading(true);
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) { showToast('Login gagal: ' + error.message, 'error'); return; }
    currentUser = data.user;
    await afterLogin();
  });

  /* ── REGISTER ── */
  $('register-btn').addEventListener('click', async () => {
    const name1    = $('reg-name1').value.trim();
    const email1   = $('reg-email1').value.trim().toLowerCase();
    const name2    = $('reg-name2').value.trim();
    const email2   = $('reg-email2').value.trim().toLowerCase();
    const password = $('reg-password').value;
    const currency = $('reg-currency').value;

    if (!name1 || !email1 || !name2 || !email2 || !password) {
      showToast('Semua field wajib diisi', 'error'); return;
    }
    if (password.length < 6) { showToast('Password minimal 6 karakter', 'error'); return; }
    if (email1 === email2)   { showToast('Email kamu dan pasangan harus berbeda', 'error'); return; }

    setAuthLoading(true);
    const { data: signupData, error: signupErr } = await sbClient.auth.signUp({ email: email1, password });
    if (signupErr) { setAuthLoading(false); showToast('Registrasi gagal: ' + signupErr.message, 'error'); return; }

    currentUser = signupData.user;
    const { data: couple, error: coupleErr } = await sbClient.from('couples').insert({
      name1, name2, email1, email2, currency,
    }).select().single();

    if (coupleErr) { setAuthLoading(false); showToast('Gagal buat couple: ' + coupleErr.message, 'error'); return; }
    currentCouple = couple;
    setAuthLoading(false);

    const inviteLink = buildInviteLink(couple.id, name2, email2);
    $('invite-partner-name').textContent = name2;
    $('invite-link-text').textContent    = inviteLink;
    switchAuthTab('invite');
  });

  /* ── INVITE ── */
  $('copy-invite-btn').addEventListener('click', () => {
    navigator.clipboard.writeText($('invite-link-text').textContent)
      .then(() => showToast('Link berhasil disalin! 📋'))
      .catch(() => showToast('Gagal salin, copy manual ya', 'error'));
  });

  $('skip-invite-btn').addEventListener('click', async () => {
    await loadFromSupabase();
    subscribeRealtime();
    showApp();
  });

  /* ── LOGOUT ── */
  $('logout-btn').addEventListener('click', async () => {
    const ok = await showConfirm('Logout?', 'Kamu akan keluar dari CoupleGoal.');
    if (!ok) return;
    await sbClient.auth.signOut();
    location.reload();
  });
}

/* ══════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['tx-modal','budget-modal','settings-modal','confirm-modal','import-modal','goal-modal'].forEach(id => {
      const el = $(id);
      if (el && !el.classList.contains('hidden')) {
        if (id === 'confirm-modal' && confirmResolve) confirmResolve(false);
        el.classList.add('hidden');
      }
    });
  }
  if (e.key === 'Enter') {
    if ($('tx-modal') && !$('tx-modal').classList.contains('hidden'))         { e.preventDefault(); saveTransaction(); }
    else if ($('budget-modal') && !$('budget-modal').classList.contains('hidden')) { e.preventDefault(); saveBudgetItem(); }
  }
});
