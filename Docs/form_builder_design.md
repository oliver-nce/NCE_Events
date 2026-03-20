# NCE Card Builder — Design Document

**Status:** Draft v2
**Date:** 2026-03-13

---

## 1. Goal

A config-driven card/form system that displays Frappe DocType records as
attractive, editable modal views with:

- Editable fields (with validation from Frappe meta)
- Read-only display fields (resolved Link values via hop paths)
- Jinja-rendered text blocks (merge fields)
- Related-record portals (one-to-many, like FileMaker portals)
- Pivot tables (aggregated summaries)
- Embedded web viewers (Google Maps, iframes)
- Graphics (JPG, PNG, SVG)
- Video (YouTube, Vimeo)
- Action buttons (invoke server/client scripts)
- Tabbed sections
- Square-grid-based layout
- Site-wide CSS variable theming with per-card overrides

---

## 2. Architecture Overview

```
┌───────────────────────────────────────────────────────────┐
│  CARD DEFINITION (Frappe DocType with child tables)       │
│  Parent: root DocType, title, grid config, offsets        │
│  Child tables: tabs, fields, displays, portals,           │
│    portal columns, text blocks, pivot tables, graphics,   │
│    videos, web viewers, actions, scripts                  │
│  Grid preview: clickable grid in desk form for placement  │
├───────────────────────────────────────────────────────────┤
│  CARD RENDERER (Vue modal)                                │
│  Reads child table data via frappe.db.get_doc             │
│  Renders widgets on CSS Grid (square cells)               │
│  Reads record data via frappe.db.get_doc / get_list       │
│  Writes data via frappe.db.set_value / insert             │
│  Modal overlay — one card active at a time                │
│  Permissions enforced by Frappe server-side               │
└───────────────────────────────────────────────────────────┘
```

**No visual designer.** Cards are configured via Frappe desk child tables
with a grid preview for coordinate assignment. A thin Python endpoint is
only needed for Jinja text-block rendering.

---

## 3. Data Connection — Tag Finder Paths, Not SQL

### 3.1 Principle

No SQL queries. Data connections are defined by:

1. **Root DocType** — declared once per card definition
2. **Field paths** — Tag Finder hop notation (dot-separated for Link traversal)
3. **Portal links** — child DocType + the Link field that connects back to root

### 3.2 Field Path Examples

| Path                  | Meaning                                    | Read method                                    |
|-----------------------|--------------------------------------------|------------------------------------------------|
| `event_name`          | Direct field on root DocType               | `doc.event_name` (from `get_doc`)              |
| `venue.venue_name`    | One-hop: root.venue → Venue.venue_name     | `frappe.db.get_value('Venue', doc.venue, 'venue_name')` |
| `venue.city.state`    | Two-hop: root→Venue→City.state             | Chain of `get_value` calls                     |

### 3.3 Portal Definition

A portal points at the Link field connecting a child DocType back to root:
`frappe.db.get_list('Registration', {filters: {event: record.name}})`.

### 3.4 Portal Column Types

Each portal column has a type:

| Type | Behavior |
|------|----------|
| `data` | Plain display (text, number, date) |
| `data+link` | Display + clickable — opens card for linked record |
| `action` | Button column — invokes a script per row |

---

## 4. Frappe Client API (Verified)

| Operation            | JS Method                                                       |
|----------------------|-----------------------------------------------------------------|
| Read one record      | `frappe.db.get_doc(doctype, name)`                              |
| Read field value     | `frappe.db.get_value(doctype, name, fieldname)`                 |
| Read list            | `frappe.db.get_list(doctype, {fields, filters, order_by, limit})` |
| Edit field(s)        | `frappe.db.set_value(doctype, name, fieldname, value)`          |
| Edit multiple fields | `frappe.db.set_value(doctype, name, {field1: v1, field2: v2})`  |
| Create record        | `frappe.db.insert({doctype, field1: v1, ...})`                  |
| Delete record        | `frappe.db.delete_doc(doctype, name)`                           |
| Field metadata       | `frappe.call('frappe.client.get_doctype', {doctype})`           |

