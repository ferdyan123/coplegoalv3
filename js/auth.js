/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — AUTH.JS
   Login, Register, Invite, Session restore
   ═══════════════════════════════════════════════════════════ */

function switchAuthTab(tabKey) {
  document.querySelectorAll('.auth-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tabKey));
  document.querySelectorAll('.auth-form-wrap').forEach(f => f.classList.remove('active'));
  const target = document.getElementById('tab-' + tabKey);
  if (target) target.classList.add('active');
}

function initAuthTabs() {
  document.addEventListener('click', e => {
    const tab = e.target.closest('.auth-tab');
    if (tab && tab.dataset.tab) { switchAuthTab(tab.dataset.tab); return; }
    const link = e.target.closest('.auth-switch');
    if (link && link.dataset.to) { e.preventDefault(); switchAuthTab(link.dataset.to); }
  });
}

/* ── Password toggle ── */
function handleTogglePw(e) {
  const btn = e.target.closest('.toggle-pw');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const inp = $(btn.dataset.target);
  if (inp) {
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? '👁' : '🙈';
  }
}
document.addEventListener('click',    handleTogglePw);
document.addEventListener('touchend', handleTogglePw, { passive: false });

/* ── Invite link builder ── */
function buildInviteLink(coupleId, partnerName, partnerEmail) {
  const base   = window.location.href.split('?')[0].split('#')[0];
  const params = new URLSearchParams({ join: coupleId, name: partnerName, email: partnerEmail });
  return `${base}?${params.toString()}`;
}

/* ── Join via invite link ── */
async function checkInviteLink() {
  const params      = new URLSearchParams(window.location.search);
  const coupleId    = params.get('join');
  const partnerName = params.get('name');
  const partnerEmail = params.get('email');

  if (!coupleId || !partnerEmail) return false;

  $('auth-screen').classList.add('hidden');
  $('join-screen').classList.remove('hidden');
  $('join-tagline').textContent = 'Kamu diundang bergabung ke CoupleGoal.';

  $('join-btn').addEventListener('click', async () => {
    const password = $('join-password').value;
    if (password.length < 6) { showToast('Password minimal 6 karakter', 'error'); return; }

    setJoinLoading(true);
    const { data: signupData, error } = await sbClient.auth.signUp({ email: partnerEmail, password });
    setJoinLoading(false);

    if (error) { showToast('Gagal daftar: ' + error.message, 'error'); return; }
    currentUser = signupData.user;

    const { data: couple, error: coupleErr } = await sbClient
      .from('couples').select('*').eq('id', coupleId).single();
    if (coupleErr || !couple) { showToast('Undangan tidak valid', 'error'); return; }

    currentCouple = couple;
    window.history.replaceState({}, '', window.location.pathname);

    await loadFromSupabase();
    subscribeRealtime();
    showApp();
    showToast(`Selamat datang, ${partnerName}! 💑`);
  });

  return true;
}

/* ── Session restore ── */
async function restoreSession() {
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session) return false;
  currentUser = session.user;
  await afterLogin();
  return true;
}

async function afterLogin() {
  const email = currentUser.email;
  const { data: couples, error } = await sbClient
    .from('couples')
    .select('*')
    .or(`email1.eq.${email},email2.eq.${email}`)
    .limit(1);

  if (error || !couples?.length) {
    showToast('Akun belum terhubung ke couple. Daftar dulu ya.', 'error');
    await sbClient.auth.signOut();
    return;
  }

  currentCouple = couples[0];
  await loadFromSupabase();
  subscribeRealtime();
  showApp();
  showToast('Selamat datang kembali! 👋');
}

function showApp() {
  $('auth-screen').classList.add('hidden');
  $('join-screen').classList.add('hidden');
  $('app').classList.remove('hidden');
  applyTheme(state.settings.theme);
  initApp();
}

function setAuthLoading(on) {
  $('login-btn').disabled    = on;
  $('register-btn').disabled = on;
  $('login-btn').querySelector('span').textContent = on ? 'Memuat…' : 'Masuk ke CoupleGoal';
}

function setJoinLoading(on) {
  $('join-btn').disabled = on;
  $('join-btn').querySelector('span').textContent = on ? 'Memuat…' : 'Gabung & Mulai';
}
