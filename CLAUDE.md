# NCE Events — Codebase Reference for AI Agents

**Read this file before making any changes.**
For deeper architecture detail see `Docs/panel_page_architecture_v2.md` and `Docs/panel_page_spec_rules.md`.

---

## Project Overview

Frappe v15 app (`nce_events`) running at `manager.ncesoccer.com`. Provides a multi-panel floating-window data explorer for NCE soccer operations. Depends on `nce_sync` (provides WP Tables mapping and WordPress sync).

Developer pushes to GitHub. Deployment is handled separately — never run `bench` commands. Never run `git reset --hard`.

---

## Key DocTypes (app-defined in `nce_events/nce_events/doctype/`)

| DocType | Purpose |
|---|---|
| `Page Panel` | Main config record — one per panel view. Controls column order, filters, display, related dialogs, and an optional `theme` (Link → NCE Theme) palette override for that panel's float. Has its own app-level JS (`page_panel.js`). |
| `Form Dialog` | Frozen snapshot of a DocType's form schema for use in the Vue dialog. Stores `frozen_meta_json`, buttons, related doctypes, tab notes. |
| `Form Dialog Related DocType` | Child table of Form Dialog — each row is a related DocType rendered as a related tab. |
| `Form Dialog Button` | Child table of Form Dialog — footer action buttons. |
| `Form Dialog Tab Note` | Child table of Form Dialog — per-tab guidance text. |
| `Display Settings` | Single DocType — site-wide font/color theme, generates `custom_theme.css` on save. |
| `Card Definition` | Card widget config (card_field, card_action, card_tab, etc. are its child tables). |
| `Panel Action` | Action record tied to a panel, with role gating (`Panel Action Role` child table). |
| `Settings` | Single DocType — app-level settings (Twilio, SendGrid, etc.). |

Standard Frappe DocTypes also used: `Client Script`, `Module Def`, `WP Tables` (from `nce_sync`).

---

## API Layer (`nce_events/api/`)

### `form_dialog/` — Form Dialog endpoints

| File | Key functions |
|---|---|
| `capture.py` | `capture_form_dialog_from_desk`, `rebuild_form_dialog`, `get_form_dialog_definition`, `list_form_dialogs_for_doctype` |
| `_helpers.py` | `_capture_client_scripts`, `_enrich_fetch_from_fields`, `_sync_related_doctypes`, `_require_system_manager`, and others |
| `save.py` | Save a Form Dialog doc from Vue |
| `search.py` | Link field search endpoint used by Vue form |
| `related_rows.py` | Fetch/save child rows for related-tab panels |
| `sync_related.py` | Sync related-doctype child rows on capture |
| `button_visibility.py` | Evaluate button visibility expressions |
| `portal_fields.py` | Portal field helpers |

### Other API files

| File | Purpose |
|---|---|
| `panel_actions.py` | Panel action execution endpoints |
| `reports.py` | Panel data fetching (Query Reports) |
| `messaging.py` | SMS (Twilio) and Email (SendGrid) send endpoints |
| `hierarchy_explorer.py` | Drill-down relationship discovery |
| `tags.py` | Tag management |
| `wp_readback_panel.py` | WordPress readback panel data |
| `exchange.py` | Data exchange utilities |
| `evaluations.py` | Expression evaluators |
| `llm.py` | LLM integration |

---

## Frontend (`nce_events/public/js/panel_page_v2/`)

Vue 3 + Vite SPA. Build with `npm run build` inside `panel_page_v2/`. Output is bundled by Frappe's asset pipeline.

### Components (`components/`)

| File | Purpose |
|---|---|
| `PanelFormDialog.vue` | Top-level dialog shell — opens/closes, owns form state via `usePanelFormDialog`, dispatches to Body/Header/Footer |
| `PanelFormDialogBody.vue` | Tab panels — routes each tab to the correct renderer (frozen fields, related tab, or script tool tab) |
| `PanelFormDialogHeader.vue` | Dialog title bar, nav arrows, dirty indicator |
| `PanelFormDialogFooter.vue` | Action buttons row (Save, Revert, custom buttons) |
| `PanelFormDialogTabBar.vue` | Tab bar with active-tab highlighting |
| `PanelFormDialogRelatedTab.vue` | Related-DocType child table tab (fetch, edit, save rows) |
| `PanelFormScriptToolTab.vue` | **NEW** — Mounts the captured JS tool UI (from `page_panel.js` or Client Scripts) into a real DOM container |
| `PanelFormField.vue` | Single field renderer (delegates to type-specific sub-widgets) |
| `PanelFormLinkField.vue` | Link field with typeahead |
| `PanelFormDateTimeField.vue` | Date/datetime picker |
| `PanelFormFindSearchHelpModal.vue` | Help modal for Find mode |
| `PanelTable.vue` | Data table panel |
| `PanelTableFilterBar.vue` | Filter bar for table panels |
| `PanelHeaderToolbar.vue` | Panel header (title, buttons, filter icon) |
| `PanelFloat.vue` | Floating window wrapper. Accepts `themeSlug` prop → renders `data-nce-theme="<slug>"` on `.ppv2-float` (omitted when empty) for per-panel palette scoping. |
| `ActionsPanel.vue` | Panel actions sidebar |
| `TagDialog.vue`, `TagFinder.vue`, `TagColumn.vue` | Tag system UI |
| `DisplayWidget.vue`, `FieldWidget.vue`, `WidgetGrid.vue` | Widget display system |
| `TabBar.vue` | Generic tab bar |

