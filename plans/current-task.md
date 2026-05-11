# Current Task: Evaluations — Phase 4 of 9

```
[PLAN OVERVIEW]
Total phases: 9
Summary: iPad SPA at /app/evaluations/<event_id>; 8-column rating Kanban; save enrollment.rating on tile drop; 3 s polling; Pinia shell + view registry.

Phase 1 — Frappe Page shell ✅
Phase 2 — Vue + Vite + Pinia + App header ✅
Phase 3 — Route eventId + Pinia shell + view registry ✅
Phase 4 — get_event_enrollments API + tests (nce_events/api/evaluations.py)
Phase 5 — Read-only RatingKanbanView + fetch wiring
Phase 6 — set_enrollment_rating API + tests
Phase 7 — Drag tile → save on drop
Phase 8 — Polling merge
Phase 9 — iPad polish
```

## Phase 3 deliverable

- `stores/shell.js` — `useNceEvalShellStore`: `eventId`, `activeView`, `setEventId`, `setView`
- `evaluations.js` — `eventId` from `frappe.get_route()[1]` passed to `mount`
- `main.js` — `mount(selector, { eventId?, activeView? })` patches store before mount
- `App.vue` — `VIEWS` registry + `<component :is>`
- `RatingKanbanPlaceholder.vue` — shows view id, event id or URL hint

Rebuild: `cd nce_events/public/js/evaluations && npm run build` then `bench build`.

---

```
[CURRENT PHASE: 4 of 9] — Backend: list enrollments for event

File(s):
  - nce_events/api/evaluations.py (new)
  - nce_events/hooks.py — whitelist `nce_events.api.evaluations.get_event_enrollments` if not using decorator-only pattern used elsewhere
  - nce_events/api/tests/test_evaluations.py (new)

Changes:
  1. Add @frappe.whitelist() get_event_enrollments(event_id) — validate event_id non-empty; permission check; SQL or get_list joining Registrations (enrollment) to Events by product_id / event link per nce_sync schema — return list of dicts: name, first_name, last_initial, position, gender, rating (int 0–7).
  2. Confirm enrollment DocType name and field names against nce_sync (Registrations vs Enrollment).
  3. Unit tests with frappe.set_user / mocks per existing api tests pattern.

Design context:
  - Response shape must match Phase 5 `useEnrollments` consumer.

Frappe notes:
  - Whitelist method name matches frappe.call from Vue in Phase 5.
```
