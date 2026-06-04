# Plan — Panel V2: full contract-class styling (post 12-phase migration)

## Goal

After the completed 12-phase theme migration (`9bb6474`–`dbfa22b`), many panel elements still get color from **`theme_defaults.css` aliases** or **scoped `var(--*)` / `var(--nce-color-*)`**. The user wants **appearance controlled only through the published theme**, using **shipping contract classes** from `THEME_CLASS_CONTRACT.json` / site-wide `nce_theme.css`.

**Paradigm (unchanged):** delete scoped chrome rules; add classes on the template. Layout (flex, sticky, resize handles, opacity animations) stays in scoped CSS.

**Out of scope:** debug overlays, JS-generated debug HTML, teleported context menu (`PanelTable.vue` ~702+), categorical gender/type hex, non-Vue CSS files (stay on `var(--nce-color-*, #fallback)`), Themes repo changes unless noted as optional prerequisite.

**Build / deploy:** Vue edits only in repo. User runs `npm run build` in `public/js/panel_page_v2/` before deploy. No `bench` commands.

**Reference:** `THEME_CLASS_CONTRACT.json` — never invent class names; only `status: "shipping"`.

---

## Design decisions

| Topic | Decision |
|-------|----------|
| Zebra rows | **Even rows:** `bg-surface`. **Odd rows:** `bg-row-alt` (already on odd; make even explicit). Both from theme tokens. |
| Row hover | Prefer template `bg-primary-100` when row is hovered. **Path B has no `hover:` utilities** — use `@mouseenter` / `@mouseleave` + `:class`, or one scoped `tr:hover { }` with `var(--nce-color-primary-100)` until Themes ships hover classes. Plan default: **dynamic class** on `<tr>` for V2 consistency with selected state. |
| Row selected | Template `bg-primary-200` when `selectedName === row.name`; delete scoped `background: var(--nce-color-primary-200) !important`. |
| `bg-{role}` pairing | Do **not** add `text-*-fg` alongside `bg-primary` / `bg-secondary-100` — auto-paired in `nce_theme.css`. |
| Footer on primary bar | Use `bg-primary` + `text-primary-fg-tonal`, **not** `text-muted` on a primary background. |
| Find strip (`--primary-light`) | Maps to `--nce-color-focus`. No `bg-focus` class. Use **`bg-primary-100`** (visual “light primary band”) **or** `bg-themed` + `:style="{ '--bg': 'var(--nce-color-focus)' }"` — pick one in Phase 2 and use consistently. |
| Header toolbar icons | Inherit fg from parent `bg-primary`, or explicit `text-primary-fg` / `text-primary-fg-tonal` for count and hint. |
| Frappe `:deep()` dirty fields | Keep minimal `var(--nce-color-danger)` on Desk controls where classes cannot reach; optional parent `text-danger` already present. |

---

## Phases

### Phase A — Panel shell (`PanelFloat.vue`)

**File:** `nce_events/public/js/panel_page_v2/components/PanelFloat.vue`

| Element | Add / change classes | Remove from scoped CSS |
|---------|----------------------|-------------------------|
| `.ppv2-float` | `bg-surface border rounded shadow-theme` | `background`, `border`, `border-radius`, `box-shadow` (keep `position`, `contain`, `will-change`) |
| `.ppv2-float-header` | keep `bg-primary` | — |
| `.ppv2-float-footer` | `bg-primary text-primary-fg-tonal` (drop `text-muted` if redundant) | `background: var(--bg-header)` |
| Resize grip | optional `border` token via class on grip element if refactor allows | gradient may stay layout-only |

**Acceptance:** float chrome visible; header/footer match theme primary; no `var(--bg-surface)` / `var(--bg-header)` on shell/footer in this file.

---

### Phase B — Find action bar (`PanelFindActionBar.vue`)

**File:** `nce_events/public/js/panel_page_v2/components/PanelFindActionBar.vue`

