# Requirements — DOMPETTIPIS (Expense & Budget Visualizer)

## Core Features

### RF-01: Input Form
- Fields: Item Name (text), Amount (number, min 1), Category (select)
- Validate all fields before submitting — show inline error messages
- Add the transaction to the list on valid submit
- Reset form after successful submission

### RF-02: Transaction List
- Scrollable list of all added transactions
- Each item shows: name, formatted amount (IDR), category badge (colored), date
- Delete button per item — requires confirmation modal before deletion
- Empty state message when list is empty

### RF-03: Total Balance
- Display total spending at the top of the dashboard
- Updates automatically whenever transactions are added or deleted
- Formatted as Indonesian Rupiah via `Intl.NumberFormat('id-ID')`

### RF-04: Visual Chart
- Pie chart showing spending distribution by category
- Built with Chart.js (CDN, no install required)
- Updates automatically when transactions change
- Tooltip shows amount (IDR) + percentage of total
- Placeholder shown when no transactions exist

### RF-05: Spending Limit
- User can set a global monthly spending limit
- Alert banner (red, shake animation) shown when total exceeds limit
- Limit of 0 = no limit active
- Persisted to localStorage

### RF-06: Custom Categories
- Default categories: Food (#ef233c), Transport (#3a86ff), Fun (#06d6a0)
- User can add new categories with a name and color picker
- User can rename categories (inline edit)
- User can delete categories — blocked if category is used by any transaction

### RF-07: Monthly Summary
- Tab switch between "All Transactions" and "Monthly Summary"
- Transactions grouped by month (YYYY-MM), sorted newest first
- Each month card is expandable/collapsible
- Shows: month name, total spending, per-category breakdown with percentage

### RF-08: Sort & Filter Toolbar
- Filter by category (All + each category)
- Sort options: Newest First, Oldest First, Amount ↓, Amount ↑, Category A-Z
- Filter and sort work in combination
- UI state is not persisted (resets on page reload)

### RF-09: Dark / Light Mode
- Default follows OS preference via `prefers-color-scheme`
- Toggle button in the navbar switches between light and dark
- User preference saved to `state.settings.theme` in localStorage

---

## Non-Functional Requirements

### NFR-01: Simplicity
- Clean, minimal interface
- No complex setup — open index.html directly in browser
- No test framework required

### NFR-02: Performance
- Fast load time (no bundler, no build step)
- Responsive UI — no noticeable lag when updating data
- Chart instance is reused (not recreated) on each render

### NFR-03: Visual Design — Neubrutalism
- High-contrast color palette with vibrant accent colors
- Thick 3px black borders on all containers, cards, inputs
- Hard unblurred offset drop shadows (4px 4px 0px #000)
- Sharp corners (border-radius: 4px max)
- Space Grotesk typeface, strong font-weight hierarchy

### NFR-04: Responsiveness
- Single-column layout on mobile (< 768px)
- Max-width 560px on mobile, 680px on desktop
- All touch targets adequately sized

### NFR-05: Accessibility
- All form inputs have associated `<label>` elements
- Interactive elements are keyboard navigable
- ARIA roles and labels on modal and tab elements
- Sufficient color contrast for text

### NFR-06: Browser Compatibility
- Chrome, Firefox, Edge, Safari (modern versions)
- Uses only standard Web APIs: localStorage, Intl, CSS custom properties

### NFR-07: File Structure
- Only 1 CSS file: `css/style.css`
- Only 1 JS file: `js/app.js`
- No backend server required
- No external dependencies beyond Chart.js and Google Fonts (both CDN)

---

## Data Model

```js
// localStorage keys
"ebv_transactions"  →  Transaction[]
"ebv_categories"    →  Category[]
"ebv_settings"      →  Settings

// Transaction
{ id: string, name: string, amount: number, category: string, date: string (ISO) }

// Category
{ id: string, name: string, color: string (hex) }

// Settings
{ theme: "auto" | "light" | "dark", spendingLimit: number }
```
