# NCE Events — Project Reference

Single source of truth for the `nce_events` Frappe v15 app. Read fully before making changes.

---

## 1. What This App Does

A multi-panel data explorer for NCE soccer operations. Users see a split-view page: select a row in Panel 1 (e.g. an event) and Panel 2 loads related data (e.g. registered players). Panels support filtering, card popovers, gender color-coding, bold fields, and export.

**Dependency:** requires the [nce_sync](https://github.com/oliver-nce/NCE_Sync) app (provides DocTypes and WordPress data sync).

---

## 2. Architecture

There is one generation of code — all V1 code has been removed.

There is also a separate **hierarchy_explorer** (legacy event explorer at `/app/hierarchy-explorer`). It has its own API, JS, and CSS. Not part of the main explorer.

---

## 3. File Structure

```
nce_events/
├── api/
│   ├── hierarchy_explorer.py        # Legacy event explorer API (do not touch)
│   └── panel_api.py                 # All panel API endpoints
├── hooks.py
├── nce_events/
│   ├── doctype/
│   │   ├── page_definition/         # Parent DocType + form JS
│   │   ├── page_panel/              # Child table
│   │   └── page_drag_action/        # Child table (drag-drop, not yet implemented)
│   ├── page/
│   │   ├── page_view/               # Router — single shared page for all pages
│   │   └── hierarchy_explorer/      # Legacy hierarchy explorer (frozen)
│   └── workspace/nce_events/        # Workspace with shortcuts
├── public/
│   ├── css/
│   │   ├── panel_page.css           # Panel page styles
│   │   └── hierarchy_explorer.css   # Legacy styles
│   └── js/
│       ├── panel_page/
│       │   ├── ui.js                # Explorer renderer
│       │   └── store.js             # Store state management
│       └── hierarchy_explorer/      # Legacy JS (frozen)
├── patches/v0_0_2/                  # Migration patches
└── utils/version.py
```

---

## 4. DocTypes

### Page Definition (parent)

`nce_events/nce_events/doctype/page_definition/`

| Field | Type | Notes |
|---|---|---|
| page_name | Data | required, unique, autoname |
| page_title | Data | required, shown in workspace |
| active | Check | default 1 |
| male_hex | Data | hex color for male-column text (e.g. `#0000FF`) |
| female_hex | Data | hex color for female-column text (e.g. `#c700e6`) |
| panels | Table → Page Panel | child table |
| drag_actions | Table → Page Drag Action | child table (future use) |

`male_hex` / `female_hex` are page-level — they apply to all panels on that page. They color the text of the designated male/female columns (not a side strip).

### Page Panel (child table)

`nce_events/nce_events/doctype/page_panel/`

| Field | Type | Notes |
|---|---|---|
| panel_number | Int | display order |
| header_text | Data | panel header label |
| report_name | Data (free text) | Query Report name — NOT a Link field |
| root_doctype | Link → DocType | for inter-panel filtering only |
| where_clause | Small Text | optional Python-side filter override |
| hidden_fields | Small Text | comma-delimited columns to hide |
| bold_fields | Small Text | comma-delimited columns to render bold |
| card_fields | Small Text | comma-delimited columns for card popover |
| male_field | Small Text | column rendered with `male_hex` + bold |
| female_field | Small Text | column rendered with `female_hex` + bold |
| header_overrides | Small Text | JSON map of custom column headers, e.g. `{"F": "Girls"}` |
| wp_query | Code (SQL) | raw WordPress SQL — input for translator |
| frappe_query | Code (SQL) | translated Frappe SQL |
| show_filter | Check | filter widget toggle |
| show_sheets | Check | sheets export button |
| show_email | Check | email button (header) |
| show_sms | Check | SMS button (header) |
| show_card_email | Check | email button (card popover) |
| show_card_sms | Check | SMS button (card popover) |
| button_1_name | Data | custom card action button label |
| button_1_code | Code (JS) | JS executed on button click |
| button_2_name | Data | second button label |
| button_2_code | Code (JS) | second button JS |

`report_name` is plain Data (not a Link to Report) because the report may not exist when the row is first created.

### Page Drag Action (child table)

`nce_events/nce_events/doctype/page_drag_action/`

Defined but **not yet implemented** in the renderer.

| Field | Type | Notes |
|---|---|---|
| source_panel | Int | panel with draggable row |
| drag_field | Data | column to grab |
| target_panel | Int | panel to drop onto |
| target_column | Data | drop zone column |
| eligibility_code | Code (JS) | returns true/false per target row |
| drop_code | Code (JS) | executes on successful drop |

---

## 5. Page Routing

All pages route through a **single shared Frappe Page** (`page-view`) at:

```
/app/page-view/{page_name}
```

`page_view.js` reads the route param, does `frappe.require` on `store.js`, `ui.js`, and `panel_page.css`, then creates an `Explorer(page, page_name)`. If no `page_name`, it shows a landing page listing active pages via `get_active_pages`.

A workspace shortcut is created automatically when the user clicks **Build Page** on the Page Definition form. No `bench migrate` is needed to add a new page.

---

## 6. Server API (panel_api.py)

`nce_events/api/panel_api.py`

### Endpoints

| Function | Params | Purpose |
|---|---|---|
| `get_page_config` | `page_name` | Returns full page + panel config as JSON |
| `get_panel_data` | `page_name, panel_number, selections` | Runs the Query Report, applies inter-panel filter, returns `{columns, rows, total}` |
| `get_report_columns` | `report_name` | Returns column names via `LIMIT 0` on report SQL |
| `translate_wp_query` | `wp_query` | Translates WP SQL to Frappe SQL using WP Tables mappings |
| `create_or_update_report` | `header_text, frappe_query, existing_report_name, ref_doctype` | Creates or updates a Frappe Query Report |
| `build_page` | `page_name` | Ensures workspace shortcut exists, returns `{page_url}` |
| `get_active_pages` | (none) | Lists active Page Definitions for the landing page |

### get_page_config Response

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
      "hidden_fields": ["max_yob", "min_yob"],
      "bold_fields": ["event_name"],
      "card_fields": ["max_yob", "min_yob"],
      "male_field": "M",
      "female_field": "F",
      "show_filter": 1,
      "show_sheets": 1,
      "show_email": 0,
      "show_sms": 0,
      "show_card_email": 0,
      "show_card_sms": 0,
      "button_1_name": "",
      "button_1_code": "",
      "header_overrides": {"M": "Boys", "F": "Girls"},
      "button_2_name": "",
      "button_2_code": ""
    }
  ]
}
```

### get_panel_data Response

```json
{
  "columns": [{"fieldname": "event_name", "label": "Event Name"}, ...],
  "rows": [{"event_name": "Spring Camp", ...}, ...],
  "total": 42
}
```

### get_panel_data Mechanics

1. Loads Page Definition record, finds the panel row
2. Calls `frappe.desk.query_report.run(report_name, filters={})` — same code path as Frappe report UI
3. Parses columns via `_parse_report_column_defs` → `[{fieldname, label}]`
4. Zips column names with row data → list of dicts
5. If a previous panel has a selection, applies inter-panel filter Python-side
6. Returns all matching rows (no pagination)

---

## 7. Inter-Panel Filtering

### Default (no where_clause)

Looks up Link fields on Panel N's `root_doctype` that point to Panel N-1's `root_doctype`. Filters rows where that link field equals the selected row's value.

Example: `Registrations.product_id` is a Link to `Events.name`. Selecting an event in Panel 1 filters Panel 2 by `product_id = {selected event name}`.

### Override (where_clause set)

Uses `{panel_N.fieldname}` token substitution in a Python-side filter:

```
r.product_id = {panel_1.name}
```

The server substitutes these with actual values from the selected row.

---

## 8. WP → Frappe SQL Translator

`translate_wp_query` uses `WP Tables` DocType records (in the `nce_sync` app). Each record maps a WP table to a Frappe DocType with:
- `table_name` — WP table name (e.g. `nce_events`)
- `frappe_doctype` — Frappe DocType name (e.g. `Events`)
- `column_mapping` — JSON dict: `{wp_col: {fieldname, is_name, is_virtual, ...}}`
  - `is_name: true` → WP column maps to Frappe's primary key (`name`)

Three-pass translation to avoid cascading substitutions:
1. Qualified `table.column` → `` `tabFoo`.fieldname ``
2. Bare table names → `` `tabFoo` ``
3. Bare column names (with `(?<!\.)` lookbehind to skip already-qualified ones)

**Known limitation:** Bare column names in complex subqueries with multiple JOINs can be ambiguous.

---

## 9. Page Panel Form UI (page_definition.js)

The Page Panel child-row form has a custom **5-tab layout** built in `page_definition.js`.

| Tab | Frappe Fields Shown | Custom UI |
|---|---|---|
| Basic | panel_number, header_text, root_doctype, where_clause | — |
| Display | *(none — all hidden)* | Interactive matrix table |
| Widgets | show_filter, show_sheets, show_email, show_sms, show_card_email, show_card_sms | — |
| Buttons | button_1_name, button_1_code, button_2_name, button_2_code | — |
| Report | report_name, wp_query, frappe_query | Translate + Create/Update Report buttons |

### Display Tab — Matrix

Columns come from the report's SQL (fetched via `get_report_columns`). Each row is a report column; matrix columns are:

- **Field** (read-only) — the SQL column alias
- **Default Header** (read-only) — title-cased version of the field name
- **Header** (editable text) — custom display header; placeholder shows the default; blank = use default
- **List** (checkbox) — unchecked = column hidden in panel list
- **Card** (checkbox) — checked = column appears in card popover
- **Bold** (checkbox) — checked = column values bold in list
- **Male** (radio) — one column whose values render with `male_hex` color + bold
- **Female** (radio) — one column whose values render with `female_hex` color + bold

On any change, `_sync()` writes back to `hidden_fields`, `bold_fields`, `card_fields`, `male_field`, `female_field`, and `header_overrides` via `frappe.model.set_value`. Checkbox/radio values are comma-delimited strings matching SQL column aliases exactly (case-preserved). `header_overrides` is a JSON object mapping fieldnames to custom header strings (only non-empty overrides are stored).

### Report Tab

1. User pastes WordPress SQL into **WP Query** field
2. Clicks **Translate WP → Frappe SQL** → calls `translate_wp_query`
3. Result appears in **Frappe Query** field (editable)
4. Clicks **Create Report** / **Update Report** → calls `create_or_update_report`
5. Query Report is created/updated; `report_name` is set on the panel row

Default new report name: `{header_text} Panel`

---

## 10. Frontend Classes (ui.js, store.js)

`nce_events/public/js/panel_page/`

### Classes

| Class | Namespace |
|---|---|
| `Explorer` | `nce_events.panel_page.Explorer` |
| `Store` | `nce_events.panel_page.Store` |

### Explorer Render Flow

1. `setup()` — builds container, calls `store.fetch_config()` then `load_panel(1)`
2. `load_panel(N)` — calls `store.fetch_panel(N)`, then `render_pane(N)`
3. `render_pane(N)` — builds HTML table:
   - `_visible_columns()` filters out `hidden_fields`
   - `_field_set()` creates a lowercase-key lookup set
   - Inline `style="font-weight:700;"` for bold fields
   - Inline `style="font-weight:700;color:{hex};"` for male/female fields
   - Row data lookup: tries `row[col.fieldname]` then `row[col.fieldname.toLowerCase()]`
4. Row click → single-click opens card popover; double-click drills to next panel

### Bold and Gender Color — Important

Bold and gender colors use **inline styles** on `<th>` and `<td>`. This is necessary because `.panel-table th { font-weight:600 }` in CSS has higher specificity than class-based rules. Do not switch to CSS classes.

Gender hex values normalize to `#XXXXXX` (the `#` is added if missing). Field comparison is case-insensitive (`col.fieldname.toLowerCase()` vs `config.male_field.toLowerCase()`).

