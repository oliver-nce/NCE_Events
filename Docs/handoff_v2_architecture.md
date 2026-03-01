# Handoff: Panel Page Architecture v2

## Purpose

This document provides context for a new agent to continue the design and
implementation of the Panel Page v2 architecture. Read this alongside
`panel_page_architecture_v2.md` for the full spec.

---

## Background

The NCE Events app (`nce_events`) is a custom Frappe v15 application that
provides a multi-panel data explorer. Users select a row in Panel 1 (e.g. an
event), and Panel 2 loads related data (e.g. players registered for that event).

### What exists today (v1)

- A working multi-panel renderer: `public/js/panel_page/ui.js`, `store.js`,
  `public/css/panel_page.css`
- A Frappe Page at `/app/panel-view/{page-name}` that loads configs and renders panels
- A `Panel Page` DocType (parent) with a `Panel Definition` child table
- A server API (`nce_events/api/panel_api.py`) with:
  - `get_active_pages()` — lists active Panel Pages for the landing page
  - `get_page_config(page_name)` — returns display config for a page
  - `get_panel_data(page_name, panel_number, selections, limit, start)` — executes
    raw SQL from the Panel Definition record, substitutes cross-panel references,
    returns paginated results
- An embedded config approach (`config.js`) where page display config is baked into
  the client JS (bypasses the database for config)
- Working features: bold fields, gender color-coding (left-border indicator using
  `male_hex`/`female_hex`), hidden fields, column header formatting, double-click
  drill-down, drag-resize panels, Load More pagination, card popover on single-click,
  header buttons (Sheets/SMS/Email stubs), filter dropdowns

### Problems with v1

- Raw SQL queries stored in DocType text fields — hard to test independently
- Display config can get out of sync between the DB record and `config.js`
- No standard way to test a panel's data query in isolation
- Column labels require manual config or heuristic title-casing
- Inter-panel filtering uses a custom `p{N}.fieldname` substitution syntax in SQL

### V1 coexistence

V1 code, pages, and DocTypes (`Panel Page`, `Panel Definition`) remain
**untouched and running** while v2 is built alongside. The existing
`config.js`, `get_page_config`, and `get_panel_data` APIs stay in place.
`get_active_pages` continues to serve the landing page. V1 artifacts will be
removed only after v2 is fully deployed and verified.

---

## The v2 Architecture Change

### Core idea

Replace raw SQL in the Panel Definition with a **link to a Frappe Query Report**.
Each panel's data comes from a standard Query Report that can be independently
created, tested, and debugged using Frappe's built-in Report UI.

### What changes

| Aspect | v1 | v2 |
|---|---|---|
| Data source | Raw SQL in Panel Definition | Frappe Query Report |
| Config DocTypes | `Panel Page` / `Panel Definition` | `Page Definition` / `Page Panel` (new) |
| Testing | Only testable by loading the page | Each report testable at `/app/query-report/report-name` |
| Column labels | Title-casing heuristic / AS alias | Report column labels (AS alias still overrides) |
| SQL storage | Text field in child table | UI-created Query Report (stored in DB, exportable as fixture) |
| Inter-panel filter | `p{N}.fieldname` in SQL | Default: auto via Link fields. Override: WHERE clause |
| Config source | `config.js` / DB record | `Page Definition` DocType record is the runtime config |
| Permissions | Page-level only | Report-level permissions per panel |
| Filter | Dropdown-based | Navicat-style dynamic filter widget |

---

### New DocTypes

All three DocTypes are defined on disk in the app. JSON files are at:
- `nce_events/nce_events/doctype/page_definition/page_definition.json`
- `nce_events/nce_events/doctype/page_panel/page_panel.json`
- `nce_events/nce_events/doctype/page_drag_action/page_drag_action.json`

#### Page Definition (parent)

The parent DocType that defines a page. Created in the Frappe UI or on disk.
Contains child rows of `Page Panel` and `Page Drag Action`.

**Fields:**

- **Page Name** (Data) — required, unique, autoname
- **Page Title** (Data) — required, in list view
- **Active** (Check) — default: 1
- **Male Hex Color** (Data) — e.g. `#0000FF`, for gender row color-coding
- **Female Hex Color** (Data) — e.g. `#c700e6`
- **Panels** (Table → Page Panel) — required
- **Drag Actions** (Table → Page Drag Action) — collapsible section

#### Page Panel (child table)

Each row defines one panel in the page.

**Core fields:**

- **Panel Number** (Int) — display order, required
- **Header Text** (Data) — panel header label
- **Report Name** (Link → Report) — the Query Report providing data, required
- **Root DocType** (Link → DocType) — for inter-panel Link field filtering
  (does not limit card content)
