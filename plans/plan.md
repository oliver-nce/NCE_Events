# Plan: Evaluations — rating Kanban (SPA)

### Goal

Build an **iPad landscape** SPA at **`/app/evaluations/<event_id>`** for one event’s enrollments. Each row shows **player name + position** (gender colors TBD — navy / dark magenta); only a **rating tile** moves across **eight lanes (ratings 0–7)**. **On drop**, the lane index is saved to the **enrollment row’s `rating` field**. Sync across devices uses **polling** (~3 s, Phase 8). Shell uses **Pinia** (`activeView`, `eventId`) and a **view registry** so more components can plug in later. Phases ordered so **each phase ends demonstrable**.

### Phases

**Phase 1 — Frappe Page shell**

- **Files:** `nce_events/nce_events/page/evaluations/__init__.py`, `evaluations.json`, `evaluations.js`
- **What:** Desk Page **`evaluations`** loads built assets from `evaluations_dist/` and mounts the Vue bundle via `window.NCEEvaluations.mount`.
- **Key decisions:** Keys `frappe.pages["evaluations"]`; guard `wrapper._vue_app`; mount `#nce-evaluations-app`.
- **Depends on:** none.
- **Done when:** Visiting `/app/evaluations` shows the Desk page and runs the SPA (requires Phase 2 dist).

**Phase 2 — Vue + Vite + Pinia skeleton**

- **Files:** `nce_events/public/js/evaluations/{package.json,vite.config.js,main.js,App.vue}`, `evaluations_dist/*` (build output); `npm install` → `package-lock.json`
- **What:** Vite **IIFE** → `evaluations_dist/evaluations.js` + `style.css`; **`createPinia()`** + **`window.NCEEvaluations.mount`**. `App.vue`: header (“Evaluations”), reserved actions area, empty `<main>`.
- **Key decisions:** Global `window.NCEEvaluations`; Pinia wired in `main.js`.
- **Depends on:** Phase 1.
- **Done when:** `npm run build` + `bench build` → `/app/evaluations` renders header strip.

**Phase 3 — URL → `eventId` + Pinia shell + view registry**

- **Files:** `nce_events/public/js/evaluations/stores/shell.js` (Pinia store), `App.vue`, `evaluations.js` (`frappe.get_route()` → mount options)
- **What:** Extend `mount(selector, opts)` — pass `opts.eventId` from route `[1]`; store holds `eventId`, `activeView` (default `rating_kanban`); `<component :is>` from a small **views registry** + placeholder kanban stub.
- **Key decisions:** `defineStore('nceEvalShell')` fields: `eventId`, `activeView`, `setView(id)`.
- **Depends on:** Phase 2.

**Phase 4 — Backend: list enrollments**

- **Files:** `nce_events/api/evaluations.py`, `hooks.py` (whitelist if pattern requires), `nce_events/api/tests/test_evaluations.py`
- **What:** Whitelisted `get_event_enrollments(event_id)` → rows with **`name`** (DocType Enrollment/Registrations PK), **`first_name`**, **`last_initial`**, **`position`**, **`gender`**, **`rating`** (normalize to int 0–7 server-side).
- **Key decisions:** Module `nce_events.api.evaluations`; exact join against `Events`/`Registrations`/`Family Members` **verified in `nce_sync` meta**.
- **Depends on:** none (parallel after Phase 2).

**Phase 5 — Read-only Kanban (no drag)**

- **Files:** `nce_events/public/js/evaluations/components/RatingKanbanView.vue`, `composables/useEnrollments.js` (or Pinia enrolment store later), wire in `App.vue` registry.
- **What:** Eight columns fitting **iPad landscape**; rows scroll vertically; tiles sit in lane `rating`; **rating number visible on tile** — updates only from server reload for this phase (no optimistic cross-lane preview until Phase 7).
- **Depends on:** Phases 3, 4.

**Phase 6 — Backend: set rating**

- **Files:** `nce_events/api/evaluations.py` + tests  
- **What:** Whitelisted `set_enrollment_rating(name, rating)` with `rating` ∈ `{0…7}`, permission check on doc write, **`frappe.db.set_value`** + **`frappe.db.commit`**, returns `{ ok, rating }`.
- **Depends on:** Phase 4.

**Phase 7 — Drag rating tile → save on drop**

- **Files:** `RatingKanbanView.vue` (+ optional `RatingTile.vue`)
- **What:** Horizontal drag **on tile only**; **number on tile updates on drop**; optimistic UI + rollback on error; avoid fighting vertical scroll (handle / axis).
- **Depends on:** Phases 5, 6.

**Phase 8 — Polling**

- **Files:** `composables/useEnrollmentsPolling.js`, `RatingKanbanView.vue`
- **What:** Poll `get_event_enrollments` ~3 s; **`document.hidden`** pauses merge; merge must not wipe an in-flight drag/save (`dirty`/lock per row).
- **Depends on:** Phase 5.

**Phase 9 — iPad polish**

- **Files:** scoped CSS on Kanban layout + shell
- **What:** ~44px touch targets; **~½ in right scroll gutter / stable scrollbar styling** per spec; narrow columns tuned for landscape.
- **Depends on:** Phase 7 (can start earlier for layout tokens).

### Design Decisions

- **Route:** `/app/evaluations/<event_id>` — `eventId` from `frappe.get_route()[1]` (validate non-empty Phase 3).
- **Bundle:** `window.NCEEvaluations.mount(selector, opts?)`; assets **`/assets/nce_events/js/evaluations_dist/evaluations.js`** + **`style.css`**.
- **State:** Pinia store **`nceEvalShell`**: `eventId`, **`activeView: 'rating_kanban'`** (+ future ids); **`setView(id)`**.
- **View registry:** `views = { rating_kanban: RatingKanbanView, … }` — root uses `<component :is="views[shell.activeView]" />`.
- **Polling:** MVP only — **no frappe.publish_realtime** in v1.
- **Naming:** Enrollment DocType = **whatever `nce_sync` uses** (“Registrations” in SQL snippets); coder confirms field **`rating`** and **position/gender JOIN** paths.

### Risks / Open Questions

- Enrollment DocType + field shapes live in **`nce_sync`** — confirm before locking SQL in Phase 4.
- **Roles:** Phase 6 needs write permission beyond System Manager if coaches aren’t admins.
- **`frappe.get_route()`** on Desk Page — smoke-test event id segment on real bench.
- iPad scrollbar “½ in” vs **native overlay scrollbars** — may need styled inner gutter vs OS defaults.