### Store Key Methods

| Method | Purpose |
|---|---|
| `fetch_config()` | Calls `get_page_config` |
| `fetch_panel(N)` | Calls `get_panel_data` (no pagination) |
| `select_row(N, row)` | Updates selections, clears downstream panes |
| `has_more(N)` | Always `false` |

### Field Reference Convention

All field references in `hidden_fields`, `bold_fields`, `card_fields` use the **SQL result column name** as it appears in report output. If the SQL uses `AS alias`, the alias is the reference. Table prefixes (e.g. `fm.gender`) are stripped when matching.

---

## 11. Deployment

- **Do not run bench commands** — the user runs `bench build`, `bench migrate`, `bench restart` on the server
- Push code to GitHub; user pulls and builds on the server
- Local dev bench root: `/Users/oliver2/NCE_V15` — but `nce_events` is NOT installed locally, it runs on a remote server
- After any `.js` or `.css` change, remind user to `bench build` + hard refresh

---

## 12. Database Access

**WordPress source DB (db_nce_custom):**
```
Host: wp-ncesoccer.chseex38tpak.us-east-1.rds.amazonaws.com
Port: 3306
User: nce_sync
Database: db_nce_custom
```

All source tables begin with `nce_` (e.g. `nce_events`, `nce_registrations`). This app does not touch `db_ncesoccer`.

**Frappe production:** `manager.ncesoccer.com`

---

## 13. hooks.py

```python
app_name = "nce_events"
app_title = "NCE Events"
app_publisher = "Oliver Reid"
app_description = "NCE Events — Dynamic Multi-Panel Page Explorer"
app_email = "oliver_reid@me.com"
app_license = "mit"
app_logo_url = "/assets/nce_events/images/logo.png"
required_apps = ["nce_sync"]
add_to_apps_screen = [
    {"name": "nce_events", "logo": "/assets/nce_events/images/logo.png",
     "title": "NCE Events", "route": "/app/page-view"}
]
```

No `doc_events`, `scheduler_events`, or `fixtures` are defined.

---

## 14. Open Backlog

| # | Item | Status |
|---|---|---|
| 1 | Drag-and-drop | `Page Drag Action` fields defined; renderer not implemented |
| 2 | Card popover actions | Email/SMS stubs exist; actual send logic not implemented |
| 3 | Fixtures | Page Definition + Report not yet added to `hooks.py` fixtures |

---

## 15. Installation

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app https://github.com/oliver-nce/NCE_Events.git
bench --site your-site install-app nce_events
bench build && bench migrate
```

Pre-commit tools: ruff, eslint, prettier, pyupgrade.