All return Promises. Permissions and validation enforced server-side.

---

## 5. Card Definition — Data Model

### 5.1 Parent DocType: `Card Definition`

| Field            | Type         | Default | Purpose                                     |
|------------------|--------------|---------|---------------------------------------------|
| title            | Data         |         | Header bar title ("Event Card")             |
| root_doctype     | Link→DocType |         | Target DocType (Frappe internal name)        |
| grid_columns     | Int          | 12      | Number of grid columns                      |
| grid_rows        | Int          | 10      | Number of grid rows (can grow)              |
| grid_cell_size   | Int          | 50      | Pixel size of one square cell (w = h)       |
| offset_x         | Int          | 80      | Horizontal offset from parent when opening  |
| offset_y         | Int          | 60      | Vertical offset from parent when opening    |
| styles_json      | Code (JSON)  |         | Optional per-card CSS variable overrides    |
| is_default       | Check        |         | Default card for this DocType               |

`autoname`: `format:CARD-{####}`
`module`: NCE Events

### 5.2 Child Table: `Card Tab`

| Field      | Type  | Default | Purpose                           |
|------------|-------|---------|-----------------------------------|
| label      | Data  | "Home"  | Tab display name                  |
| sort_order | Int   | 0       | Display order                     |
| hide_bar   | Check |         | If only one tab, hide the tab bar |

Default "Home" tab auto-created on new Card Definition save.

### 5.3 Child Table: `Card Field` (editable input)

| Field     | Type          | Purpose                               |
|-----------|---------------|---------------------------------------|
| tab       | Link→Card Tab | Which tab this belongs to             |
| path      | Data          | Tag Finder hop path (e.g. `event_name`) |
| editable  | Check         | Allow editing (default: true)         |
| x         | Int           | Grid column start (0-based)           |
| y         | Int           | Grid row start (0-based)              |
| w         | Int           | Column span                           |
| h         | Int           | Row span                              |

### 5.4 Child Table: `Card Display` (read-only resolved value)

| Field     | Type          | Purpose                               |
|-----------|---------------|---------------------------------------|
| tab       | Link→Card Tab | Which tab                             |
| path      | Data          | Hop path (e.g. `venue.venue_name`)    |
| label     | Data          | Override label (default: from path)   |
| x, y, w, h | Int         | Grid coordinates                      |

### 5.5 Child Table: `Card Portal` (related records table)

| Field            | Type          | Purpose                               |
|------------------|---------------|---------------------------------------|
| tab              | Link→Card Tab | Which tab                             |
| portal_name      | Data          | Identifier (for portal columns to ref)|
| child_doctype    | Link→DocType  | The related DocType                   |
| link_field       | Data          | Field on child that links to root     |
| editable         | Check         | Allow inline editing                  |
| allow_insert     | Check         | Show "Add Row" button                 |
| allow_delete     | Check         | Show delete button per row            |
| x, y, w, h      | Int           | Grid coordinates                      |

### 5.6 Child Table: `Card Portal Column`

| Field          | Type          | Purpose                               |
|----------------|---------------|---------------------------------------|
| portal_name    | Data          | Which portal this column belongs to   |
| fieldname      | Data          | Field on the child DocType            |
| column_type    | Select        | `data` / `data+link` / `action`       |
| label          | Data          | Column header (default: from meta)    |
| action_label   | Data          | Button text (if type = action)        |
| action_script  | Data          | Script name (refs Card Script)        |
| sort_order     | Int           | Column display order                  |

### 5.7 Child Table: `Card Text Block` (Jinja merge text)

| Field     | Type          | Purpose                               |
|-----------|---------------|---------------------------------------|
| tab       | Link→Card Tab | Which tab                             |
| template  | Small Text    | Jinja template string                 |
| x, y, w, h | Int         | Grid coordinates                      |

