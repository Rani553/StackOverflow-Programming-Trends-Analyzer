/**
 * StackTrends Dashboard — Main Script
 * Handles: API fetching, chart rendering, filters, sidebar interactions
 */

// ── Color palette for each language (consistent across charts) ──
const LANG_COLORS = {
  'python':     '#5b8def',
  'javascript': '#f4a24a',
  'java':       '#f87171',
  'c++':        '#a78bfa',
  'c#':         '#34d399',
  'html':       '#fb923c',
  'css':        '#60a5fa',
  'php':        '#c084fc',
  'sql':        '#4ade80',
  'reactjs':    '#e879f9',
  'typescript': '#38bdf8',
  'r':          '#a3e635',
  'swift':      '#fbbf24',
  'kotlin':     '#f472b6',
  'ruby':       '#fc8181',
  'go':         '#6ee7b7',
};

function getColor(lang) {
  return LANG_COLORS[lang.toLowerCase()] || `hsl(${hashCode(lang) % 360}, 65%, 60%)`;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// ── Global State ──
let rawData = null;         // Full API response { lang: { year: value } }
let activeLanguages = null; // Set of visible languages (null = all)
let chartInstance = null;   // Main line chart instance
let barChartInstance = null;
let currentChartType = 'line';
let selectedYear = 'all';

// ── DOM Refs ──
const mainChartCanvas  = document.getElementById('mainChart');
const barChartCanvas   = document.getElementById('barChart');
const rankingListEl    = document.getElementById('rankingList');
const statsGrid        = document.getElementById('statsGrid');
const langTogglesEl    = document.getElementById('langToggles');
const yearSelect       = document.getElementById('yearSelect');
const sidebarEl        = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggle');

// ── Sidebar Toggle (Mobile) ──
if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener('click', () => {
    sidebarEl.classList.toggle('open');
  });
}

// Close sidebar on outside click (mobile)
document.addEventListener('click', (e) => {
  if (sidebarEl.classList.contains('open') &&
      !sidebarEl.contains(e.target) &&
      e.target !== sidebarToggleBtn) {
    sidebarEl.classList.remove('open');
  }
});

// ── Year Filter ──
if (yearSelect) {
  yearSelect.addEventListener('change', () => {
    selectedYear = yearSelect.value;
    renderMainChart();
    renderBarChart();
    renderRanking();
  });
}

// ── Fetch Stats and populate cards ──
async function loadStats() {
  try {
    const res = await fetch('/stats');
    const stats = await res.json();

    statsGrid.innerHTML = `
      <div class="stat-card fade-in" style="--accent-color: #5b8def">
        <span class="stat-icon">📊</span>
        <div class="stat-value">${stats.total_questions.toLocaleString()}</div>
        <div class="stat-label">Total Questions</div>
        <div class="stat-sublabel">Scraped from Stack Overflow</div>
      </div>
      <div class="stat-card fade-in" style="--accent-color: #a78bfa">
        <span class="stat-icon">💬</span>
        <div class="stat-value">${stats.total_languages}</div>
        <div class="stat-label">Languages Tracked</div>
        <div class="stat-sublabel">Unique tags in dataset</div>
      </div>
      <div class="stat-card fade-in" style="--accent-color: #f4a24a">
        <span class="stat-icon">📅</span>
        <div class="stat-value">${stats.year_range}</div>
        <div class="stat-label">Year Coverage</div>
        <div class="stat-sublabel">Historical trend window</div>
        
      </div>
      <div class="stat-card fade-in" style="--accent-color: #4ade80">
        <span class="stat-icon">🏆</span>
        <div class="stat-value">${stats.top_language}</div>
        <div class="stat-label">Top Language</div>
        <div class="stat-sublabel">${stats.top_language_count.toLocaleString()} occurrences</div>
      </div>
    `;
  } catch (err) {
    statsGrid.innerHTML = `<div class="error-state">⚠ Could not load stats — is the backend running?</div>`;
  }
}

// ── Fetch Tag Data ──
async function loadTagData() {
  const res = await fetch('/top-tags');
  return await res.json();
}

// ── Populate Year Dropdown ──
function populateYearSelect(years) {
  yearSelect.innerHTML = '<option value="all">All Years</option>';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });
}

