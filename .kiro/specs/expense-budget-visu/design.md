# Design — DOMPETTIPIS (Expense & Budget Visualizer)

## Overview

Single-page application (SPA) built without a framework. All state is held in a central
`state` object in `app.js`, persisted to localStorage on every mutation. A single `render()`
dispatcher re-renders all components on every state change.

---

## Folder Structure

```
project-root/
├── index.html                          ← App shell, all HTML sections
├── css/
│   └── style.css                       ← All styles (Neubrutalism design system)
├── js/
│   └── app.js                          ← All logic (~890 lines)
├── assets/                             ← Reserved for icons/images
├── .kiro/
│   └── specs/
│       └── expense-budget-visu/
│           ├── .config.kiro
│           ├── design.md               ← This file
│           ├── requirements.md
│           └── tasks.md
├── .vscode/
│   └── settings.json
└── README.md
```

---

## Architecture

```
DOMContentLoaded
  └── loadState()          Read localStorage → populate state{}
  └── initEventListeners() Attach all event handlers
  └── render()             Initial render pass

state mutation (e.g. add transaction)
  └── setState(partial)
        ├── Object.assign(state, partial)
        ├── saveState()    Write to localStorage
        └── render()       Full re-render

render() dispatcher
  ├── applyTheme()
  ├── renderBalanceSummary()
  ├── populateCategorySelects()
  ├── renderToolbar()
  ├── renderTransactionList()
  ├── renderChart()
  ├── renderCategoryList()
  └── renderMonthlySummary()   (only if monthly tab is active)
```

---

## Component Map

| Component            | HTML element/id              | Render function              |
|----------------------|------------------------------|------------------------------|
| Navbar               | `header.app-header`          | static HTML + applyTheme()   |
| Balance summary      | `#balanceSection`            | renderBalanceSummary()        |
| Spending limit alert | `#limitAlert`                | renderBalanceSummary()        |
| Input form           | `#transactionForm`           | populateCategorySelects()     |
| Transaction list     | `#transactionList`           | renderTransactionList()       |
| Sort/Filter toolbar  | `.toolbar`                   | renderToolbar()               |
| Pie chart            | `#spendingChart` (canvas)    | renderChart()                 |
| Monthly summary      | `#monthlySummaryList`        | renderMonthlySummary()        |
| Category manager     | `#categoryManagerPanel`      | renderCategoryList()          |
| Delete modal         | `#deleteModal`               | openDeleteModal() / close     |

---

## Design System — Neubrutalism Tokens

```css
--border:     3px solid #000
--shadow:     4px 4px 0px #000
--shadow-sm:  3px 3px 0px #000
--shadow-lg:  6px 6px 0px #000
--radius:     4px
```

### Color Palette

| Token               | Light          | Dark           |
|---------------------|----------------|----------------|
| `--color-bg`        | `#f5f0e8`      | `#1a1a2e`      |
| `--color-surface`   | `#ffffff`      | `#16213e`      |
| `--color-border`    | `#000000`      | `#e0e0e0`      |
| `--color-primary`   | `#ff6b35`      | `#ff6b35`      |
| `--color-secondary` | `#ffd166`      | `#ffd166`      |
| `--color-danger`    | `#ef233c`      | `#ef233c`      |
| `--color-success`   | `#06d6a0`      | `#06d6a0`      |

### Typography

- Font family: `Space Grotesk`, fallback `Inter`, `sans-serif`
- Base size: `1rem` (16px)
- Weight hierarchy: 400 (body) → 500 (label) → 600 (badge) → 700 (heading/button)
- Brand title: uppercase, `letter-spacing: 1.5px`, `text-shadow: 2px 2px 0 rgba(0,0,0,0.25)`

---

## Navbar Design

```
┌─────────────────────────────────────────────────────────┐  ← 3px black border-bottom
│  🪙  DOMPETTIPIS                               [🌙/☀️]  │  ← orange bg (#ff6b35)
│      Sistem pencatat yang cuma bisa pasrah...           │
└─────────────────────────────────────────────────────────┘
   ↑ coin icon  ↑ brand-title (uppercase, bold)
                ↑ brand-tagline (0.72rem, 75% opacity)
```

- Sticky (`position: sticky; top: 0; z-index: 100`)
- `align-items: flex-start` so tagline wraps below title naturally
- Toggle button aligned to top-right

---

## State Shape

```js
state = {
  transactions: Transaction[],   // persisted: ebv_transactions
  categories:   Category[],      // persisted: ebv_categories
  settings:     Settings,        // persisted: ebv_settings
}

uiState = {
  filterCategory:  string,       // 'all' | category.id
  sortOrder:       string,       // 'newest' | 'oldest' | 'amount-desc' | ...
  activeTab:       string,       // 'all' | 'monthly'
  pendingDeleteId: string|null,  // transaction id awaiting delete confirmation
}
```

---

## Security Note

All user-provided strings (transaction name, category name) are passed through `escapeHtml()`
before being inserted into the DOM via `innerHTML`, preventing XSS injection.
