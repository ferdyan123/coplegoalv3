/* ═══════════════════════════════════════════════════════════
   COUPLEGOAL — DASHBOARD.JS
   Diambil langsung dari app__4_.js Pak Ferdy + getThemeColors untuk chart tab baru
   ═══════════════════════════════════════════════════════════ */

let donutChart = null, barChart = null, trendChart = null;

const STICKER_FILES = {
  nodata:    's-sleep.png',     // No. 9  — tidur, belum ada data
  welcome:   's-peek.png',      // No. 4  — ngintip, anggaran diset
  celebrate: 's-cheer.png',     // No. 17 — cheerleader, goal tercapai
  happy:     's-happy.png',     // No. 3  — tertawa lebar, keuangan sehat
  ontrack:   's-ontrack.png',   // No. 12 — senyum, on track
  saving:    's-boba.png',      // No. 19 — pegang boba, nabung konsisten
  warning:   's-confused.png',  // No. 14 — bingung, hampir overspend
  crisis:    's-cry.png',       // No. 20 — nangis, over budget
  tired:     's-tired.png',     // No. 6  — rebahan, pengeluaran tinggi
};

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getAxisColor() { return getCSSVar('--chart-axis') || '#94a3b8'; }

function getGridColor()  { return getCSSVar('--chart-grid')  || 'rgba(255,255,255,0.05)'; }

function getThemeColors() {
  const a  = getCSSVar('--accent');
  const a2 = getCSSVar('--accent-2');
  const a3 = getCSSVar('--accent-3');
  // 6 kategori: income, fixed, variable, loan, savings, investments
  // Pakai variasi opacity/shade dari 3 accent utama
  return [
    a,                                    // income    → accent utama
    a2,                                   // fixed     → accent-2
    a3,                                   // variable  → accent-3
    a + 'cc',                             // loan      → accent redup
    a2 + '99',                            // savings   → accent-2 muda
    a3 + 'cc',                            // investments → accent-3 redup
  ];
}

function calcHealthScore() {
  const incomeBudget  = calcBudget('income');
  const incomeActual  = calcActual('income');
  const expenseActual = calcTotalActual(EXPENSE_CATEGORIES);
  const savBudget     = calcBudget('savings') + calcBudget('investments');
  const savActual     = calcActual('savings') + calcActual('investments');
  const loanActual    = calcActual('loan');

  if (incomeBudget === 0 && incomeActual === 0) return { score: 0, grade: 'Belum Ada Data', tips: [], color: '#5a6690' };

  const income = incomeActual || incomeBudget;
  let score = 0;
  const tips = [];

  // 1. Savings rate (40 pts) — ideal >= 20%
  const savRate = income > 0 ? savActual / income : 0;
  const savScore = Math.min(savRate / 0.20, 1) * 40;
  score += savScore;
  if (savRate < 0.10) tips.push('💡 Coba tingkatkan tabungan ke minimal 10% dari pemasukan');
  else if (savRate < 0.20) tips.push('👍 Tabungan OK, targetkan 20% untuk lebih aman');
  else tips.push('🌟 Rasio tabungan sangat bagus!');

  // 2. Expense control (30 pts) — ideal expenses < 70% of income
  const expRatio = income > 0 ? expenseActual / income : 1;
  const expScore = Math.max(0, 1 - (expRatio - 0.5) / 0.5) * 30;
  score += expScore;
  if (expRatio > 0.90) tips.push('⚠️ Pengeluaran melebihi 90% pemasukan — kurangi kategori variabel');
  else if (expRatio > 0.70) tips.push('📊 Pengeluaran 70-90% pemasukan — masih bisa dioptimalkan');
  else tips.push('✅ Pengeluaran terkendali dengan baik');

  // 3. Loan burden (20 pts) — ideal < 30% of income
  const loanRatio = income > 0 ? loanActual / income : 0;
  const loanScore = Math.max(0, 1 - loanRatio / 0.30) * 20;
  score += loanScore;
  if (loanRatio > 0.40) tips.push('🔴 Cicilan terlalu besar, pertimbangkan refinancing');
  else if (loanRatio > 0.30) tips.push('🟡 Cicilan di batas aman, hati-hati tambah utang baru');

  // 4. Investment (10 pts)
  const invActual = calcActual('investments');
  const invScore  = income > 0 ? Math.min(invActual / income / 0.05, 1) * 10 : 0;
  score += invScore;
  if (invActual === 0) tips.push('📈 Mulai investasi, walau kecil. Compound interest bekerja!');

  const finalScore = Math.round(Math.max(0, Math.min(100, score)));

  let grade, color;
  if (finalScore >= 80)      { grade = '🏆 Excellent — Keuangan sangat sehat!'; color = getCSSVar('--accent-2') || '#34d399'; }
  else if (finalScore >= 65) { grade = '😊 Good — Keuangan cukup sehat';        color = getCSSVar('--accent')   || '#38bdf8'; }
  else if (finalScore >= 50) { grade = '😐 Fair — Perlu beberapa perbaikan';     color = '#fbbf24'; }
  else if (finalScore >= 30) { grade = '😟 Poor — Perhatikan pengeluaran';        color = '#fb923c'; }
  else                        { grade = '🚨 Critical — Segera evaluasi keuangan'; color = getCSSVar('--accent-3'); }

  return { score: finalScore, grade, tips: tips.slice(0, 3), color };
}

