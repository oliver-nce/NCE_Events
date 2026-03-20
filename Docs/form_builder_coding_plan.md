# NCE Card Builder — Coding Plan

Explicit step-by-step instructions for AI coding agent execution.
Each step is self-contained and builds on previous steps.

**Reference:** `Docs/form_builder_design.md` — full architecture.
**Reference:** `Docs/project_reference.md` — codebase conventions.
**Reference:** `AGENTS.md` — where to add new code.

---

## Phase 1: Foundation

### Step 1.1 — Create `theme_defaults.css`

**Create:** `nce_events/public/css/theme_defaults.css`

Copy the full `:root` CSS variable block from design doc §18.1 (colors,
gender, typography, spacing, components). This is the fallback theme.

**Modify:** `nce_events/hooks.py` — add `"nce_events/public/css/theme_defaults.css"`
to the `app_include_css` list.

---

### Step 1.2 — Refactor existing components to CSS variables

**Modify these files — replace hardcoded hex values with CSS variables:**

1. `nce_events/public/js/panel_page_v2/components/PanelFloat.vue`
   - `#fafafa` → `var(--bg-surface)`
   - `#b0b8c0` → `var(--border-color)`
   - `0 4px 16px rgba(0,0,0,0.15)` → `var(--shadow)`
   - `#e8ecf0` → `var(--portal-header-bg)`
   - `#555` → `var(--text-muted)`
   - `6px` (border-radius) → `var(--border-radius)`

2. `nce_events/public/js/panel_page_v2/components/PanelTable.vue`
   - All hardcoded colors → CSS variable equivalents
   - Header background/text, row colors, font sizes

3. `nce_events/public/js/panel_page_v2/components/TagFinder.vue`
   - `#126BC4` → `var(--bg-header)`
   - `#fff` → `var(--text-header)`
   - Other hardcoded colors → CSS variables

**Test:** App should look identical after changes.

---

### Step 1.3 — Add `theme_json` to Display Settings

**Modify:** `nce_events/nce_events/doctype/display_settings/display_settings.json`

Add to `field_order` and `fields` arrays (before `section_actions`):

```json
{
  "fieldname": "theme_json",
  "fieldtype": "Code",
  "label": "Theme (JSON)",
  "options": "JSON"
}
```

Keep existing fields — deprecated but not removed yet.

---

### Step 1.4 — Add `applyTheme()` to main.js

**Modify:** `nce_events/public/js/panel_page_v2/main.js`

Add an `applyTheme` async function that:
1. Calls `frappe.call` to get Display Settings doc
2. Parses `theme_json` if present
3. Iterates entries, calls `document.documentElement.style.setProperty(key, value)`
   for each key starting with `--`
4. Catches errors silently (console.warn)

Modify `mount()` to call `await applyTheme()` before `app.mount(selector)`.

---

### Step 1.5 — Create all Card Definition DocTypes

Create **13 DocTypes** — 1 parent + 12 child tables. For each, create a
directory under `nce_events/nce_events/doctype/` with 4 files:
`__init__.py` (empty), `<name>.py` (empty Document subclass), `<name>.json`
(DocType definition).

Use `bench new-doctype` or copy structure from existing DocType like
`page_panel`. Set `module` to `NCE Events` on all.

**Parent: `Card Definition`**

Fields (see design doc §5.1):
- `title` (Data, required)
- `root_doctype` (Link → DocType, required)
- `grid_columns` (Int, default 12)
- `grid_rows` (Int, default 10)
- `grid_cell_size` (Int, default 50)
- `offset_x` (Int, default 80)
- `offset_y` (Int, default 60)
- `is_default` (Check)
- Section Break: "Tabs"
- `tabs` (Table → Card Tab)
- Section Break: "Fields"
- `fields_list` (Table → Card Field)
- Section Break: "Displays"
- `displays` (Table → Card Display)
- Section Break: "Portals"
- `portals` (Table → Card Portal)
- `portal_columns` (Table → Card Portal Column)
- Section Break: "Text Blocks"
- `text_blocks` (Table → Card Text Block)
- Section Break: "Pivot Tables"
- `pivot_tables` (Table → Card Pivot Table)
- Section Break: "Media"
- `graphics` (Table → Card Graphic)
- `videos` (Table → Card Video)
- `web_viewers` (Table → Card Web Viewer)
- Section Break: "Actions & Scripts"
- `actions` (Table → Card Action)
- `scripts` (Table → Card Script)
- Section Break: "Style Overrides"
- `styles_json` (Code, options: JSON)

