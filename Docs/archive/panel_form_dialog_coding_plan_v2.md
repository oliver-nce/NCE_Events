# Panel Form Dialog — Coding Plan v2

Detailed step-by-step plan for **frozen Desk-derived forms** rendered as **Frappe UI dialogs** in Panel Page V2, configured from Desk via an extra tab on **Page Panel**, with an **independent listing DocType**.

**Do not treat this file as executed** until implementation is explicitly approved.

**References:** `Docs/project_reference.md`, `AGENTS.md`, `frappe-ui-dynamic-form-from-desk-schema.md` (layout/parser concepts — copy and adapt from this document), `Docs/form_builder_coding_plan.md` (style of phases), `theme-system.md` (NCE Theme System — **read before writing any CSS**).

---

## 0. Resolved Decisions

All open questions have been resolved. The coder should not deviate from these unless explicitly told otherwise.

| Decision | Resolution |
|----------|-----------|
| **Parent DocType name** | `Form Dialog` |
| **Child DocType name** | `Form Dialog Button` |
| **Child table field on parent** | `buttons` (i.e. `doc.buttons` returns the list of button rows) |
| **WP Tables field name** | `frappe_doctype` (confirmed) |
| **Frozen JSON shape** | Fields array only: `{ "fields": [...] }`. No child DocType schemas, no `is_submittable` or `title_field`. Expand later if needed. |
| **`captured_hash` field** | Dropped. Not needed at this stage. |
| **Page Panel relationship** | `Page Panel` is a **standalone** DocType, NOT a child table of Page Definition. There is no `page_definition.js` or `page_definition` DocType in this app. |
| **Vue component approach** | **Copy and adapt** from `frappe-ui-dynamic-form-from-desk-schema.md`. Replace the live `frappe.client.get_doctype` call with loading from frozen JSON via `get_form_dialog_definition()`. Everything else (parser, field renderer, save logic) stays the same. |
| **`parseLayout()` function** | Copy **verbatim** from the reference document. The frozen JSON `fields` array has the same shape as `frappe.get_meta().fields`. |
| **Button scripts** | **Visual placeholders only** — render buttons from child table but do not execute any script. No execution wrapper needed yet. |
| **`fetch_from` support** | **Required.** When a Link field changes, fetch the value from the linked document and populate the target field. This needs a server call on Link change. |
| **Conditional field properties** | **Required.** `depends_on` (visibility), `read_only_depends_on`, `mandatory_depends_on` must all evaluate at runtime against the live document data using the `evaluateExpression()` function from the reference doc. |
| **Dialog action buttons** | Two hardcoded buttons in the dialog footer: **Cancel** (discard changes, close dialog) and **Submit** (save the document via `frappe.client.save` or `frappe.client.insert`, then close). "Submit" means **save and close** — NOT Frappe's formal `docstatus` submit workflow. |
| **Theming** | This project does **NOT use Tailwind**. Read `theme-system.md` (the NCE Theme System agent reference) before writing any CSS. It uses a two-tier CSS variable system: NCE Builder defines `--nce-*` tokens site-wide, then `theme_defaults.css` maps them to internal variables scoped to component selectors. The dialog must add `.ppv2-form-dialog` to the selector list in `theme_defaults.css` and use `var(--bg-surface)`, `var(--text-color)`, etc. **NEVER set variables at `:root`** — this will break all Frappe Desk pages. The reference doc's Tailwind classes (`text-gray-900`, `mb-6`, etc.) must be replaced with this CSS variable approach. |
| **Dialogs tab in Desk** | Follows the existing `TAB_GROUPS` / `TAB_ORDER` / `TAB_LABELS` pattern in `page_panel.js`. Add `dialogs` as a new entry. |
| **New API file** | `form_dialog_api.py` in `nce_events/api/`. |
| **Panel config extension** | Add `form_dialog` to the existing `get_panel_config()` in `panel_api.py`. |

---

## 1. Goals & Non-Goals

### 1.1 Goals

