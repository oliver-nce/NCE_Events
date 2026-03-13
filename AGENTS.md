# Agent Guide — NCE Events

**Read `Docs/project_reference.md` first.** It is the single source of truth. Do not make changes without reading it fully.

---

## Where to Add New Code

| Feature type | Location | Notes |
|--------------|----------|-------|
| New API endpoint | `nce_events/api/` | Add to existing module (e.g. `panel_api.py`, `messaging.py`) or create new module if domain is distinct |
| New V1 panel/explorer UI | `nce_events/public/js/panel_page/ui.js` | Extend `Explorer` class |
| New V1 panel state logic | `nce_events/public/js/panel_page/store.js` | Extend `Store` |
| New V2 panel component | `nce_events/public/js/panel_page_v2/components/` | Vue 3 SFC |
| New V2 composable | `nce_events/public/js/panel_page_v2/composables/` | Vue 3 composable |
| New V2 root logic | `nce_events/public/js/panel_page_v2/App.vue` | Panel orchestration |
| New SMS dialog behavior | `nce_events/public/js/panel_page/sms_dialog.js` | Extend `SmsDialog` (shared by V1+V2) |
| New email dialog behavior | `nce_events/public/js/panel_page/email_dialog.js` | Extend `EmailDialog` (shared by V1+V2) |
| New Tag Finder behavior (V1) | `nce_events/public/js/schema_explorer.js` | Extend `nce_events.schema_explorer` |
| New Tag Finder behavior (V2) | `nce_events/public/js/panel_page_v2/components/TagFinder.vue` | Vue port |
| New DocType | `nce_events/nce_events/doctype/<name>/` | Use `bench new-doctype` or copy existing |
| New page | `nce_events/nce_events/page/<name>/` | Frappe Page |
| New CSS | `nce_events/public/css/` | `panel_page.css` for panels, `schema_explorer.css` for Tag Finder |
| Migration patch | `nce_events/patches/v0_0_2/` | Add to `patches.txt` |

---

## Reusable Code — Use Before Duplicating

| Helper | Location | Purpose |
|--------|----------|---------|
| `_render_body(body, context, for_html)` | `api/messaging.py` | Jinja render + optional newline→`<br>` for HTML |
| `_enrich_row_context(root_doctype, row)` | `api/messaging.py` | Build template context from row (Link fields, gender) |
| `_compute_jinja_tag(fn, male, female, gender_field)` | `api/tags.py` | Gender-conditional Jinja tag |
| `_title_case(fieldname)` | `api/panel_api.py`, `api/reports.py` | `field_name` → `Field Name` |
| `_build_core_filter_where(doctype, filters, core_filter)` | `api/panel_api.py` | Combine user filters with core SQL |
| `_auto_detect_contact_fields(doctype)` | `api/panel_api.py` | Detect email/sms fields |
| `_find_link_field(doctype, target_doctype)` | `api/panel_api.py` | Find Link field pointing to target |
| `_get_link_fields_with_target(doctype)` | `api/panel_api.py` | Link fields with target DocType `[{fieldname, options}]` |
| `get_panel_data`, `get_panel_config` | `api/panel_api.py` | Panel data fetch |
| `get_child_doctypes(root_doctype)` | `api/panel_api.py` | DocTypes with Link to root (for related columns + drill-down) |
| `get_credentials(connector_name)` | `api/credentials.py` | Read credential_config JSON from API Connector — returns auth_pattern, base_url, and required credential values |
| `usePanel(doctype, parentFilter)` | `public/js/panel_page_v2/composables/usePanel.js` | V2 composable — load, refetch with user_filters |
| `useTagFinder()` | `public/js/panel_page_v2/composables/useTagFinder.js` | V2 composable — Tag Finder field loading + tag generation |

---

## Conventions

- **Python:** `from __future__ import annotations`, type hints, `frozenset` for skip sets
- **JavaScript:** `let`/`const` only, ES6 template literals, `frappe.provide()` namespacing
- **Tests:** `nce_events/api/tests/` — `unittest` + `unittest.mock`
- **No `bench` commands** — User handles deployment. Push to GitHub.
- **V2 build** — V2 Vue source requires `npm run build` in `public/js/panel_page_v2/` before `bench build`. Server script: `update_v2.sh`.

---

## Avoiding Redundancy

Before adding new code:

1. Search `api/` for existing helpers that match the need.
2. Search `public/js/panel_page/` and `schema_explorer.js` for existing V1 patterns.
3. Search `public/js/panel_page_v2/` for existing V2 components and composables.
4. Prefer extending existing helpers or adding parameters over duplicating logic.
5. V2 reuses V1's `SmsDialog`, `EmailDialog`, and `ai_tools.js` at runtime — do not duplicate these.