`autoname`: `format:CARD-{####}`

**Child tables** — create each with the columns listed in design doc
§5.2 through §5.13. Set `istable: 1` on all child DocTypes.

**Important:** For each child table that has a `tab` field, make it a
Link field with `options: "Card Tab"`. However, since Card Tab is a child
table (istable=1), Frappe won't allow Link to it. **Instead, use a Data
field** for `tab` and store the tab label as the reference. The renderer
matches by label.

Similarly, `portal_name` on Card Portal Column is a Data field matching
the portal's `portal_name` Data field on Card Portal.

**Card Definition Python class** — add an `after_insert` hook that creates
the default "Home" tab:

```python
class CardDefinition(Document):
    def after_insert(self):
        if not self.tabs:
            self.append("tabs", {"label": "Home", "sort_order": 0, "hide_bar": 1})
            self.save()
```

---

### Step 1.6 — Build `useCardForm.js` composable

**Create:** `nce_events/public/js/panel_page_v2/composables/useCardForm.js`

Export `useCardForm(rootDoctype)` function. State refs: `cardDef`, `record`,
`meta` (cached by doctype), `resolvedHops`, `loading`, `error`.

Methods:
- `load(cardDefName, recordName)` — fetches Card Definition doc (includes
  all child tables via `frappe.db.get_doc`), fetches record, fetches meta,
  pre-resolves all hop paths from Card Display and Card Field rows.
- `saveField(fieldname, value)` — `frappe.db.set_value`, updates local record.
- `resolveHopPath(path)` — walks dot-separated path. For each hop: find
  Link field in meta, get target doctype, call `frappe.db.get_value`. Cache
  intermediate results.
- `refresh()` — re-fetches record and re-resolves hops.

The Card Definition doc returned by `frappe.db.get_doc('Card Definition', name)`
includes all child table arrays: `tabs`, `fields_list`, `displays`, `portals`,
`portal_columns`, `text_blocks`, `pivot_tables`, `graphics`, `videos`,
`web_viewers`, `actions`, `scripts`.

---

### Step 1.7 — Build `WidgetGrid.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/WidgetGrid.vue`

**Props:** `widgets` (array of widget objects with type + x/y/w/h + config),
`gridColumns`, `gridRows`, `cellSize`, `record`, `meta`, `resolvedHops`,
`scripts` (Card Script array for action execution).

**Template:** A `<div>` styled as CSS Grid:
```
display: grid;
grid-template-columns: repeat(gridColumns, cellSize + 'px');
grid-template-rows: repeat(gridRows, cellSize + 'px');
gap: 4px;
```

For each widget, render a positioned `<div>` wrapper, then use a
`<component :is="widgetMap[widget.type]">` inside.

Widget type → component mapping:
```js
import FieldWidget from './FieldWidget.vue'
import DisplayWidget from './DisplayWidget.vue'
// ... etc
const widgetMap = { field: FieldWidget, display: DisplayWidget, ... }
```

**Emits:** `save-field`, `open-card`

---

### Step 1.8 — Build `FieldWidget.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/FieldWidget.vue`

**Props:** `config` (path, editable), `record`, `meta`

Look up the field's Frappe meta (fieldtype, options, reqd, label) from
the meta object. Map fieldtype to HTML input:
- Data → `<input type="text">`
- Int/Float/Currency → `<input type="number">`
- Select → `<select>` with options split by `\n` from meta
- Date → `<input type="date">`
- Check → `<input type="checkbox">`
- Small Text/Text → `<textarea>`
- Link → plain `<input type="text">` (LinkInput comes in Phase 2)

Show label above input. Emit `save-field` with `{fieldname, value}` on
blur or Enter. Mark required fields.

Style with CSS variables.

---

### Step 1.9 — Build `DisplayWidget.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/DisplayWidget.vue`

**Props:** `config` (path, label), `record`, `resolvedHops`

Read value: if path has dots, use `resolvedHops[path]`; otherwise
`record[path]`. Show label (from config or title-cased last path segment)
+ value in a muted read-only style.

---

### Step 1.10 — Build `ActionsPanel.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/ActionsPanel.vue`

**Props:** `actions` (Card Action rows), `scripts` (Card Script rows), `record`
**Emits:** `open-card`, `refresh`

Render vertical button list. On click, find the matching Card Script by
`action_script` → `script_name`. Execute based on `script_type`:

- `server` → `frappe.call({method: script.method, args: {name: record.name}})`
  then show `frappe.show_alert` and emit `refresh`
- `client` → named function registry lookup (log warning if not found)
- `open_url` → `window.open(resolvedUrl)` with `{{ field }}` token replacement
- `open_card` → emit `open-card` with `{cardDefName: script.method, doctype, name}`
- `frappe_action` → handle print via `frappe.ui.form.PrintPreview` etc.

Token replacement helper: `str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => record[k] || '')`

Fixed-width sidebar (~140px), buttons stacked, full-width, CSS variables.

---

### Step 1.11 — Build `TabBar.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/TabBar.vue`

**Props:** `tabs` (Card Tab rows), `activeTab` (string — tab label)
**Emits:** `update:activeTab`

Show tab bar only if `tabs.length > 1 || !tabs[0]?.hide_bar`.

Render a row of buttons, active tab highlighted with `var(--tab-active-border)`.
Click emits `update:activeTab` with the tab's label.

---

### Step 1.12 — Build `CardForm.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/CardForm.vue`

**Props:** `cardDefName`, `doctype`, `recordName`
**Emits:** `open-card`, `close`

Use `useCardForm(doctype)` composable. On mount, call `load(cardDefName, recordName)`.

**Template:**
```
<div class="card-form" :style="cardStyles">
  <div class="card-form-header">
    <span>{{ cardDef?.title || doctype }}</span>
    <span class="record-name">{{ recordName }}</span>
    <button @click="$emit('close')">&times;</button>
  </div>
  <div class="card-form-body">
    <ActionsPanel ... />
    <div class="card-form-content">
      <TabBar ... v-model:active-tab="activeTab" />
      <WidgetGrid :widgets="activeWidgets" ... />
    </div>
  </div>
</div>
```

`activeWidgets` is a computed that collects all widget rows (from fields_list,
displays, text_blocks, portals, pivot_tables, graphics, videos, web_viewers)
whose `tab` matches `activeTab`, normalized into a common format:
`{ type, x, y, w, h, config: { ...row-specific fields } }`.

`cardStyles` is the parsed `styles_json` for per-card CSS variable overrides.

`onSaveField` calls `saveField()` from the composable.

---

### Step 1.13 — Build `CardModal.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/CardModal.vue`

**Props:** `cardDefName`, `doctype`, `recordName`
**Emits:** `open-card`, `close`

**Template:**
```vue
<Teleport to="body">
  <div class="card-modal-backdrop" @click.self="$emit('close')">
    <div class="card-modal">
      <CardForm
        :card-def-name="cardDefName"
        :doctype="doctype"
        :record-name="recordName"
        @open-card="(...a) => $emit('open-card', ...a)"
        @close="$emit('close')"
      />
    </div>
  </div>
</Teleport>
```

**Style** — see design doc §6.2 (modal backdrop + responsive card sizing).
Use CSS variables. Escape key closes (add `keydown` listener on mount).

---

### Step 1.14 — Integrate into App.vue

**Modify:** `nce_events/public/js/panel_page_v2/App.vue`

1. Import `CardModal`.
2. Add `cardStack` reactive array — supports stacked modals.
3. Add `openCardModal(cardDefName, doctype, recordName)` — pushes to stack.
4. Add `closeTopCard()` — pops from stack.
5. Add template:
   ```vue
   <CardModal
     v-for="(card, i) in cardStack"
     :key="'card-' + i"
     :card-def-name="card.cardDefName"
     :doctype="card.doctype"
     :record-name="card.recordName"
     :style="{ zIndex: 1000 + i }"
     @open-card="onOpenCard"
     @close="closeTopCard"
   />
   ```
6. Modify `onDrill` to check for Card Definition:
   ```js
   async function onDrill(ev, parentPanel) {
     const filter = {}
     if (ev.linkField && ev.rowName) filter[ev.linkField] = ev.rowName
     try {
       const r = await frappe.db.get_value(
         'Card Definition', {root_doctype: ev.doctype, is_default: 1}, 'name'
       )
       if (r?.name && ev.rowName) {
         openCardModal(r.name, ev.doctype, ev.rowName)
         return
       }
     } catch (e) { /* fall through */ }
     openPanel(ev.doctype, filter)
   }
   ```
7. `onOpenCard(cfg)` calls `openCardModal(cfg.cardDefName, cfg.doctype, cfg.name)`.

---

