# Panel Form Dialog — Coding Plan

Detailed step-by-step plan for **frozen Desk-derived forms** rendered as **Frappe UI dialogs** in Panel Page V2, configured from Desk via an extra tab on **Page Panel**, with an **independent listing DocType**.

**Do not treat this file as executed** until implementation is explicitly approved.

**References:** `Docs/project_reference.md`, `AGENTS.md`, `frappe-ui-dynamic-form-from-desk-schema.md` (layout/parser concepts), `Docs/form_builder_coding_plan.md` (style of phases).

---

## 1. Goals & Non-Goals

### 1.1 Goals

| Requirement | Approach |
|-------------|----------|
| **Frozen field/layout** | Persist a snapshot of DocType metadata (at minimum the merged `fields` array from `frappe.get_meta` / `frappe.client.get_doctype`) on the dialog definition document. Runtime renderer reads **only** this snapshot, not live Desk. |
| **Desk changes** | **Rebuild** action re-fetches metadata and overwrites the snapshot (with confirmation). Optional: **Save as new** duplicates the dialog row for versioning (later phase if needed). |
| **Eligibility** | Only DocTypes that appear in **`WP Tables`** (nce_sync) may be used as `target_doctype`. Enforce in server-side validation and optionally filter Desk Link queries. |
| **Independent listing** | One **parent DocType** lists all dialog definitions (List view, permissions, imports). Page Panel does not own the master list—it **links** to one record. |
| **Panel association** | **Page Panel** gains a **Link** → dialog DocType, filtered so `dialog.target_doctype == panel.root_doctype`. |
| **Desk tab for workflow** | Extend **`page_panel.js`** custom tab bar with a **Dialogs** tab: scoped CRUD workflow + **Capture from Desk**, **Rebuild**, **Open in full form** (new Desk tab). |
| **Client / form scripts** | Do **not** expect Desk Client Scripts to run automatically. **Copy** script body onto **dialog action buttons** (child table). When the canonical script changes in Desk, operator runs **Rebuild** (or per-button “Refresh from source” later) to refresh copied code. |
| **Theming** | Dialog uses the **same CSS variables / Tailwind-aligned styling** as V2 panels (`theme_defaults.css`, `applyTheme` in `main.js` — see form builder plan Phase 1). |
| **Submit** | Saving the document updates Frappe via existing patterns (`frappe.client.save` / `insert` or Document Resource), consistent with dynamic form doc. |

### 1.2 Non-Goals (initial phases)

- Full **`frm` / `cur_frm` shim** so original Desk Client Scripts run unmodified inside Vue.
- Auto-sync of button scripts from Client Script DocType without an explicit user action.
- Porting **Print**, **Workflow**, or **Assignment** Desk features.

---

## 2. Data Model

### 2.1 Parent DocType: `Panel Form Dialog` (name final per naming preference)

**Module:** NCE Events  
**Naming:** Title Case title field or `autoname` from `field: title` — choose one convention and stick to it.

**Suggested fields:**

| Fieldname | Type | Notes |
|-----------|------|--------|
| `title` | Data | Required. Human name, e.g. “Events — quick edit”. |
| `target_doctype` | Link → DocType | Required. Validated: must exist in `WP Tables` (see §4.2). |
| `frozen_meta_json` | Code, options JSON | Required after first capture. Stores **at least** `{ "fields": [ ... DocField-like dicts ... ] }` as returned from merged meta. Optionally store small extras (`permissions` subset, `is_submittable`) if the renderer needs them. |
| `captured_at` | Datetime | Set on capture/rebuild. |
| `captured_hash` | Data | Optional. Hash of canonical field signature (fieldnames + fieldtypes + key layout breaks) to show “Desk may have changed” in Desk UI without auto-updating. |
| `dialog_size` | Select | `sm`, `md`, `lg`, `xl`, `2xl`, `3xl` — maps to Frappe UI Dialog options. |
| `is_active` | Check | Default 1. Inactive dialogs not offered in Page Panel Link pickers. |

