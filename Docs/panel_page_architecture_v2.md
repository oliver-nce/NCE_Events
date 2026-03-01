# Panel Page Architecture v2

## Overview

A Panel Page is a multi-panel data explorer built entirely from Frappe-native
configuration. No custom code is needed to create a new page — only the JS
page renderer is custom. Everything else is set up through the Frappe UI.

## Core Principle

Each panel's data source is a **Frappe Query Report**. Reports are created,
tested, and debugged independently using the standard Report UI before being
assigned to a panel. The Panel Page renderer assembles multiple reports into
a single interactive multi-panel view.

---

## Data Layer

### Query Reports

- Each panel is backed by a Query Report (Setup > Report, type "Query Report").
- The report's `.sql` file defines the data query.
- Reports are fully testable in Frappe's standard Report view (`/app/query-report/report-name`).
- Reports define their own columns (names, labels, types).

### Panel Page DocType (parent)

The parent record defines a page. Fields:

- **Page Name** (Data) — unique identifier, becomes the URL slug
- **Page Title** (Data) — display title
- **Active** (Check) — whether the page is live
- **Male Hex Color** (Data) — hex color for male-gender rows (optional)
- **Female Hex Color** (Data) — hex color for female-gender rows (optional)
- **Panels** (Table → Panel Definition) — child table, one row per panel

### Panel Definition (child table)

Each row defines one panel on the page. Fields:

- **Panel Number** (Int) — display order
- **Header Text** (Data) — panel header label
- **Report Name** (Link → Report) — the Query Report providing data
- **Root DocType** (Link → DocType) — the primary DocType for this panel
- **Where Clause** (Small Text) — optional override for inter-panel filtering
  (see Cross-Panel Filtering below)
- **Hidden Fields** (Small Text) — comma-delimited columns to hide from display
- **Bold Fields** (Small Text) — comma-delimited columns to render bold
- **Card Fields** (Small Text) — comma-delimited columns shown in card popover
- **Button 1 Name** (Data) — first action button label
- **Button 1 Code** (Code/JS) — description or implementation for button 1
- **Button 2 Name** (Data) — second action button label
- **Button 2 Code** (Code/JS) — description or implementation for button 2

---

## Cross-Panel Filtering

When a row is double-clicked in Panel N, Panel N+1 loads filtered data.

### Default behavior (no Where Clause)

The system looks up Link fields on Panel N+1's Root DocType that point to
Panel N's Root DocType. The Link field value from the selected row is used
as the filter automatically.

Example: `Registrations.product_id` is a Link to `Events.name`.
Selecting an event in Panel 1 automatically filters Panel 2 by
`product_id = {selected event's name}`.

### Override (Where Clause specified)

If a Where Clause is entered on the panel child record, it overrides the
default relationship. The clause is appended to the report's SQL at runtime.

Syntax uses `{panel_N.fieldname}` for substitution:

```
r.product_id = {panel_1.name}
```

The server substitutes these with parameterized values from the selected row.

---

## Column Header Display Priority

1. **Explicit `AS` alias** — if the report SQL uses `AS SomeAlias`, the alias
   is displayed exactly as written.
2. **Frappe Report column label** — from the report's column definition.
3. **Title-cased fallback** — if neither is available, title-case the field name
   (e.g. `player_count` → "Player Count").

## Field Reference Convention

All field references in `hidden_fields`, `bold_fields`, and `card_fields`
use the **SQL result column name** as it appears in the report output.

- If the report SQL uses `AS alias`, the alias is the reference name.
- If no alias, the bare column name is the reference name.
- Table prefixes (e.g. `fm.gender`) are automatically stripped when matching.

---

## Row Interaction

- **Single click** — shows a card popover (if `card_fields` defined).
  The card displays the configured fields, action buttons, and a link to
  open the record's full Frappe form view in a modal dialog.
- **Double click** — selects the row and loads the next panel, passing context.

## Card Popover

The card popover shows:

- Fields listed in `card_fields`, with smart rendering:
  - HTML fields (column name contains "html") rendered as raw HTML
  - Link/URL fields rendered as clickable links
  - All other fields escaped and displayed as text
- Action buttons (Button 1, Button 2) if defined
- **View Record** button — opens the Root DocType form in a modal dialog
  (user stays on the panel page)

## Filter Widget

Each panel has a standard filter widget in its header, similar to Frappe's
List/Report view filters. Users can:

- Pick any column from the report's result set
- Choose an operator (=, !=, >, <, LIKE, IN, etc.)
- Enter a value
- Add/remove multiple filter conditions

No configuration needed — the filter widget auto-populates from the report columns.

## Gender Color-Coding

`male_hex` and `female_hex` on the parent record color-code rows based on a
`gender` column in the report result set. Displayed as a colored left-border
indicator on each row. Leave empty for no color-coding.

## Header Buttons

Each panel header includes:

- **Sheets Link** — export to spreadsheet (all panels)
- **SMS** / **Email** — available on panels whose report queries Family/Family Members data

---

## Page Structure on Disk

Each page gets a standard Frappe Page directory:

```
nce_events/page/{page_name}/
    {page_name}.js      — thin wrapper: loads shared assets, creates Explorer
    {page_name}.json    — Page metadata (name, module, title, roles)
    __init__.py         — empty
```

The `.js` wrapper loads the shared renderer files:

- `public/js/panel_page/store.js` — state management, data fetching
- `public/js/panel_page/ui.js` — rendering, events, card popover, filters
- `public/css/panel_page.css` — styling

## Adding a New Page

1. Create the Query Reports for each panel (via Frappe UI)
2. Create a Panel Page record (via Frappe UI) linking to those reports
3. Create the page directory on disk (thin JS wrapper + JSON + __init__.py)
4. Deploy, `bench migrate`, done

No JSON editing. No config.js updates. No code changes (except the page wrapper).
