# Handoff — CSS Theme Refactor

## Status
The MCP bug (workflow gate stuck at COMPLETED) has been fixed and rebuilt. This new chat should have a working delegation cycle.

## Task: Refactor `panel_page.css` to use NCE theme tokens

**Git HEAD:** `87fb57f` — *Revert "refactor: replace all hardcoded CSS..."* — code is back to pre-refactor state with all hardcoded values.

### Required Reading
- `NCE_Events/nce_events/public/css/theme_defaults.css` — semantic alias layer (keep all existing aliases, keep all fallbacks)
- `NCE_Events/nce_events/public/css/panel_page.css` — 124 hardcoded hex colors, 30+ hardcoded px font sizes, 6 hardcoded font-family Arial, 15 hardcoded border-radius, 7 hardcoded box-shadows — ALL must be replaced with theme tokens

### What to delegate to the executor

**Step 1: theme_defaults.css** — Add two new aliases after `--text-header: #ffffff;`. Do NOT remove or change anything else:
```css
	/* ── Row states ───────────────────────────────────────────────────────── */
	--row-hover-bg: var(--nce-color-primary-100, #e3f0fc);
	--row-selected-bg: var(--nce-color-primary-200, #c7e0fa);
```

**Step 2: panel_page.css** — Replace all hardcoded values using these mappings:

**Colors (use semantic alias where purpose matches, otherwise var(--nce-color-*) with fallback):**
- `#126bc4` as header bg → `var(--bg-header)` / as accent → `var(--primary)`
- `#105ead` → `var(--nce-color-primary-700, #105ead)`
- `#4198f0` → `var(--nce-color-primary-400, #4198f0)`
- `#a2ccf6` → `var(--nce-color-primary-300, #a2ccf6)`
- `#c7e0fa` selected row → `var(--row-selected-bg)` / as border → `var(--nce-color-primary-200, #c7e0fa)`
- `#e3f0fc` row hover → `var(--row-hover-bg)` / other → `var(--nce-color-primary-100, #e3f0fc)`
- `#f1f7fe` / `#eaf2fb` → `var(--nce-color-primary-50, #f1f7fe)`
- `#fafafa` / `#f7f7f7` / `#f0f4f7` / `#fafbfc` / `#f0f4f8` / `#f0f0f0` → `var(--bg-surface)`
- `#fff` as background → `var(--bg-card)` / as text on header → `var(--text-header)`
- `#333` / `#464d53` / `#36414c` / `#1f2933` / `#1b2a3d` → `var(--text-color)`
- `#6d757e` / `#6c7680` / `#888` / `#999` / `#b0b0b0` → `var(--text-muted)`
- `#d1d8dd` / `#e0e5ea` / `#eee` / `#d8d8d8` → `var(--border-color)`
- `#1680e9` → `var(--primary)`
- `#d00` → `var(--nce-color-danger, #dd0000)`
- `#8d99a6` → `var(--nce-color-primary-400, #8d99a6)`
- `#d4e8fa` → `var(--nce-color-primary-200, #d4e8fa)`

**Font-family:** `Arial, sans-serif` → `var(--font-family)`. Leave `monospace`.

**Font-size (base=13px=var(--font-size-base)):**
- 9px→`calc(var(--font-size-base) * 0.692)`, 10px→`calc(…* 0.769)`, 11px→`var(--font-size-sm)`, 12px→`calc(…* 0.923)`, 13px→`var(--font-size-base)`, 14px→`calc(…* 1.077)`, 15px→`calc(…* 1.154)`
- Leave icon sizes hardcoded (20px, 18px, 16px, 14px on close/remove buttons)

**Border-radius:** 3px/4px → `var(--border-radius-sm)`. 6px/8px → `var(--border-radius)`. Leave `0 0 7px 0`.

**Box-shadow:** Decorative → `var(--shadow)`. Leave focus ring `0 0 0 2px rgba(65,152,240,0.2)`.

**Leave alone:** rgba() values, !important flags, layout properties, selectors, @font-face blocks.

### Verification commands after edit
1. `grep -n '#[0-9a-fA-F]\{3,8\}' nce_events/public/css/panel_page.css` — only @font-face lines
2. `grep -n 'font-family:.*Arial' nce_events/public/css/panel_page.css` — zero results
3. `grep -n 'font-size:.*px' nce_events/public/css/panel_page.css | grep -v 'var\|calc'` — only icon sizes
4. `grep -n 'border-radius:.*px' nce_events/public/css/panel_page.css | grep -v 'var\|calc'` — only resize handle

### Commit (local only, do NOT push)
```
refactor: replace all hardcoded CSS in panel_page.css with NCE theme tokens
```

### Context
- A previous attempt (commit `edd4d93`) was reverted because it stripped all fallbacks from theme_defaults.css and removed useful semantic aliases. This attempt must keep the alias layer and fallbacks intact.
- The user's theme usage reference doc defines the rules: zero hardcoded colors/fonts/radii/shadows, use semantic aliases where they exist, use var(--nce-*) directly otherwise.