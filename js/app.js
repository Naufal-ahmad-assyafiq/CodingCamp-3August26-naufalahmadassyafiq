/* ============================================================
   EXPENSE & BUDGET VISUALIZER — app.js
   Vanilla JavaScript | No frameworks
   ============================================================ */

/* ── CONSTANTS ─────────────────────────────────────────────── */
const LS_KEYS = {
  transactions: 'ebv_transactions',
  categories:   'ebv_categories',
  settings:     'ebv_settings',
};

const DEFAULT_CATEGORIES = [
  { id: 'cat_food',      name: 'Food',      color: '#ef233c' },
  { id: 'cat_transport', name: 'Transport', color: '#3a86ff' },
  { id: 'cat_fun',       name: 'Fun',       color: '#06d6a0' },
];

const DEFAULT_SETTINGS = {
  theme:         'auto',   // 'auto' | 'light' | 'dark'
  spendingLimit: 0,
};

/* ── STATE ─────────────────────────────────────────────────── */
let state = {
  transactions: [],
  categories:   [],
  settings:     { ...DEFAULT_SETTINGS },
};

/* UI-only state (not persisted) */
let uiState = {
  filterCategory: 'all',
  sortOrder:      'newest',
  activeTab:      'all',
  pendingDeleteId: null,
};

/* ── CHART INSTANCE ────────────────────────────────────────── */
let chartInstance = null;

/* ── TASK 2: STATE MANAGER & LOCALSTORAGE ──────────────────── */

/**
 * Load persisted state from localStorage.
 * Falls back to defaults when nothing is stored.
 */
function loadState() {
  try {
    const txRaw  = localStorage.getItem(LS_KEYS.transactions);
    const catRaw = localStorage.getItem(LS_KEYS.categories);
    const setRaw = localStorage.getItem(LS_KEYS.settings);

    state.transactions = txRaw  ? JSON.parse(txRaw)  : [];
    state.categories   = catRaw ? JSON.parse(catRaw) : [...DEFAULT_CATEGORIES];
    state.settings     = setRaw
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(setRaw) }
      : { ...DEFAULT_SETTINGS };
  } catch (e) {
    console.error('BudgetViz: failed to load state', e);
    state.transactions = [];
    state.categories   = [...DEFAULT_CATEGORIES];
    state.settings     = { ...DEFAULT_SETTINGS };
  }
}

/** Persist full state to localStorage. */
function saveState() {
  try {
    localStorage.setItem(LS_KEYS.transactions, JSON.stringify(state.transactions));
    localStorage.setItem(LS_KEYS.categories,   JSON.stringify(state.categories));
    localStorage.setItem(LS_KEYS.settings,     JSON.stringify(state.settings));
  } catch (e) {
    console.error('BudgetViz: failed to save state', e);
  }
}

/**
 * Merge partial updates into state, persist, and re-render.
 * @param {Partial<typeof state>} partial
 */
function setState(partial) {
  Object.assign(state, partial);
  saveState();
  render();
}

/* ── THEME ─────────────────────────────────────────────────── */

/** Apply theme to <html data-theme> and update icon. */
function applyTheme(theme) {
  const html      = document.documentElement;
  const icon      = document.getElementById('themeIcon');
  const effective = theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  html.setAttribute('data-theme', effective);
  if (icon) icon.textContent = effective === 'dark' ? '☀️' : '🌙';
}

/** Toggle between light and dark (saves preference). */
function toggleTheme() {
  const current = state.settings.theme;
  const html     = document.documentElement;
  const isDark   = html.getAttribute('data-theme') === 'dark';
  const next     = isDark ? 'light' : 'dark';
  setState({ settings: { ...state.settings, theme: next } });
  applyTheme(next);
}

/* ── UTILITIES ─────────────────────────────────────────────── */