### 5.8 Child Table: `Card Pivot Table`

| Field          | Type          | Purpose                               |
|----------------|---------------|---------------------------------------|
| tab            | Link→Card Tab | Which tab                             |
| child_doctype  | Link→DocType  | Source data DocType                   |
| link_field     | Data          | Field linking to root                 |
| pivot_rows     | Data          | Comma-separated row fields            |
| pivot_cols     | Data          | Comma-separated column fields         |
| pivot_vals     | Data          | Comma-separated value fields          |
| aggregator     | Select        | Count / Sum / Average / Min / Max     |
| x, y, w, h    | Int           | Grid coordinates                      |

### 5.9 Child Table: `Card Graphic` (image)

| Field       | Type          | Purpose                               |
|-------------|---------------|---------------------------------------|
| tab         | Link→Card Tab | Which tab                             |
| source      | Select        | `static` / `field`                    |
| src         | Data          | Static URL or Jinja-tokenised URL     |
| fieldname   | Data          | Attach Image field (if source=field)  |
| alt_text    | Data          | Alt text                              |
| object_fit  | Select        | `contain` / `cover` / `fill`          |
| x, y, w, h | Int           | Grid coordinates                      |

### 5.10 Child Table: `Card Video`

| Field       | Type          | Purpose                               |
|-------------|---------------|---------------------------------------|
| tab         | Link→Card Tab | Which tab                             |
| source      | Select        | `static` / `field`                    |
| url         | Data          | YouTube/Vimeo URL (if source=static)  |
| fieldname   | Data          | Field containing URL (if source=field)|
| x, y, w, h | Int           | Grid coordinates                      |

### 5.11 Child Table: `Card Web Viewer` (iframe)

| Field         | Type          | Purpose                               |
|---------------|---------------|---------------------------------------|
| tab           | Link→Card Tab | Which tab                             |
| url_template  | Data          | URL with `{{ field }}` tokens         |
| x, y, w, h   | Int           | Grid coordinates                      |

### 5.12 Child Table: `Card Action` (sidebar buttons)

| Field         | Type          | Purpose                               |
|---------------|---------------|---------------------------------------|
| label         | Data          | Button text                           |
| action_script | Data          | Script name (refs Card Script)        |
| sort_order    | Int           | Display order                         |

### 5.13 Child Table: `Card Script`

| Field        | Type          | Purpose                               |
|--------------|---------------|---------------------------------------|
| script_name  | Data          | Identifier (e.g. "push_woo")         |
| script_type  | Select        | `server` / `client` / `open_url` / `open_card` / `frappe_action` |
| method       | Data          | Python path, JS fn name, URL, card name, or Frappe action |
| description  | Small Text    | What this script does                 |

Actions and portal action columns reference scripts by `script_name`.
Change the method in one place → all buttons using it update.

---

## 6. Modal Cards

### 6.1 Why Modal

- Simpler than managing multiple floating z-index conflicts
- Forces user to finish with one record before moving on
- Easier locking semantics
- Responsive — adapts to viewport automatically

### 6.2 Modal CSS

```css
.card-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 60px;
  overflow-y: auto;
  z-index: 1000;
}

.card-modal {
  width: 90vw;
  max-width: 1200px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  background: var(--bg-card);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
}
```

Responsive: 90vw on small screens, capped at 1200px on large.
Card scrolls internally if content exceeds viewport.

### 6.3 Stacked Modals

Opening a card from a portal row stacks a new modal on top.
Each stacked modal gets a higher z-index. Closing returns to previous.
Manageable for 2-3 levels deep.

### 6.4 Record Locking — Optimistic

No explicit locking. Frappe's `set_value` checks the `modified` timestamp
server-side. If another user changed the record since load, the save
returns an error. The card shows "Record was modified by another user —
refresh?" and lets the user reload.

Explicit locking (via `frappe.lock_doc`) can be added later if needed.

---

## 7. Grid System — Square Cells

