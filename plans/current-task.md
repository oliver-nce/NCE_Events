# Current Task: Evaluations — Phase 6 of 9

```
[PLAN OVERVIEW]
Phase 4 — get_event_enrollments API + tests ✅
Phase 5 — Read-only RatingKanbanView + useEnrollments ✅
Phase 6 — set_enrollment_rating API + tests
Phase 7 — Drag tile → save on drop
Phase 8 — Polling merge
Phase 9 — iPad polish
```

**Phase 5 delivered**

- `utils/frappeCall.js`, `composables/useEnrollments.js`, `components/RatingKanbanView.vue`
- `App.vue` — `rating_kanban` → `RatingKanbanView`
- Rebuild: `cd nce_events/public/js/evaluations && npm run build` then `bench build`

Note: **`77c03a1` only added the API** — UI stayed on the placeholder until this phase. Deploy the new `evaluations_dist` after pull.

---

```
[CURRENT PHASE: 6 of 9] — set_enrollment_rating backend

File(s):
  - nce_events/api/evaluations.py
  - nce_events/api/tests/test_evaluations.py

Changes:
  1. Whitelist set_enrollment_rating(enrollment_name, rating) — int 0–7, resolve enrollment doctype (same as get_event_enrollments), frappe.has_permission(enroll_dt, write, doc=enrollment_name), frappe.db.set_value + commit, return { ok, rating, name }.
  2. Tests: guest, missing args, out-of-range rating, permission mocked happy path.

Frappe notes: enrollment PK is Enrollments.name (order_item_id per exchange.py) or Registrations name on older sites.
```