/** Format number as Indonesian Rupiah. */
function formatIDR(amount) {
  return new Intl.NumberFormat('id-ID', {
    style:    'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format ISO date string to readable locale string. */
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** Generate a simple unique ID. */
function uid() {
  return 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/** Get category object by id. */
function getCategoryById(id) {
  return state.categories.find(c => c.id === id) || null;
}

/** Format YYYY-MM from ISO date. */
function toYearMonth(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Format YYYY-MM to "Month YYYY" label. */
function formatMonthLabel(ym) {
  const [year, month] = ym.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/* ── TASK 3: INPUT FORM & VALIDATION ───────────────────────── */

/** Populate the category <select> dropdowns from state. */
function populateCategorySelects() {
  const selects = [
    document.getElementById('itemCategory'),
    document.getElementById('filterCategory'),
  ];

  selects.forEach(sel => {
    if (!sel) return;
    const isFilter = sel.id === 'filterCategory';
    const current  = sel.value;

    sel.innerHTML = '';

    if (isFilter) {
      const allOpt   = document.createElement('option');
      allOpt.value   = 'all';
      allOpt.textContent = 'All Categories';
      sel.appendChild(allOpt);
    }

    state.categories.forEach(cat => {
      const opt       = document.createElement('option');
      opt.value       = cat.id;
      opt.textContent = cat.name;
      sel.appendChild(opt);
    });

    // Restore previous selection if still valid
    if ([...sel.options].some(o => o.value === current)) {
      sel.value = current;
    }
  });
}

/** Show or hide an inline error. */
function setFieldError(inputEl, errorEl, message) {
  if (message) {
    inputEl.classList.add('is-invalid');
    errorEl.textContent = message;
    errorEl.removeAttribute('hidden');
  } else {
    inputEl.classList.remove('is-invalid');
    errorEl.setAttribute('hidden', '');
  }
}

/** Validate and submit the add-transaction form. */
function handleTransactionSubmit(e) {
  e.preventDefault();

  const nameInput  = document.getElementById('itemName');
  const amtInput   = document.getElementById('itemAmount');
  const catSelect  = document.getElementById('itemCategory');
  const nameErr    = document.getElementById('itemNameError');
  const amtErr     = document.getElementById('itemAmountError');
  const catErr     = document.getElementById('itemCategoryError');

  let valid = true;

  const name   = nameInput.value.trim();
  const amount = parseFloat(amtInput.value);
  const catId  = catSelect.value;

  setFieldError(nameInput, nameErr, name === '' ? 'Item name is required.' : null);
  if (name === '') valid = false;

  setFieldError(amtInput, amtErr, (!amtInput.value || isNaN(amount) || amount <= 0)
    ? 'Enter a valid positive amount.' : null);
  if (!amtInput.value || isNaN(amount) || amount <= 0) valid = false;

  setFieldError(catSelect, catErr, !catId ? 'Please select a category.' : null);
  if (!catId) valid = false;

  if (!valid) return;

  const transaction = {
    id:       uid(),
    name,
    amount,
    category: catId,
    date:     new Date().toISOString(),
  };

  setState({ transactions: [transaction, ...state.transactions] });

  // Reset form
  e.target.reset();
  setFieldError(nameInput, nameErr, null);
  setFieldError(amtInput,  amtErr,  null);
  setFieldError(catSelect, catErr,  null);
  nameInput.focus();
}

/* ── TASK 4: TRANSACTION LIST WITH DELETE ──────────────────── */

/** Build the filtered + sorted transaction array for rendering. */
function getFilteredAndSortedTransactions() {
  let list = [...state.transactions];

  // Filter by category
  if (uiState.filterCategory !== 'all') {
    list = list.filter(tx => tx.category === uiState.filterCategory);
  }

  // Sort
  switch (uiState.sortOrder) {
    case 'oldest':
      list.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'amount-desc':
      list.sort((a, b) => b.amount - a.amount);
      break;
    case 'amount-asc':
      list.sort((a, b) => a.amount - b.amount);
      break;
    case 'category-az': {
      const getName = tx => getCategoryById(tx.category)?.name ?? '';
      list.sort((a, b) => getName(a).localeCompare(getName(b)));
      break;
    }
    case 'newest':
    default:
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return list;
}

/** Render the transaction list panel. */
function renderTransactionList() {
  const listEl   = document.getElementById('transactionList');
  const emptyEl  = document.getElementById('listEmpty');
  if (!listEl || !emptyEl) return;

  const items        = getFilteredAndSortedTransactions();
  const total        = state.transactions.reduce((s, tx) => s + tx.amount, 0);
  const limit        = state.settings.spendingLimit;

  listEl.innerHTML = '';

  if (items.length === 0) {
    emptyEl.removeAttribute('hidden');
    return;
  }
  emptyEl.setAttribute('hidden', '');

  items.forEach(tx => {
    const cat      = getCategoryById(tx.category);
    const catName  = cat ? cat.name  : 'Unknown';
    const catColor = cat ? cat.color : '#999';
    const overLimit = limit > 0 && total > limit;

    const item = document.createElement('div');
    item.className = 'transaction-item' + (overLimit ? ' over-limit' : '');
    item.dataset.id = tx.id;

    item.innerHTML = `
      <span class="transaction-color-dot" style="background-color:${catColor}"></span>
      <div class="transaction-body">
        <p class="transaction-name">${escapeHtml(tx.name)}</p>
        <div class="transaction-meta">
          <span class="category-badge" style="background-color:${catColor}">${escapeHtml(catName)}</span>
          <span class="transaction-date">${formatDate(tx.date)}</span>
        </div>
      </div>
      <span class="transaction-amount">${formatIDR(tx.amount)}</span>
      <button class="transaction-delete" data-id="${tx.id}" aria-label="Delete ${escapeHtml(tx.name)}">✕</button>
    `;

    listEl.appendChild(item);
  });
}

/** Escape HTML special characters to prevent XSS. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Handle delete button clicks inside the transaction list (event delegation). */
function handleListClick(e) {
  const deleteBtn = e.target.closest('.transaction-delete');
  if (!deleteBtn) return;
  const id = deleteBtn.dataset.id;
  openDeleteModal(id);
}

/* ── DELETE CONFIRM MODAL ──────────────────────────────────── */

function openDeleteModal(id) {
  uiState.pendingDeleteId = id;
  document.getElementById('deleteModal').removeAttribute('hidden');
  document.getElementById('deleteConfirmBtn').focus();
}

function closeDeleteModal() {
  uiState.pendingDeleteId = null;
  document.getElementById('deleteModal').setAttribute('hidden', '');
}

function confirmDelete() {
  if (!uiState.pendingDeleteId) return;
  const updated = state.transactions.filter(tx => tx.id !== uiState.pendingDeleteId);
  closeDeleteModal();
  setState({ transactions: updated });
}

/* ── TASK 5: TOTAL BALANCE & SPENDING LIMIT ────────────────── */

function renderBalanceSummary() {
  const total    = state.transactions.reduce((s, tx) => s + tx.amount, 0);
  const limit    = state.settings.spendingLimit;

  const balanceEl   = document.getElementById('totalBalance');
  const limitInfo   = document.getElementById('limitInfo');
  const limitDisplay= document.getElementById('limitDisplay');
  const limitAlert  = document.getElementById('limitAlert');
  const limitInput  = document.getElementById('spendingLimitInput');

  if (balanceEl)    balanceEl.textContent   = formatIDR(total);
  if (limitInput && document.activeElement !== limitInput) {
    limitInput.value = limit > 0 ? limit : '';
  }

  if (limit > 0) {
    limitInfo?.removeAttribute('hidden');
    if (limitDisplay) limitDisplay.textContent = formatIDR(limit);
    if (total > limit) {
      limitAlert?.removeAttribute('hidden');
      // Re-trigger shake animation
      limitAlert?.classList.remove('alert--danger');
      void limitAlert?.offsetWidth; // reflow
      limitAlert?.classList.add('alert--danger');
    } else {
      limitAlert?.setAttribute('hidden', '');
    }
  } else {
    limitInfo?.setAttribute('hidden', '');
    limitAlert?.setAttribute('hidden', '');
  }
}

function handleSaveLimit() {
  const input = document.getElementById('spendingLimitInput');
  const val   = parseFloat(input.value);
  const limit = (!input.value || isNaN(val) || val < 0) ? 0 : val;
  setState({ settings: { ...state.settings, spendingLimit: limit } });
}

/* ── TASK 6: PIE CHART WITH CHART.JS ───────────────────────── */

function renderChart() {
  const canvas   = document.getElementById('spendingChart');
  const emptyEl  = document.getElementById('chartEmpty');
  const wrapper  = document.getElementById('chartWrapper');
  if (!canvas) return;

  // Aggregate totals per category
  const totals = {};
  state.transactions.forEach(tx => {
    totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
  });

  const catIds    = Object.keys(totals);
  const labels    = catIds.map(id => getCategoryById(id)?.name ?? id);
  const data      = catIds.map(id => totals[id]);
  const colors    = catIds.map(id => getCategoryById(id)?.color ?? '#ccc');
  const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#f0f0f0' : '#111111';

  if (catIds.length === 0) {
    wrapper?.setAttribute('hidden', '');
    emptyEl?.removeAttribute('hidden');
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  wrapper?.removeAttribute('hidden');
  emptyEl?.setAttribute('hidden', '');

  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor:    colors,
      borderColor:        isDark ? '#1a1a2e' : '#ffffff',
      borderWidth:        3,
      hoverBorderWidth:   4,
      hoverOffset:        8,
    }],
  };

  const chartOptions = {
    responsive:  true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color:      textColor,
          font:       { family: "'Space Grotesk', sans-serif", weight: '600', size: 13 },
          padding:    16,
          boxWidth:   14,
          boxHeight:  14,
        },
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            const val   = ctx.parsed;
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct   = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
            return ` ${formatIDR(val)}  (${pct}%)`;
          },
        },
      },
    },
  };

  if (chartInstance) {
    // Update existing chart instead of recreating
    chartInstance.data            = chartData;
    chartInstance.options.plugins.legend.labels.color = textColor;
    chartInstance.update('active');
  } else {
    chartInstance = new Chart(canvas, {
      type:    'pie',
      data:    chartData,
      options: chartOptions,
    });
  }
}