### Step 1.15 — Build and test Phase 1

```bash
cd nce_events/public/js/panel_page_v2 && npm run build
```
Then `bench build --app nce_events` on server.

**Test:**
1. Create a Card Definition in Frappe desk:
   - Title: "Test Card", Root DocType: any DocType with data
   - Add a "Home" tab, add 2-3 Card Field rows with paths and grid coords
   - Set `is_default` checked
2. Open V2 panel, drill into a row for that DocType
3. Modal should open with the card rendered
4. Edit a field, verify it saves
5. Close modal, verify it dismisses

---

## Phase 2: Portals + Rich Widgets

### Step 2.1 — Build `usePortal.js` composable

**Create:** `nce_events/public/js/panel_page_v2/composables/usePortal.js`

Export `usePortal(childDoctype, linkField, parentName)`. State: `rows`,
`meta`, `loading`, `error`.

- `load(columns)` — `frappe.db.get_list` with filters + fields. Load child meta.
- `saveCell(name, fieldname, value)` — `frappe.db.set_value` on child doc.
- `insertRow(defaults)` — `frappe.db.insert` with link field pre-set.
- `deleteRow(name)` — `frappe.db.delete_doc`.
- `refresh()` — re-run load.

---

### Step 2.2 — Build `LinkInput.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/LinkInput.vue`

**Props:** `modelValue` (string), `doctype` (target)
**Emits:** `update:modelValue`

~60 lines: text input, debounce 300ms on input, call `frappe.db.get_list`
for matching names, show dropdown `<ul>`, click/enter selects, escape closes.
Absolutely positioned dropdown with z-index, border, shadow.

---

### Step 2.3 — Build `PortalWidget.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/PortalWidget.vue`

**Props:** `config` (portal row data), `portalColumns` (filtered Card Portal
Column rows for this portal), `record`, `scripts`
**Emits:** `open-card`

Use `usePortal`. On mount, load with `config.child_doctype`, `config.link_field`,
`record.name`, and column fieldnames from `portalColumns`.

Render `<table>`:
- Header from portal columns (label, sorted by sort_order)
- Data rows from portal.rows
- Each cell based on `column_type`:
  - `data` — if `config.editable` and field not read_only: editable input,
    blur → `saveCell`. Otherwise plain text.
  - `data+link` — clickable text. Click emits `open-card` to open the linked
    record's card. If editable, render `<LinkInput>`.
  - `action` — button with `action_label`. Click executes the script referenced
    by `action_script` (look up in `scripts`, same execution logic as ActionsPanel).
    Pass row's `name` as context.
- If `config.allow_insert`: "Add Row" button at bottom.
- If `config.allow_delete`: "×" button per row.

Style: CSS variables, alternating rows with `var(--portal-alt-row)`.

---

### Step 2.4 — Update FieldWidget for Link fields

**Modify:** `nce_events/public/js/panel_page_v2/components/FieldWidget.vue`

Import `LinkInput`. When field meta has `fieldtype === "Link"`, render
`<LinkInput :model-value="value" :doctype="meta.options" @update:model-value="onSave" />`
instead of plain text input.

---

### Step 2.5 — Build `TextBlockWidget.vue` + Python endpoint

**Create:** `nce_events/api/form_api.py`

```python
from __future__ import annotations
import frappe
from nce_events.api.messaging import _render_body, _enrich_row_context

@frappe.whitelist()
def render_text_block(template: str, doctype: str, name: str) -> str:
    doc = frappe.get_doc(doctype, name)
    context = _enrich_row_context(doctype, doc.as_dict())
    return _render_body(template, context, for_html=True)
```

**Create:** `nce_events/public/js/panel_page_v2/components/TextBlockWidget.vue`

**Props:** `config` (template string), `record`

On mount + when record changes, call `nce_events.api.form_api.render_text_block`.
Display via `<div v-html="renderedHtml" />`.

---

### Step 2.6 — Build `WebViewerWidget.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/WebViewerWidget.vue`

**Props:** `config` (url_template), `record`

Replace `{{ field }}` tokens in URL, render `<iframe :src="url" />`.

---

### Step 2.7 — Build `GraphicWidget.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/GraphicWidget.vue`

**Props:** `config` (source, src, fieldname, alt_text, object_fit), `record`

Resolve src: `static` → use `config.src`, `field` → `record[config.fieldname]`.
Render `<img :src :alt :style="{ objectFit }">`.

---

