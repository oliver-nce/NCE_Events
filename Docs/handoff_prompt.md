# NCE Events — Agent Handoff Prompt

**Read `Docs/project_reference.md` first — it is the single source of truth.** Do not make changes without reading it fully.

---

## Context

This is a Frappe v15 app (`nce_events`) that provides a multi-panel floating-window data explorer for NCE soccer operations. It runs on a remote production server at `manager.ncesoccer.com`. The developer pushes to GitHub; deployment is handled separately.

The app depends on `nce_sync` (provides DocTypes, WP Tables mappings, WordPress data sync).

---

## Current State (as of March 2026)

### Panel Explorer (`ui.js` + `store.js` + `panel_api.py`)

- **Floating window panels** — Root panel is WP Tables; clicking a row opens that DocType as a floating panel. Child panels drill via relationship-specific buttons.
- **Drill buttons** — Each panel row shows buttons for child DocTypes (DocTypes that have a Link field pointing TO the current DocType). Buttons display a count badge `(N)` and are grayed out when count is 0. Counts are computed server-side via `GROUP BY` queries.
- **Dot-notation fields** — `column_order` supports `link_field.child_field` syntax (e.g. `player_id.first_name`). Base link fields are auto-included in the query. Resolution happens via `frappe.db.get_value` lookups.
- **Auto-detect email/phone** — If Page Panel doesn't have `email_field` or `sms_field` set, the system scans the root DocType's fields by fieldtype (`Email`/`Phone`) or common names (`email`, `phone`, `mobile`, etc.).

### Messaging

- **SMS** — Twilio REST API via `API Connector` "Twilio" (username=Account SID, password=Auth Token). From-number from SMS Settings.
- **Email** — SendGrid v3 API via `API Connector` "SendGrid" (username=from email, password=bearer token/API key).
- **Send dialog** — Blue-themed modal. Two modes: "Type a message" (opens Tag Finder alongside) or "Use Email Template" (Link picker). Cancel button. `on_hide` closes Tag Finder.

### Tag Finder (`schema_explorer.js`)

- Renamed from "Schema Explorer" — all display text says "Tag Finder", internal namespace remains `nce_events.schema_explorer`.
- Opens at 280px width, right-aligned (`right: 20px`). CSS re-injected every open (no stale cache).
- Public API: `.open(doctype)`, `.open()` (prompts), `.close()`.
- Tag panels have **Insert at Cursor** + **Copy to Clipboard** buttons. Cursor tracking via `focusin`/`mouseup`/`keyup` listeners on the document.
- Email Template "Insert Tag" button now opens the Tag Finder (replaced old flat grid picker).

---

## Key Files

| File | Purpose |
|---|---|
| `nce_events/api/panel_api.py` | All server endpoints — data fetching, drill buttons, messaging, tag rebuild |
| `nce_events/public/js/panel_page/ui.js` | Explorer UI — floating windows, table rendering, drill buttons, send dialog |
| `nce_events/public/js/panel_page/store.js` | Client state management — panel open/close, data fetch, filters |
| `nce_events/public/css/panel_page.css` | All panel styles including drill buttons, send dialog, filter widget |
| `nce_events/public/js/schema_explorer.js` | Tag Finder — Miller columns, tag generation, insert at cursor |
| `nce_events/public/js/email_template_tags.js` | Email Template form hook — Insert Tag button |
| `Docs/project_reference.md` | Full project reference (READ THIS FIRST) |

---

## Important Patterns

1. **No `bench` commands** — User handles deployment. Just push to GitHub.
2. **API Connector** — Custom DocType storing third-party credentials. Use `connector.get_password("password")` for secrets.
3. **WP Tables** — DocType from `nce_sync` app that maps WordPress tables to Frappe DocTypes. Used to discover available DocTypes.
4. **Page Panel** — Config DocType controlling column order, bold fields, gender coloring, show flags. `column_order` is comma-delimited and supports dot-notation.
5. **CSS injection** — Tag Finder injects its own CSS via `<style>` tag. Panel styles are in `panel_page.css`.
6. **Inline styles** — Bold and gender colors use inline styles on `<th>`/`<td>` (necessary for specificity). Do not switch to CSS classes.

---

## What's NOT Done Yet

| Item | Notes |
|---|---|
| Drag-and-drop actions | `Page Drag Action` child table defined but renderer not implemented |
| Fixtures | Page Definition + Report not added to `hooks.py` fixtures |
| Send dialog testing | SendGrid and Twilio wiring is in place but needs live testing with real credentials |
| Tag Finder in narrow panels | When user drills into a Link field, the explorer stays at 280px — may need to auto-widen |

---

## Rules for This Codebase

- Confirm understanding before making changes (`💭 Understanding:` pattern)
- No code changes until user approves
- Start with highest-probability fixes (config/typos before complex system issues)
- Read `project_reference.md` fully before any work
- After edits, check lints
- User runs deployment — just commit and push when asked