/* ── TASK 7: SORT & FILTER TOOLBAR ─────────────────────────── */

function renderToolbar() {
  const filterSel = document.getElementById('filterCategory');
  const sortSel   = document.getElementById('sortOrder');

  // Sync filter options with current categories
  populateCategorySelects();

  if (filterSel) filterSel.value = uiState.filterCategory;
  if (sortSel)   sortSel.value   = uiState.sortOrder;
}

function handleFilterChange(e) {
  uiState.filterCategory = e.target.value;
  renderTransactionList();
}

function handleSortChange(e) {
  uiState.sortOrder = e.target.value;
  renderTransactionList();
}

/* ── TASK 8: CATEGORY MANAGER ──────────────────────────────── */

function renderCategoryList() {
  const listEl = document.getElementById('categoryList');
  if (!listEl) return;

  listEl.innerHTML = '';

  state.categories.forEach(cat => {
    const usedCount = state.transactions.filter(tx => tx.category === cat.id).length;

    const item = document.createElement('div');
    item.className  = 'category-item';
    item.dataset.id = cat.id;

    item.innerHTML = `
      <span class="category-color-swatch" style="background-color:${cat.color}"></span>
      <span class="category-name-display" id="cat-label-${cat.id}">${escapeHtml(cat.name)}</span>
      <input
        type="text"
        class="category-name-input"
        id="cat-input-${cat.id}"
        value="${escapeHtml(cat.name)}"
        aria-label="Edit category name"
        hidden
      />
      <div class="category-actions">
        <button class="btn-cat btn-cat--edit"   data-action="edit"   data-id="${cat.id}" title="Rename">✏️</button>
        <button class="btn-cat btn-cat--save"   data-action="save"   data-id="${cat.id}" title="Save" hidden>✔</button>
        <button class="btn-cat btn-cat--delete" data-action="delete" data-id="${cat.id}"
          title="${usedCount > 0 ? 'Used by ' + usedCount + ' transaction(s) — cannot delete' : 'Delete category'}"
          ${usedCount > 0 ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>🗑</button>
      </div>
    `;
    listEl.appendChild(item);
  });
}