### Composables (`composables/`)

| File | Purpose |
|---|---|
| `usePanelFormDialog.js` | Master composable — owns all form dialog state (load, save, validate, dirty, field visibility/mandatory/readonly). Instantiates `useFormClientScript`. |
| `useFormClientScript.js` | **NEW** — Two-phase runner for captured client scripts. Phase 1: `activateScripts()` intercepts `frappe.ui.form.on`, runs script bodies, discovers tool groups. Phase 2: `mountTool()` renders full JS UI into a real DOM container. |
| `useFrozenFormLoad.js` | Loads frozen form schema from server, populates `formData`, handles fetch_from chains |
| `frozenFormValidate.js` | Field visibility, mandatory, read-only rules for frozen schema |
| `frozenFormSave.js` | Save frozen form document to server |
| `formDialogFetchFrom.js` | Handles fetch_from field dependencies |
| `useFormDialogChrome.js` | Dialog open/close chrome, backdrop handling |
| `useFormDialogRecordNav.js` | Previous/Next record navigation within a dialog |
| `usePanelFormDialogHost.js` | Host composable — manages which dialog is open, which record |
| `usePanel.js` | Panel data state and loading |
| `usePanelActions.js` | Panel action execution |
| `useSendDialogs.js` | SMS/Email send dialog state |
| `useTagFinder.js` | Tag finder panel state |
| `useNceCardStack.js` | NCE card stack state |
| `useBackdropPointerDismiss.js` | Click-outside-to-close logic |
| `wpReadbackFlow.js` | WordPress readback flow |

### Utils (`utils/`)

| File | Purpose |
|---|---|
| `parseLayout.js` | Parse frozen meta fields into tab/section/column layout |
| `formDialogFindFields.js` | Find-mode searchable field logic |
| `formDialogSnapshot.js` | Snapshot formData for dirty comparison |
| `formDialogLiveScrape.js` | Live-scrape field values from Desk form |
| `formDialogLoadDebug.js` | Load debug overlay (localStorage `nce_fd_load_debug=1`) |
| `frappeCall.js` | Thin wrapper around `frappe.call` |
| `frappeDateControlSync.js` | Sync Frappe date controls with Vue reactivity |
| `frappeFieldExpr.js` | Evaluate Frappe field expressions (depends_on, etc.) |
| `fieldTypeMap.js` | Field type → component mapping |
| `parseClientHandlerSpec.js` | Parse client handler specifications |
| `openDeskDoctypeList.js` | Open a DocType list in Desk |
| `wooPublishDocNormalize.js` | WooCommerce publish normalization |
| `submitPerfTrace.js` | Performance tracing for submit flow |

### NCE Cards (`nce_cards/`)

`CardModal.vue`, `CardForm.vue`, `useCardForm.js` — card-based form presentation layer.

### Actions (`actions/`)

`registry.js` — action registry. `handlers/showDt.js` — show-doctype action handler.

---

## How the Form Dialog System Works

### Capture (Python → JSON)

`capture_form_dialog_from_desk(doctype)` in `capture.py`:
1. Reads `frappe.get_meta(doctype).fields` → list of field dicts
2. Calls `_enrich_fetch_from_fields()` to annotate fetch_from chains
3. Calls `_capture_client_scripts(doctype)` — two sources:
   - `Client Script` DocType records (enabled, view=Form) for this doctype
   - App-level `.js` file on disk (e.g. `page_panel/page_panel.js`)
4. Stores as `{"fields": [...], "client_scripts": [...]}` in `Form Dialog.frozen_meta_json`

### Load (Vue)

