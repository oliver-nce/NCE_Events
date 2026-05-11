# Current Task: Evaluations — Phase 3 of 9

```
[PLAN OVERVIEW]
Total phases: 9
Summary: iPad SPA at /app/evaluations/<event_id>; 8-column rating Kanban; save enrollment.rating on tile drop; 3 s polling for multi-device sync; Pinia shell + view registry.

Phase 1 — Frappe Page shell (nce_events/nce_events/page/evaluations/)
Phase 2 — Vue + Vite + Pinia + App header (nce_events/public/js/evaluations/)
Phase 3 — Route eventId + Pinia shell store + view registry (stores/shell.js, App.vue, page evaluations.js)
Phase 4 — get_event_enrollments API + tests (nce_events/api/evaluations.py)
Phase 5 — Read-only RatingKanbanView + fetch wiring
Phase 6 — set_enrollment_rating API + tests
Phase 7 — Drag tile → save on drop
Phase 8 — Polling merge
Phase 9 — iPad polish (gutter scroll, lanes)
```

## Status — Phases 1–2 ✅ complete

Artifacts:

- Desk Page: `evaluations.json`, `evaluations.js`, `__init__.py`
- Vue sources: `public/js/evaluations/{main.js,App.vue,vite.config.js,package.json}`
- Build output: `public/js/evaluations_dist/{evaluations.js,style.css}`
- Code index excludes `evaluations_dist`; ESLint excludes built bundle patterns.

Smoke test locally: `bench build`, open **`/app/evaluations`** (System Manager).

---

```
[CURRENT PHASE: 3 of 9] — URL → eventId + Pinia shell + view registry

File(s):
  - nce_events/nce_events/page/evaluations/evaluations.js
  - nce_events/public/js/evaluations/main.js
  - nce_events/public/js/evaluations/App.vue
  - nce_events/public/js/evaluations/stores/shell.js (new)

Changes:
  1. evaluations.js — read frappe.get_route(); pass event id into mount:
     window.NCEEvaluations.mount('#nce-evaluations-app', { eventId: frappe.get_route()[1] || '' })
  2. main.js — change mount(signature) to accept opts; before mount create app per call OR pass props via pinia.shell.setEventId from opts once (preferred: Pinia patch on entry before Mount):
         const mount = (selector, opts = {}) => { shellStore/event init from opts if provided; return app.mount(selector); }
     Keep single Vue app instance (same pattern as NCEPanelPageV2 — one mount per page lifecycle).
  3. stores/shell.js — defineStore('nceEvalShell', { state: () => ({ eventId: '', activeView: 'rating_kanban' }), actions: setEventId, setView })
  4. App.vue — use store; `<component :is="currentViewComponent" />` from registry `{ rating_kanban: MinimalPlaceholder }`; placeholder shows eventId + view id for QA.
  5. Optionally add stubs/RatingKanbanPlaceholder.vue as minimal component.

Design context:
  - activeView values are string enums; first real view id: rating_kanban.
  - eventId empty string handled in UI (“No event selected”) until UX decided.

Frappe notes:
  - Route `/app/evaluations/EVT-XYZ` → frappe.get_route() is ['evaluations', 'EVT-XYZ'] typically.

Rebuild: cd nce_events/public/js/evaluations && npm run build; then bench build.
```
