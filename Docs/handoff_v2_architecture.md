# Handoff: Panel Page Architecture v2

## Purpose

This document is the single source of truth for a new agent continuing
v2 development. Read it fully before making any changes.

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
    raw SQL, substitutes cross-panel references, returns paginated results
- Working features: bold fields, gender color-coding, hidden fields, card popover,
  double-click drill-down, drag-resize panels, filter dropdowns

### V1 coexistence rule

**V1 code, pages, and DocTypes (`Panel Page`, `Panel Definition`) are untouched
and stay running.** Do not modify them. V1 will be removed only after v2 is fully
deployed and verified.

---

## V2 Architecture — Implemented and Working

### Core idea

Replace raw SQL in the Panel Definition with a **link to a Frappe Query Report**.
Each panel's data comes from a Query Report that can be independently tested in
the Frappe UI.

### How v2 pages work

All v2 pages route through a **single shared Frappe Page** (`page-view`) at:
```
/app/page-view/{page_name}
```
This avoids needing a new Frappe Page record per v2 page and means no
`bench migrate` is needed to add a new v2 page. The `page_name` parameter
identifies which `Page Definition` record to load.

A workspace shortcut (type `URL`, pointing to `/app/page-view/{page_name}`) is
created automatically when the user clicks **Build Page** on the Page Definition
form. The shortcut appears in the NCE Events workspace.

### V2 page file structure

```
nce_events/nce_events/page/page_view/
    page_view.js     — thin wrapper: reads route param, calls frappe.require, creates ExplorerV2
    page_view.json   — Frappe Page metadata
    __init__.py      — empty
```

`page_view.js` does a `frappe.require` on:
- `/assets/nce_events/js/panel_page/store.js`
- `/assets/nce_events/js/panel_page/ui.js`
- `/assets/nce_events/css/panel_page.css`

---

## New DocTypes (v2)

All three DocTypes are migrated and working.

### Page Definition (parent)

`nce_events/nce_events/doctype/page_definition/page_definition.json`

| Field | Type | Notes |
|---|---|---|
| page_name | Data | required, unique, autoname |
| page_title | Data | required, shown in workspace |
| active | Check | default 1 |
| male_hex | Data | hex color for M-column text (e.g. `#0000FF`) |
| female_hex | Data | hex color for F-column text (e.g. `#c700e6`) |
| panels | Table → Page Panel | required |
| drag_actions | Table → Page Drag Action | collapsible, future use |

`male_hex` / `female_hex` are **page-level** — they apply to all panels on that page.
They control text color of the designated male/female columns (not a side strip).

### Page Panel (child table)

`nce_events/nce_events/doctype/page_panel/page_panel.json`

| Field | Type | Notes |
|---|---|---|
| panel_number | Int | display order, required |
| header_text | Data | panel header label |
| report_name | **Data** (free text) | Query Report name — **NOT a Link field** |
| root_doctype | Link → DocType | for inter-panel Link-field filtering only |
| where_clause | Small Text | optional Python-side filter override |
| hidden_fields | Small Text | comma-delimited columns to hide in list |
| bold_fields | Small Text | comma-delimited columns to render bold |
| card_fields | Small Text | comma-delimited columns for card popover |
| male_field | Small Text | column name whose values get male_hex text color + bold |
| female_field | Small Text | column name whose values get female_hex text color + bold |
| wp_query | Code (SQL) | raw WordPress SQL — input for translator |
| frappe_query | Code (SQL) | translated Frappe SQL — edit before use |
| show_filter | Check | Navicat-style filter widget toggle |
| show_sheets | Check | Sheets button toggle |
| show_email | Check | Email button toggle (header) |
| show_sms | Check | SMS button toggle (header) |
| show_card_email | Check | Email button toggle (card popover) |
| show_card_sms | Check | SMS button toggle (card popover) |
| button_1_name | Data | custom card action button label |
| button_1_code | Code (JS) | JS executed on button click |
| button_2_name | Data | |
| button_2_code | Code (JS) | |