**Child table:** `Panel Form Dialog Button` (see §2.2).

**Permissions:** Same pattern as other NCE config DocTypes (e.g. System Manager).

### 2.2 Child DocType: `Panel Form Dialog Button`

| Fieldname | Type | Notes |
|-----------|------|--------|
| `label` | Data | Button label in dialog footer/toolbar. |
| `button_script` | Code, options JavaScript | **Copied** script. Execution environment defined in §6.3. |
| `sort_order` | Int | Display order. |
| `source_note` | Small Text | Optional. Human note, e.g. “Copied from Client Script ‘Events-Form’”. Not a machine link unless you add Link → Client Script later. |

---

## 3. Page Panel Integration

### 3.1 New field on `Page Panel`

| Fieldname | Type | Notes |
|-----------|------|--------|
| `form_dialog` | Link → Panel Form Dialog | Optional. Which frozen form opens for this panel in V2. |

**Dynamic filter:** In Desk, use **Link filters** (or `get_query` in `page_panel.js` if the child row is edited from Page Definition form) so only dialogs where `target_doctype = doc.root_doctype` and `is_active = 1` appear.

**Note:** `Page Panel` is a **child table** of **Page Definition**. Link filters on child rows sometimes need to be set on the **parent** Page Definition form script if the built-in Link query does not receive `root_doctype` reliably—plan for `page_definition.js` hook if needed.

### 3.2 Config API surface

Extend `get_panel_config` (or add a dedicated method, e.g. `get_panel_form_dialog`) so V2 receives in one place:

- `form_dialog`: name or `null`
- When non-null: either embed **minimal** `{ name, title, dialog_size }` and lazy-load frozen JSON on open, **or** embed frozen payload once (larger response). **Recommendation:** lazy-load via `get_form_dialog_definition(name)` to keep list/config payloads small.

Document the JSON contract in `project_reference.md` when implemented.

---

## 4. Server API (`nce_events/api/`)

Add a new module (e.g. `form_dialog_api.py`) or extend `panel_api.py` if you prefer fewer files — **prefer new module** if functions are numerous.

### 4.1 Whitelisted methods

| Method | Purpose |
|--------|---------|
| `capture_form_dialog_from_desk(doctype, title=None)` | Admin: creates or updates a **Panel Form Dialog** by fetching `frappe.get_meta(doctype).as_dict()` (or equivalent), serializing `fields` (+ needed flags), setting `captured_at` / `captured_hash`. Used from Desk tab “Create & capture” wizard. |
| `rebuild_form_dialog(name)` | Reload meta from Desk, overwrite `frozen_meta_json`, update `captured_*`. Confirm destructive overwrite in UI before call. |
| `get_form_dialog_definition(name)` | Return frozen JSON + button rows + size for Vue dialog. Respect permissions. |
| `list_form_dialogs_for_doctype(doctype)` | For Page Panel Dialogs tab: rows filtered by `target_doctype`, `is_active`. |

All methods: `@frappe.whitelist()`, validate **System Manager** or a dedicated role if you introduce one.

### 4.2 WP Tables validation

Implement `_assert_doctype_in_wp_tables(doctype: str) -> None`:

- Query `frappe.get_all("WP Tables", filters={"frappe_doctype": doctype}, limit=1)` or the **actual field names** used in nce_sync’s WP Tables DocType (verify on target site / nce_sync repo before coding).

Raise `frappe.ValidationError` with a clear message if not listed.

Use this on: create, capture, rebuild, and optionally on `target_doctype` change.

### 4.3 Tests

Under `nce_events/api/tests/`:

- Validation rejects DocType not in WP Tables (mock `frappe.get_all`).
- Capture stores expected keys in `frozen_meta_json`.
- `get_form_dialog_definition` returns buttons in `sort_order`.

---

## 5. Desk: Page Panel — “Dialogs” Tab

**File:** `nce_events/nce_events/doctype/page_panel/page_panel.js`

### 5.1 Tab bar extension

Mirror existing `TAB_GROUPS` / `TAB_ORDER` / `TAB_LABELS`:

