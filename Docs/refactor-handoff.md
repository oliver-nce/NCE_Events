# NCE_Events Refactor — Handoff Document

**Status as of 2026-05-02.** This document consolidates everything the next agent (or future-you) needs to continue the 12-phase refactor of the NCE_Events Frappe v15 app. Phases 1–4 are an authoritative record of what was actually shipped. Phases 5–12 are a **reconstruction** assembled from the codebase's current state and the trajectory of Phases 1–4 — the original 12-phase plan was supplied in an earlier chat session that has since fallen out of context, so the strawman below should be reconciled against the original before being used to drive new work.

---

## 1. Universal rules (apply to every phase)

1. **Preserve whitelisted endpoint names.** Every `frappe.call({method: "nce_events.api.X.fn"})` site in the frontend must keep resolving. The mechanism is shim modules that re-export the moved function objects — `frappe.whitelisted` is keyed on function objects, not import paths, so a re-export through a shim preserves the registration.
2. **No behaviour change in Phases 1–11.** Behaviour changes are permitted only in Phase 12 (the shim-removal phase).
3. **Never push to `main`.** Each phase is its own branch and its own PR.
4. **Never bypass pre-commit with `--no-verify`.** If a hook fails, fix the underlying cause.
5. **Never run `bench` commands.** No site interaction, no migrations, no test runner from the sandbox.
6. **Regenerate `nce_events/CODE_INDEX.json` each phase.** Pre-commit `build-code-index` hook runs `scripts/build_code_index.py --check` and blocks commits when stale (added in Phase 3).
7. **Grep the whole repo for verification.** Before committing, confirm no stale references remain to renamed/moved symbols.

## 2. Per-phase workflow