**Important:** `report_name` is a plain `Data` field (not a Link to Report) because
the report may not exist yet when the panel row is created.

### Page Drag Action (child table)

`nce_events/nce_events/doctype/page_drag_action/page_drag_action.json`

Defined but **not yet implemented** in the renderer. Fields:

| Field | Notes |
|---|---|
| source_panel (Int) | panel with the draggable row |
| drag_field (Data) | column to grab |
| target_panel (Int) | panel to drop onto |
| target_column (Data) | drop zone column on target panel |
| eligibility_code (Code/JS) | returns true/false per target row |
| drop_code (Code/JS) | executes on successful drop |

---

## Page Panel Form UI (page_definition.js)

The `Page Panel` child-row form is heavily customized with a **5-tab layout**.
All of this is in `nce_events/nce_events/doctype/page_definition/page_definition.js`.

### Tabs

| Tab | Frappe Fields Shown | Custom UI |
|---|---|---|
| Basic | panel_number, header_text, root_doctype, where_clause | — |
| Display | *(none — all hidden)* | Matrix table |
| Widgets | show_filter, show_sheets, show_email, show_sms, show_card_email, show_card_sms | — |
| Buttons | button_1_name, button_1_code, button_2_name, button_2_code | — |
| Report | report_name, wp_query, frappe_query | Translate + Create/Update Report buttons |

### Display tab — Matrix

The Display tab renders an interactive matrix table. Columns come from the
report's SQL (fetched via `get_report_columns` API). Each row is a column;
each column in the matrix is:

- **List** (checkbox) — unchecked = column hidden in panel list
- **Card** (checkbox) — checked = column appears in card popover
- **Bold** (checkbox) — checked = column values bold in list
- **Male** (radio) — one column whose values render with `male_hex` color + bold
- **Female** (radio) — one column whose values render with `female_hex` color + bold

On any checkbox/radio change, `_sync()` fires and writes back to
`hidden_fields`, `bold_fields`, `card_fields`, `male_field`, `female_field`
via `frappe.model.set_value`. Values are comma-delimited strings matching the
SQL column aliases exactly (case-preserved from cursor.description).

### Report tab — WP → Frappe SQL translation

1. User pastes a WordPress SQL query into the **WP Query** field
2. Clicks **Translate WP → Frappe SQL** → calls `translate_wp_query` API
3. Translated SQL appears in **Frappe Query** field (editable)
4. Clicks **Create Report** / **Update Report** → calls `create_or_update_report` API
5. A Frappe Query Report is created/updated; `report_name` is set on the panel row

Default new report name: `{header_text} Panel`

---

## Server API (panel_api.py)

`nce_events/api/panel_api.py`

### V2 endpoints

| Function | Purpose |
|---|---|
| `get_page_config_v2(page_name)` | Returns full page + panel config as JSON |
| `get_panel_data_v2(page_name, panel_number, selections)` | Runs the Query Report, applies inter-panel filter, returns `{columns, rows, total}` |
| `get_report_columns(report_name)` | Returns column names from report SQL via `LIMIT 0` cursor.description |
| `translate_wp_query(wp_query)` | Translates WP SQL to Frappe SQL using `WP Tables` mappings |
| `create_or_update_report(header_text, frappe_query, existing_report_name, ref_doctype)` | Creates or updates a Frappe Query Report |
| `build_page(page_name)` | Ensures workspace shortcut exists, returns `{page_url}` |
| `get_active_v2_pages()` | Lists active Page Definitions for the landing page |

### V1 endpoints (untouched)

`get_active_pages`, `get_page_config`, `get_panel_data` — leave alone.

### get_page_config_v2 response shape