### Step 2.8 — Build `VideoWidget.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/VideoWidget.vue`

**Props:** `config` (source, url, fieldname), `record`

Resolve URL, convert via `toEmbedUrl()` (YouTube/Vimeo regex, ~10 lines).
Render `<iframe :src="embedUrl" allowfullscreen />`.

---

### Step 2.9 — Update WidgetGrid for new widget types

**Modify:** `nce_events/public/js/panel_page_v2/components/WidgetGrid.vue`

Add imports for PortalWidget, TextBlockWidget, WebViewerWidget, GraphicWidget,
VideoWidget. Add to `widgetMap`.

Portal widgets need extra props: `portalColumns` (filtered from cardDef)
and `scripts`. Thread these through from CardForm.

---

### Step 2.10 — Build and test Phase 2

Build + bench build.

**Test:**
1. Add Card Portal + Card Portal Column rows to a Card Definition
2. Open card, verify portal renders with related records
3. Test inline editing, add row, delete row
4. Test a `data+link` column — click opens a card
5. Test a portal `action` column — button executes script
6. Test TextBlockWidget with Jinja tags
7. Test WebViewerWidget with Google Maps URL
8. Test GraphicWidget with an Attach Image field
9. Test VideoWidget with a YouTube URL

---

## Phase 3: Pivot + Grid Preview

### Step 3.1 — Install vue-pivottable

```bash
cd nce_events/public/js/panel_page_v2
npm install vue-pivottable
```

---

### Step 3.2 — Build `PivotWidget.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/PivotWidget.vue`

**Props:** `config` (child_doctype, link_field, pivot_rows, pivot_cols,
pivot_vals, aggregator), `record`

Use `usePortal` to load all child rows. Pass to vue-pivottable.

**Important:** Check the actual export name from vue-pivottable package.
Look in `node_modules/vue-pivottable/dist/` or the package's `main`/`exports`
field. It may be `VuePivottable`, `VuePivotTable`, or a default export.

```vue
<VuePivottable
  :data="rows"
  :rows="config.pivot_rows?.split(',').map(s => s.trim()) || []"
  :cols="config.pivot_cols?.split(',').map(s => s.trim()) || []"
  :vals="config.pivot_vals?.split(',').map(s => s.trim()) || []"
  :aggregatorName="config.aggregator || 'Count'"
  rendererName="Table"
/>
```

Import the CSS: `import 'vue-pivottable/dist/vue-pivottable.css'`
(verify actual path in node_modules).

Add PivotWidget to WidgetGrid's `widgetMap`.

---

### Step 3.3 — Build `GridPreview.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/GridPreview.vue`

A standalone component for embedding in the Card Definition desk form.

**Props:** `gridColumns`, `gridRows`, `widgets` (array of {type, label, x, y, w, h})
**Emits:** `cell-click` with `{x, y}`

Render a grid of small squares (30×30px for preview). Each cell:
- Empty → shows faint col/row label, clickable
- Occupied → shaded with widget type abbreviation + color

Colors by type:
```js
const typeColors = {
  field: '#c8e6c9',   display: '#bbdefb',  text_block: '#fff9c4',
  portal: '#ffccbc',  pivot_table: '#d1c4e9', web_viewer: '#b2dfdb',
  graphic: '#f8bbd0', video: '#ffe0b2',
}
```

On cell click, emit `cell-click` with coordinates.

---

### Step 3.4 — Card Definition form client script

**Create:** `nce_events/nce_events/doctype/card_definition/card_definition.js`

A Frappe form client script that:
1. Renders `GridPreview.vue` in an HTML field or sidebar of the Card Def form
2. Collects all widget rows from all child tables, normalizes to
   `{type, label, x, y, w, h}` format
3. Passes to GridPreview
4. On `cell-click`, if user is currently editing a child table row
   (detected via `cur_frm.cur_grid`), sets x and y on the current row

This requires mounting a mini Vue app inside the Frappe form. Pattern:

```js
frappe.ui.form.on('Card Definition', {
  refresh(frm) {
    // Create a container div in the form
    if (!frm.$grid_preview) {
      frm.$grid_preview = $('<div id="card-grid-preview"></div>')
      frm.fields_dict.grid_columns.$wrapper.after(frm.$grid_preview)
    }
    // Mount or update the Vue component
    // ... createApp(GridPreview, { props }) .mount('#card-grid-preview')
  }
})
```

---

### Step 3.5 — Build and test Phase 3

Build + bench build.