function handleCategoryManagerClick(e) {
  const btn    = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id     = btn.dataset.id;
  const item   = document.querySelector(`.category-item[data-id="${id}"]`);
  if (!item) return;

  const labelEl = item.querySelector(`#cat-label-${id}`);
  const inputEl = item.querySelector(`#cat-input-${id}`);
  const editBtn = item.querySelector('[data-action="edit"]');
  const saveBtn = item.querySelector('[data-action="save"]');

  if (action === 'edit') {
    labelEl.setAttribute('hidden', '');
    inputEl.removeAttribute('hidden');
    editBtn.setAttribute('hidden', '');
    saveBtn.removeAttribute('hidden');
    inputEl.focus();
    inputEl.select();
  }

  if (action === 'save') {
    const newName = inputEl.value.trim();
    const nameErr = document.getElementById('newCategoryError');
    const isDuplicate = state.categories.some(c => c.id !== id && c.name.toLowerCase() === newName.toLowerCase());

    if (!newName || isDuplicate) {
      inputEl.classList.add('is-invalid');
      return;
    }
    inputEl.classList.remove('is-invalid');

    const updated = state.categories.map(c => c.id === id ? { ...c, name: newName } : c);
    setState({ categories: updated });
  }

  if (action === 'delete') {
    const inUse = state.transactions.some(tx => tx.category === id);
    if (inUse) return; // guard
    const updated = state.categories.filter(c => c.id !== id);
    setState({ categories: updated });
  }
}