- **Where Clause** (Small Text) — optional runtime filter override

**Display fields:**

- **Hidden Fields** (Small Text) — comma-delimited columns to hide
- **Bold Fields** (Small Text) — comma-delimited columns to render bold
- **Card Fields** (Small Text) — comma-delimited columns for card popover

**Header widget toggles** (Check fields, default ON):

- **Show Filter** — Navicat-style filter widget
- **Show Sheets** — Google Sheets link button
- **Show Email** — Email action button (header-level)
- **Show SMS** — SMS action button (header-level)

**Card action toggles** (Check fields, default OFF):

- **Show Card Email** — Email button in card popover (contact individual)
- **Show Card SMS** — SMS button in card popover (contact individual)

**Custom buttons:**

- **Button 1 Name** / **Button 1 Code** (JS) — card action button
- **Button 2 Name** / **Button 2 Code** (JS) — card action button

Button code is JS that runs on click. For server-side work (DB writes, external
API calls, sending messages), the JS calls a whitelisted Python function via
`frappe.call()`. JS has access to all panel state (selections across all panels).

#### Page Drag Action (child table)

Defines drag-and-drop interactions between panels. Not implemented yet but
fields are defined for future use.

- **Source Panel** (Int) — panel containing the draggable field
- **Drag Field** (Data) — column name to grab (e.g. `name`)
- **Target Panel** (Int) — panel to drop onto
- **Target Column** (Data) — drop zone column on target panel
- **Eligibility Code** (Code/JS) — returns true/false per target row to
  highlight eligible drop targets (change color, sort to top)
- **Drop Code** (Code/JS) — executes on drop with `{dragged_row, target_row}`
  context; calls `frappe.call()` for server actions

**Visual behavior during drag:** Draggable fields show a subtle indicator
(dashed border, grab cursor). During drag, eligible target rows highlight and
sort to top; ineligible rows dim. After drop, both panels refresh.

---

### Query Reports

Reports are created in the **Frappe UI** (`/app/query-report`). Set the type to
"Query Report", pick a Reference DocType, and write the SQL in the form. No file
deployment needed.

Reports can JOIN multiple tables. The Reference DocType on the report is used for
permissions; the Root DocType on the Page Panel is used for inter-panel filtering.

Reports and Page Definition records are exported as **Frappe fixtures** so they
travel with the app code. One designated dev site owns the fixture exports;
production sites consume them via `bench migrate`.

### Server API

A new v2 endpoint wraps Frappe's built-in report execution
(`frappe.get_doc("Report", name).execute()`). The report produces a ready-made
data array; our endpoint captures that output and adds:

- **Inter-panel filtering** — injects filters based on the selected row in the
  previous panel (via Link field lookup or WHERE clause override)
- **Pagination** — limit/offset for Load More

The v1 `get_panel_data` endpoint remains untouched for v1 pages.

### Inter-panel filtering

**Default (no Where Clause):** When a row is selected in Panel N, the system
looks up Link fields on Panel N+1's Root DocType that reference Panel N's Root
DocType. The selected row's `name` value is passed as the filter automatically.

Example: `Registrations.product_id` is a Link to `Events`. Selecting an event
automatically filters the next panel by `product_id = {selected event name}`.

**Override (Where Clause specified):** The clause is appended to the report's
SQL at runtime. Uses `{panel_N.fieldname}` substitution syntax:

```
r.product_id = {panel_1.name}
```

### Column header display priority

1. **Explicit `AS` alias** in the report SQL — displayed as written
2. **Frappe Report column label** — from the report definition
3. **Title-cased fallback** — e.g. `player_count` → "Player Count"

### Card popover

- Shows **all columns from the report row** (not limited to the Root DocType's
  own fields — joined/related fields are included)
- Fields listed in `card_fields` control which columns appear
- HTML fields (column name contains "html") rendered as raw HTML
- Link/URL fields rendered as clickable links

**Standard card action widgets:**

- **Email** — send email to the person in this row
- **SMS** — send SMS to the person in this row

**Custom card actions (future):** For actions beyond Email/SMS, write a
whitelisted Python function on disk (e.g.
`nce_events.api.card_actions.my_custom_action`). The client calls it via
`frappe.call()`. Custom action code lives in version-controlled `.py` files
in the app, not in the database.

### Filter widget

Navicat-style dynamic filter (see screenshot in project assets). Per-panel,
controlled by the **Show Filter** toggle on the Page Panel record.