| Element | Classes |
|---------|---------|
| `.ppv2-find-actions` | `bg-primary-100 border-b border` (or `bg-themed` + focus var — document choice in commit message) |
| `.ppv2-find-tab-btn` | `bg-card border rounded-sm font-sans text-base` |
| `.ppv2-find-tab-btn--primary` | `bg-primary border-primary font-bold` |
| Browse dashed bottom | `border-b border` + keep dashed via scoped **width/style only** OR vanilla `border-dashed` |

**Remove:** `var(--primary-light)`, `var(--bg-card)`, `var(--bg-header)`, `var(--text-header)`, `var(--border-color)` color declarations.

**Hover on find buttons:** dynamic `bg-surface` class on mouseenter, or scoped one-liner until `hover:bg-surface` exists.

**Acceptance:** New Find / Modify Find / Cancel strip and buttons re-theme when NCE Theme changes; no legacy aliases in file.

---

### Phase C — Table chrome + zebra + row states (`PanelTable.vue`)

**File:** `nce_events/public/js/panel_page_v2/components/PanelTable.vue`

#### C1 — Zebra striping (explicit both stripes)

```vue
:class="{
  'bg-surface': ri % 2 === 0,
  'bg-row-alt': ri % 2 === 1,
  'bg-primary-200': selectedName === row.name,
  'bg-primary-100': hoveredRowIndex === ri && selectedName !== row.name,
}"
```

- Add `hoveredRowIndex` ref; `@mouseenter` / `@mouseleave` on `<tr>` (or tbody delegation).
- Remove `.ppv2-selected` background rule if class replaces it; keep class name only if needed for other selectors.

#### C2 — Already class-based (verify, do not regress)

- Column headers: `col-header bg-secondary-100` — keep.
- Links: `text-link` — keep; move link **hover** from `color: var(--nce-color-primary)` to dynamic `text-primary` on hover or defer to Themes `hover:text-primary`.

#### C3 — Row actions + loading + borders

| Element | Classes |
|---------|---------|
| `.ppv2-row-btn` | `bg-card border rounded-sm` |
| `.ppv2-loading` | `text-primary` |
| `.ppv2-error` | keep `text-danger` |
| `th` / `td` borders | `border` on cells or table wrapper where possible; keep sticky/width in scoped |

**Remove:** `var(--bg-card)`, `var(--border-color)`, `var(--nce-color-primary-100/200)` for row states once classes work.

**Acceptance:**

- Even rows use `bg-surface`, odd use `bg-row-alt`; both respond to theme `--nce-color-surface` / `--nce-color-row-alt`.
- Hover shows primary-100 tint; selected shows primary-200; stripe visible when not hovered/selected.
- Grep file: no `var(--row-hover-bg)`, `var(--row-selected-bg)`, `var(--bg-card)` for chrome.

---

### Phase D — Header toolbar (`PanelHeaderToolbar.vue` + `PanelFloat` `:deep`)

**Files:**

- `nce_events/public/js/panel_page_v2/components/PanelHeaderToolbar.vue` — add classes on root controls where possible (`text-primary-fg-tonal` on `.ppv2-count`, `text-secondary` on refreshing state via class binding).
- `nce_events/public/js/panel_page_v2/components/PanelFloat.vue` — strip `:deep` color rules that duplicate contract (opacity, font-size layout can stay).

**Open question (from original plan):** confirm this toolbar is **panel header on `bg-primary`**, not a separate app strip — if subdued strip is desired, use `bg-surface` on header instead of `bg-primary` (visual review before Phase A commit).

**Acceptance:** record count and icons readable on themed primary header without `var(--color-secondary)` except refreshing → `text-secondary`.

---

### Phase E — Filter bar (`PanelTableFilterBar.vue`)

**File:** `nce_events/public/js/panel_page_v2/components/PanelTableFilterBar.vue`

| Element | Classes |
|---------|---------|
| Active op `.ppv2-op-btn.active` | `bg-primary border-primary` |
| Inputs | `bg-card border-input-border` |
| Remove filter btn | keep `text-danger` |