| Requirement | Approach |
|-------------|----------|
| **Frozen field/layout** | Persist a snapshot of DocType metadata (the merged `fields` array from `frappe.get_meta`) on the Form Dialog document in `frozen_meta_json`. Runtime renderer reads **only** this snapshot, not live Desk. |
| **Desk changes** | **Rebuild** action re-fetches metadata and overwrites the snapshot (with confirmation). |
| **Eligibility** | Only DocTypes that appear in **`WP Tables`** (nce_sync) may be used as `target_doctype`. Enforce in server-side validation. The WP Tables field is `frappe_doctype`. |
| **Independent listing** | `Form Dialog` DocType is standalone with its own List view and permissions. Page Panel does not own the master list — it **links** to one record. |
| **Panel association** | **Page Panel** gains a **Link** → `Form Dialog`, filtered so `dialog.target_doctype == panel.root_doctype`. |
| **Desk tab for workflow** | Extend **`page_panel.js`** tab bar (Config / Display / Query / **Dialogs**) with a Dialogs tab: scoped CRUD workflow + **Capture from Desk**, **Rebuild**, **Open in full form** (new Desk tab). |
| **Client / form scripts** | Button scripts are **visual placeholders only** in this phase. The `Form Dialog Button` child table stores `label`, `button_script`, `sort_order`, and `source_note`, but scripts do not execute. |
| **Theming** | Dialog uses the **same CSS custom properties** as V2 panels (`theme_defaults.css`). Add `.ppv2-form-dialog` to the selector list in `theme_defaults.css`. Use `var(--bg-surface)`, `var(--text-color)`, `var(--border-color)`, etc. in all component styles. **No Tailwind.** |
| **Conditional field properties** | `depends_on`, `mandatory_depends_on`, `read_only_depends_on` must all work in the dialog, evaluated against the live document data. Use the `evaluateExpression()` function from the reference doc. |
| **`fetch_from` support** | When a Link field changes, auto-populate target fields using `fetch_from` definitions from the frozen schema. Requires a small server call. |
| **Save** | "Submit" button saves the document via `frappe.client.save` (existing) or `frappe.client.insert` (new), then closes the dialog. "Cancel" discards changes and closes. This is NOT Frappe's formal `docstatus` submit. |

### 1.2 Non-Goals (initial phases)

- Full **`frm` / `cur_frm` shim** so original Desk Client Scripts run unmodified inside Vue.
- Button script execution (placeholder buttons only).
- Auto-sync of button scripts from Client Script DocType without an explicit user action.
- Porting **Print**, **Workflow**, or **Assignment** Desk features.
- Child table (Table field) rendering — if a frozen schema contains Table-type fields, show a placeholder. Expand in a future phase.
- Frappe formal submit (`docstatus` lifecycle).

---

## 2. Data Model

### 2.1 Parent DocType: `Form Dialog`

**Module:** NCE Events
**Naming:** `autoname` from `field:title`.

**Fields:**

| Fieldname | Type | Notes |
|-----------|------|--------|
| `title` | Data | Required. Human name, e.g. "Events — quick edit". |
| `target_doctype` | Link → DocType | Required. Validated: must exist in `WP Tables` where field is `frappe_doctype` (see §4.2). |
| `frozen_meta_json` | Code, options JSON | Required after first capture. Stores `{ "fields": [ ... DocField-like dicts ... ] }` as returned from merged meta. |
| `captured_at` | Datetime | Set on capture/rebuild. |
| `dialog_size` | Select | `sm`, `md`, `lg`, `xl`, `2xl`, `3xl` — maps to Frappe UI Dialog `size` option. |
| `is_active` | Check | Default 1. Inactive dialogs not offered in Page Panel Link pickers. |
| `buttons` | Table → Form Dialog Button | Action buttons (placeholder only in Phase 1). |

**Permissions:** Same pattern as other NCE config DocTypes (System Manager with full CRUD).

**Important:** The `.json` file must include `"istable": 0`, correct `"module": "NCE Events"`, `"autoname": "field:title"`, and a `"permissions"` array granting System Manager read/write/create/delete.

### 2.2 Child DocType: `Form Dialog Button`

**Important:** This DocType must have `"istable": 1` in its `.json` definition.

| Fieldname | Type | Notes |
|-----------|------|--------|
| `label` | Data | Button label in dialog footer/toolbar. |
| `button_script` | Code, options JavaScript | **Copied** script body. Not executed in Phase 1 — placeholder only. |
| `sort_order` | Int | Display order. |
| `source_note` | Small Text | Optional. Human note, e.g. "Copied from Client Script 'Events-Form'". |

---

## 3. Page Panel Integration

### 3.1 New field on `Page Panel`

| Fieldname | Type | Notes |
|-----------|------|--------|
| `form_dialog` | Link → Form Dialog | Optional. Which frozen form opens for this panel in V2. |

**Dynamic filter:** In `page_panel.js`, use `frm.set_query('form_dialog', ...)` to filter so only dialogs where `target_doctype == frm.doc.root_doctype` and `is_active == 1` appear.

**Note:** `Page Panel` is a **standalone** DocType — not a child table. Standard `set_query` works.