function renderHealthScore() {
  const { score, grade, tips, color } = calcHealthScore();
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  $('health-score-val').textContent = score;
  $('health-score-grade').textContent = grade;

  const ring = $('health-ring-fill');
  ring.style.stroke = color;
  setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);

  $('health-score-tips').innerHTML = tips.length
    ? tips.map(t => `<div class="health-tip">${t}</div>`).join('')
    : '<div class="health-tip">💡 Tambahkan data keuangan untuk tips personal</div>';
}

function renderDashboard() {
  const s = state.settings;

  // ── Sync month picker ──
  const picker = $('dash-month-picker');
  if (picker && picker.value !== s.month) picker.value = s.month || '';

  const incomeBudget  = calcBudget('income');
  const incomeActual  = calcActual('income');
  const expenseBudget = calcTotalBudget(EXPENSE_CATEGORIES);
  const expenseActual = calcTotalActual(EXPENSE_CATEGORIES);
  const savBudget     = calcBudget('savings') + calcBudget('investments');
  const savActual     = calcActual('savings') + calcActual('investments');
  const leftBudget    = incomeBudget - expenseBudget - savBudget;
  const leftActual    = incomeActual - expenseActual - savActual;

  // ── Greeting hero ──
  const greetNames = $('dash-greeting-names');
  const greetMonth = $('dash-greeting-month');
  const greetSub   = $('dash-greeting-sub');
  const greetMsg   = $('dash-greeting-msg');
  if (greetNames) greetNames.textContent = `${s.name1} & ${s.name2}`;
  if (greetMonth) greetMonth.textContent = monthLabel(s.month) || '—';

  const hour = new Date().getHours();
  const tod  = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  if (greetSub) greetSub.textContent = `${tod}! Ini ringkasan keuangan kalian bulan ${monthLabel(s.month) || 'ini'}.`;

  // Kalimat dinamis sesuai kondisi keuangan
  if (greetMsg) {
    const income  = incomeActual || incomeBudget;
    const leftPct = income > 0 ? leftActual / income : null;
    const expPct  = income > 0 ? expenseActual / income : null;
    const totalTx = state.transactions.filter(t => !s.month || (t.date||'').startsWith(s.month)).length;
    const savRate = income > 0 ? savActual / income : 0;

    let msg = '';
    if (totalTx === 0 && incomeBudget === 0) {
      msg = '🌱 Belum ada data keuangan. Mulai dengan mengisi anggaran dan catat transaksi pertama kalian!';
    } else if (totalTx === 0) {
      msg = '📋 Anggaran sudah diset! Yuk mulai catat transaksi agar kalian bisa pantau pengeluaran secara real-time.';
    } else if (expenseActual > expenseBudget && expenseBudget > 0) {
      msg = `⚠️ Pengeluaran kalian sudah melebihi anggaran bulan ini. Yuk review bersama dan rem sedikit pengeluaran variabel!`;
    } else if (leftPct !== null && leftPct >= 0.30) {
      msg = `🎉 Keren! Kalian masih punya ${Math.round(leftPct*100)}% sisa pemasukan. Pertimbangkan tambahkan ke tabungan atau investasi bareng!`;
    } else if (savRate >= 0.20) {
      msg = `💪 Rasio tabungan kalian ${Math.round(savRate*100)}% — sudah melampaui target ideal 20%. Tetap konsisten ya!`;
    } else if (expPct !== null && expPct > 0.75) {
      msg = `📊 Pengeluaran kalian sudah ${Math.round(expPct*100)}% dari pemasukan. Pantau terus agar bulan ini tetap aman.`;
    } else if (savActual === 0 && incomeBudget > 0) {
      msg = `🐷 Belum ada tabungan bulan ini. Coba sisihkan minimal 10% dari pemasukan sekarang, sekecil apapun itu!`;
    } else {
      msg = `✅ Keuangan kalian berjalan lancar bulan ini. Pantau terus dan jaga konsistensinya bersama!`;
    }
    greetMsg.textContent = msg;
  }
  const gi = $('dash-greet-income');  if (gi) gi.textContent = fmt(incomeActual || incomeBudget);
  const ge = $('dash-greet-expense'); if (ge) ge.textContent = fmt(expenseActual);
  const gl = $('dash-greet-left');    if (gl) gl.textContent = fmt(leftActual);

  // ── Summary cards ──
  $('dash-income-budget').textContent  = fmt(incomeBudget);
  $('dash-income-actual').textContent  = `Aktual: ${fmt(incomeActual)}`;
  $('dash-expense-budget').textContent = fmt(expenseBudget);
  $('dash-expense-actual').textContent = `Aktual: ${fmt(expenseActual)}`;
  $('dash-save-budget').textContent    = fmt(savBudget);
  $('dash-save-actual').textContent    = `Aktual: ${fmt(savActual)}`;
  $('dash-left-budget').textContent    = fmt(leftBudget);
  $('dash-left-actual').textContent    = `Sisa Aktual: ${fmt(leftActual)}`;

  const ip = $('dash-income-pill');
  ip.textContent = incomeActual >= incomeBudget && incomeBudget > 0 ? 'ON TARGET ✅' : incomeActual === 0 ? 'BELUM ADA' : 'PROGRES';

  const ep = $('dash-expense-pill');
  if (expenseActual > expenseBudget && expenseBudget > 0) { ep.textContent = 'OVER BUDGET ⚠️'; ep.className = 'summary-pill over'; }
  else { ep.textContent = 'ON BUDGET ✅'; ep.className = 'summary-pill'; }

  renderHealthScore();
  renderDonutChart();
  renderBarChart();
  renderProgressCircle();
  renderPersonBreakdown();
  renderCategoryStatusBars();
  renderRecentTransactions();
  renderFinanceSticker();
}

