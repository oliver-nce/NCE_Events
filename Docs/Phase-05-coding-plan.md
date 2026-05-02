# Phase 5 — Coding Plan: Split `panel_api.py` into a `panel_api/` package

**Status:** Ready to execute (Claude Code).
**Branch base:** `refactor/phase-04-split-form-dialog-api`.
**Branch name to create:** `refactor/phase-05-split-panel-api`.
**Estimated atomic commit size:** ~1,100 LOC moved across 6 new submodules + a 35–60 LOC shim.

This plan is the concrete, codebase-grounded execution doc for Phase 5 of the NCE_Events refactor. It mirrors Phase 4 (the `form_dialog_api.py` split), adapted to the actual contents of `nce_events/api/panel_api.py` as recorded in `nce_events/CODE_INDEX.json` and verified against the source tree on disk on 2026-05-02.

If anything in this plan disagrees with the original 12-phase plan or with `Docs/refactor-handoff.md`, the handoff doc and the universal rules win — re-read both before changing scope.

---

## 1. Scope and intent

`nce_events/api/panel_api.py` is currently 1,093 LOC and holds 9 whitelisted endpoints plus 19 private helpers covering panel config, panel data fetch, CSV export, SQL filter save, child-doctype discovery, field metadata, computed columns, and core-filter SQL primitives. Phase 5 splits it into a sibling package (`nce_events/api/panel_api/`) along the section lines already curated in `CODE_INDEX.manual.json`, leaving a re-export shim at the original module path so that:

- Every `frappe.call({method: "nce_events.api.panel_api.<fn>"})` site in the frontend keeps resolving without a single character of frontend change.
- Every `from nce_events.api.panel_api import <name>` statement in the rest of the backend keeps resolving without a single character of import-line change in this phase.
- Every `unittest.mock.patch("nce_events.api.panel_api.<name>")` (none exist today, but new ones may be added later) continues to resolve.

**This is a pure code-move + shim phase. No behaviour changes are permitted.** Behaviour changes for the panel API land in Phase 12 alongside the form_dialog shim removal.

## 2. Universal rules recap (apply unchanged from Phases 1–4)

1. Preserve whitelisted endpoint names by re-exporting the moved function objects through the shim. `frappe.whitelisted` is keyed on function objects, not import paths.
2. No behaviour change. If a refactor seems to require one, stop and surface it for human review.
3. Never push to `main`. Phase 5 lives on its own branch and its own PR.
4. Never bypass `pre-commit` with `--no-verify`. Fix the underlying hook failure.
5. Never run `bench` commands from the sandbox. No site interaction, no migrations, no live test runner.
6. Regenerate `nce_events/CODE_INDEX.json` via `python3 scripts/build_code_index.py --write` before committing. The pre-commit `build-code-index --check` hook will block the commit otherwise.
7. Grep the whole repo before committing to confirm no stale references to renamed/moved symbols remain.

Sandbox quirks documented in `Docs/refactor-handoff.md` §3 (no `git config user.name/email`, non-persistent `cd`, no pytest, restricted WebFetch) all still apply.

Pre-commit gotchas documented in §4 (RUF022 isort `__all__`, F402 `_` shadowing of the translation function, RUF002 en-dash inside docstrings, RUF100 unused `# noqa: F401`, UP038 union `isinstance`) all still apply.

## 3. Inventory of `panel_api.py` as it stands today

Captured from `nce_events/api/panel_api.py` (1,093 LOC) on 2026-05-02. Line numbers are the `def` line, not the decorator line.

### 3.1 Whitelisted endpoints (9)

| Symbol | def line | One-line role |
|---|---|---|
| `get_panel_config` | 48 | Return the page-panel config (root doctype, columns, hop chain, etc.) for the desk-side panel renderer. |
| `get_panel_data` | 168 | Paginated, filtered panel data fetch. Honours core-filter SQL, user filters, computed columns. |
| `export_panel_data` | 348 | CSV export of `get_panel_data` results. |
| `build_panel_sql` | 501 | Public form of `_build_panel_sql`: returns the SQL string for the current panel for inspection. |
| `save_panel_sql` | 515 | Persist a core-filter SQL clause + order-by on the page-panel doc. |
| `get_child_doctypes` | 647 | Discover direct-child doctypes (one hop) reachable from `root_doctype`. |
| `get_multi_hop_children` | 707 | Multi-hop child-doctype discovery (used by the related-rows hop chain UI). |
| `debug_child_lookup` | 838 | Diagnostic endpoint exposing the child-discovery walk. |
| `get_doctype_fields` | 869 | Field metadata for the page-panel field picker. Returns `{ fields, doctype_title_field }`. |