### 7.1 Configuration

Each Card Definition specifies:
- `grid_columns` — default 12
- `grid_rows` — default 10 (can grow based on widget placement)
- `grid_cell_size` — default 50px (width = height, always square)

### 7.2 CSS Grid Rendering

```css
.widget-grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), var(--cell-size));
  grid-template-rows: repeat(var(--grid-rows), var(--cell-size));
  gap: 4px;
}

.widget-item {
  /* Each widget positioned by its x, y, w, h from child table */
  grid-column: calc(var(--wx) + 1) / span var(--ww);
  grid-row: calc(var(--wy) + 1) / span var(--wh);
}
```

### 7.3 Grid Preview (in Desk)

Instead of a visual designer, the Card Definition desk form includes a
**grid preview** — a read-only visualization of the grid showing:

- Empty cells labeled with column/row numbers
- Occupied cells shaded and labeled with widget type + name
- Click an empty cell while editing a child table row → auto-fills x, y

The grid preview is a single Vue component (`GridPreview.vue`, ~100 lines)
embedded in the Card Definition form via client script.

Preview cells are scaled down (e.g. 30×30px) to fit in the desk form.
The actual rendered card uses `grid_cell_size` for real dimensions.

### 7.4 Typical Widget Sizes (at 50px cell size)

| Widget              | Grid size | Actual pixels |
|---------------------|----------|--------------|
| Text field          | 3w × 1h  | 150 × 50px   |
| Text area           | 6w × 2h  | 300 × 100px  |
| Portal table        | 12w × 6h | 600 × 300px  |
| Google Map          | 4w × 5h  | 200 × 250px  |
| Photo               | 3w × 3h  | 150 × 150px  |
| Pivot table         | 8w × 5h  | 400 × 250px  |

---

## 8. Widget Types Summary

| # | Widget | Child table | Rendering |
|---|--------|------------|-----------|
| 1 | Field (editable) | Card Field | frappe-ui FormControl or HTML input |
| 2 | Display (read-only) | Card Display | Styled `<span>`, resolved via hop path |
| 3 | Text Block (Jinja) | Card Text Block | Server-rendered Jinja → `v-html` |
| 4 | Portal | Card Portal + Card Portal Column | `<table>` with typed columns |
| 5 | Pivot Table | Card Pivot Table | `<VuePivottable>` from vue-pivottable |
| 6 | Web Viewer | Card Web Viewer | `<iframe>` |
| 7 | Graphic | Card Graphic | `<img>` |
| 8 | Video | Card Video | `<iframe>` (YouTube/Vimeo embed) |

Actions panel is separate — not on the grid, always on the left sidebar.

### 8.1 Link Field Input

frappe-ui lacks a Frappe Link autocomplete. Build `LinkInput.vue`:
text input + debounced `get_list` dropdown, ~60 lines. Used by Field
widgets (Link fieldtype) and editable portal columns (data+link type).

### 8.2 Video URL Conversion

```js
function toEmbedUrl(url) {
  if (!url) return ''
  const yt = url.match(/youtube\.com\/watch\?v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return url
}
```

### 8.3 Text Block Rendering

Python endpoint (reuses existing helpers):

```python
@frappe.whitelist()
def render_text_block(template: str, doctype: str, name: str) -> str:
    doc = frappe.get_doc(doctype, name)
    context = _enrich_row_context(doctype, doc.as_dict())
    return _render_body(template, context, for_html=True)
```

---

## 9. Tab System

### 9.1 Default Tab

Every new Card Definition auto-creates a "Home" tab. It can be renamed.

### 9.2 Tab Bar Visibility

```js
const showTabBar = computed(() => {
  if (tabs.length === 1 && tabs[0].hide_bar) return false
  return tabs.length > 1
})
```

If only one tab and `hide_bar` is checked, no tab bar renders — the card
just shows the content directly.

### 9.3 Widget Assignment

