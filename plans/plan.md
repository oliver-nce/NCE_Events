# Plan — Harvest the full theme contract in NCE_Events panel/dialog chrome

## Goal

Path B shipped. `nce_theme.css` now exposes ~320 theme-aware Tailwind-style utility classes site-wide — every entry in `THEME_CLASS_CONTRACT.json` (apart from the deferred set: state variants, directional spacing, dark-mode, ring-focus). The goal of this plan is to delete hand-rolled CSS overrides and hardcoded color literals from panel_page_v2 components and companion stylesheets by moving styling onto template classes wherever a contract class applies. This is no longer "swap one CSS var for another" — it is "delete the scoped CSS rule entirely and put a single class on the template."

The strategic win the user articulated — "use the TW classes as is; our fixed style variations would not be needed" — is now fully realizable. Every component that currently writes `background: var(--bg-card); color: var(--text-color); border: 1px solid var(--border-color); border-radius: var(--border-radius); box-shadow: var(--shadow);` collapses to `class="bg-surface border rounded shadow-theme"` on the template element with zero scoped CSS for chrome.

The earlier draft of this plan (before Path B) is archived at `plans/plan-nce_events-migration-deferred.md`; the Path B coding plan (now executed) is at `plans/plan-path-b-completed.md`.

## What's now possible (the new floor)

After Path B, in any nce_events component, these all work as bare template classes — no Tailwind build required:

- **Role bg + auto-paired fg:** `bg-primary`, `bg-secondary`, `bg-accent`, `bg-success`, `bg-info`, `bg-warning`, `bg-danger`
- **Role text-color only:** `text-primary`, `text-secondary`, …, `text-danger`
- **Role border-color only:** `border-primary`, …, `border-danger`
- **Explicit/tonal fg:** `text-{role}-fg`, `text-{role}-fg-tonal`
- **Per-role shade (curated 100/200/300/500/600/700/900):** `bg-{role}-{shade}` (auto-paired fg), `text-{role}-{shade}`, `text-{role}-{shade}-fg`, `text-{role}-{shade}-fg-tonal`, `border-{role}-{shade}`
- **Neutrals:** `bg-bg-page`, `bg-surface`, `bg-card`, `bg-row-alt`
- **Semantic chrome aliases:** `bg-header`, `text-text-header`
- **Text roles:** `text-heading`, `text-muted`, `text-link`
- **Borders:** `border` (default), `border-input-border`, `border-input-focus`
- **Shape:** `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `shadow`, `shadow-theme`, `duration-theme`
- **Typography:** `font-sans`, `font-heading`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`
- **Spacing (uniform):** `p-xs`/`p-sm`/`p-md`/`p-lg`/`p-xl`, same for `m-*` and `gap-*`
- **Escape hatch:** `bg-themed` + `:style="{ '--bg': 'var(--nce-color-...)' }"`

**Still not available** (deferred from Path B): state variants like `hover:bg-primary`, `focus:border-input-focus`; directional spacing like `px-md`/`py-sm`/`mt-lg`; ring-focus utility. Phases that need a `:hover` color change keep a tiny scoped rule with `var(--nce-color-*)`. Phases that need directional padding either use uniform `p-{size}` or fall back to inline `:style` with `var(--nce-spacing-base)`.

## Migration paradigm (read before phases)

For each scoped CSS rule the migration touches, ask in this order:

1. **Is the rule pure chrome** (background/color/border/border-radius/box-shadow/font/spacing) that has a 1:1 class in the contract? → Delete the rule. Add the class to the template.
2. **Is part of the rule chrome, part layout?** → Move chrome to a template class. Keep layout (`display`, `flex-direction`, `position`, `width`, etc.) in scoped CSS.
3. **Is the rule a `:hover` / `:focus` / `:active` color change?** → Keep as scoped CSS using `var(--nce-color-*)` direct (state variants are out of Path B's scope).
4. **Is the rule a directional padding/margin** (`padding-left`, `margin-top`)? → Use inline `:style="{ padding: '... var(--nce-spacing-base)' }"` or keep as scoped CSS with `var()`. Uniform spacing classes only.
5. **Is the color a categorical static** (gender, type-indicator orange/purple)? → Leave hardcoded with a comment. Do not coerce into role tokens.

CSS files (`schema_explorer.css`, `hierarchy_explorer.css`, `panel_page.css`) cannot use template classes — they're stylesheets. They stay at the `var(--nce-color-*, #fallback)` layer.

## Phases

### Phase 1 — Validation-red sweep → `class="text-danger"` (6 files)

Files:

- `nce_events/public/js/panel_page_v2/components/PanelFormDialogRelatedTab.vue` (lines ~1112, 1188, 1238, 1349)
- `nce_events/public/js/panel_page_v2/components/PanelFormDialogBody.vue` (lines ~290, 351–354)
- `nce_events/public/js/panel_page_v2/components/PanelFormField.vue` (lines ~388, 392, 397, 401)
- `nce_events/public/js/panel_page_v2/components/PanelTable.vue` (line ~551, the `#e53e3e` error)
- `nce_events/public/js/panel_page_v2/components/PanelTableFilterBar.vue` (line ~257)
- `nce_events/public/js/panel_page_v2/components/PanelFormDialogInlineChildTab.vue` (line ~303)

What: each file has at least one scoped CSS selector like `.fd-required { color: #c0392b; }` or `.fd-error-msg { color: #c0392b; font-weight: 600; }` applied to a validation/required/error indicator. For each:

1. **Identify the element in the template** that the selector targets (e.g. `<span class="fd-required">*</span>`).
2. **Add `class="text-danger"`** to that element (alongside whatever existing classes it has).
3. **Delete the `color:` declaration** from the scoped CSS rule. If the rule only had `color:`, delete the entire selector. If it had other properties (font-weight, margin), keep the selector with the remaining properties.

This is mechanical; ~10 substitutions across 6 files; first phase deliberately easy to prove the pipeline.

Key decisions: never substitute `text-red-500` or any other non-contract class — `text-danger` is the contract's red. The HTML-string debug snippet at PanelFormDialogRelatedTab.vue:416 and 437 is out of scope (developer-only debug overlay).

Depends on: Path B published.

### Phase 2 — Muted text sweep → `class="text-muted"`

Files (grep result, ~5 components):

- `nce_events/public/js/panel_page_v2/components/PanelFormFindSearchHelpModal.vue` (multiple `var(--text-muted, #64748b)` consumers)
- `nce_events/public/js/panel_page_v2/components/TagColumn.vue` (lines 129–130 — `#8D949A`, will be covered fully in Phase 7 but this phase's mechanical pass catches it first if convenient)
- `nce_events/public/js/panel_page_v2/components/TagDialog.vue` (lines ~156–161 — `.tf-lbl`, `.tf-tile-fieldname` — same caveat)
- Any other scoped rule where the ONLY property is `color: var(--text-muted)` or a hex muted-gray (#6c757d, #888888, #8D949A, #64748b).
- (Run `grep -rn "color: var(--text-muted\|color: #6c757d\|color: #888888\|color: #8D949A\|color: #64748b" nce_events/public/js/panel_page_v2/components/*.vue` to enumerate at execution time.)

What: same paradigm as Phase 1. Add `class="text-muted"` to the targeted element, delete the `color:` declaration from scoped CSS. Where the muted color is hardcoded as a hex with no var() wrapper, the migration is still valid — the new class supplies a themable value.

Skip elements that will be fully migrated in Phases 7 (TagColumn) and 8 (TagDialog) — those phases will handle them. Phase 2 covers the single-property muted-color rules elsewhere.

Key decisions: `text-muted` resolves to `var(--nce-color-muted)`. The visual color may shift slightly under the active theme; document the before/after at the bottom of phase notes for any visible regression.

Depends on: Phase 1 (pattern proven).

### Phase 3 — Default body text — drop redundant `color: var(--text-color)` declarations

Files: any component with a scoped rule that ONLY sets `color: var(--text-color)` (or its fallback alias).

What: the default body text color cascades from `--nce-color-text` (emitted by Path B's `_emit_root_block` and referenced as Tailwind's `textColor.DEFAULT`). Any scoped rule that sets `color: var(--text-color)` and nothing else is redundant — delete it. The element inherits the default.

If a rule sets `color: var(--text-color)` alongside other properties, keep the rule but delete just the `color:` line.

Key decisions: this phase reduces noise; no template changes. Pure deletion. Easy to revert if a regression appears (rare since we're removing a re-declaration of the default).

Depends on: Phase 1.

### Phase 4 — Link colors → `class="text-link"` in PanelTable.vue

File: `nce_events/public/js/panel_page_v2/components/PanelTable.vue` (lines ~620, 625, 629, 634).

What: link cells currently use `color: royalblue` for default and `color: #1a3fb5` for hover. Replace:

1. **Template:** add `class="text-link"` to the link element (likely `<a>` or `<router-link>`).
2. **Scoped CSS:** delete the default-state `color: royalblue` rule. Keep the `:hover { color: #1a3fb5; }` rule but change to `:hover { color: var(--nce-color-primary); }` (hover variants are not in Path B's class set, so hover state stays as scoped CSS).

Key decisions: do not use `text-blue-700` or any literal-shade class. Hover stays scoped because `hover:text-primary` is out of Path B scope.

Depends on: Phase 1.

### Phase 5 — Primary header chrome harvest (3 files)

Files:

- `nce_events/public/js/panel_page_v2/components/PanelFloat.vue` (header strip around line ~206, plus inline cssText at line ~127)
- `nce_events/public/js/panel_page_v2/components/PanelFindToolbar.vue` (header strip at ~167–169)
- `nce_events/public/js/panel_page_v2/components/TagDialog.vue` JS-injected toast (lines 55–72; the panel header rule at 130–142 is handled in Phase 8)

What: each renders a primary-colored header strip with white text. For each:

1. **Template:** add `class="bg-primary"` to the header element. (The `.bg-primary` rule in nce_theme.css supplies both background AND auto-paired foreground — no need for `text-primary-fg`.)
2. **Scoped CSS:** delete the `background:` and `color:` declarations. Leave layout (`display: flex`, padding, gap, cursor, border-radius — unless border-radius is now `rounded`/`rounded-sm`, in which case use the class).
3. **JS-injected DOM (toast, inline cssText):** set `el.className = '<existing> bg-primary'`. Remove the `background` and `color` keys from `Object.assign(el.style, { ... })`. Keep position, size, transition, zIndex.

This is the canonical fg-pairing harvest. Before: 2 declarations per element. After: 1 class on the template.

Key decisions:
- The @layer rule for `.bg-primary` sets both `background-color` and `color`. Inline `style.backgroundColor` would override it. Phases 5 and 8 must remove the inline color/background keys from JS injection sites — only `className` reaches the DOM for color/bg. Add a code comment at each injection site to prevent regression.
- Border-radius on the header element: if the existing CSS uses `border-radius: var(--border-radius)`, add `class="rounded"` alongside `bg-primary` and delete the CSS rule. If it's a custom value (e.g. `6px 6px 0 0` for a top-only round), keep the scoped CSS.

Depends on: Phase 1.

### Phase 6 — Dialog header/footer/tabbar chrome (4 files)

Files:

- `nce_events/public/js/panel_page_v2/components/PanelFormDialogHeader.vue` (style block ~line 50)
- `nce_events/public/js/panel_page_v2/components/PanelFormDialogFooter.vue` (style block ~line 267)
- `nce_events/public/js/panel_page_v2/components/PanelFormDialogTabBar.vue` (style block ~line 51)
- `nce_events/public/js/panel_page_v2/components/PanelHeaderToolbar.vue`

What: same paradigm as Phase 5. These currently use `background: var(--bg-header); color: var(--text-header);` on their header/title strip. Add `class="bg-primary"` to the template element, delete the two declarations from scoped CSS.

For the tab bar's active-tab underline (`.fd-tab.is-active { border-bottom-color: var(--tab-active-border); }`), change to `:style="{ borderBottomColor: 'var(--nce-color-primary)' }"` on the active tab in template OR keep the scoped rule but change to `border-bottom-color: var(--nce-color-primary);` direct. Either works; recommend the scoped-CSS direct since the selector already exists.

Key decisions:
- `PanelHeaderToolbar.vue` may be the SPA's top app strip rather than a dialog header. If so, check whether the visual treatment should be `bg-primary` (matching dialogs) or stay subdued. If unsure, leave it for follow-up review.
- The contract has `bg-header` as a semantic alias for the top-bar strip — and Path B mapped it to `bg-primary` colors. Using `bg-primary` directly here gives the same result and makes the intent obvious; use `bg-header` if the team prefers slot-role naming.

Depends on: Phase 5 (pattern proven on isolated chrome).

### Phase 7 — TagColumn.vue full migration

File: `nce_events/public/js/panel_page_v2/components/TagColumn.vue` (lines 72–137 in `<style scoped>`).

What: rewrite chrome. Most of the eight rules collapse to template classes:

1. `.tf-col-header` (currently `#E3F0FC` bg, `#105EAD` text, `2px solid #A2CCF6` bottom border): template → `class="bg-primary-100 border-b-2 border-primary-300"`. Note: `border-b-2` is a vanilla Tailwind utility (border-bottom-width: 2px) — not in Path B. Use inline `:style="{ borderBottomWidth: '2px' }"` or keep the `border-bottom: 2px solid var(--nce-color-primary-300);` declaration in scoped CSS. (`bg-primary-100` auto-pairs the text color via Path B Group B — no need for explicit text class.)
2. `.tf-tile` (cursor + transition): keep as scoped CSS for cursor/transition; no chrome to migrate.
3. `.tf-tile:hover { background: #EAF3FD; }` → scoped CSS, change to `background: var(--nce-color-primary-100);` (hover variants out of Path B scope).
4. `.tf-tile-link { border-left: 3px solid #126BC4; }` → scoped CSS, change to `border-left: 3px solid var(--nce-color-primary);` (directional border, not in Path B).
5. `.tf-tile-active { background: #D4E8FC; border-color: #126BC4; }` → template on the active tile → `class="bg-primary-200 border-primary"` (auto-paired). Delete the scoped rule.
6. `.tf-tile-label { color: #333; }` → template `class="text-base"` (or just delete — body color cascades from `--nce-color-text`).
7. `.tf-tile-fieldname { color: #8D949A; }` → template `class="text-muted"`. Delete the rule.
8. `.tf-tile-badge { color: #8D949A; background: #f0f2f4; }` → template `class="text-muted bg-row-alt"`. Delete the rule.
9. `.tf-tile-table { border-left: 3px solid #e67e22; }` and `.tf-tile-pronoun { border-left: 3px solid #9b59b6; }` → **leave hardcoded** in scoped CSS with comment `/* categorical color — type indicator, not brand-themed */`. Optional: extract to `--type-table-hex` / `--type-pronoun-hex` in theme_defaults.css (Phase 11).

After this phase, TagColumn.vue's `<style scoped>` block should shrink from ~65 lines to ~15 (layout + state hover + categorical statics).

Key decisions: do not hijack `bg-warning` / `bg-accent` for the orange/purple type tiles. Categorical statics stay static.

Depends on: Phase 1.

### Phase 8 — TagDialog.vue full migration

File: `nce_events/public/js/panel_page_v2/components/TagDialog.vue` (lines 118–185 in `<style scoped>`, plus the toast at lines 55–72 — but the toast was already covered by Phase 5).

What:

1. **`.tf-tag-panel` shell:** template root → `class="bg-surface border rounded shadow-theme"`. Delete `background: #fff; border: 1px solid #b0b8c0; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.18);` from scoped CSS. Keep `position: fixed; width: 320px; z-index: 100050; font-family: …` — those are layout/identity, not chrome.
2. **`.tf-tag-header`:** template → `class="bg-primary"`. Delete `background: #126BC4; color: #fff;`. Keep `display: flex; padding; border-radius: 6px 6px 0 0; cursor: move; user-select: none;` — directional border-radius can't be replaced by `rounded` (which is uniform).
3. **`.tf-close`:** delete `color: #fff;` (cascades from the parent `bg-primary` via the auto-paired fg).
4. **`.tf-lbl`:** template → `class="text-xs text-muted"` (and `font-weight: 600; text-transform: uppercase;` stays in scoped CSS). Delete the `color: #8D949A; font-size: 10px;` lines.
5. **`.tf-input`:** template → `class="border-input-border rounded-sm"`. Delete `border: 1px solid #d1d8dd; border-radius: 4px;`. Add a `:focus { border-color: var(--nce-color-focus); }` scoped rule (focus variants out of Path B).
6. **`.tf-check-label`, `.tf-tag-body`, `.tf-actions`, `.tf-btn-group`:** mostly layout, leave as-is or migrate trivial cases.

After this phase, TagDialog.vue's `<style scoped>` block should shrink ~50%.

Key decisions: directional `border-radius: 6px 6px 0 0` on the header can't use `rounded`. Either keep scoped or use inline `:style`. Recommend scoped.

Depends on: Phase 5 (toast already handled there).

### Phase 9 — Table chrome in PanelTable.vue

File: `nce_events/public/js/panel_page_v2/components/PanelTable.vue` (style block ~lines 532–701; the unscoped teleport block at ~702–731 is out of scope, leave untouched).

What:

1. **`.col-header`** (header row cells, currently `background: var(--column-header-bg); color: var(--column-header-text);` via alias layer): template → `<th class="col-header bg-secondary-100">` (auto-paired text). Delete the `background:` and `color:` from scoped CSS.
2. **Alternating rows** (`tbody tr:nth-child(even) { background: var(--portal-alt-row); }`): template → can't add a class to every-other-row easily without a binding. Keep as scoped CSS but change to `background: var(--nce-color-row-alt);`. Alternative: bind `:class="{ 'bg-row-alt': index % 2 === 0 }"` on each row — cleaner but a v-for change. Recommend scoped for v1.
3. **Hover rows** (`tbody tr:hover { background: var(--row-hover-bg); }`): keep as scoped, change to `background: var(--nce-color-primary-100);`. Hover variants out of Path B.
4. **Selected rows** (`tbody tr.is-selected { background: var(--row-selected-bg); }`): keep as scoped (since `.is-selected` is bound conditionally and adding a separate `bg-primary-200` class would require a v-bind), change to `background: var(--nce-color-primary-200);`.

Key decisions:
- Do NOT touch the unscoped teleport block at ~702 (context menu) — the existing comment explains why it can't inherit tokens cleanly.
- The state-conditional row classes (hover, alt, selected) are good candidates for `:class="{}"` bindings + utility classes, but the refactor is larger. Defer to a follow-up if desired.

Depends on: Phase 1.

### Phase 10 — `schema_explorer.css` → `var(--nce-color-*)`

File: `nce_events/public/css/schema_explorer.css` (338 lines).

What: this is a stylesheet loaded site-wide via `nce_events/hooks.py::app_include_css`. **Stylesheets cannot use utility classes** (classes live in templates, not CSS files). The migration here stays at the CSS-variable layer: replace hardcoded hex chrome with `var(--nce-color-*, #fallback)` direct references, keeping the existing class names.

- `background: #FAFAFA` → `background: var(--nce-color-surface, #FAFAFA)`
- `background: #126BC4; color: #fff` → `background: var(--nce-color-primary, #126BC4); color: var(--nce-color-primary-fg, #ffffff)`
- `border: 1px solid #A2CCF6` → `border: 1px solid var(--nce-color-primary-300, #A2CCF6)`
- `border-top: 1px solid #105EAD` → `border-top: 1px solid var(--nce-color-primary-700, #105EAD)`

Add a leading comment listing every token consumed so future re-themes are obvious.

Key decisions: keep the hex as the fallback inside each `var()` so the file degrades gracefully if Themes is uninstalled.

Depends on: Phase 1 (deliberately unrelated to Vue phases; can run in parallel).

### Phase 11 — `hierarchy_explorer.css` → `var(--nce-color-*)`

File: `nce_events/public/css/hierarchy_explorer.css` (242 lines).

What: same treatment as Phase 10. Map `#FAFAFA`/`#D7D9DB`/`#F4F5F5`/`#126BC4`/`#73B3F2` chrome to `var(--nce-color-surface, ...)`, `var(--nce-color-border, ...)`, `var(--nce-color-row-alt, ...)`, `var(--nce-color-primary, ...)`, `var(--nce-color-primary-300, ...)`. Keep fallbacks.

**First step of this phase:** confirm `hierarchy_explorer.css` is actually loaded somewhere. It is NOT in `hooks.py::app_include_css`. Grep the repo. If it's loaded via a different mechanism (page-level include, jinja template), document where. If orphaned, delete the file instead of editing.

Depends on: Phase 10 (same pattern).

### Phase 12 — Aggressive prune of `theme_defaults.css`

File: `nce_events/public/css/theme_defaults.css` (107 lines today).

What: after Phases 1–9, most of the alias layer has zero consumers. Audit each alias (`--primary`, `--bg-card`, `--bg-header`, `--text-header`, `--text-color`, `--text-muted`, `--column-header-bg`, `--column-header-text`, `--portal-alt-row`, `--row-hover-bg`, `--row-selected-bg`, `--input-border`, `--input-focus-border`, `--btn-primary-bg`, `--btn-primary-text`, `--tab-active-border`, `--color-secondary`, `--portal-header-bg`, …):

1. Grep `var(--<alias-name>)` across all .vue and .css files under `nce_events/public/`.
2. **Zero consumers:** delete the alias declaration.
3. **Still consumed:** keep, add a `/* consumed by: <files> */` comment.
4. **Categorical statics** (`--male-hex`, `--female-hex`, optional `--type-table-hex`/`--type-pronoun-hex` if introduced in Phase 7): keep under a `/* Static categorical palette — NOT brand-themed */` heading.

Expected outcome: file shrinks from 107 lines to ~20-30 lines, containing mostly categorical statics. The brand-themed alias bridge is largely dead because templates now use contract classes directly.

Key decisions: the file is NOT deleted entirely. It remains the home for categorical statics. The `.ppv2-root, .ppv2-float, …` selector list (lines 19–32) can shrink too — only keep selectors that still have alias consumers.

Depends on: Phases 1–11.

## Design Decisions

- **The migration paradigm is "delete scoped CSS, add template class."** Not "swap var name." This is the paradigm shift Path B enables.
- **Chrome on template, layout in scoped CSS.** Backgrounds, colors, borders, border-radius (uniform), box-shadow, font-size, font-family, uniform padding/margin → template classes. Position, display, flex, grid, width, height, directional spacing, state variants, animations → scoped CSS.
- **`bg-{role}` auto-pairs foreground.** Do NOT add `text-{role}-fg` alongside `bg-{role}` — it's a no-op. Same for shade classes: `bg-primary-100` auto-pairs with the shade's fg companion.
- **State variants stay in scoped CSS using `var()` direct.** `:hover`, `:focus`, `:active` color changes use `var(--nce-color-*)` — the hover utility classes are not in Path B.
- **Directional spacing stays in scoped CSS using `var()` direct.** Only uniform `p-{size}` / `m-{size}` / `gap-{size}` are migratable. Directional `padding-left: var(--nce-spacing-base)` etc. stay scoped.
- **CSS files (Phases 10, 11) stay at the `var(--nce-color-*, #fallback)` layer.** Utility classes don't go in stylesheets.
- **Categorical statics are exempt.** Gender colors, type-indicator orange/purple — never coerce into role tokens.
- **Hex fallbacks inside `var()` calls are kept** in CSS files (Phases 10, 11) for graceful degradation. In Vue components, the contract class IS the source of truth — no hex literals, period.
- **State-conditional row classes** in PanelTable.vue (Phase 9) could move to `:class="{}"` bindings but the refactor is larger than the phase budget. Defer.
- **`theme_defaults.css` survives** as the home for categorical statics. It does NOT get deleted.

## Risks / Open Questions

- **Visual regressions from theme palette shift.** Some hardcoded hex literals (e.g. `#E3F0FC`, `#A2CCF6`, `#126BC4`) were calibrated for a specific brand palette. After migration, the same elements consume `--nce-color-primary-100`, `--nce-color-primary-300`, `--nce-color-primary` — which the user controls via NCE Theme. If the active theme's primary is far from #126BC4, those elements will look different. **Recommend:** during each phase, capture screenshots before/after and review. The new behavior is correct (theme-driven) but the visual change is real.
- **`bg-primary-100` text-color may surprise.** The auto-paired fg for a very light shade (100) is computed for max contrast — likely a dark color even if the user expected white. Document during Phase 7 (`.tf-col-header` migration) which text color the active theme produces.
- **`PanelHeaderToolbar.vue` ambiguity** (Phase 6). It may be the SPA's top app strip, not a dialog header. Confirm before applying `bg-primary`. If it's the top strip, the visual treatment may want to be intentionally subdued (e.g. `bg-bg-page` or `bg-surface` instead). Leave for review if uncertain.
- **`hierarchy_explorer.css` load path unconfirmed** (Phase 11). Step one of that phase is to confirm it's actually loaded. If orphaned, the phase becomes "delete the file."
- **Debug overlay (`PanelFormDialog.vue` 1051–1113)** — intentionally dark-themed, out of scope.
- **Teleported context menu (`PanelTable.vue` 702–731, unscoped)** — out of scope per existing comment.
- **`THEME_CLASS_CONTRACT.json` needs a docs update.** Pre-Path-B, the contract listed every class as `status: "shipping"` — true for the Themes SPA only, aspirational for downstream apps. Post-Path-B, the classes genuinely ship site-wide. The contract should add a `runtime: "nce_theme.css site-wide"` annotation to distinguish from any future `runtime: "tailwind build only"` classes (state variants, directional spacing, etc.). Suggest filing this as a follow-up in the Themes repo; not part of this plan.
- **State variants are absent.** Anywhere a hover/focus state was previously expressed as a Tailwind class somewhere (none in nce_events today), it now needs scoped CSS. Not a regression from the migration since there's nothing to migrate FROM — but worth flagging if any future component author reaches for `hover:bg-primary`.
- **Conservative vs aggressive scope.** This plan is aggressive: it deletes scoped CSS wherever a class applies. A conservative variant would leave scoped CSS untouched and just add classes for the new behavior. The aggressive path is recommended (it's the win the user articulated) but a conservative fallback exists if early phases reveal regression risk.