### 3.2 Private helpers (19)

| Symbol | def line | Cluster |
|---|---|---|
| `_build_panel_sql` | 399 | sql |
| `_build_core_filter_where` | 540 | core_filters |
| `_count_with_core_filter` | 564 | core_filters |
| `_query_with_core_filter` | 571 | core_filters |
| `_auto_detect_contact_fields` | 598 | _helpers |
| `_find_link_field` | 625 | _helpers |
| `_title_case` | 637 | _helpers |
| `_safe_filename` | 641 | _helpers |
| `_wp_doctype_label_map` | 690 | _helpers |
| `_get_link_fieldnames` | 902 | _helpers |
| `_get_link_fields_with_target` | 911 | _helpers |
| `_get_gender_field_key` | 924 | _helpers |
| `_meta_reqd_root_fieldnames` | 940 | _helpers (re-imported externally) |
| `_parse_csv` | 955 | _helpers (re-imported externally) |
| `_get_computed_columns` | 962 | computed_columns |
| `_evaluate_computed_columns` | 981 | computed_columns |
| `_ensure_tab_prefix` | 1002 | core_filters (re-imported externally) |
| `_run_computed_sql` | 1024 | computed_columns |
| `_apply_user_filters` | 1049 | core_filters (re-imported externally) |

### 3.3 External callers of `panel_api` private helpers (must keep working through the shim)

Verified via grep on 2026-05-02:

- `nce_events/api/form_dialog/save.py` line 18: `from nce_events.api.panel_api import _meta_reqd_root_fieldnames, _parse_csv`
- `nce_events/api/tests/test_core_functions.py` line 14: `from nce_events.api.panel_api import _apply_user_filters, _build_core_filter_where, _ensure_tab_prefix`
- `nce_events/api/reports.py` (per `CODE_INDEX.json`'s `depends_on`)

There are currently zero `@patch("nce_events.api.panel_api.<name>")` decorators anywhere in the repo, so unlike Phase 4 there is no patch-path migration step. **Re-grep before committing** in case anything new has landed.

### 3.4 Frontend `frappe.call` sites referencing `nce_events.api.panel_api.<fn>`

Verified via grep on 2026-05-02. These all currently resolve through the live module and must keep resolving through the shim:

| File | Endpoint(s) called |
|---|---|
| `nce_events/public/js/panel_page_v2_dist/panel_page_v2.js` (built artefact) | `get_panel_config`, `get_panel_data`, `export_panel_data` |
| `nce_events/public/js/panel_page_v2/App.vue` | `export_panel_data` |
| `nce_events/public/js/panel_page_v2/composables/usePanel.js` | `get_panel_config`, `get_panel_data` |
| `nce_events/nce_events/doctype/page_panel/page_panel.js` | `get_doctype_fields` (×2), `build_panel_sql`, `get_child_doctypes`, `get_multi_hop_children` (×2) |
| `plans/agent-prompt.md` (planning text only — not runtime) | `get_child_doctypes` (×2) — informational, do not "fix" |

That is 10 production runtime sites against 7 distinct endpoint names. None of them are touched in this phase.

## 4. Target package layout

Create `nce_events/api/panel_api/` as a package mirroring the Phase 4 form_dialog layout. Keep submodule names short, lowercase, and single-purpose so they read well in import lines.

| New file | LOC est. | Contents (functions to move, in source order) |
|---|---|---|
| `nce_events/api/panel_api/_helpers.py` | ~210 | `_title_case`, `_safe_filename`, `_auto_detect_contact_fields`, `_find_link_field`, `_get_link_fieldnames`, `_get_link_fields_with_target`, `_get_gender_field_key`, `_wp_doctype_label_map`, `_meta_reqd_root_fieldnames`, `_parse_csv` |
| `nce_events/api/panel_api/core_filters.py` | ~120 | `_build_core_filter_where`, `_count_with_core_filter`, `_query_with_core_filter`, `_apply_user_filters`, `_ensure_tab_prefix` |
| `nce_events/api/panel_api/computed_columns.py` | ~85 | `_get_computed_columns`, `_evaluate_computed_columns`, `_run_computed_sql` |
| `nce_events/api/panel_api/sql.py` | ~140 | `_build_panel_sql`, `build_panel_sql`, `save_panel_sql` |
| `nce_events/api/panel_api/panel_data.py` | ~360 | `get_panel_config`, `get_panel_data`, `export_panel_data` |
| `nce_events/api/panel_api/discovery.py` | ~280 | `get_child_doctypes`, `get_multi_hop_children`, `debug_child_lookup`, `get_doctype_fields` |
| `nce_events/api/panel_api/__init__.py` | — | Re-export every public + underscore-prefixed name. Sort `__all__` alphabetically (RUF022 — single list, no comment-segmented sub-blocks). |

Notes on the split:

- `_helpers.py` is the bottom of the import graph: it has zero intra-package imports.
- `core_filters.py` may import from `_helpers.py` (e.g. for `_title_case`) but not vice-versa.
- `computed_columns.py` imports from `_helpers.py` only.
- `sql.py` imports from `core_filters.py` (for `_build_core_filter_where`) and `_helpers.py`.
- `panel_data.py` imports from `_helpers.py`, `core_filters.py`, `computed_columns.py`, `sql.py`.
- `discovery.py` imports from `_helpers.py` only (it's the field/doctype-metadata branch and does not need filter or computed-column code).

If a circular import shows up (Phase 4 had a `_helpers ↔ portal_fields` cycle solved with deferred in-function imports), use the same fix here: move the offending `import` line inside the function body. Do **not** introduce a new helper module just to break a cycle — match Phase 4's approach.

## 5. The shim

Replace `nce_events/api/panel_api.py` with a re-export shim that mirrors `nce_events/api/form_dialog_api.py` exactly in structure. Concrete template:

```python
"""
Deprecated shim: re-exports nce_events.api.panel_api.* under the historical
``nce_events.api.panel_api.<name>`` path.

The actual implementation has been split into the ``nce_events.api.panel_api``
package (Phase 5 refactor). This shim exists so that:

- Existing ``frappe.call({method: "nce_events.api.panel_api.<fn>"})`` call
  sites in JS keep resolving (the underlying function objects carry the same
  ``@frappe.whitelist`` registration regardless of how they are imported).
- Existing ``from nce_events.api.panel_api import <name>`` statements in
  ``form_dialog/save.py``, ``reports.py``, and ``tests/test_core_functions.py``
  keep resolving without a Phase 5 source change.
- Any external ``unittest.mock.patch("nce_events.api.panel_api.<name>")``
  paths that still need this attribute can find it.

New code should import directly from ``nce_events.api.panel_api`` (the
package). This shim will be removed in Phase 12 once all call sites have
been migrated. See Docs/refactor-handoff.md.
"""

from __future__ import annotations

from nce_events.api.panel_api import (
    _apply_user_filters,
    _auto_detect_contact_fields,
    _build_core_filter_where,
    _build_panel_sql,
    _count_with_core_filter,
    _ensure_tab_prefix,
    _evaluate_computed_columns,
    _find_link_field,
    _get_computed_columns,
    _get_gender_field_key,
    _get_link_fieldnames,
    _get_link_fields_with_target,
    _meta_reqd_root_fieldnames,
    _parse_csv,
    _query_with_core_filter,
    _run_computed_sql,
    _safe_filename,
    _title_case,
    _wp_doctype_label_map,
    build_panel_sql,
    debug_child_lookup,
    export_panel_data,
    get_child_doctypes,
    get_doctype_fields,
    get_multi_hop_children,
    get_panel_config,
    get_panel_data,
    save_panel_sql,
)
```

Do not add `# noqa: F401` to these imports — RUF100 will reject pre-emptive suppressions, and the imports are used (re-exported via the module namespace) by the Phase 4 mechanism.

**Naming collision warning.** The shim filename is `panel_api.py`. The package is `panel_api/`. Python's import system resolves a package directory before a sibling `.py` file of the same name **in some layouts**, but **not** when both live in the same parent directory — only one can win, and which one wins depends on the loader's search order. **You cannot keep both `panel_api.py` and `panel_api/` as siblings in `nce_events/api/`.**

This is the key delta from Phase 4. In Phase 4 the new package was `form_dialog/` and the shim was `form_dialog_api.py` — different names, no conflict. Here the shim must take a **different filename** than the package, or the package must take a different name than the historical module.

**Decision: rename the package, not the shim.** The shim is the user-facing import path that frontend `frappe.call` sites and existing backend imports already use. The package name is internal. Use one of these two options and pick **option A** unless human review says otherwise:

- **Option A (recommended): name the package `panel_api_pkg/` on disk** but expose it as `nce_events.api.panel_api` to importers via the shim's import-and-re-export pattern.
  - Concretely: create `nce_events/api/panel_api_pkg/` containing the 6 submodules and `__init__.py`.
  - The shim at `nce_events/api/panel_api.py` does `from nce_events.api.panel_api_pkg import …`.
  - All existing `from nce_events.api.panel_api import _X` statements continue to work because the shim re-exports `_X`.
  - **Asymmetry with Phase 4.** Phase 4 used a parallel-named package because the shim was `form_dialog_api.py` (different stem). Document this asymmetry in the PR description.
- **Option B: rename the shim, e.g. to `panel_api_shim.py` + a `panel_api/` package.** Rejected because it forces every existing `from nce_events.api.panel_api import X` and every `nce_events.api.panel_api.X` frappe.call to migrate **in this phase**, which violates the "no behaviour change in Phases 1–11" rule and explodes the diff.

**Before writing any code, the agent must confirm option A with a short comment in the PR description and call this out as a deviation from the literal Phase 4 mirror.** If human review prefers a different package name (`panel/`, `panel_core/`, `panel_pkg/`, etc.), apply that name everywhere consistently — but never collide with `panel_api.py`.

## 6. CODE_INDEX.manual.json updates

Add curated entries for the new package and submodules. Mirror the Phase 4 style. At minimum, supply for each new file:

- `purpose`: 1–2 sentences describing the file's role.
- `sections`: short bulleted-style strings keyed to the function clusters above.
- `private_helpers`: list of underscore-prefixed names defined in the file.
- `key_fields`: omit unless a doctype-fieldname cluster lives here (it doesn't for panel_api).
- `depends_on`: intra-package paths the file imports from.

Update the existing `nce_events/api/panel_api.py` entry's `purpose` to read "Deprecated re-export shim …" exactly as the form_dialog_api shim entry does (see `CODE_INDEX.json` `nce_events/api/form_dialog_api.py` for the template wording).

After editing the manual file, run `python3 scripts/build_code_index.py --write` to regenerate `CODE_INDEX.json`. The script will raise if a manual entry references a path that does not exist on disk — useful as a typo check.

## 7. Step-by-step execution

1. **Branch off Phase 4.**
   - `git fetch --all`
   - `git checkout refactor/phase-04-split-form-dialog-api`
   - `git checkout -b refactor/phase-05-split-panel-api`
2. **Read the source.** Read all 1,093 lines of `nce_events/api/panel_api.py` end-to-end. Do not rely solely on the inventory in §3 — note any module-level constants, `import` statements, or top-of-file side effects (logger setup, etc.) that must be propagated to the new submodules.
3. **Create the package directory.** `mkdir -p nce_events/api/panel_api_pkg` (per option A in §5).
4. **Create the empty `__init__.py`.** Just a docstring + `from __future__ import annotations` + an empty `__all__: list[str] = []` placeholder. Populate `__all__` at the end once all symbols have moved.
5. **Move helpers in dependency order.** One submodule per commit-internal step (still one atomic git commit at the end — see §8). Order:
   1. `_helpers.py`
   2. `core_filters.py`
   3. `computed_columns.py`
   4. `sql.py`
   5. `panel_data.py`
   6. `discovery.py`
   For each: copy the function definitions verbatim from `panel_api.py`, then add only the imports the new file actually needs. Do not edit function bodies.
6. **Wire `__init__.py`.** Re-export all 9 public + 19 private names. Sort `__all__` alphabetically (single flat list). Match the form_dialog `__init__.py` style.
7. **Replace `panel_api.py` with the shim** per §5. Verify the file is ~35–60 LOC, imports-only, with no logic.
8. **Update `CODE_INDEX.manual.json`** per §6.
9. **Regenerate the index.** `python3 scripts/build_code_index.py --write`.
10. **Run pre-commit until clean.** `python3 -m pre_commit run --all-files`. Iterate on any RUF022 / F402 / RUF002 / RUF100 / UP038 violation per `Docs/refactor-handoff.md` §4. Never use `--no-verify`.
11. **AST + grep verification** (see §9).
12. **Commit.** Single atomic commit. Conventional Commits message — see §8.
13. **Stop.** Print the `git push -u origin refactor/phase-05-split-panel-api` command for the human to run. Do not start Phase 6.

## 8. Commit message

Use a single atomic commit with a Conventional Commits header. Suggested:

```
refactor(api): split panel_api.py into panel_api_pkg/ package

Mirrors the Phase 4 form_dialog_api split. The 1,093-LOC panel_api.py
is broken into six submodules under nce_events/api/panel_api_pkg/
(_helpers, core_filters, computed_columns, sql, panel_data, discovery)
and panel_api.py is rewritten as a re-export shim so that:

- Frontend frappe.call("nce_events.api.panel_api.<fn>") sites keep
  resolving without any frontend change.
- Backend imports `from nce_events.api.panel_api import _X` in
  form_dialog/save.py, reports.py, and tests/test_core_functions.py
  keep resolving without an import-line change in this phase.

The package is named panel_api_pkg/ on disk (rather than panel_api/)
to avoid a sibling-name collision with the panel_api.py shim. The
public import path remains nce_events.api.panel_api.

No behaviour change. Behaviour change for the panel API lands in
Phase 12 alongside the form_dialog shim removal.

CODE_INDEX.json regenerated. Pre-commit hooks pass.
```

Use the repo's last-commit identity for the commit author (per `Docs/refactor-handoff.md` §3): `git -c user.name='Oliver Reid' -c user.email='ocreid@users.noreply.github.com' commit -F <msg-file>`.

Use a HEREDOC or a file for the multi-line commit body — never inline it with multiple `-m` flags only.

## 9. Verification checklist (run before committing)

The agent must run **all** of these and report each as PASS/FAIL in the final summary. A single FAIL means the work is not yet done.

### 9.1 Static / structural

- `python3 -c "import ast; ast.parse(open('nce_events/api/panel_api.py').read())"` — shim parses.
- For each new file `nce_events/api/panel_api_pkg/*.py`: parse with `ast`. No `SyntaxError`.
- Line count of `nce_events/api/panel_api.py` ≤ 65. The shim should be roughly imports-only.
- `python3 scripts/build_code_index.py --check` exits 0.
- `python3 -m pre_commit run --all-files` exits 0.

### 9.2 Symbol resolution (AST-only — do not import the modules; Frappe is not installed in the sandbox)

For every name listed in §3.1 and §3.2, confirm the shim's `__init__`-style import block in `panel_api.py` references it. Implementation: parse `panel_api.py` with `ast`, walk for `ast.ImportFrom`, collect `name.name` for each `alias`, assert the set equals the union of §3.1 + §3.2 (28 names total).

### 9.3 Grep sweeps

These must all return zero new false positives compared to `main`:

- `git grep "nce_events.api.panel_api"` — every hit must still be a valid path. The shim makes every dotted-path hit valid by definition; this sweep is a sanity check that nothing was renamed accidentally.
- `git grep "from nce_events.api.panel_api import"` — three known hits (form_dialog/save.py, tests/test_core_functions.py, plus any in reports.py); confirm count is unchanged.
- `git grep "@patch(\"nce_events.api.panel_api"` — must remain zero.
- `git grep "panel_api_pkg"` — should appear only inside `nce_events/api/panel_api.py` (the shim) and `nce_events/api/panel_api_pkg/` (the new package). Anywhere else is a leak of the on-disk package name into a place it shouldn't be.

### 9.4 Frontend assertion

No changes should have been made to any file under `nce_events/public/js/`, `nce_events/nce_events/doctype/page_panel/page_panel.js`, or any `.vue` file. Confirm with `git diff --name-only refactor/phase-04-split-form-dialog-api..HEAD`. If any frontend file appears in the diff, stop and surface it for human review — Phase 5 must not modify the frontend.

### 9.5 `CODE_INDEX.json` diff sanity

Diff the regenerated `CODE_INDEX.json` against the Phase 4 tip. Expected structural changes:

- `nce_events/api/panel_api.py` entry's `whitelist_endpoints` list collapses to empty (or remains the 9 names, depending on how the AST walker resolves re-exports — match the form_dialog_api.py shim's current entry shape exactly).
- 7 new entries appear under `nce_events/api/panel_api_pkg/` (six submodules + `__init__.py`).
- `form_dialog/save.py`'s `depends_on` still lists `nce_events/api/panel_api.py` (unchanged — we did not touch its imports).

If any other entry shifts unexpectedly, investigate before committing.

## 10. Out of scope for Phase 5

Do **not** do any of the following in this phase:

- Migrate `form_dialog/save.py`'s import to `from nce_events.api.panel_api_pkg._helpers import …`. That's Phase 12.
- Migrate `tests/test_core_functions.py`'s import. That's Phase 12.
- Migrate `reports.py`'s usage. That's Phase 12.
- Migrate any frontend `frappe.call` site. That's Phase 12.
- Add type annotations beyond what the moved code already has. That's Phase 10.
- Reorganize tests to mirror the new layout. That's Phase 11.
- Rename `panel_api_pkg/` to `panel_api/`. That's Phase 12, simultaneous with shim removal.
- Touch `panel_page_v2_dist/`. That's Phase 6/7 territory.

## 11. Open questions to surface in the PR description

The agent should call these out for human review when the PR is opened:

1. **Package name on disk.** This plan uses `panel_api_pkg/`. Acceptable alternatives: `_panel_api/`, `panel_api_internal/`, `panel/`. Whatever name is chosen, confirm it does not collide with any other module in `nce_events/api/` (currently it does not — verified via the file listing on 2026-05-02).
2. **Cluster boundaries.** The split in §4 follows the `sections` list curated in `CODE_INDEX.manual.json`. If review prefers different boundaries (e.g. fold `sql.py` into `panel_data.py`, or split `discovery.py` into `child_doctypes.py` + `field_metadata.py`), they're cheap to adjust before the squash-merge. Don't re-split after merge.
3. **Whether the shim should also re-export `__all__` itself.** Phase 4 did not. Stay consistent unless review says otherwise.

## 12. After the human runs `git push`

Stop. Do not start Phase 6 autonomously. Wait for the PR to be reviewed and merged, then ask the human to confirm before branching `refactor/phase-06-...` off the new tip. This is the per-phase workflow rule from `Docs/refactor-handoff.md` §2 step 9.

---

## Appendix A — Quick command reference

```bash
# Branch
git checkout refactor/phase-04-split-form-dialog-api
git checkout -b refactor/phase-05-split-panel-api

# Iterate
python3 scripts/build_code_index.py --write
python3 -m pre_commit run --all-files

# Verify
python3 scripts/build_code_index.py --check
git grep "nce_events.api.panel_api"
git grep "from nce_events.api.panel_api import"
git grep "@patch(\"nce_events.api.panel_api"
git grep "panel_api_pkg"

# Commit (use the repo's last-commit identity per Docs/refactor-handoff.md §3)
git -c user.name='Oliver Reid' -c user.email='ocreid@users.noreply.github.com' \
  commit -F .git/COMMIT_EDITMSG_phase05

# Print push command — do not run it
echo 'Run: git push -u origin refactor/phase-05-split-panel-api'
```

## Appendix B — Symbol-to-submodule mapping (quick lookup)

```
_apply_user_filters          -> core_filters.py
_auto_detect_contact_fields  -> _helpers.py
_build_core_filter_where     -> core_filters.py
_build_panel_sql             -> sql.py
_count_with_core_filter      -> core_filters.py
_ensure_tab_prefix           -> core_filters.py
_evaluate_computed_columns   -> computed_columns.py
_find_link_field             -> _helpers.py
_get_computed_columns        -> computed_columns.py
_get_gender_field_key        -> _helpers.py
_get_link_fieldnames         -> _helpers.py
_get_link_fields_with_target -> _helpers.py
_meta_reqd_root_fieldnames   -> _helpers.py
_parse_csv                   -> _helpers.py
_query_with_core_filter      -> core_filters.py
_run_computed_sql            -> computed_columns.py
_safe_filename               -> _helpers.py
_title_case                  -> _helpers.py
_wp_doctype_label_map        -> _helpers.py
build_panel_sql              -> sql.py
debug_child_lookup           -> discovery.py
export_panel_data            -> panel_data.py
get_child_doctypes           -> discovery.py
get_doctype_fields           -> discovery.py
get_multi_hop_children       -> discovery.py
get_panel_config             -> panel_data.py
get_panel_data               -> panel_data.py
save_panel_sql               -> sql.py
```

End of plan.