1. Branch off the **previous phase's** branch (the chain is `phase-01 ← phase-02 ← phase-03 ← phase-04 ← …`).
2. Make code changes.
3. If file/module layout changed, update `nce_events/CODE_INDEX.manual.json` (the curated overlay; the script raises if a manual entry's path is missing on disk).
4. Run `python3 scripts/build_code_index.py --write`.
5. Run `python3 -m pre_commit run` until every hook passes.
6. Verify via grep + AST that public-API names still resolve through the shim.
7. Commit with a Conventional-Commits-style message.
8. Report the `git push -u origin <branch>` command for the human to run manually.
9. **Stop. Wait for human review.** Do not start the next phase autonomously.

## 3. Sandbox quirks (encountered during Phase 4)

- `git config user.name` and `user.email` are not set in the sandbox. Use the repo's last-commit identity: `git -c user.name='Oliver Reid' -c user.email='ocreid@users.noreply.github.com' commit …`.
- Bash `cd` does not persist between tool calls. Use absolute paths, or chain `cd /sessions/vibrant-eager-allen/mnt/NCE_Events && <cmd>`.
- Pytest is not installed in the sandbox, and Frappe tests require a live site context anyway. Validation relies on AST parse, grep, pre-commit, and curated module diffs — not runtime test execution.
- WebFetch / WebSearch are restricted; do not try to bypass via shell.

## 4. Pre-commit hook gotchas

- **RUF022** — `__all__` must be isort-sorted (single alphabetical list, no comment-segmented sub-blocks).
- **F402** — using `_` as a loop variable shadows the imported translation function `from frappe import _`. Use `_idx`, `_unused`, etc.
- **RUF002** — en-dash `–` (U+2013) is ambiguous with hyphen-minus inside docstrings. Em-dash `—` is fine. Replace `1–2000` with `1-2000`.
- **RUF100** — unused `# noqa: F401` is itself a lint violation. Don't pre-emptively suppress.
- **UP038** — use `isinstance(x, A | B | C)`, not `isinstance(x, (A, B, C))`.

---

## 5. Phase 1–4 record (what actually shipped)

### Phase 1 — Delete dormant V0 frontend

- Branch: `refactor/phase-01-delete-v0`
- Commit: `e166340 refactor(v0): delete dormant V0 frontend (~3k LOC)`
- Removed the unused V0 vanilla-JS class-based frontend tree.

### Phase 2 — Rename `panel_page_v2/shared` → `legacy_dialogs`

- Branch: `refactor/phase-02-rename-shared`
- Commit: `340344a refactor: rename panel_page_v2/shared -> legacy_dialogs`
- The directory holds V1 SMS/Email/AI-tools dialogs that V2 still reuses at runtime; the name `shared` was misleading.

### Phase 3 — Auto-generate `CODE_INDEX.json`

- Branch: `refactor/phase-03-codeindex-gen`
- Commit: `766bdb6 chore: auto-generate CODE_INDEX.json via scripts/build_code_index.py`
- Added: `scripts/build_code_index.py` — stdlib-only AST walker that derives the file list, top-level Python `def`/`class` names, JS top-level `export` names, `frappe.provide` namespaces, and `@frappe.whitelist` decorators.
- Added: `nce_events/CODE_INDEX.manual.json` — curated overlay merged onto the generator output (per-file `purpose`, `sections`, `private_helpers`, `key_fields`, `depends_on`).
- Added pre-commit hook `build-code-index` running `--check`.
- Run modes: `--write` regenerates on disk; `--check` exits 1 + unified diff if drift detected.

### Phase 4 — Split `form_dialog_api.py` (1233 LOC) into `form_dialog/` package

- Branch: `refactor/phase-04-split-form-dialog-api`
- Commit: `3b27243 refactor(api): split form_dialog_api.py into form_dialog/ package`
- Push pending: `git push -u origin refactor/phase-04-split-form-dialog-api`
- New layout under `nce_events/api/form_dialog/`:

  | Module | LOC | Contents |
  |---|---|---|
  | `_helpers.py` | 412 | WP-Tables validation, role guard, hop-chain walk, related-row filters/columns, fetch_from enrichment, related-doctypes argument parsing, `get_list` field sanitization |
  | `related_rows.py` | 317 | `_related_rows_for_vue_api`, `get_form_dialog_related_rows`, `save_form_dialog_related_rows` + private `_editable_related_fieldnames_for_save`, `_allowed_child_names_for_related_tab` |
  | `capture.py` | 255 | `capture_form_dialog_from_desk`, `rebuild_form_dialog`, `get_form_dialog_definition`, `list_form_dialogs_for_doctype` |
  | `portal_fields.py` | 239 | `get_related_portal_field_editor`, `save_related_portal_field_config` + portal editor row builders, normalizer |
  | `save.py` | 106 | `save_form_dialog_document` (with optional fetch_from writeback) |
  | `__init__.py` | — | Re-exports all 30 public + underscore-prefixed names; isort-sorted `__all__` |
- `nce_events/api/form_dialog_api.py` rewritten as a 35-line re-export shim.
- 12 `@patch` decorators updated in `nce_events/api/tests/test_form_dialog_api.py` to point at the new lookup sites.
- `CODE_INDEX.manual.json` updated with curated descriptions for the new package and submodules.

### Lessons captured during Phase 4

- `frappe.whitelist()` registers function objects, not paths, so the shim preserves resolution at the original `nce_events.api.form_dialog_api.X` paths used by the frontend.
- `unittest.mock.patch` patches at the **lookup site** (the module namespace where the calling function looks up the name), not where the function is defined. After splitting, every `@patch("nce_events.api.form_dialog_api.X")` had to become `@patch("nce_events.api.form_dialog.<submodule>.X")`.
- `from nce_events.api.form_dialog_api import X` import lines in test bodies survive unchanged through the shim.
- Circular imports between sibling submodules (`_helpers` ↔ `portal_fields`) resolved with deferred (in-function) imports, not module-top imports.
- The split was committed as **one atomic commit**, not sub-commits. Sub-commits would have left the test patch paths inconsistent across intermediate states because tests only become coherent when all functions reach their new homes simultaneously.

### Frontend `frappe.call` sites (must remain unchanged through Phases 4–11)

These all resolve through the `form_dialog_api` shim and must keep working:

- `nce_events/nce_events/doctype/page_panel/page_panel.js` — 6 sites: `get_related_portal_field_editor`, `save_related_portal_field_config`, `list_form_dialogs_for_doctype`, `get_form_dialog_definition`, `rebuild_form_dialog`, `capture_form_dialog_from_desk`
- `nce_events/public/js/panel_page_v2_dist/panel_page_v2.js` — 4 sites (built artefact): `get_form_dialog_related_rows`, `save_form_dialog_related_rows`, `save_form_dialog_document`, `get_form_dialog_definition`
- `nce_events/public/js/panel_page_v2/components/PanelFormDialogBody.vue` — 2 sites: `get_form_dialog_related_rows`, `save_form_dialog_related_rows`
- `nce_events/public/js/panel_page_v2/composables/useFrozenFormLoad.js` — 1 site: `get_form_dialog_definition`
- `nce_events/public/js/panel_page_v2/composables/frozenFormSave.js` — 1 site: `save_form_dialog_document`

---

## 6. Phases 5–12 — RECONSTRUCTION (replace if you have the original)

The original 12-phase plan is not in context and not in the repo. The phases below are inferred from (a) the current shape of the codebase, (b) the trajectory of Phases 1–4, and (c) the universal rule that no behaviour changes until Phase 12. **Confirm against the original before driving execution.**

### Phase 5 — Split `panel_api.py` (1093 LOC) into a `panel_api/` package

Direct mirror of Phase 4. `panel_api.py` is the next-largest API module. Likely cluster boundaries:

- WP-Tables / meta helpers (parallels `form_dialog/_helpers.py`)
- Panel list-fetch endpoints (the main `frappe.call` reads)
- Derived-column / SQL eval (interacts with `sql_eval.py`)
- Save endpoints
- Internal helpers (already shared with `form_dialog/save.py`: `_meta_reqd_root_fieldnames`, `_parse_csv`)

Replace `panel_api.py` with a re-export shim. Update test `@patch` paths to new lookup sites. Verify that `form_dialog/save.py` still imports `_meta_reqd_root_fieldnames` and `_parse_csv` correctly (either through the shim or directly from a new submodule path; pick one and document).

### Phase 6 — Split `PanelFormDialogBody.vue` (1162 LOC)

Largest Vue SFC in the V2 frontend. Extract into smaller child components by visual section, candidates:

- `PanelFormDialogTabs.vue` — tab strip + active-tab state
- `PanelFormDialogMainFields.vue` — main-tab fields grid
- `PanelFormDialogRelatedTab.vue` — related-tab list, scrollable table, portal-editable cells
- `PanelFormDialogActions.vue` — submit/cancel/Save Related Rows buttons

Composables (`useFrozenFormLoad.js`, `frozenFormSave.js`, `usePanelFormDialog.js`, `usePanelFormDialogHost.js`) stay where they are. Parent component prop API (`v-model:activeTab`, etc.) must not break. Rebuild `panel_page_v2_dist/`.

### Phase 7 — Split `App.vue` (710 LOC) and `PanelTable.vue` (604 LOC)

Same surgical-split treatment for the next two largest Vue files. Likely extractions: toolbar, filter bar, row-actions menu, computed-column rendering. No behaviour change; rebuild dist.

### Phase 8 — Archive root-level coding-instruction docs

Repo root currently holds ~70KB of stale planning/handoff markdown:

- `CODING_INSTRUCTIONS_PHASE_A.md` (18KB), `_B.md` (13KB), `_CD.md` (35KB), `_E.md` (4KB)
- `panel_form_dialog_coding_plan_v2.md` (21KB)
- `frappe-ui-dynamic-form-from-desk-schema.md` (45KB)
- `HANDOFF.md` (4KB), `TODO.md` (0.4KB)
- `chat_transcript.md` (empty — delete)

Move to `Docs/archive/` (or delete the empty/superseded ones). Update `AGENTS.md` and `Docs/project_reference.md` cross-references. Update `.gitignore` if appropriate.

### Phase 9 — Move `legacy_dialogs/` out of `panel_page_v2/`

Phase 2 renamed `panel_page_v2/shared/` → `panel_page_v2/legacy_dialogs/`, but the V1 holdover dialogs (`email_dialog.js` 1035 LOC, `sms_dialog.js` 479, `ai_tools.js` 145) still live structurally inside the V2 tree, which entangles the V2 build with V1 code. Lift to `public/js/legacy_dialogs/`. Update Vite config, all import paths, `hooks.py` `app_include_js`. Rebuild dist.

### Phase 10 — Tighten Python typing across `nce_events/api/`

Add return-type annotations and `from __future__ import annotations` to every module that's missing them. No runtime change. Optionally introduce a minimal `mypy --strict` or `pyright` config + pre-commit hook so future drift is caught. Be careful with Frappe's loosely-typed `frappe.get_doc()` returns — use `cast()` or `# type: ignore[no-any-return]` where Frappe leaks `Any`.

### Phase 11 — Reorganize `nce_events/api/tests/` to mirror package layout

Tests currently in `nce_events/api/tests/`:

- `test_form_dialog_api.py` (517 LOC, 23 methods)
- `test_core_functions.py` (268 LOC)
- `test_derived_fields.py` (128 LOC)
- `test_events_publish.py` (125 LOC)

Move to mirror the source tree:

- `tests/api/form_dialog/test_capture.py`, `test_related_rows.py`, `test_portal_fields.py`, `test_save.py`, `test_helpers.py`
- `tests/api/panel_api/...` (post-Phase-5)
- `tests/api/test_events_publish.py`

Pure file moves + class moves; no test-body changes. Confirm Frappe's `bench run-tests --module ...` discovery still finds them (the user runs this; agent does not).

### Phase 12 — Behaviour-change phase: drop the shims

The first phase where external callers must change. This is the breaking-change PR; coordinate with a deploy.

- Delete `nce_events/api/form_dialog_api.py` shim.
- Delete `nce_events/api/panel_api.py` shim (post-Phase-5).
- Update every frontend `frappe.call({method: "nce_events.api.form_dialog_api.X"})` site to a direct package path. The 14 known sites are listed in §5 above.
- Update every `unittest.mock.patch("nce_events.api.form_dialog_api.X")` in the test suite — though Phase 4 already pointed these at the new lookup sites, so this should be a no-op for the form_dialog tests.
- Update `Docs/project_reference.md` data-flow diagram.
- Rebuild `panel_page_v2_dist/`.

---

## 7. Open questions and known risks

- **Original plan ordering.** Phases 5–12 above are a strawman. The original may merge or split phases differently (e.g. could fold Phase 6 + 7 into one "Vue split" phase, or insert a "delete `panel_page_v2_dist/` from git, build artefact only" phase).
- **Phase 5 internal cluster boundaries.** Without reading every function in `panel_api.py`, the proposed split inside that module is a guess. The agent should re-read the module first and propose a concrete split plan in the PR description.
- **Phase 9 risk.** Moving `legacy_dialogs/` out of `panel_page_v2/` may break Vite resolution and `hooks.py` `app_include_js` assets. Validate by rebuilding and confirming `panel_page_v2_dist/panel_page_v2.js` byte-identical aside from import path strings.
- **Phase 11 + bench discovery.** `bench run-tests --app nce_events --module nce_events.api.tests.test_form_dialog_api` paths will all change. Either preserve the old paths via shim test files that import the new ones, or coordinate the path change with whoever runs the test suite.
- **Phase 12 deploy coordination.** Frontend + backend must deploy together. There is no in-flight version where the new package paths are live but the shim is gone.