function renderDonutChart() {
  const ctx = $('donut-budget'); if (!ctx) return;
  const labels = CATEGORIES.map(c => c.label);
  const data   = CATEGORIES.map(c => calcBudget(c.key));
  const colors = getThemeColors();
  const total  = data.reduce((s, v) => s + v, 0);
  $('donut-budget-total').textContent = fmt(total);
  $('donut-legend').innerHTML = CATEGORIES.map((c, i) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${colors[i]}"></span>
      <span>${c.label}</span>
      <span class="legend-val">${fmt(data[i])}</span>
    </div>`).join('');
  if (donutChart) donutChart.destroy();
  if (total === 0) return;
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 3, borderColor: getCSSVar('--bg-surface') || 'transparent', hoverOffset: 8 }] },
    options: {
      cutout: '70%', responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed)}` },
          backgroundColor: getCSSVar('--bg-elevated'),
          titleColor: getCSSVar('--text-primary'),
          bodyColor: getCSSVar('--text-secondary'),
          borderColor: getCSSVar('--border'),
          borderWidth: 1,
        }
      },
      animation: { animateRotate: true, duration: 900 }
    }
  });
}

function renderBarChart() {
  const ctx = $('bar-overview'); if (!ctx) return;
  const labels  = CATEGORIES.map(c => c.label.split(' ')[0]);
  const budget  = CATEGORIES.map(c => calcBudget(c.key));
  const actual  = CATEGORIES.map(c => calcActual(c.key));
  const accent  = getCSSVar('--accent');
  const accent2 = getCSSVar('--accent-2');
  const axisC   = getAxisColor();
  const gridC   = getGridColor();
  if (barChart) barChart.destroy();
  if (budget.reduce((a,b)=>a+b,0) === 0 && actual.reduce((a,b)=>a+b,0) === 0) return;
  barChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Budget', data: budget,
        backgroundColor: accent + '33', borderColor: accent, borderWidth: 2, borderRadius: 8, borderSkipped: false },
      { label: 'Aktual', data: actual,
        backgroundColor: accent2 + '99', borderColor: accent2, borderWidth: 2, borderRadius: 8, borderSkipped: false },
    ]},
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: axisC, font: { size: 11, family: "'Plus Jakarta Sans'" }, boxWidth: 12, borderRadius: 4 } },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` },
          backgroundColor: getCSSVar('--bg-elevated'),
          titleColor: getCSSVar('--text-primary'),
          bodyColor: getCSSVar('--text-secondary'),
          borderColor: getCSSVar('--border'),
          borderWidth: 1,
        }
      },
      scales: {
        x: { ticks: { color: axisC, font: { size: 10 } }, grid: { color: gridC }, border: { color: 'transparent' } },
        y: { ticks: { color: axisC, font: { size: 10 }, callback: v => fmt(v) }, grid: { color: gridC }, border: { color: 'transparent' } },
      },
    }
  });
}

function renderProgressCircle() {
  const ms = getMonthStats();
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (ms.pct / 100) * circumference;
  const circle = $('prog-fill-circle');
  setTimeout(() => { if (circle) circle.style.strokeDashoffset = offset; }, 100);
  $('month-prog-pct').textContent = ms.pct + '%';
  $('stat-days-passed').textContent = ms.passed;
  $('stat-days-left').textContent   = ms.left;
  $('stat-days-total').textContent  = ms.total;

  // SVG gradient — pakai warna tema
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.querySelector('.month-progress-circle svg');
  if (svg) {
    // Hapus gradient lama supaya update saat ganti tema
    const oldDefs = svg.querySelector('#prog-gradient');
    if (oldDefs) oldDefs.parentElement.remove();

    const accent  = getCSSVar('--accent');
    const accent2 = getCSSVar('--accent-2');
    const defs = document.createElementNS(svgNS, 'defs');
    const grad = document.createElementNS(svgNS, 'linearGradient');
    grad.setAttribute('id', 'prog-gradient');
    grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%');
    const s1 = document.createElementNS(svgNS, 'stop');
    s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', accent);
    const s2 = document.createElementNS(svgNS, 'stop');
    s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', accent2);
    grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad);
    svg.insertBefore(defs, svg.firstChild);
  }
}

function renderPersonBreakdown() {
  const s = state.settings;
  const persons = [
    { key: 'p1', name: s.name1, label: s.name1, cls: '' },
    { key: 'p2', name: s.name2, label: s.name2, cls: 'p2' },
    { key: 'shared', name: 'Shared', label: '🤝 Bersama', cls: 'shared' },
  ];
  $('person-grid').innerHTML = persons.map(p => {
    const incomeBudget  = calcBudget('income', p.key);
    const incomeActual  = calcActual('income', p.key);
    const expenseBudget = EXPENSE_CATEGORIES.reduce((s, c) => s + calcBudget(c, p.key), 0);
    const expenseActual = EXPENSE_CATEGORIES.reduce((s, c) => s + calcActual(c, p.key), 0);
    return `<div class="person-card ${p.cls}">
      <div class="person-card-header">
        <div class="person-card-avatar">${(p.name[0] || '?').toUpperCase()}</div>
        <div class="person-card-name">${p.label}</div>
      </div>
      <div class="person-stat-row"><span class="person-stat-label">Budget Masuk</span><span class="person-stat-val">${fmt(incomeBudget)}</span></div>
      <div class="person-stat-row"><span class="person-stat-label">Aktual Masuk</span><span class="person-stat-val" style="color:var(--accent)">${fmt(incomeActual)}</span></div>
      <div class="person-stat-row"><span class="person-stat-label">Budget Keluar</span><span class="person-stat-val">${fmt(expenseBudget)}</span></div>
      <div class="person-stat-row"><span class="person-stat-label">Aktual Keluar</span><span class="person-stat-val" style="color:${expenseActual > expenseBudget && expenseBudget > 0 ? 'var(--accent-3)' : 'var(--accent-2)'}">${fmt(expenseActual)}</span></div>
    </div>`;
  }).join('');
}

function renderCategoryStatusBars() {
  const colors = getThemeColors(); // 6 warna dari tema aktif
  $('category-status-bars').innerHTML = CATEGORIES.map((c, i) => {
    const budget = calcBudget(c.key);
    const actual = calcActual(c.key);
    const pct    = budget > 0 ? Math.min((actual / budget) * 100, 120) : 0;
    const over   = actual > budget && budget > 0;
    const barColor = over ? 'var(--accent-3)' : (colors[i] || 'var(--accent)');
    return `<div class="cat-bar-item">
      <div class="cat-bar-header">
        <span class="cat-bar-label">${c.icon} ${c.label}</span>
        <span class="cat-bar-vals">${fmt(actual)} / ${fmt(budget)} <span style="color:${over ? 'var(--accent-3)' : 'var(--text-muted)'};">${over ? '▲ OVER' : ''}</span></span>
      </div>
      <div class="progress-track"><div class="progress-fill ${over ? 'over' : ''}" style="width:${Math.min(pct,100)}%;background:${barColor};"></div></div>
    </div>`;
  }).join('');
}

function renderRecentTransactions() {
  const month = state.settings.month;
  const txs = [...state.transactions]
    .filter(t => !month || !t.date || t.date.substring(0, 7) === month)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);
  if (!txs.length) {
    $('recent-tx-list').innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada transaksi bulan ini</p></div>`;
    return;
  }
  $('recent-tx-list').innerHTML = txs.map(t => renderTxItem(t, true)).join('');
}