function handleAddCategory() {
  const nameInput  = document.getElementById('newCategoryName');
  const colorInput = document.getElementById('newCategoryColor');
  const errorEl    = document.getElementById('newCategoryError');

  const name  = nameInput.value.trim();
  const color = colorInput.value;

  const isDuplicate = state.categories.some(c => c.name.toLowerCase() === name.toLowerCase());

  if (!name || isDuplicate) {
    nameInput.classList.add('is-invalid');
    errorEl?.removeAttribute('hidden');
    return;
  }
  nameInput.classList.remove('is-invalid');
  errorEl?.setAttribute('hidden', '');

  const newCat = {
    id:    'cat_' + Date.now(),
    name,
    color,
  };

  setState({ categories: [...state.categories, newCat] });
  nameInput.value = '';
  colorInput.value = '#ff6b35';
}

function toggleCategoryManager() {
  const panel  = document.getElementById('categoryManagerPanel');
  const togBtn = document.getElementById('toggleCategoryManager');
  if (!panel || !togBtn) return;

  const isHidden = panel.hasAttribute('hidden');
  if (isHidden) {
    panel.removeAttribute('hidden');
    togBtn.textContent = 'Hide';
    togBtn.setAttribute('aria-expanded', 'true');
  } else {
    panel.setAttribute('hidden', '');
    togBtn.textContent = 'Show';
    togBtn.setAttribute('aria-expanded', 'false');
  }
}

/* ── TASK 9: MONTHLY SUMMARY VIEW ──────────────────────────── */

/** Group transactions by YYYY-MM, return sorted newest first. */
function groupTransactionsByMonth() {
  const map = {};
  state.transactions.forEach(tx => {
    const ym = toYearMonth(tx.date);
    if (!map[ym]) map[ym] = [];
    map[ym].push(tx);
  });
  // Sort months newest first
  return Object.keys(map)
    .sort((a, b) => b.localeCompare(a))
    .map(ym => ({ ym, transactions: map[ym] }));
}

function renderMonthlySummary() {
  const containerEl = document.getElementById('monthlySummaryList');
  const emptyEl     = document.getElementById('monthlyEmpty');
  if (!containerEl || !emptyEl) return;

  const groups = groupTransactionsByMonth();

  containerEl.innerHTML = '';

  if (groups.length === 0) {
    emptyEl.removeAttribute('hidden');
    return;
  }
  emptyEl.setAttribute('hidden', '');

  groups.forEach(({ ym, transactions }) => {
    const monthTotal = transactions.reduce((s, tx) => s + tx.amount, 0);

    // Aggregate per category for this month
    const catTotals = {};
    transactions.forEach(tx => {
      catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
    });

    const group = document.createElement('div');
    group.className = 'monthly-group';

    const catRows = Object.keys(catTotals).map(catId => {
      const cat    = getCategoryById(catId);
      const name   = cat ? cat.name  : 'Unknown';
      const color  = cat ? cat.color : '#999';
      const amt    = catTotals[catId];
      const pct    = monthTotal > 0 ? ((amt / monthTotal) * 100).toFixed(1) : 0;
      return `
        <div class="monthly-row">
          <div class="monthly-cat-info">
            <span class="monthly-cat-dot" style="background-color:${color}"></span>
            <span class="monthly-cat-name">${escapeHtml(name)}</span>
          </div>
          <div class="monthly-cat-right">
            <span class="monthly-cat-amount">${formatIDR(amt)}</span>
            <span class="monthly-cat-pct">${pct}%</span>
          </div>
        </div>`;
    }).join('');

    group.innerHTML = `
      <div class="monthly-header" role="button" tabindex="0" aria-expanded="true" data-ym="${ym}">
        <span class="monthly-month">${formatMonthLabel(ym)}</span>
        <span class="monthly-total">${formatIDR(monthTotal)}</span>
        <em class="monthly-toggle-icon">▲</em>
      </div>
      <div class="monthly-body" id="monthly-body-${ym}">
        ${catRows}
      </div>
    `;
    containerEl.appendChild(group);
  });
}

/** Toggle monthly group expand/collapse. */
function handleMonthlySummaryClick(e) {
  const header = e.target.closest('.monthly-header');
  if (!header) return;

  const ym     = header.dataset.ym;
  const body   = document.getElementById(`monthly-body-${ym}`);
  const icon   = header.querySelector('.monthly-toggle-icon');
  if (!body || !icon) return;

  const isOpen = header.getAttribute('aria-expanded') === 'true';
  if (isOpen) {
    body.setAttribute('hidden', '');
    icon.textContent = '▼';
    header.setAttribute('aria-expanded', 'false');
  } else {
    body.removeAttribute('hidden');
    icon.textContent = '▲';
    header.setAttribute('aria-expanded', 'true');
  }
}