Every widget child table row has a `tab` field (Link to Card Tab).
The renderer groups widgets by tab and renders the active tab's widgets
on the grid.

---

## 10. Actions Panel (Left Sidebar)

Vertical list of buttons. Each Card Action row references a Card Script
by `script_name`. On click, the script is executed based on `script_type`:

| script_type    | Execution                                                |
|----------------|----------------------------------------------------------|
| server         | `frappe.call({method: script.method, args: {name: record.name}})` |
| client         | Named function registry lookup                           |
| open_url       | `window.open(resolvedUrl, '_blank')`                     |
| open_card      | Open another card modal (script.method = card def name)  |
| frappe_action  | Print, Submit, Cancel, etc.                              |

Token replacement in URLs/args: `{{ fieldname }}` → `record[fieldname]`.

---

## 11. Vue Component Tree

```
App.vue (existing — add modal card support)
├── PanelFloat.vue (existing — list panels)
│   └── PanelTable.vue (existing — list view)
├── CardModal.vue ★ NEW — modal backdrop + card
│   └── CardForm.vue ★ NEW — renders a card definition
│       ├── ActionsPanel.vue ★ — left sidebar buttons
│       ├── TabBar.vue ★ — tab switcher (or hidden)
│       └── WidgetGrid.vue ★ — CSS Grid container
│           ├── FieldWidget.vue ★ — editable input
│           ├── DisplayWidget.vue ★ — read-only value
│           ├── TextBlockWidget.vue ★ — Jinja-rendered HTML
│           ├── PortalWidget.vue ★ — related records table
│           ├── PivotWidget.vue ★ — vue-pivottable wrapper
│           ├── WebViewerWidget.vue ★ — iframe
│           ├── GraphicWidget.vue ★ — image
│           ├── VideoWidget.vue ★ — video embed
│           └── LinkInput.vue ★ — Link field autocomplete
├── GridPreview.vue ★ NEW — grid preview for desk form
└── TagFinder.vue (existing — reused for field path picking)
```

**New components: 13.** No designer components needed.

---

## 12. Composables

### 12.1 `useCardForm(rootDoctype)`

```js
const cardDef = ref(null)       // Card Definition doc with child tables
const record = ref(null)        // frappe.db.get_doc result
const meta = ref(null)          // frappe.client.get_doctype results (cached per doctype)
const resolvedHops = ref({})    // pre-resolved hop path values
const loading = ref(false)
const error = ref(null)

async function load(cardDefName, recordName)
async function saveField(fieldname, value)
async function resolveHopPath(path)
async function refresh()
```

### 12.2 `usePortal(childDoctype, linkField, parentName)`

```js
const rows = ref([])
const meta = ref(null)
const loading = ref(false)

async function load()
async function saveCell(name, fieldname, value)
async function insertRow(defaults)
async function deleteRow(name)
async function refresh()
```

---

## 13. New Dependencies

| Package            | Version  | Size (min+gz) | Purpose              |
|--------------------|----------|---------------|----------------------|
| vue-pivottable     | ^1.4.0   | ~50 KB        | Pivot table widget   |

Install: `npm install vue-pivottable`

**Removed:** gridstack (~35KB) and vuedraggable (~10KB) — no longer needed
since the visual designer is replaced by grid preview + child tables.

---

## 14. Integration with Existing V2 Panel

### 14.1 Opening a Card from PanelTable

Row click or drill in a panel → check if a default Card Definition exists
for that DocType → if yes, open a CardModal.

```js
async function onDrill(ev, parentPanel) {
  const result = await frappe.db.get_value(
    'Card Definition', {root_doctype: ev.doctype, is_default: 1}, 'name'
  )
  if (result?.name && ev.rowName) {
    openCardModal(result.name, ev.doctype, ev.rowName)
  } else {
    openPanel(ev.doctype, filter)
  }
}
```

### 14.2 Recursive Cards

Portal row "Open Card" action → closes nothing, stacks a new CardModal
on top of the current one. Escape or close button dismisses the top modal.