- Add `dialogs` group: placeholder **hidden** fields if needed for Frappe layout, **or** empty group with **only** custom-rendered HTML (like Display tab uses `.pp-matrix-wrap`).

Suggested **visible** fields in this tab (optional, for simpler state):

- None required if everything is custom HTML + `frappe.call`; alternatively a **read-only** Small Text `form_dialog_summary` updated by JS (avoid if possible to reduce schema churn).

### 5.2 Tab content (custom HTML)

When `dialogs` tab is selected:

1. If `!frm.doc.root_doctype`: show message — select DocType in Config first.
2. Else render:
   - **Current selection:** show linked `form_dialog` if Page Panel JSON includes it (read from `frm.doc.form_dialog`).
   - **List** of existing **Panel Form Dialog** rows for `target_doctype = root_doctype` (call `list_form_dialogs_for_doctype`).
   - Actions:
     - **Create & capture from Desk** — prompt for title → `capture_form_dialog_from_desk` → optionally set `frm.set_value('form_dialog', new_name)`.
     - **Rebuild** — for currently linked dialog → confirm → `rebuild_form_dialog`.
     - **Open in full form** — `frappe.set_route('Form', 'Panel Form Dialog', name)` in **new tab** (`window.open` with Desk URL or Frappe’s route helper if available).
     - **Set as panel dialog** — set Page Panel’s `form_dialog` Link to selected row (same as editing the Link field in Config; can duplicate UX here for convenience).

3. **Pick default / association:** ensure the **Link field** `form_dialog` remains the source of truth; tab actions only call `set_value`.

### 5.3 Page Definition parent form

If child row Link filter needs `root_doctype` from the same row, implement `get_query` in `page_definition.js` for child grid field `panels` → column `form_dialog`. (Inspect how Frappe passes `doc` for child tables in your version.)

---

## 6. Panel Page V2 (Vue)

**Locations:** per `AGENTS.md` — new components under `nce_events/public/js/panel_page_v2/components/`, composable under `composables/`, API calls via `frappe.call` or existing patterns in `usePanel.js`.

### 6.1 Load definition

- When opening the dialog: `get_form_dialog_definition(name)`.
- Parse `frozen_meta_json.fields` with a **shared** `parseLayout(fields)` (port from `frappe-ui-dynamic-form-from-desk-schema.md` or extract to `panel_page_v2/utils/parseLayout.js`).

### 6.2 Components

| Piece | Responsibility |
|-------|----------------|
| `PanelFormDialog.vue` (or `DynamicDocDialog.vue`) | Frappe UI `Dialog`, `Tabs` if multi-tab layout, section grid, save/cancel. |
| `PanelFormField.vue` | Map fieldtype → control; respect `hidden`, `read_only`, `reqd`; **Phase 1** can skip rare fieldtypes and show placeholder. |
| `usePanelFormDialog.js` | Load definition, local reactive `doc`, validate mandatory, call save/insert, loading/error state. |

### 6.3 Button script execution

**Security:** copied JS is **admin-authored** but still runs in the browser. Wrap execution in a **narrow API**:

- `doc` (reactive proxy or plain object),
- `set_value(fieldname, value)`,
- `frappe.call` / `frappe.show_alert`,
- no arbitrary `eval` of user-supplied strings from row data.

**Pattern:** `new Function('context', script)` with `context = { doc, set_value, frappe_call: ... }` **or** require scripts to be `function(context) { ... }` — pick one and document.

**Phase 1:** render buttons from child table but **no-op** or only `frappe.show_alert` until wrapper is reviewed.

### 6.4 Theming

- Reuse CSS variables loaded by `main.js` (`applyTheme`).
- Dialog wrapper classes should match PanelFloat / PanelTable spacing and header contrast (`var(--bg-header)`, etc.).

### 6.5 Wiring from `App.vue`

- Row action or row double-click (configurable): if panel config includes `form_dialog`, open `PanelFormDialog` with `doctype`, `name` from row, definition name from config.
- If `form_dialog` blank, keep current behavior (`open_card_on_click` → new tab form view).