**Remove:** `var(--bg-header)` on active op.

---

### Phase F — Required / error literals (`text-danger`)

**Files:**

- `PanelFormField.vue` — `text-danger` on `.ppv2-fd-reqd`; delete `color: red` (~297–299).
- `PanelFormDialogRelatedTab.vue` — `text-danger` on all `.ppv2-fd-reqd` spans (~59, 190, 257); delete nested `color: red` (~1156–1158, 1206–1208).
- `PanelFormDialogInlineChildTab.vue` — `text-danger` on `.ppv2-fd-reqd` (~22).
- `FieldWidget.vue` — `text-danger` for required indicator (~165).

**Acceptance:** `rg 'color:\s*red' panel_page_v2/components` → zero (excluding comments).

---

### Phase G — Dialog / tab chrome leftovers

**Files (grep-driven):**

- `TabBar.vue` — active tab: `bg-primary border-primary` on template; remove scoped text-color override.
- `PanelFormDialogBody.vue` — validation banner: `bg-danger-100 border-danger` + keep `text-danger` on text.
- `PanelFormDialogFooter.vue` / `PanelFormDialogTabBar.vue` — already partial `bg-primary`; grep remaining `var(--bg-header)` / `var(--text-header)`.

**Acceptance:** no `var(--bg-header)` in these files.

---

### Phase H — Prune `theme_defaults.css` aliases (second pass)

**File:** `nce_events/public/css/theme_defaults.css`

1. Grep `var(--primary)`, `var(--bg-card)`, `var(--bg-header)`, `var(--primary-light)`, `var(--row-hover-bg)`, `var(--column-header-bg)`, etc. under `nce_events/public/`.
2. Delete aliases with zero consumers.
3. Keep `/* Static categorical */` block (`--male-hex`, `--female-hex`).
4. Shrink `.ppv2-root, .ppv2-float, …` selector list to panels that still need bridge.

**Acceptance:** file ≤ ~40 lines; comment lists remaining consumers per alias.

---

### Phase I — Optional Themes prerequisite (hover utilities)

**Repo:** `Themes/themes/utils/css_writer.py`

If dynamic row hover (Phase C) feels too heavy, emit e.g. `hover:bg-primary-100`, `hover:bg-surface`, `hover:text-primary` in `generate_css()`, republish theme, then simplify PanelTable to `class="… hover:bg-primary-100"` and remove `hoveredRowIndex` ref.

**Not blocking** Phases A–H.

---

## Suggested commit order

1. `theme(panel A): contract classes on PanelFloat shell and footer`
2. `theme(panel B): contract classes on PanelFindActionBar`
3. `theme(panel C): zebra bg-surface/bg-row-alt, hover/selected shade classes on PanelTable`
4. `theme(panel D–E): header toolbar and filter bar contract classes`
5. `theme(panel F–G): text-danger asterisks and dialog/tab leftovers`
6. `theme(panel H): prune theme_defaults alias bridge`

One phase per commit keeps bisect easy.

---

## Test plan (manual)

1. Open **Families — Found** (browse find): header/footer primary, find strip tinted, table zebra visible, hover tint, selected row tint.
2. Change NCE Theme primary/secondary on site, hard-refresh: panel colors track without code deploy (only theme republish).
3. Required field asterisk in Form Dialog: danger color from theme.
4. Filter bar: active operator chip uses primary.
5. Regression: Tag Finder, Tag Dialog, Actions panel floats still readable.

---

## `current-task.md` stub (after approval)

When starting work, set `plans/current-task.md` to Phase A with file list and acceptance criteria from this plan; mark phases complete as commits land.

---

## Related docs

| Doc | Use |
|-----|-----|
| `plans/plan.md` | Original 12-phase migration (complete) |
| `plans/plan-path-b-completed.md` | Path B emitter |
| `THEME_CLASS_CONTRACT.json` | Class names |
| `Docs/theme-classes-reference.md` | Quick lookup |