### 3.2 Config API surface

Add `form_dialog` to the return value of the existing `get_panel_config()` function in `panel_api.py` (line 48). When non-null, V2 lazy-loads the frozen definition via `get_form_dialog_definition(name)` on dialog open.

Document the JSON contract in `project_reference.md` when implemented.

---

## 4. Server API (`nce_events/api/`)

Add a new module: `nce_events/api/form_dialog_api.py`.

### 4.1 Whitelisted methods

| Method | Purpose |
|--------|---------|
| `capture_form_dialog_from_desk(doctype, title=None)` | Admin: creates or updates a **Form Dialog** by fetching `frappe.get_meta(doctype).as_dict()`, serializing the `fields` array into `frozen_meta_json` as `{ "fields": [...] }`, setting `captured_at`. Used from Desk tab "Create & capture" wizard. |
| `rebuild_form_dialog(name)` | Reload meta from Desk, overwrite `frozen_meta_json`, update `captured_at`. Confirm destructive overwrite in UI before call. |
| `get_form_dialog_definition(name)` | Return frozen JSON + button rows + size for Vue dialog. Respect permissions. |
| `list_form_dialogs_for_doctype(doctype)` | For Page Panel Dialogs tab: rows filtered by `target_doctype`, `is_active`. |

All methods: `@frappe.whitelist()`, validate **System Manager** role.

### 4.2 WP Tables validation

Implement `_assert_doctype_in_wp_tables(doctype: str) -> None`:

```python
if not frappe.get_all("WP Tables", filters={"frappe_doctype": doctype}, limit=1):
    frappe.throw(f"DocType '{doctype}' is not listed in WP Tables and cannot be used for Form Dialogs.")
```

Use this on: create, capture, and rebuild.

### 4.3 Tests

Under `nce_events/api/tests/`:

- Validation rejects DocType not in WP Tables (mock `frappe.get_all`).
- Capture stores expected keys in `frozen_meta_json`.
- `get_form_dialog_definition` returns buttons in `sort_order`.

---

## 5. Desk: Page Panel — "Dialogs" Tab

**File:** `nce_events/nce_events/doctype/page_panel/page_panel.js`

### 5.1 Tab bar extension

Follow the existing pattern. Update the constants:

```javascript
const TAB_GROUPS = {
    config: [ /* existing fields */ ],
    display: [],
    query: ["panel_sql"],
    dialogs: [],  // custom-rendered HTML, no form fields needed
};
const TAB_ORDER = ["config", "display", "query", "dialogs"];
const TAB_LABELS = { config: "Config", display: "Display", query: "Query", dialogs: "Dialogs" };
```

Update `_show_tab()` to handle the `dialogs` case — show/hide a `.pp-dialogs-wrap` container similar to how `.pp-matrix-wrap` is toggled for the Display tab.

### 5.2 Tab content (custom HTML)

When `dialogs` tab is selected:

1. If `!frm.doc.root_doctype`: show message — select DocType in Config first.
2. Else render into `.pp-dialogs-wrap`:
   - **Current selection:** show linked `form_dialog` if set (`frm.doc.form_dialog`).
   - **List** of existing Form Dialog rows for `target_doctype == root_doctype` (call `list_form_dialogs_for_doctype`).
   - Actions:
     - **Create & capture from Desk** — prompt for title → `capture_form_dialog_from_desk` → optionally `frm.set_value('form_dialog', new_name)`.
     - **Rebuild** — for currently linked dialog → confirm → `rebuild_form_dialog`.
     - **Open in full form** — `window.open(frappe.utils.get_form_link('Form Dialog', name))` in new tab.
     - **Set as panel dialog** — `frm.set_value('form_dialog', selected_name)`.

3. The **Link field** `form_dialog` remains the source of truth; tab actions only call `set_value`.

---

## 6. Panel Page V2 (Vue)

**Locations:** New components under `nce_events/public/js/panel_page_v2/components/`, composable under `composables/`, utils under `utils/`.

### 6.1 Load definition

When opening the dialog, call `get_form_dialog_definition(name)`. This returns the frozen JSON.

Parse the fields with `parseLayout(fields)` — **copied verbatim** from `frappe-ui-dynamic-form-from-desk-schema.md` into `panel_page_v2/utils/parseLayout.js`.

**Key difference from reference doc:** The reference doc fetches meta live via `frappe.client.get_doctype`. In this implementation, meta comes from the frozen snapshot returned by `get_form_dialog_definition()`. The document data (the actual record being edited) is still fetched live via `frappe.client.get` or Document Resource.