function renderHomePage() {
  const s = state.settings;
  const namesEl = document.getElementById('home-couple-names');
  if (namesEl && s.name1 && s.name2) {
    namesEl.textContent = s.name1 + ' & ' + s.name2;
  }
  // Update nama pasangan di assignee cards
  const p1Title = document.getElementById('home-assignee-title-p1');
  const p2Title = document.getElementById('home-assignee-title-p2');
  const p1Icon  = document.getElementById('home-assignee-icon-p1');
  const p2Icon  = document.getElementById('home-assignee-icon-p2');
  if (p1Title) p1Title.textContent = s.name1 || 'Pasangan 1';
  if (p2Title) p2Title.textContent = s.name2 || 'Pasangan 2';
  if (p1Icon)  p1Icon.textContent  = (s.name1?.[0] || '👤').toUpperCase();
  if (p2Icon)  p2Icon.textContent  = (s.name2?.[0] || '👤').toUpperCase();
}

function renderMonthlyReport() {
  const currentMonth = state.settings.month;
  if (!currentMonth) {
    $('narrative-text').textContent = 'Set bulan anggaran di Pengaturan untuk melihat laporan.';
    return;
  }

  // Generate last 6 months
  const [cy, cm] = currentMonth.split('-').map(Number);
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(cy, cm - 1 - i, 1);
    months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }

  // Calc per month
  const incomeData  = months.map(m => calcActualForMonth('income', m));
  const expenseData = months.map(m => EXPENSE_CATEGORIES.reduce((s, c) => s + calcActualForMonth(c, m), 0));
  const savData     = months.map(m => calcActualForMonth('savings', m) + calcActualForMonth('investments', m));
  const labels      = months.map(m => { const [y, mo] = m.split('-'); return new Date(+y, +mo-1,1).toLocaleDateString('id-ID', {month:'short'}); });

  // Trend chart
  const ctx = $('trend-chart'); if (!ctx) return;
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Pemasukan', data: incomeData,  borderColor: getCSSVar('--accent'), backgroundColor: getCSSVar('--accent-soft'), tension: 0.4, fill: true, pointRadius: 4 },
        { label: 'Pengeluaran', data: expenseData, borderColor: getCSSVar('--accent-2'), backgroundColor: getCSSVar('--accent-2-soft'), tension: 0.4, fill: true, pointRadius: 4 },
        { label: 'Tabungan+Inv', data: savData,  borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.08)', tension: 0.4, fill: true, pointRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: getAxisColor() } }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } } },
      scales: {
        x: { ticks: { color: getAxisColor() }, grid: { color: getGridColor() } },
        y: { ticks: { color: getAxisColor(), callback: v => fmt(v) }, grid: { color: getGridColor() } },
      }
    }
  });

  // Narrative
  const currIncome  = incomeData[5];
  const currExpense = expenseData[5];
  const prevIncome  = incomeData[4];
  const prevExpense = expenseData[4];
  const net = currIncome - currExpense;
  const savRate = currIncome > 0 ? ((savData[5] / currIncome) * 100).toFixed(0) : 0;

  let narrative = `Bulan ${monthLabel(currentMonth)}, `;
  if (currIncome > 0) {
    narrative += `kalian mencatat pemasukan ${fmt(currIncome)}`;
    if (prevIncome > 0) {
      const diff = ((currIncome - prevIncome) / prevIncome * 100).toFixed(0);
      narrative += ` (${diff > 0 ? '+' : ''}${diff}% vs bulan lalu)`;
    }
    narrative += `. Pengeluaran ${fmt(currExpense)}, menyisakan ${fmt(net)}.`;
    if (savRate > 0) narrative += ` Rasio tabungan kalian bulan ini ${savRate}%.`;
    if (net < 0) narrative += ' ⚠️ Pengeluaran melebihi pemasukan — perlu dievaluasi.';
    else if (parseFloat(savRate) >= 20) narrative += ' 🎉 Rasio tabungan sangat baik!';
  } else {
    narrative = 'Belum ada data pemasukan untuk bulan ini. Tambahkan transaksi untuk melihat ringkasan.';
  }
  $('narrative-text').textContent = narrative;

  // Compare grid
  const prevMonth = months[4];
  $('report-compare-grid').innerHTML = [
    { label: 'Pemasukan', curr: currIncome, prev: prevIncome, positive: true },
    { label: 'Pengeluaran', curr: currExpense, prev: prevExpense, positive: false },
    { label: 'Tabungan+Inv', curr: savData[5], prev: savData[4], positive: true },
  ].map(item => {
    const diff = item.prev > 0 ? ((item.curr - item.prev) / item.prev * 100).toFixed(0) : null;
    const diffUp = diff !== null && ((item.positive && parseFloat(diff) > 0) || (!item.positive && parseFloat(diff) < 0));
    return `<div class="compare-item">
      <div class="compare-label">${item.label}</div>
      <div class="compare-curr">${fmt(item.curr)}</div>
      <div class="compare-prev">Lalu: ${fmt(item.prev)}</div>
      ${diff !== null ? `<div class="compare-diff ${diffUp ? 'up' : 'down'}">${parseFloat(diff) > 0 ? '▲' : '▼'} ${Math.abs(diff)}%</div>` : ''}
    </div>`;
  }).join('');
}