---

## 15. Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Create `theme_defaults.css` with CSS variable fallbacks
- [ ] Add to `hooks.py`
- [ ] Refactor PanelFloat, PanelTable, TagFinder to use CSS variables
- [ ] Add `theme_json` to Display Settings
- [ ] Add `applyTheme()` to `main.js`
- [ ] Create Card Definition DocType + all 12 child table DocTypes
- [ ] Build `useCardForm` composable (hop path resolver)
- [ ] Build `WidgetGrid.vue` (CSS Grid renderer)
- [ ] Build `FieldWidget.vue` (editable input)
- [ ] Build `DisplayWidget.vue` (read-only)
- [ ] Build `ActionsPanel.vue` (sidebar buttons, script execution)
- [ ] Build `TabBar.vue` (tab switcher with hide logic)
- [ ] Build `CardForm.vue` (main card renderer)
- [ ] Build `CardModal.vue` (modal backdrop)
- [ ] Integrate into App.vue (modal card from panel drill)
- [ ] Build and test

### Phase 2: Portals + Rich Widgets
- [ ] Build `usePortal` composable
- [ ] Build `PortalWidget.vue` (typed columns: data, data+link, action)
- [ ] Build `LinkInput.vue` (autocomplete for Link fields)
- [ ] Add inline editing to portals
- [ ] Add insert/delete row to portals
- [ ] Build `TextBlockWidget.vue` + Python `render_text_block` endpoint
- [ ] Build `WebViewerWidget.vue` (iframe)
- [ ] Build `GraphicWidget.vue` (image)
- [ ] Build `VideoWidget.vue` (YouTube/Vimeo embed)
- [ ] Build and test

### Phase 3: Pivot + Grid Preview
- [ ] Install vue-pivottable: `npm install vue-pivottable`
- [ ] Build `PivotWidget.vue`
- [ ] Build `GridPreview.vue` (clickable grid for desk form)
- [ ] Build Card Definition form client script (embed grid preview)
- [ ] Build and test

### Phase 4: Polish
- [ ] Recursive card opening from portal row actions
- [ ] Keyboard shortcuts (Escape to close, Ctrl+S to save)
- [ ] Loading states and error handling
- [ ] "Record modified by another user" conflict detection
- [ ] Unsaved changes warning on close

---

## 16. Risks and Open Questions

| Risk | Mitigation |
|------|-----------|
| frappe-ui FormControl lacks Link autocomplete | Build custom `LinkInput.vue` (~60 lines) |
| Large portal datasets slow pivot table | Limit query to 5000 rows, show warning |
| Jinja rendering requires server round-trip | Cache text blocks, re-render on record change |
| iframe blocked by X-Frame-Options | Primary use: Google Maps embed — no issue |
| Multi-hop path resolution (3+ hops) | Chain get_value calls, cache intermediate results |
| 12 child tables = many DocTypes to create | One-time setup cost, manageable with bench scaffolding |
| Stacked modals feel heavy at 3+ levels | Acceptable for now, can switch to non-modal later |
| Optimistic locking: last write wins | Frappe's modified-timestamp check catches conflicts |

---

## 17. Files to Create