### 6.2 Components

| Piece | Responsibility | Source |
|-------|----------------|--------|
| `PanelFormDialog.vue` | Frappe UI `Dialog` wrapper; tabs if multi-tab layout; section grid; Cancel + Submit buttons. | Adapt from `FormDialog.vue` in reference doc. Replace live meta fetch with frozen JSON load. Replace Tailwind classes with CSS variable styles. |
| `PanelFormField.vue` | Map fieldtype → control; respect `hidden`, `read_only`, `reqd`, `depends_on`, `mandatory_depends_on`, `read_only_depends_on`; handle `fetch_from`. Phase 1 shows placeholder for Table-type fields. | Adapt from `DynamicField.vue` in reference doc. |
| `usePanelFormDialog.js` | Load definition via `get_form_dialog_definition`, load document data live, local reactive `doc`, validate mandatory, call save/insert, loading/error state. | New composable. |
| `parseLayout.js` | Parse flat field list into Tabs → Sections → Columns → Fields tree. | **Copy verbatim** from reference doc. Place in `panel_page_v2/utils/`. |
| `fieldTypeMap.js` | Map Frappe fieldtype → component config. | **Copy verbatim** from reference doc. Place in `panel_page_v2/utils/`. |

### 6.3 `fetch_from` implementation

When a Link field value changes:

1. Check if any other fields in the frozen schema have `fetch_from` referencing this Link field (format: `link_fieldname.remote_field`).
2. If so, call `frappe.client.get_value` to fetch the remote field value from the linked document.
3. Populate the target field. Respect `fetch_if_empty` — only overwrite if the current value is empty/null.

### 6.4 Button rendering (placeholder)

Render buttons from the `Form Dialog Button` child table rows (sorted by `sort_order`) in the dialog. Each button shows its `label` but clicking it does nothing (or shows `frappe.show_alert('Button scripts coming soon')`). No `new Function()` or execution wrapper needed yet.

### 6.5 Theming

**Read `theme-system.md` before writing any CSS.** This project does NOT use Tailwind. The reference doc's components use Tailwind classes — these must be replaced.

**Architecture:** NCE Builder defines `--nce-*` tokens at `:root` site-wide. `theme_defaults.css` maps these to internal variables (e.g. `--primary`, `--text-color`) but **only inside scoped component selectors** — NEVER at `:root`. Setting variables at `:root` will break all Frappe Desk pages (see the real bug example in `theme-system.md`).

Steps:

1. Add `.ppv2-form-dialog` to the selector list in `nce_events/public/css/theme_defaults.css` (alongside `.ppv2-root`, `.ppv2-float`, etc.). This gives the dialog access to all mapped variables.
2. Wrap the dialog's outermost DOM element with class `ppv2-form-dialog`.
3. In all Vue component `<style scoped>` blocks, use CSS custom properties:
   - Backgrounds: `var(--bg-surface)`, `var(--bg-card)`
   - Text: `var(--text-color)`, `var(--text-muted)`
   - Borders: `var(--border-color)`, `var(--border-radius)`
   - Primary accent: `var(--primary)`, `var(--primary-light)`
   - Headers: `var(--bg-header)`, `var(--text-header)`
   - Font: `var(--font-family)`, `var(--font-size-base)`, `var(--font-size-sm)`
   - Shadow: `var(--shadow)`
4. Always include hardcoded fallbacks when referencing `--nce-*` tokens directly: `var(--nce-color-primary, #126bc4)`.
5. Match the spacing and visual density of existing components (`PanelFloat.vue`, `PanelTable.vue`).

**DO NOT:**
- Set any variables at `:root`
- Use Tailwind utility classes (`bg-gray-100`, `text-sm`, etc.)
- Hardcode colours, shadows, or radii — always use variables

### 6.6 Wiring from `App.vue`

- Row action or row double-click (configurable): if panel config includes `form_dialog`, set `dialogDocName = row.name` + `showFormDialog = true` → `PanelFormDialog` opens with `:name="dialogDocName"`.
- For new documents: toolbar button sets `dialogDocName = null`, opens dialog in create mode.
- If `form_dialog` is blank in config, keep current behavior (`open_card_on_click` → new tab form view).

---

## 7. Implementation Phases

### Phase A — Schema & API only

1. Create DocType `Form Dialog` (`form_dialog.json`, `form_dialog.py`).
2. Create DocType `Form Dialog Button` (`form_dialog_button.json` with `"istable": 1`, `form_dialog_button.py`).
3. Add `form_dialog` Link field on `Page Panel` (`page_panel.json`).
4. Implement `form_dialog_api.py` + WP Tables validation + unit tests.
5. Run `bench migrate` on dev.