---

## 7. Implementation Phases

### Phase A — Schema & API only

1. Add DocTypes `Panel Form Dialog`, `Panel Form Dialog Button`.
2. Add `form_dialog` Link on `Page Panel` (`page_panel.json`).
3. Implement `form_dialog_api.py` + WP Tables validation + unit tests.
4. Run migrations / `bench migrate` on dev (when executed).

### Phase B — Desk Dialogs tab

1. Extend `page_panel.js` tab bar with **Dialogs**.
2. Implement list + Create & capture + Rebuild + Open in new tab + set `form_dialog`.
3. Fix Link `get_query` on Page Definition if needed.

### Phase C — V2 read-only preview

1. `get_panel_config` (or sibling) exposes `form_dialog` id.
2. Vue: open dialog, render fields from frozen JSON **read-only** (no save) to validate layout parser.

### Phase D — V2 full save + buttons

1. Implement save/insert + validation + child tables (if in snapshot).
2. Implement button script wrapper and wire to UI.
3. Manual QA on 2–3 WP Tables DocTypes (simple + one with Table field).

### Phase E — Docs & polish

1. Update `Docs/project_reference.md` (DocTypes + API table).
2. Optional hash badge in Desk tab: “Desk drift detected” if `captured_hash` ≠ live recomputed hash.

---

## 8. File Summary (expected)

| # | File | Phase |
|---|------|-------|
| 1 | `nce_events/doctype/panel_form_dialog/panel_form_dialog.json` | A |
| 2 | `nce_events/doctype/panel_form_dialog/panel_form_dialog.py` | A |
| 3 | `nce_events/doctype/panel_form_dialog_button/panel_form_dialog_button.json` | A |
| 4 | `nce_events/doctype/panel_form_dialog_button/panel_form_dialog_button.py` | A |
| 5 | `nce_events/doctype/page_panel/page_panel.json` — add `form_dialog` | A |
| 6 | `nce_events/api/form_dialog_api.py` (or chosen name) | A |
| 7 | `nce_events/api/tests/test_form_dialog_api.py` | A |
| 8 | `nce_events/doctype/page_panel/page_panel.js` — Dialogs tab | B |
| 9 | `nce_events/doctype/page_definition/page_definition.js` — optional `get_query` | B |
| 10 | `nce_events/api/panel_api.py` — extend config | C |
| 11 | `panel_page_v2/utils/parseLayout.js` | C |
| 12 | `panel_page_v2/components/PanelFormDialog.vue` | C–D |
| 13 | `panel_page_v2/components/PanelFormField.vue` | C–D |
| 14 | `panel_page_v2/composables/usePanelFormDialog.js` | C–D |
| 15 | `panel_page_v2/App.vue` — open dialog from row | C–D |
| 16 | `Docs/project_reference.md` | E |

---

## 9. Testing Checklist (when executed)

- [ ] Cannot save Panel Form Dialog with `target_doctype` not in WP Tables.
- [ ] Capture produces valid JSON; V2 renders tabs/sections/columns correctly.
- [ ] Rebuild overwrites snapshot; confirmation shown.
- [ ] Page Panel Link picker only lists dialogs for current `root_doctype`.
- [ ] “Open in full form” opens correct Desk route in new tab.
- [ ] V2 save updates document; reload shows persisted values.
- [ ] Theme variables apply inside dialog surface.

---

## 10. Open Decisions (resolve before Phase A)

1. **Exact DocType names** — `Panel Form Dialog` vs shorter name.
2. **Child table field naming** — align with Frappe convention (`panel_form_dialog` as parent field on child).
3. **WP Tables field** — confirm column for Frappe DocType name (`frappe_doctype` vs actual schema in nce_sync).
4. **Frozen JSON shape** — store raw `fields` only vs full `meta` subset; affects parser and submit handling for child tables.

---

*This plan is not executed until you explicitly approve implementation (e.g. “go” on Phase A).*