// ── Build Language Toggle Sidebar ──
function buildLangToggles(langs, totals) {
  activeLanguages = new Set(langs); // all active by default
  langTogglesEl.innerHTML = '';

  langs.forEach(lang => {
    const pct = (totals[lang] * 100).toFixed(1);
    const div = document.createElement('div');
    div.className = 'lang-toggle active';
    div.dataset.lang = lang;
    div.innerHTML = `
      <div class="lang-dot" style="background:${getColor(lang)}"></div>
      <span class="lang-toggle-label">${lang}</span>
      <span class="lang-toggle-count">${pct}%</span>
    `;
    div.addEventListener('click', () => toggleLanguage(lang, div));
    langTogglesEl.appendChild(div);
  });
}

function toggleLanguage(lang, el) {
  if (activeLanguages.has(lang)) {
    // Don't deactivate if only 1 left
    if (activeLanguages.size === 1) return;
    activeLanguages.delete(lang);
    el.classList.remove('active');
  } else {
    activeLanguages.add(lang);
    el.classList.add('active');
  }
  renderMainChart();
  renderBarChart();
  renderRanking();
}

// ── Get filtered data for a given year / language selection ──
function getFilteredData() {
  if (!rawData) return null;

  const langs = Object.keys(rawData).filter(l => activeLanguages.has(l));
  const allYears = new Set();
  langs.forEach(l => Object.keys(rawData[l]).forEach(y => allYears.add(y)));
  const sortedYears = Array.from(allYears).sort();

  // If a specific year is selected, compute a snapshot
  if (selectedYear !== 'all') {
    return { langs, years: [selectedYear], sortedYears: [selectedYear] };
  }

  return { langs, years: sortedYears, sortedYears };
}