### Phase B — Desk Dialogs tab

1. Extend `page_panel.js` tab bar: add `dialogs` to `TAB_GROUPS`, `TAB_ORDER`, `TAB_LABELS`.
2. Implement `.pp-dialogs-wrap` content: list + Create & capture + Rebuild + Open in new tab + set `form_dialog`.
3. Add `frm.set_query('form_dialog', ...)` filter in `page_panel.js`.

### Phase C — V2 read-only preview

1. Add `form_dialog` to `get_panel_config()` return value in `panel_api.py`.
2. Copy `parseLayout.js` and `fieldTypeMap.js` verbatim from reference doc into `panel_page_v2/utils/`.
3. Create `PanelFormDialog.vue` and `PanelFormField.vue` — adapted from reference doc, frozen JSON source, CSS variables instead of Tailwind.
4. Open dialog, render fields from frozen JSON **read-only** (no save) to validate layout parser.

### Phase D — V2 full save + fetch_from

1. Create `usePanelFormDialog.js` composable.
2. Implement save/insert via Cancel + Submit buttons.
3. Implement mandatory field validation using reference doc's `validateForm()`.
4. Implement `fetch_from` support (server call on Link field change).
5. Implement `depends_on` / `mandatory_depends_on` / `read_only_depends_on` using reference doc's `evaluateExpression()`.
6. Render button placeholders from child table.
7. Wire dialog open from `App.vue` row action.
8. Manual QA on 2–3 WP Tables DocTypes.

### Phase E — Docs & polish

1. Update `Docs/project_reference.md` (DocTypes + API table + JSON contracts).
2. Add `.ppv2-form-dialog` to `theme_defaults.css` selector list.
3. Final theming pass to match existing panel visual density.

---

## 8. File Summary (expected)

| # | File | Phase |
|---|------|-------|
| 1 | `nce_events/doctype/form_dialog/form_dialog.json` | A |
| 2 | `nce_events/doctype/form_dialog/form_dialog.py` | A |
| 3 | `nce_events/doctype/form_dialog_button/form_dialog_button.json` | A |
| 4 | `nce_events/doctype/form_dialog_button/form_dialog_button.py` | A |
| 5 | `nce_events/doctype/page_panel/page_panel.json` — add `form_dialog` field | A |
| 6 | `nce_events/api/form_dialog_api.py` | A |
| 7 | `nce_events/api/tests/test_form_dialog_api.py` | A |
| 8 | `nce_events/doctype/page_panel/page_panel.js` — add Dialogs tab | B |
| 9 | `nce_events/api/panel_api.py` — add `form_dialog` to `get_panel_config()` return | C |
| 10 | `panel_page_v2/utils/parseLayout.js` | C |
| 11 | `panel_page_v2/utils/fieldTypeMap.js` | C |
| 12 | `panel_page_v2/components/PanelFormDialog.vue` | C–D |
| 13 | `panel_page_v2/components/PanelFormField.vue` | C–D |
| 14 | `panel_page_v2/composables/usePanelFormDialog.js` | C–D |
| 15 | `panel_page_v2/App.vue` — open dialog from row action | D |
| 16 | `nce_events/public/css/theme_defaults.css` — add `.ppv2-form-dialog` selector | E |
| 17 | `Docs/project_reference.md` | E |

---

## 9. Testing Checklist (when executed)

- [ ] Cannot save Form Dialog with `target_doctype` not in WP Tables.
- [ ] Capture produces valid JSON with `{ "fields": [...] }` shape.
- [ ] Rebuild overwrites snapshot; confirmation shown in Desk UI.
- [ ] Page Panel Link picker only lists Form Dialogs for current `root_doctype` where `is_active == 1`.
- [ ] "Open in full form" opens correct Desk route in new tab.
- [ ] V2 dialog renders tabs, sections, columns correctly from frozen JSON.
- [ ] `depends_on` shows/hides fields based on document values.
- [ ] `mandatory_depends_on` enforces required fields conditionally.
- [ ] `read_only_depends_on` toggles field editability.
- [ ] `fetch_from` populates target field when Link changes; respects `fetch_if_empty`.
- [ ] Submit button saves document and closes dialog.
- [ ] Cancel button discards changes and closes dialog.
- [ ] Theme CSS variables apply correctly inside dialog (matches panel visual style).
- [ ] Button placeholders render from child table but do not execute scripts.

---

*This plan is not executed until you explicitly approve implementation (e.g. "go" on Phase A).*