`useFrozenFormLoad.js` calls `get_form_dialog_definition(name)` → gets `frozen_meta` (parsed JSON with fields + client_scripts). Parses layout via `parseLayout.js` into tabs/sections/columns.

### Client Script Execution (Vue)

`useFormClientScript.js` — instantiated inside `usePanelFormDialog`:

**Phase 1 — `activateScripts()`** (called after each load):
- Temporarily replaces `window.frappe.ui.form.on` to intercept handler registration
- Executes each script body via `new Function('frappe', src)(window.frappe)`
- Runs `h.refresh(shim)` with a DOM-safe shim (real hidden element for `layout.wrapper`, Proxy for `fields_dict`, absorb-Proxy for `page`)
- If any `add_custom_button` calls are found → groups them into tool tabs
- If no `add_custom_button` calls but refresh handlers exist → returns `[{ label: 'Tools' }]` (for DOM-injection scripts like `page_panel.js`)
- Result tab objects are pushed onto `tabs` in `usePanelFormDialog`

**Phase 2 — `mountTool(tool, domContainer)`** (called by `PanelFormScriptToolTab.vue` on mount):
- Re-runs `h.refresh(shim)` with `shim.layout.wrapper = domContainer`
- `shim.fields_dict` Proxy returns `{ $wrapper: $anchor }` for all fieldnames (anchor is a div inside the container)
- Script injects its full UI (tab bar, sections, buttons) into `domContainer`

**Tab routing in `PanelFormDialogBody.vue`:**
- `tab._related` → `PanelFormDialogRelatedTab`
- `tab._scriptTool` → `PanelFormScriptToolTab`
- otherwise → normal frozen-field sections

### Known Limitation (as of May 2026)

`page_panel.js` creates 4 tabs (Config / Display / Query / Dialogs) via DOM injection. In the Tools tab:
- **Display** renders correctly (pure JS content)
- **Config / Query** panels are empty (their content is desk fields — already present in the frozen-schema tabs)
- **Dialogs** renders the JS parts; desk fields exist in the frozen-schema tabs

The frozen-schema tabs (Config, Query, Dialogs desk fields) and the Tools tab are intentionally separate. This is the accepted baseline.

---

## Important Patterns

1. **No `bench` / no `git reset --hard`** — User handles all deployment. Commit + push only.
2. **`frozen_meta_json`** — The form schema is a snapshot. Changes to the live DocType don't affect dialogs until Rebuild is triggered from Desk.
3. **`_captureHandlers()` intercept** — `frappe.ui.form.on` is temporarily replaced during script capture. Always restored in `finally`.
4. **`scriptFieldOverrides` reactive map** — Scripts call `frm.set_df_property(fn, prop, val)` which writes into this map. `isFieldVisible`, `isFieldMandatory`, `isFieldReadOnly` check it first before frozen-schema rules.
5. **`syncingFromLoad` ref** — True while `load()` is pushing values into `formData`. Mutes Frappe control `change()` echo during load.
6. **WP Tables gating** — `_assert_doctype_in_wp_tables(doctype)` runs before every capture. Only WP-Tables-registered DocTypes can have Form Dialogs.
7. **Dialog size** — Stored on the Form Dialog record (`dialog_size` field). Defaults to `xl`.
8. **Per-panel theme** — `Page Panel.theme` (Link → NCE Theme doc name, not slug). `_panel_config_from_doc` in `panel_data.py` resolves it via `_resolve_theme_slug()` to `theme_slug` (only Active themes with a slug; empty/Inactive/deleted/missing-DocType → `None`). `App.vue` passes `config.theme_slug` to `PanelFloat`, which sets `data-nce-theme` on the float. **ThemeSwatchPicker (Desk):** pass `themeField: "theme"` — the Themes app Desk adapter performs the same Link → slug lookup via `frappe.db.get_value` before scoping the picker modal. Empty = site base (`:root`). Only `PanelFloat` is scoped — Actions sidebar, page switcher, TagFinder, and Form Dialog stay on base.

---

## Docs Folder

| File | Contents |
|---|---|
| `Docs/theme-system/INDEX.md` | Router for theme-system how-to docs |
| `Docs/theme-swatch-picker.md` | ThemeSwatchPicker widget spec (class picker for form fields; Desk Link → slug) |
| `Docs/panel_page_spec_rules.md` | Rules and constraints for panel page configuration |
| `Docs/handoff_prompt.md` | Legacy agent handoff prompt (older state — superseded by this file for Form Dialog work) |
| `Docs/handoff_client_script_tools.md` | **NEW** — Detailed handoff for the client-script-in-dialog feature |