// ── Render Main Chart (line or area) ──
function renderMainChart() {
  const { langs, sortedYears } = getFilteredData();

  const datasets = langs.map(lang => {
    const values = sortedYears.map(y => rawData[lang][y] ?? 0);
    const color = getColor(lang);
    return {
      label: lang,
      data: values,
      borderColor: color,
      backgroundColor: currentChartType === 'line'
        ? 'transparent'
        : color + '22',
      fill: currentChartType !== 'line',
      tension: 0.42,
      borderWidth: 2.5,
      pointRadius: sortedYears.length > 8 ? 2 : 4,
      pointHoverRadius: 7,
      pointBackgroundColor: color,
      pointBorderColor: '#0d0f14',
      pointBorderWidth: 2,
    };
  });

  const data = { labels: sortedYears, datasets };

  if (chartInstance) {
    chartInstance.data = data;
    chartInstance.update('active');
    return;
  }

  const ctx = mainChartCanvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },   // custom legend in sidebar
        tooltip: {
          backgroundColor: '#181c27',
          borderColor: '#252a3a',
          borderWidth: 1,
          titleFont: { family: "'DM Mono', monospace", size: 12 },
          bodyFont:  { family: "'DM Mono', monospace", size: 11 },
          titleColor: '#e8ecf4',
          bodyColor: '#8a92a8',
          padding: 14,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${(ctx.raw * 100).toFixed(2)}%`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(37,42,58,0.6)', drawTicks: false },
          border: { color: '#252a3a' },
          ticks: {
            color: '#4e5568',
            font: { family: "'DM Mono', monospace", size: 11 },
            padding: 10,
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(37,42,58,0.6)', drawTicks: false },
          border: { color: '#252a3a', dash: [4, 4] },
          ticks: {
            color: '#4e5568',
            font: { family: "'DM Mono', monospace", size: 11 },
            padding: 12,
            callback: v => (v * 100).toFixed(0) + '%'
          },
          title: {
            display: true,
            text: 'Normalized Frequency',
            color: '#4e5568',
            font: { family: "'DM Sans', sans-serif", size: 11 },
            padding: { bottom: 8 }
          }
        }
      }
    }
  });
}

// ── Render Bar Chart (latest year snapshot) ──
function renderBarChart() {
  const year = selectedYear !== 'all'
    ? selectedYear
    : Math.max(...Object.values(rawData)[0] ? Object.keys(Object.values(rawData)[0]).map(Number) : [2024]).toString();

  const langs = Object.keys(rawData).filter(l => activeLanguages.has(l));
  const values = langs.map(l => rawData[l][year] ?? 0);
  const colors = langs.map(l => getColor(l));

  const sortedPairs = langs
    .map((l, i) => ({ lang: l, val: values[i], color: colors[i] }))
    .sort((a, b) => b.val - a.val);

  const data = {
    labels: sortedPairs.map(p => p.lang),
    datasets: [{
      data: sortedPairs.map(p => p.val),
      backgroundColor: sortedPairs.map(p => p.color + 'cc'),
      borderColor: sortedPairs.map(p => p.color),
      borderWidth: 1.5,
      borderRadius: 6,
      hoverBackgroundColor: sortedPairs.map(p => p.color),
    }]
  };

  document.getElementById('barChartYear').textContent = year;

  if (barChartInstance) {
    barChartInstance.data = data;
    barChartInstance.update('active');
    return;
  }

  const ctx = barChartCanvas.getContext('2d');
  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data,
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#181c27',
          borderColor: '#252a3a',
          borderWidth: 1,
          titleFont: { family: "'DM Mono', monospace", size: 12 },
          bodyFont:  { family: "'DM Mono', monospace", size: 11 },
          padding: 12,
          callbacks: {
            label: ctx => `  ${(ctx.raw * 100).toFixed(2)}% share`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(37,42,58,0.6)' },
          border: { color: '#252a3a' },
          ticks: {
            color: '#4e5568',
            font: { family: "'DM Mono', monospace", size: 10 },
            callback: v => (v * 100).toFixed(0) + '%'
          }
        },
        y: {
          grid: { display: false },
          border: { color: '#252a3a' },
          ticks: {
            color: '#8a92a8',
            font: { family: "'DM Mono', monospace", size: 11 },
          }
        }
      }
    }
  });
}

// ── Render Ranking List ──
function renderRanking() {
  const year = selectedYear !== 'all'
    ? selectedYear
    : (() => {
        const allYears = new Set();
        Object.values(rawData).forEach(d => Object.keys(d).forEach(y => allYears.add(y)));
        return Math.max(...Array.from(allYears).map(Number)).toString();
      })();

  const langs = Object.keys(rawData).filter(l => activeLanguages.has(l));
  const pairs = langs
    .map(l => ({ lang: l, val: rawData[l][year] ?? 0 }))
    .sort((a, b) => b.val - a.val);

  const max = pairs[0]?.val || 1;

  rankingListEl.innerHTML = pairs.map((p, i) => `
    <div class="ranking-item">
      <span class="rank-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="rank-color" style="background:${getColor(p.lang)}"></div>
      <span class="rank-name">${p.lang}</span>
      <div class="rank-bar-wrap">
        <div class="rank-bar" style="width:${(p.val / max * 100).toFixed(1)}%;background:${getColor(p.lang)}"></div>
      </div>
      <span class="rank-pct">${(p.val * 100).toFixed(1)}%</span>
    </div>
  `).join('');
}

// ── Chart Type Toggle ──
window.setChartType = function(type, el) {
  currentChartType = type;
  document.querySelectorAll('.btn-sm[data-chart-type]').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  renderMainChart();
};

// ── Toggle All / Reset ──
window.toggleAllLangs = function(show) {
  const toggles = document.querySelectorAll('.lang-toggle');
  toggles.forEach(t => {
    if (show) {
      activeLanguages.add(t.dataset.lang);
      t.classList.add('active');
    } else {
      // Keep at least one
      if (activeLanguages.size > 1) {
        activeLanguages.delete(t.dataset.lang);
        t.classList.remove('active');
      }
    }
  });
  renderMainChart();
  renderBarChart();
  renderRanking();
};

// ── Boot ──
async function init() {
  // Show skeleton placeholders
  statsGrid.innerHTML = Array(4).fill(0).map(() => `
    <div class="stat-card">
      <div class="skeleton" style="width:28px;height:28px;border-radius:6px;margin-bottom:14px"></div>
      <div class="skeleton" style="width:60%;height:28px;margin-bottom:8px"></div>
      <div class="skeleton" style="width:40%;height:12px"></div>
    </div>
  `).join('');

  // Load stats cards (separate endpoint)
  loadStats();

  try {
    rawData = await loadTagData();

    const allYears = new Set();
    const totals = {};
    Object.entries(rawData).forEach(([lang, yearData]) => {
      totals[lang] = Object.values(yearData).reduce((s, v) => s + v, 0);
      Object.keys(yearData).forEach(y => allYears.add(y));
    });

    const sortedYears = Array.from(allYears).sort();
    const langs = Object.keys(rawData).sort((a, b) => totals[b] - totals[a]);

    populateYearSelect(sortedYears);
    buildLangToggles(langs, totals);

    // Render all visualizations
    renderMainChart();
    renderBarChart();
    renderRanking();

  } catch (err) {
    console.error('Failed to load tag data:', err);
    mainChartCanvas.closest('.chart-card').innerHTML =
      `<div class="error-state">⚠ Cannot connect to API.<br><span style="color:var(--text-muted);font-size:0.75rem">Make sure Flask is running on port 5000.</span></div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