```json
{
  "page_name": "...",
  "page_title": "...",
  "male_hex": "#0000FF",
  "female_hex": "#c700e6",
  "panels": [
    {
      "panel_number": 1,
      "header_text": "Events",
      "report_name": "Events Panel",
      "root_doctype": "Events",
      "where_clause": "",
      "hidden_fields": ["max_yob", "min_yob", ...],
      "bold_fields": ["event_name"],
      "card_fields": ["max_yob", "min_yob", ...],
      "male_field": "M",
      "female_field": "F",
      "show_filter": 1,
      ...
    }
  ]
}
```

### get_panel_data_v2 mechanics

1. Loads `Page Definition` record
2. Finds the panel row
3. Calls `frappe.desk.query_report.run(report_name, filters={})` — same code path
   as the Frappe report UI, so permissions and performance are identical
4. Parses columns via `_parse_report_column_defs` → `[{fieldname, label}]`
5. Zips column names with row data → list of dicts
6. If a previous panel has a selection, applies inter-panel filter Python-side
7. Returns all matching rows (no pagination)

### Inter-panel filtering

**Default (no where_clause):** Looks up Link fields on Panel N's Root DocType
that point to Panel N-1's Root DocType. Filters rows where that link field
equals the selected row's value.

**Override (where_clause set):** Uses `{panel_N.fieldname}` token substitution
in a Python-side filter, e.g. `r.product_id = {panel_1.name}`.

### translate_wp_query mechanics

Uses `WP Tables` DocType records (in `nce_sync` app). Each record has:
- `table_name` — WP table name (e.g. `nce_events`)
- `frappe_doctype` — Frappe DocType name (e.g. `Events`)
- `column_mapping` — JSON dict: `{wp_col: {fieldname, is_name, is_virtual, ...}}`
  - `is_name: true` → WP column maps to Frappe's primary key (`name`)

Three-pass translation to avoid cascading substitutions:
1. Qualified `table.column` → `` `tabFoo`.fieldname ``
2. Bare table names → `` `tabFoo` ``
3. Bare column names (with `(?<!\.)` lookbehind to skip already-qualified fields)

**Known limitation:** Bare column names in complex subqueries with multiple JOIN
tables can be ambiguous — the translator does a best-effort mapping.

---

## Frontend (ui.js, store.js)

`nce_events/public/js/panel_page/`

### Class structure

| Class | File | Purpose |
|---|---|---|
| `nce_events.panel_page.ExplorerV1` | ui.js | V1 renderer — do not modify |
| `nce_events.panel_page.ExplorerV2` | ui.js | V2 renderer |
| `nce_events.panel_page.StoreV1` | store.js | V1 data/state — do not modify |
| `nce_events.panel_page.StoreV2` | store.js | V2 data/state |

### ExplorerV2 render flow

1. `setup()` — builds container, calls `store.fetch_config()` then `load_panel(1)`
2. `load_panel(N)` — calls `store.fetch_panel(N)`, then `render_pane(N)`
3. `render_pane(N)` — builds the HTML table for panel N:
   - `_visible_columns()` — filters out `hidden_fields`
   - `_field_set()` — creates a lowercase-key lookup set from a field list
   - Inline `style="font-weight:700;"` for bold fields (NOT CSS classes — inline wins)
   - Inline `style="font-weight:700;color:{hex};"` for male/female fields
   - Row data lookup: tries `row[col.fieldname]` then `row[col.fieldname.toLowerCase()]`
     (handles mixed-case SQL aliases)
4. Row click → single-click opens card popover; double-click drills down to next panel

### Bold and gender color — important implementation note

Bold and gender colors are applied with **inline styles** (`style="..."`)
directly on `<th>` and `<td>` elements. This was necessary because
`.panel-table th { font-weight:600 }` in the CSS has higher specificity than
any class-based rule. Do not switch back to CSS classes.

Gender: `male_hex` / `female_hex` normalize to `#XXXXXX` format (the `#` prefix
is added automatically if missing). The `male_field` / `female_field` comparison
uses `col.fieldname.toLowerCase()` vs `config.male_field.toLowerCase()` so it
is case-insensitive.