/* ── TAB SWITCHING ─────────────────────────────────────────── */

function switchTab(tab) {
  uiState.activeTab = tab;

  const tabAll     = document.getElementById('tabAll');
  const tabMonthly = document.getElementById('tabMonthly');
  const panelAll   = document.getElementById('panelAll');
  const panelMon   = document.getElementById('panelMonthly');
  const toolbar    = document.getElementById('toolbar');

  if (tab === 'all') {
    tabAll?.classList.add('tab-btn--active');
    tabMonthly?.classList.remove('tab-btn--active');
    tabAll?.setAttribute('aria-selected', 'true');
    tabMonthly?.setAttribute('aria-selected', 'false');
    panelAll?.removeAttribute('hidden');
    panelMon?.setAttribute('hidden', '');
    toolbar?.removeAttribute('hidden');
  } else {
    tabMonthly?.classList.add('tab-btn--active');
    tabAll?.classList.remove('tab-btn--active');
    tabMonthly?.setAttribute('aria-selected', 'true');
    tabAll?.setAttribute('aria-selected', 'false');
    panelMon?.removeAttribute('hidden');
    panelAll?.setAttribute('hidden', '');
    toolbar?.setAttribute('hidden', '');
    renderMonthlySummary();
  }
}

/* ── TASK 10: RENDER DISPATCHER ────────────────────────────── */

/**
 * Main render function — called every time state changes.
 * Dispatches to all sub-render functions.
 */
function render() {
  applyTheme(state.settings.theme);
  renderBalanceSummary();
  populateCategorySelects();
  renderToolbar();
  renderTransactionList();
  renderChart();
  renderCategoryList();

  // Re-render monthly panel if it's the active tab
  if (uiState.activeTab === 'monthly') {
    renderMonthlySummary();
  }
}

/* ── EVENT LISTENERS ───────────────────────────────────────── */

function initEventListeners() {
  // Theme toggle
  document.getElementById('themeToggleBtn')
    ?.addEventListener('click', toggleTheme);

  // Transaction form
  document.getElementById('transactionForm')
    ?.addEventListener('submit', handleTransactionSubmit);

  // Transaction list — delete (event delegation)
  document.getElementById('transactionList')
    ?.addEventListener('click', handleListClick);

  // Spending limit save
  document.getElementById('saveLimitBtn')
    ?.addEventListener('click', handleSaveLimit);

  // Allow Enter key on limit input
  document.getElementById('spendingLimitInput')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSaveLimit(); });

  // Filter & sort toolbar
  document.getElementById('filterCategory')
    ?.addEventListener('change', handleFilterChange);
  document.getElementById('sortOrder')
    ?.addEventListener('change', handleSortChange);

  // Tab switching
  document.getElementById('tabAll')
    ?.addEventListener('click', () => switchTab('all'));
  document.getElementById('tabMonthly')
    ?.addEventListener('click', () => switchTab('monthly'));

  // Category manager toggle
  document.getElementById('toggleCategoryManager')
    ?.addEventListener('click', toggleCategoryManager);

  // Add category button
  document.getElementById('addCategoryBtn')
    ?.addEventListener('click', handleAddCategory);

  // Allow Enter on new category name input
  document.getElementById('newCategoryName')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') handleAddCategory(); });

  // Category list actions (event delegation)
  document.getElementById('categoryList')
    ?.addEventListener('click', handleCategoryManagerClick);

  // Monthly summary — expand/collapse
  document.getElementById('monthlySummaryList')
    ?.addEventListener('click', handleMonthlySummaryClick);

  // Monthly summary keyboard a11y
  document.getElementById('monthlySummaryList')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') handleMonthlySummaryClick(e);
    });

  // Delete modal
  document.getElementById('deleteCancelBtn')
    ?.addEventListener('click', closeDeleteModal);
  document.getElementById('deleteConfirmBtn')
    ?.addEventListener('click', confirmDelete);

  // Close modal on overlay click
  document.getElementById('deleteModal')
    ?.addEventListener('click', e => {
      if (e.target === document.getElementById('deleteModal')) closeDeleteModal();
    });

  // Close modal on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDeleteModal();
  });

  // Watch for OS theme changes when set to 'auto'
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (state.settings.theme === 'auto') applyTheme('auto');
    });
}

/* ── BOOTSTRAP ─────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initEventListeners();
  render();
});