function getFinanceStickerConfig() {
  const incomeBudget  = calcBudget('income');
  const incomeActual  = calcActual('income');
  const expenseBudget = calcTotalBudget(EXPENSE_CATEGORIES);
  const expenseActual = calcTotalActual(EXPENSE_CATEGORIES);
  const savActual     = calcActual('savings') + calcActual('investments');
  const totalTx       = state.transactions.filter(t => {
    const m = state.settings.month;
    return !m || (t.date && t.date.substring(0,7) === m);
  }).length;
  const income     = incomeActual || incomeBudget;
  const leftActual = incomeActual - expenseActual - savActual;
  const surplusPct = income > 0 ? leftActual / income : 0;
  const expRatio   = income > 0 ? expenseActual / income : 0;
  const goals      = state.goals || [];
  const goalDone   = goals.some(g => g.target > 0 && (g.saved || 0) >= g.target);

  // 0 data sama sekali
  if (totalTx === 0 && incomeBudget === 0) return {
    file: STICKER_FILES.nodata, cls: 'sticker--idle',
    title: 'Belum ada data nih~',
    desc: 'Yuk mulai catat keuangan kalian! 🐾'
  };

  // Goal tercapai
  if (goalDone) return {
    file: STICKER_FILES.celebrate, cls: 'sticker--celebrate',
    title: 'Goal tercapai! 🎉',
    desc: 'Kalian luar biasa — target tabungan kelar!'
  };

  // Surplus besar > 30%
  if (surplusPct >= 0.30 && income > 0) return {
    file: STICKER_FILES.happy, cls: '',
    title: 'Keuangan sehat banget!',
    desc: `Sisa ${Math.round(surplusPct*100)}% dari pemasukan 🌟`
  };

  // On track surplus 10-30%
  if (surplusPct >= 0.10 && income > 0) return {
    file: STICKER_FILES.ontrack, cls: '',
    title: 'On track, good job!',
    desc: 'Pengeluaran terkendali ✅'
  };

  // Nabung konsisten
  if (savActual > 0 && expRatio < 0.80) return {
    file: STICKER_FILES.saving, cls: '',
    title: 'Rajin nabung nih!',
    desc: 'Konsisten = kunci kebebasan finansial 🐟'
  };

  // Baru login / anggaran diset tapi 0 transaksi
  if (totalTx === 0 && incomeBudget > 0) return {
    file: STICKER_FILES.welcome, cls: 'sticker--idle',
    title: 'Siap pantau keuangan~',
    desc: 'Anggaran sudah diset, yuk catat transaksi! 👀'
  };

  // Hampir overspend 80-100%
  if (expRatio >= 0.80 && expRatio < 1.0) return {
    file: STICKER_FILES.warning, cls: '',
    title: 'Hati-hati nih...',
    desc: `Pengeluaran udah ${Math.round(expRatio*100)}% dari budget ⚠️`
  };

  // Over budget
  if (expenseActual > expenseBudget && expenseBudget > 0) return {
    file: STICKER_FILES.crisis, cls: 'sticker--crisis',
    title: 'Aduh, over budget! 😭',
    desc: 'Pengeluaran melebihi anggaran — yuk evaluasi!'
  };

  // Pengeluaran tinggi 70-80%
  if (expRatio >= 0.70) return {
    file: STICKER_FILES.tired, cls: '',
    title: 'Pengeluaran lumayan nih',
    desc: 'Kurangi sedikit biar lebih lega~'
  };

  // Default: aman
  return {
    file: STICKER_FILES.happy, cls: '',
    title: 'Keuangan aman!',
    desc: 'Terus pertahankan ya 💪'
  };
}