**Test:**
1. Open a Card Definition in desk — verify grid preview appears
2. Add widget rows to child tables — verify they appear on the preview
3. Click an empty cell — verify coordinates fill in on current child row
4. Add a Card Pivot Table row — open card, verify pivot renders
5. Test pivot with different aggregators

---

## Phase 4: Polish

### Step 4.1 — Recursive card opening
- Portal `action` and `data+link` column clicks emit `open-card`
- App.vue's `cardStack` handles stacking
- Test 2-3 levels deep

### Step 4.2 — Keyboard shortcuts
- `Escape` → close top card modal (`closeTopCard` in App.vue)
- Already wired via keydown listener in CardModal.vue

### Step 4.3 — Loading states
- CardForm: show "Loading…" while `loading` is true
- PortalWidget: show spinner while loading rows
- PivotWidget: show "Loading data…"
- All: show error messages on failure

### Step 4.4 — Conflict detection
- After `saveField` fails, check if error mentions "modified"
- Show dialog: "Record was modified by another user. Refresh?"
- On confirm, call `refresh()` on the composable

### Step 4.5 — Unsaved changes warning
- Track `dirty` state in useCardForm (set true on any local edit)
- On close attempt, if dirty: show "You have unsaved changes. Close anyway?"
- frappe.confirm dialog

---

## File Summary

| # | File | Phase | Type |
|---|------|-------|------|
| 1 | `public/css/theme_defaults.css` | 1 | New CSS |
| 2 | `nce_events/doctype/card_definition/` | 1 | New DocType (parent) |
| 3 | `nce_events/doctype/card_tab/` | 1 | New DocType (child) |
| 4 | `nce_events/doctype/card_field/` | 1 | New DocType (child) |
| 5 | `nce_events/doctype/card_display/` | 1 | New DocType (child) |
| 6 | `nce_events/doctype/card_portal/` | 1 | New DocType (child) |
| 7 | `nce_events/doctype/card_portal_column/` | 1 | New DocType (child) |
| 8 | `nce_events/doctype/card_text_block/` | 1 | New DocType (child) |
| 9 | `nce_events/doctype/card_pivot_table/` | 1 | New DocType (child) |
| 10 | `nce_events/doctype/card_graphic/` | 1 | New DocType (child) |
| 11 | `nce_events/doctype/card_video/` | 1 | New DocType (child) |
| 12 | `nce_events/doctype/card_web_viewer/` | 1 | New DocType (child) |
| 13 | `nce_events/doctype/card_action/` | 1 | New DocType (child) |
| 14 | `nce_events/doctype/card_script/` | 1 | New DocType (child) |
| 15 | `composables/useCardForm.js` | 1 | New JS |
| 16 | `components/WidgetGrid.vue` | 1 | New Vue |
| 17 | `components/FieldWidget.vue` | 1 | New Vue |
| 18 | `components/DisplayWidget.vue` | 1 | New Vue |
| 19 | `components/ActionsPanel.vue` | 1 | New Vue |
| 20 | `components/TabBar.vue` | 1 | New Vue |
| 21 | `components/CardForm.vue` | 1 | New Vue |
| 22 | `components/CardModal.vue` | 1 | New Vue |
| 23 | `composables/usePortal.js` | 2 | New JS |
| 24 | `components/LinkInput.vue` | 2 | New Vue |
| 25 | `components/PortalWidget.vue` | 2 | New Vue |
| 26 | `components/TextBlockWidget.vue` | 2 | New Vue |
| 27 | `api/form_api.py` | 2 | New Python |
| 28 | `components/WebViewerWidget.vue` | 2 | New Vue |
| 29 | `components/GraphicWidget.vue` | 2 | New Vue |
| 30 | `components/VideoWidget.vue` | 2 | New Vue |
| 31 | `components/PivotWidget.vue` | 3 | New Vue |
| 32 | `components/GridPreview.vue` | 3 | New Vue |
| 33 | `card_definition.js` (form script) | 3 | New JS |

**Modified files:**
- `hooks.py` — add theme_defaults.css
- `main.js` — add applyTheme
- `App.vue` — add cardStack + modal support
- `PanelFloat.vue` — CSS variables
- `PanelTable.vue` — CSS variables
- `TagFinder.vue` — CSS variables
- `display_settings.json` — add theme_json field

**Dependencies:**
- `vue-pivottable` (Phase 3 only)

**Total: 33 new files + 7 modified files. 1 new npm dependency.**
