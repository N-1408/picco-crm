# PICCO CRM Chat Memory

## Frontend Stack Direction
- Stay with the existing vanilla HTML/CSS/JS architecture (no React migration; reuse current files).
- Use **Google Material Icons** via `<link href='https://fonts.googleapis.com/icon?family=Material+Icons' rel='stylesheet'>` (already embedded).
- Layout pattern: fixed glassmorphism sidebar + top bar. `[data-sidebar-toggle]` controls mobile visibility and `[data-sidebar-close]` handles the sidebar back button.
- Dashboards rely on responsive icon grids (`.picco-icon-grid`) and glass metric cards (`.picco-metric`).
- Creation forms remain collapsible behind `[data-collapse-target]` triggers; edit/delete run through modals with Material icons.
- Toast notifications use `showToast()` from `frontend/js/ui.js`; empty states via `renderEmptyState()`.

## API Expectations
- All CRUD actions hit existing helper functions in `frontend/js/api.js` (which call `/api/*`).
- `fetchAgentStats(agentId, params)` accepts optional query params for date filtering.

## Styling System Notes
- Global gradient background: `linear-gradient(135deg, #1E3A8A, #3B82F6, #00A1C6)`. 
- Use CSS variables (`--card-bg`, `--card-border`, `--glass-shadow`, etc.) for glass components.
- Material icons + Inter typography drive the calm, business-dashboard look.

## Deployment Notes
- Repository: `https://github.com/N-1408/picco-crm` (latest push `965529c`).
- Secrets (.env) are not committed; configure bot/backend/frontend env vars directly on hosting services.

## Prior Prompt (Adapted for Current Stack)
You are rebuilding the entire PICCO CRM Telegram Mini App using **vanilla HTML, CSS, and JavaScript** (no React/Vue). Fix all non-working logic, redesign the UI to be modern, aesthetic, and eye-friendly. This version must be fully responsive, bug-free, and connected to working backend APIs.

---

### 1. CORE FUNCTIONALITY
- All buttons, edit forms, panels, modals, filters, and exports must work correctly.
- Every action (add, edit, delete, export, navigation) must have working JS logic and API connection.
- The app must detect returning users:
  - If the user is already registered, open the Agent Panel directly without re-login.
  - If new, redirect to the bot link: [@picco_agent_bot](https://t.me/picco_agent_bot).

---

### 2. DESIGN SYSTEM
- Use soft modern colors: white/blue/gray/pastel/mint accents for eye comfort.
- Subtle gradients, light shadows, hover transitions, and soft animations across buttons/cards/icons.
- Typography: Inter (already in use).
- Overall tone: calm business dashboard (Apple-like).

---

### 3. NAVIGATION IMPROVEMENTS
- Sidebar stays on the left, collapsible via menu icon, with icons + labels.
- Replace old back text with a sidebar close button (`close` or `arrow_circle_left`).
- Page-level back arrow (`arrow_back`) appears only on nested views and pops the previous state.

---

### 4. DASHBOARD STRUCTURE
- Admin & Agent dashboards stack sections vertically with clear headers and spacing.
- Each section uses Material icons for titles and responsive grid cards.
- Smooth transitions between sections.

---

### 5. FILTER BAR UPDATE
- Replace large horizontal filter bar with compact inline selectors (From/To inputs, dropdowns). Ensure mobile friendliness.

---

### 6. LOCATION TOOL
- Add a store location capture feature using the **Telegram Location API** or **Google Maps JS API** (preferred if free).
- Agents tap "Mark on map", choose location (modal/inline), and lat/lng is saved.
- Admins get a read-only map view of store locations with soft map styling.

---

### 7. ADMIN AGENTS PANEL
- Display: Agent Name, Phone Number, Total Orders, Join Date (no Telegram ID).
- Include avatar placeholders and pastel backgrounds for rows.

---

### 8. STATISTICS UPGRADE
- Use Chart.js (already integrated) with pleasant non-repetitive colors and light animations.
- KPI cards get gradient backgrounds + subtle animations.
- Trigger animations on load/scroll where possible.

---

### 9. EXPORT FIXES
- PDF export should include charts and tables with clear formatting.
- Excel export requires Uzbek headers, bold top row with light pastel background, and well-aligned columns.

---

### 10. FRONTEND REFACTOR
- Keep vanilla JS modules; organize code by responsibility (api.js, admin.js, agent.js, ui.js, etc.).
- Modularize repeated view logic into helpers/components where feasible (without a framework).
- Ensure responsive layout at 360px, 768px, 1440px using CSS Grid/Flex + `clamp()` typography.

---

### Quality Bar
- All interactive pieces must be wired to the backend endpoints and show toast feedback.
- Verify mobile/tablet/desktop responsiveness.
- Maintain clean, commented code as needed, and keep Material Icons consistent throughout.