- Column dropdown **dynamically populates** from the current result set columns
- User picks a column, chooses an operator (=, !=, >, <, LIKE, IN), enters a value
- Add/remove multiple filter conditions
- No pre-configuration or default filters needed
- Filter widget starts empty on page load

### Page structure on disk

Each page gets a Frappe Page directory with a thin JS wrapper:

```
nce_events/page/{page_name}/
    {page_name}.js      — loads shared renderer, creates Explorer
    {page_name}.json    — Frappe Page metadata
    __init__.py         — empty
```

The shared renderer files remain at:
- `public/js/panel_page/store.js`
- `public/js/panel_page/ui.js`
- `public/css/panel_page.css`

### Fixtures and deployment

- Add `"Page Definition"` and `"Report"` (filtered to our reports) to
  `fixtures` in `hooks.py`
- Page Panel child rows export automatically with the parent
- Run `bench export-fixtures` on the dev site to save records as JSON
- On deploy + `bench migrate`, fixtures auto-install on all sites
- One designated dev site owns fixture exports; other sites consume them

### No custom code needed to add a page

1. Create Query Reports for each panel (Frappe UI)
2. Create a Page Definition record with Page Panel child rows (Frappe UI)
3. Create the page directory on disk (thin wrapper)
4. Export fixtures and deploy; `bench migrate`

---

## All decisions (finalized)

- **New DocTypes:** `Page Definition` (parent) + `Page Panel` (child) +
  `Page Drag Action` (child) — separate from v1's `Panel Page` / `Panel Definition`
- **Drag-and-drop:** `Page Drag Action` child table defines cross-panel drag
  interactions (source/target panel, eligibility logic, drop action). Fields
  defined now; implementation is future work.
- **V1 coexistence:** v1 code, pages, and DocTypes remain untouched and running
- **Data source:** Frappe Query Reports, created in the UI
- **Server API:** Frappe's report runner wrapped in a custom v2 endpoint for
  inter-panel filtering and pagination
- **Filter widget:** Navicat-style, dynamically built from result columns, no
  default filters, starts empty, per-panel toggle
- **Header widget toggles:** Filter, Sheets, Email, SMS (Check fields on Page Panel)
- **Card popover:** Shows all report columns (including joined fields), not just
  Root DocType fields
- **Card action widgets:** Email and SMS built-in; custom actions via whitelisted
  `.py` functions on disk (future)
- **Root DocType purpose:** Inter-panel Link field lookup only; does not limit
  card content
- **Inter-panel filtering:** Auto via Link fields by default; WHERE clause
  override with `{panel_N.fieldname}` syntax
- **Column headers:** AS alias > Report column label > title-cased fallback
- **Fixtures:** Page Definitions and Query Reports exported as Frappe fixtures;
  one dev site owns exports
- **Gender color-coding:** `male_hex`/`female_hex` colored left border carries forward
- **Bold fields, hidden fields:** carry forward

## Key files

| File | Purpose |
|---|---|
| `nce_events/api/panel_api.py` | Server API — v1 endpoints stay, v2 endpoint added |
| `nce_events/public/js/panel_page/ui.js` | Panel renderer (shared, v1+v2) |
| `nce_events/public/js/panel_page/store.js` | Client state management |
| `nce_events/public/js/panel_page/config.js` | Embedded page configs (v1 only, stays for now) |
| `nce_events/public/css/panel_page.css` | Panel styling |
| `nce_events/nce_events/page/panel_view/panel_view.js` | Landing page + router |
| `nce_events/nce_events/page/event_explorer/` | Event Explorer page wrapper (v1) |
| `nce_events/nce_events/doctype/panel_page/` | Panel Page DocType (v1, untouched) |
| `nce_events/nce_events/doctype/panel_definition/` | Panel Definition child table (v1, untouched) |
| `nce_events/nce_events/doctype/page_definition/` | Page Definition DocType (v2, new) |
| `nce_events/nce_events/doctype/page_panel/` | Page Panel child table (v2, new) |
| `nce_events/nce_events/doctype/page_drag_action/` | Page Drag Action child table (v2, new) |
| `Docs/panel_page_architecture_v2.md` | Full architecture spec |
| `Docs/panel_page_spec_rules.md` | v1 spec rules (partially superseded) |
| `Docs/wordpress_db_tables.md` | WordPress source database table list |

## Database access

The WordPress source database (db_ncesoccer) is accessible from the developer's
local machine via MySQL CLI:

```
Host: wp-ncesoccer.chseex38tpak.us-east-1.rds.amazonaws.com
Port: 3306
User: nce_sync
Database: db_ncesoccer
```

The Frappe database is on the production server (manager.ncesoccer.com).
