# Current Task: Evaluations — Phase 5 of 9

```
[PLAN OVERVIEW]
Phase 4 — get_event_enrollments API + tests ✅
Phase 5 — Read-only RatingKanbanView + fetch wiring (Vue)
Phase 6 — set_enrollment_rating API + tests
Phase 7 — Drag tile → save on drop
Phase 8 — Polling merge
Phase 9 — iPad polish
```

## Phase 4 delivered

- `nce_events/api/evaluations.py` — `@whitelist` `get_event_enrollments(event_id)`
- `nce_events/api/tests/test_evaluations.py` — norm rating + mocked happy path + guest / validation
- Auto-discovered whitelist (no hooks change needed in this app)

Method for `frappe.call`: `nce_events.api.evaluations.get_event_enrollments`

---

```
[CURRENT PHASE: 5 of 9] — Read-only Kanban + fetch from API

File(s):
  - nce_events/public/js/evaluations/composables/useEnrollments.js (new)
  - nce_events/public/js/evaluations/components/RatingKanbanPlaceholder.vue → replace or add RatingKanbanView.vue
  - nce_events/public/js/evaluations/App.vue — register `rating_kanban` → real view
  - Rebuild evaluations_dist

Changes:
  1. Composable: `frappe.call({ method: 'nce_events.api.evaluations.get_event_enrollments', args: { event_id: shell.eventId }})` with loading/error state; skip if !eventId.
  2. RatingKanbanView.vue: 8 columns 0–7, one row per enrollment: name line (first_name + last_initial “John R.” style) + position; rating tile in lane `rating` (static, no drag).
  3. Gender colors on name line: male #1B2A60, female #7A0E5C (constants).
  4. Wire shell.activeView registry to RatingKanbanView.

Frappe notes: use existing frappeCall util if project has one (panel_page_v2/utils/frappeCall.js) — copy pattern or import if shared path allows; else inline frappe.call in composable.
```
