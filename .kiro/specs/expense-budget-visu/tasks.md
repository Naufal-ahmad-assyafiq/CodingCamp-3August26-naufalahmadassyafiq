# Task Breakdown — DOMPETTIPIS (Expense & Budget Visualizer)

> Each task results in a working, demoable increment of functionality.
> All tasks build on the previous one and wire into the existing app.

---

## Task 1: Project Scaffold & Neubrutalism Base Styles
**Status:** ✅ Complete

**Objective:** Create folder structure, base HTML shell, and full Neubrutalism CSS design system.

**Implementation:**
- `index.html` with semantic HTML skeleton (header, main sections, script/link tags)
- Load Chart.js v4.4.0 via CDN
- Load Space Grotesk from Google Fonts
- `css/style.css`: CSS custom properties (`:root`) for all color, border, shadow tokens
- Two complete theme sets: light and dark via `[data-theme="dark"]`
- Base styles: reset, typography, `.card`, `.btn`, `.form-input`, `.alert`
- Sticky header with orange Neubrutalism navbar

**Demo:** Page opens with Neubrutalism layout. Dark/light toggle reads OS preference.

---

## Task 2: State Manager & localStorage Layer
**Status:** ✅ Complete

**Objective:** Central state module as single source of truth, fully persisted.

**Implementation:**
- `state` object: `{ transactions, categories, settings }`
- `loadState()` — reads localStorage, applies defaults on first load
  - Default categories: Food, Transport, Fun
  - Default settings: `{ theme: 'auto', spendingLimit: 0 }`
- `saveState()` — serializes state to `ebv_*` localStorage keys
- `setState(partial)` — merges, saves, calls `render()`
- `render()` — main dispatcher (calls all sub-renders)
- Bootstrap on `DOMContentLoaded`

**Demo:** DevTools → Application → localStorage shows `ebv_transactions`, `ebv_categories`, `ebv_settings` with correct defaults after page load.

---

## Task 3: Input Form & Validation
**Status:** ✅ Complete

**Objective:** Functional form to add transactions with inline validation.

**Implementation:**
- Form fields: Item Name, Amount (number), Category (select, dynamic from state)
- `handleTransactionSubmit()`: validates all fields, shows inline errors with `.is-invalid` class
- Valid submit: creates `{ id, name, amount, category, date }`, prepends to `state.transactions`
- `setFieldError()` helper toggles error visibility
- Form reset + focus after successful submit
- `escapeHtml()` on all user strings

**Demo:** Submit form → transaction saved. Submit empty → inline errors appear. Refresh → data persists.

---

## Task 4: Transaction List with Delete
**Status:** ✅ Complete

**Objective:** Scrollable transaction list with delete confirmation.

**Implementation:**
- `renderTransactionList()`: generates `.transaction-item` cards from filtered+sorted list
- Each card: color dot, name, category badge (colored), date, formatted IDR amount, delete button
- Delete uses event delegation on `#transactionList`
- `openDeleteModal()` / `confirmDelete()` / `closeDeleteModal()` — modal flow
- Close on Escape key and overlay click
- Over-limit items highlighted with `.over-limit` class
- Empty state shown when list is empty

**Demo:** Transactions appear in list. Delete → confirmation modal → item removed. Empty state shows when list is cleared.

---

## Task 5: Total Balance & Spending Limit Alert
**Status:** ✅ Complete

**Objective:** Real-time total display and visual alert for budget overrun.

**Implementation:**
- `renderBalanceSummary()`: sums all `tx.amount`, formats with `Intl.NumberFormat('id-ID')`
- Budget settings: number input + "Save Limit" button (also triggers on Enter)
- `handleSaveLimit()` updates `state.settings.spendingLimit`
- Alert banner uses CSS `@keyframes shake` re-triggered via DOM reflow trick
- Limit display shown in balance card when limit > 0

**Demo:** Total updates in real time. Set limit → add transactions until exceeded → red shake alert appears. Set 0 → alert disappears.

---

## Task 6: Pie Chart with Chart.js
**Status:** ✅ Complete

**Objective:** Live pie chart of spending by category.