function getStickerFolder() {
  const t = state.settings.theme;
  if (t === 'dark')  return 'animasi/drako';
  if (t === 'yuki')  return 'animasi/yuki';
  if (t === 'rose')  return 'animasi/pupi';
  return null; // ocean = no stiker
}

function renderFinanceSticker() {
  const el = $('finance-sticker-area');
  if (!el) return;

  // Ocean tidak pakai stiker
  const folder = getStickerFolder();
  if (!folder) {
    const { title, desc } = getFinanceStickerConfig();
    el.innerHTML = `
      <div class="sticker-card">
        <div class="sticker-ocean-icon">🌊</div>
        <div class="sticker-card-text">
          <div class="sticker-card-title">${title}</div>
          <div class="sticker-card-desc">${desc}</div>
        </div>
      </div>`;
    return;
  }

  const { file, cls, title, desc } = getFinanceStickerConfig();
  const src = `${folder}/${file}`;
  el.innerHTML = `
    <div class="sticker-card">
      <div class="sticker-img-wrap ${cls}">
        <img src="${src}" alt="${title}" class="sticker-img"
          onerror="this.parentElement.style.display='none'">
      </div>
      <div class="sticker-card-text">
        <div class="sticker-card-title">${title}</div>
        <div class="sticker-card-desc">${desc}</div>
      </div>
    </div>`;
}