```
nce_events/
├── api/
│   └── form_api.py                          ★ render_text_block endpoint
├── nce_events/doctype/
│   ├── card_definition/                     ★ Parent DocType
│   ├── card_tab/                            ★ Child: tabs
│   ├── card_field/                          ★ Child: editable fields
│   ├── card_display/                        ★ Child: read-only displays
│   ├── card_portal/                         ★ Child: portal definitions
│   ├── card_portal_column/                  ★ Child: portal column config
│   ├── card_text_block/                     ★ Child: Jinja text blocks
│   ├── card_pivot_table/                    ★ Child: pivot tables
│   ├── card_graphic/                        ★ Child: images
│   ├── card_video/                          ★ Child: videos
│   ├── card_web_viewer/                     ★ Child: iframes
│   ├── card_action/                         ★ Child: sidebar action buttons
│   └── card_script/                         ★ Child: script definitions
├── public/
│   ├── css/
│   │   └── theme_defaults.css               ★ CSS variable fallbacks
│   └── js/panel_page_v2/
│       ├── components/
│       │   ├── CardModal.vue                ★ Modal backdrop
│       │   ├── CardForm.vue                 ★ Main card renderer
│       │   ├── ActionsPanel.vue             ★ Left sidebar buttons
│       │   ├── TabBar.vue                   ★ Tab switcher
│       │   ├── WidgetGrid.vue               ★ CSS Grid container
│       │   ├── FieldWidget.vue              ★ Editable input
│       │   ├── DisplayWidget.vue            ★ Read-only display
│       │   ├── TextBlockWidget.vue          ★ Jinja text
│       │   ├── PortalWidget.vue             ★ Related records table
│       │   ├── PivotWidget.vue              ★ Pivot table
│       │   ├── WebViewerWidget.vue          ★ iframe
│       │   ├── GraphicWidget.vue            ★ Image
│       │   ├── VideoWidget.vue              ★ Video embed
│       │   ├── LinkInput.vue                ★ Link field autocomplete
│       │   └── GridPreview.vue              ★ Grid preview for desk
│       ├── composables/
│       │   ├── useCardForm.js               ★ Card form state + hop resolver
│       │   └── usePortal.js                 ★ Portal state
│       └── App.vue                          (modify — add modal card support)
```

**New files: ~32** (13 DocTypes × 4 files + 1 Python endpoint + 1 CSS +
15 Vue components + 2 composables). Modified: App.vue, main.js, hooks.py,
PanelFloat.vue, PanelTable.vue, TagFinder.vue, display_settings.json.

---

## 18. Theming — Site-Wide CSS Variable Palette

### 18.1 New Approach: JSON Theme → CSS Variables

Replace Display Settings individual style fields with `theme_json` Code field.
JSON object defines CSS custom properties injected at `:root` on page load.

**Default fallbacks** in `theme_defaults.css`:

```css
:root {
  --primary: #126BC4;
  --primary-light: #e8f0fe;
  --bg-surface: #fafafa;
  --bg-card: #ffffff;
  --bg-header: #126BC4;
  --text-color: #333333;
  --text-muted: #888888;
  --text-header: #ffffff;
  --border-color: #b0b8c0;
  --shadow: 0 4px 16px rgba(0,0,0,0.15);
  --male-hex: #dce6f0;
  --female-hex: #f0dce6;
  --font-family: 'Instrument Sans', -apple-system, sans-serif;
  --font-size-base: 13px;
  --font-size-sm: 11px;
  --font-size-lg: 16px;
  --font-weight-bold: 600;
  --border-radius: 6px;
  --border-radius-sm: 4px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --input-border: #ccc;
  --input-focus-border: var(--primary);
  --btn-primary-bg: var(--primary);
  --btn-primary-text: #ffffff;
  --tab-active-border: var(--primary);
  --portal-header-bg: #e8ecf0;
  --portal-alt-row: #f5f7f9;
}
```

**Runtime injection** in `main.js`:

```js
async function applyTheme() {
  try {
    const settings = await frappe.db.get_doc('Display Settings')
    if (!settings.theme_json) return
    const vars = JSON.parse(settings.theme_json)
    for (const [key, value] of Object.entries(vars)) {
      if (key.startsWith('--')) {
        document.documentElement.style.setProperty(key, value)
      }
    }
  } catch (e) { console.warn('applyTheme:', e) }
}
```

### 18.2 Per-Card Overrides

Card Definition's `styles_json` field scoped via `:style` on the card root.
Only affects that card and children — doesn't leak.

### 18.3 Existing Components Refactor

Replace hardcoded hex values in PanelFloat, PanelTable, TagFinder with
CSS variable references. Do this in Phase 1 so all new components use
variables from the start.
