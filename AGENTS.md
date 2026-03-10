# Agent Guide — NCE Events

**Read `Docs/project_reference.md` first.** It is the single source of truth. Do not make changes without reading it fully.

---

## Where to Add New Code

| Feature type | Location | Notes |
|--------------|----------|-------|
| New API endpoint | `nce_events/api/` | Add to existing module (e.g. `panel_api.py`, `messaging.py`) or create new module if domain is distinct |
| New panel/explorer UI | `nce_events/public/js/panel_page/ui.js` | Extend `Explorer` class |
| New panel state logic | `nce_events/public/js/panel_page/store.js` | Extend `Store` |
| New SMS dialog behavior | `nce_events/public/js/panel_page/sms_dialog.js` | Extend `SmsDialog` |
| New email dialog behavior | `nce_events/public/js/panel_page/email_dialog.js` | Extend `EmailDialog` |
| New Tag Finder behavior | `nce_events/public/js/schema_explorer.js` | Extend `nce_events.schema_explorer` |
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

---

## Conventions

- **Python:** `from __future__ import annotations`, type hints, `frozenset` for skip sets
- **JavaScript:** `let`/`const` only, ES6 template literals, `frappe.provide()` namespacing
- **Tests:** `nce_events/api/tests/` — `unittest` + `unittest.mock`
- **No `bench` commands** — User handles deployment. Push to GitHub.

---

## Avoiding Redundancy

Before adding new code:

1. Search `api/` for existing helpers that match the need.
2. Search `public/js/panel_page/` and `schema_explorer.js` for existing patterns.
3. Prefer extending existing helpers or adding parameters over duplicating logic.