---

## WP Tables DocType

Lives in the `nce_sync` app at:
`/Users/oliver2/Documents/_NCE_projects/NCE_Sync/nce_sync/nce_sync/doctype/wp_tables/`

Each record maps one WP table to a Frappe DocType. The `column_mapping` field
is a JSON Code field. Example entry:

```json
{
  "wp_id": {"fieldname": "name", "is_name": true, "is_virtual": false, "is_auto_generated": false},
  "name":  {"fieldname": "event_name", "is_virtual": false, "is_auto_generated": false},
  "end_date": {"fieldname": "end_date", "is_virtual": false, "is_auto_generated": false}
}
```

`is_name: true` means this WP column is the primary key and maps to Frappe's
`name` field.

---

## Key files reference

| File | Purpose |
|---|---|
| `nce_events/api/panel_api.py` | All server API — v1 (untouched) + v2 endpoints |
| `nce_events/public/js/panel_page/ui.js` | Panel renderer — ExplorerV1 (do not touch) + ExplorerV2 |
| `nce_events/public/js/panel_page/store.js` | Client state — StoreV1 (do not touch) + StoreV2 |
| `nce_events/public/css/panel_page.css` | Panel styling |
| `nce_events/nce_events/page/page_view/page_view.js` | V2 page router |
| `nce_events/nce_events/page/panel_view/panel_view.js` | V1 landing page + router (do not touch) |
| `nce_events/nce_events/doctype/page_definition/page_definition.js` | Page Panel form UI (tabs, matrix, report tab) |
| `nce_events/nce_events/doctype/page_definition/page_definition.json` | Page Definition DocType schema |
| `nce_events/nce_events/doctype/page_panel/page_panel.json` | Page Panel DocType schema |
| `nce_events/nce_events/doctype/page_drag_action/page_drag_action.json` | Page Drag Action schema |
| `Docs/handoff_v2_architecture.md` | **This file** |

---

## Deployment rules

- **Do not run bench commands** — the user runs all `bench build`, `bench migrate`,
  `bench restart` commands on the server themselves
- Push code changes to GitHub; user pulls and builds on the server
- The bench root on the local dev machine is `/Users/oliver2/NCE_V15` but
  `nce_events` is NOT installed there — it runs on a remote server
- After any `.js` or `.css` change, remind the user to `bench build` + hard refresh

---

## Backlog / Known Issues

| # | Issue | Notes |
|---|---|---|
| 1 | ~~Workspace shortcut not appearing~~ | **RESOLVED** — writes both `content` JSON and `shortcuts` child table |
| 2 | ~~Page title shows "Page View" instead of page title~~ | **RESOLVED** — `frappe.db.get_value` sets title dynamically |
| 3 | ~~Page loading 14 seconds~~ | **RESOLVED** — use `frappe.desk.query_report.run()` instead of raw SQL; removed pagination |
| 4 | ~~Bold/gender styles not applying~~ | **RESOLVED** — switched to inline styles; gender now colors text not strip |
| 5 | **Drag-and-drop** | `Page Drag Action` fields defined; renderer not implemented yet |
| 6 | **Card popover actions** | Email/SMS stubs exist; actual send logic not implemented |
| 7 | **Fixtures** | Page Definition + Report not yet added to `hooks.py` fixtures |

---

## Database access

The WordPress source database (`db_ncesoccer`) is accessible from the developer's
local machine via MySQL:

```
Host: wp-ncesoccer.chseex38tpak.us-east-1.rds.amazonaws.com
Port: 3306
User: nce_sync
Database: db_ncesoccer
```

The Frappe production database is on `manager.ncesoccer.com`.

---

## Previous conversation context

The main implementation conversation is available at transcript ID
`97855a53-990e-4ada-9244-6077eb43d3c7`. It covers all v2 work from
initial DocType creation through the matrix UI, WP→Frappe SQL translator,
and bold/gender color fixes.