function renderTxItem(t) {
  const cat  = CATEGORIES.find(c => c.key === t.type) || { icon: '💰', color: '#8b5cf6' };
  const s    = state.settings;
  const name = t.assignee === 'p1' ? s.name1 : t.assignee === 'p2' ? s.name2 : 'Shared';
  const isIncome = t.type === 'income';
  return `<div class="tx-item" data-id="${t.id}">
    <div class="tx-icon" style="background:${cat.color}22;color:${cat.color};">${cat.icon}</div>
    <div class="tx-body">
      <div class="tx-desc">${t.description || '—'}</div>
      <div class="tx-meta">${fmtDate(t.date)} · ${cat.label} · ${name}</div>
    </div>
    <div class="tx-amount ${isIncome ? 'income' : 'expense'}">${isIncome ? '+' : '-'}${fmt(t.amount)}</div>
    <div class="tx-actions"><button class="tx-delete-btn" onclick="deleteTx('${t.id}')">🗑️ Hapus</button></div>
  </div>`;
}

async function deleteTx(id) {
  const idx = state.transactions.findIndex(t => t.id === id);
  if (idx < 0) return;
  const ok = await showConfirm('Hapus Transaksi?', 'Transaksi ini akan dihapus permanen.');
  if (!ok) return;
  state.transactions.splice(idx, 1);
  saveState();
  renderPage(currentPage);
  showToast('Transaksi dihapus', 'info');
}
window.deleteTx = deleteTx;