**Implementation:**
- `<canvas id="spendingChart">` inside `.chart-wrapper`
- `renderChart()`: aggregates `totals[catId]` from all transactions
- Chart initialized once; subsequent renders call `chartInstance.update('active')`
- Slice colors pulled from `state.categories[].color`
- Tooltip callback: `formatIDR(value) + percentage`
- Legend at bottom with Space Grotesk font
- Chart hidden, placeholder shown when no transactions

**Demo:** Add transactions in different categories → pie chart appears and updates instantly. Matches dark/light theme.

---

## Task 7: Sort & Filter Toolbar
**Status:** ✅ Complete

**Objective:** Combined filter-by-category and sort toolbar above the transaction list.

**Implementation:**
- `renderToolbar()` / `populateCategorySelects()`: syncs dropdowns with `state.categories`
- `handleFilterChange()` → updates `uiState.filterCategory`
- `handleSortChange()` → updates `uiState.sortOrder`
- `getFilteredAndSortedTransactions()`: applies both filter and sort before rendering
- Sort options: newest, oldest, amount-desc, amount-asc, category-az
- Toolbar hidden when Monthly tab is active

**Demo:** Filter + sort work independently and in combination. Category dropdown stays in sync with category manager changes.

---

## Task 8: Category Manager
**Status:** ✅ Complete

**Objective:** Full CRUD UI for managing expense categories.

**Implementation:**
- Collapsible section toggled by "Show/Hide" button (`aria-expanded`)
- `handleAddCategory()`: validates name (required + unique), creates `{ id, name, color }`
- `renderCategoryList()`: renders `.category-item` per category with color swatch
- Inline rename: edit button shows input, save button commits change
- Delete button disabled (opacity 0.4) if `usedCount > 0` — title shows reason
- All changes go through `setState()` — instantly reflected in form dropdown, filter, chart

**Demo:** Add "Healthcare" with custom color → appears in form and chart. Try deleting a used category → button is disabled with tooltip.

---

## Task 9: Monthly Summary View
**Status:** ✅ Complete

**Objective:** Collapsible monthly grouping of transactions with per-category breakdown.

**Implementation:**
- Tab buttons `#tabAll` / `#tabMonthly` call `switchTab()`
- `groupTransactionsByMonth()`: groups by `YYYY-MM`, sorts newest first
- `renderMonthlySummary()`: renders `.monthly-group` cards with header + body
- Header: month name (formatted `toLocaleDateString`) + total
- Body: per-category row with color dot, name, amount, percentage badge
- `handleMonthlySummaryClick()`: toggles `hidden` on `.monthly-body` + flips ▲/▼ icon
- Keyboard accessible (Enter/Space triggers toggle)

**Demo:** Switch to Monthly tab → months appear grouped, expandable. Correct totals and percentages per category.

---

## Task 10: Polish, Responsiveness & Final Wiring
**Status:** ✅ Complete

**Objective:** Full integration, mobile layout, and accessibility audit.

**Implementation:**
- Responsive CSS: single-column on mobile (`< 600px`), max-width 680px on desktop
- `@keyframes fadeInDown` on new `.transaction-item` cards
- Dark mode consistently applied via CSS custom properties across all components
- Delete confirmation via modal (not `confirm()`)
- All inputs have `<label>` elements; modal has `role="dialog"` + `aria-modal`
- Tab buttons have `role="tab"` + `aria-selected`
- `render()` dispatcher calls all sub-renders in correct order
- `expense-visualizer.kiro` documentation at project root
- `.kiro/specs/expense-budget-visu/` spec folder created

**Demo:** App runs fully integrated on mobile and desktop. All 9 feature tasks work together. Data survives page refresh.

---

## Navbar Redesign (Post v1.0)
**Status:** ✅ Complete

**Objective:** Rebrand navbar to DOMPETTIPIS with tagline, keep Neubrutalism style.

**Changes:**
- `index.html`: replaced `💸 BudgetViz` with `🪙` coin icon + `.brand-text-group` flex column
- Added `<h1 class="brand-title">DOMPETTIPIS</h1>` (uppercase, letter-spacing: 1.5px)
- Added `<p class="brand-tagline">Sistem pencatat yang cuma bisa pasrah...</p>`
- `css/style.css`: new `.brand-text-group`, `.brand-tagline` rules; header-inner changed to `align-items: flex-start`

**Demo:** Navbar shows coin icon, bold uppercase DOMPETTIPIS, and italic tagline below — all in Neubrutalism style on orange background.
