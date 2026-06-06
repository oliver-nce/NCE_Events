# 01 — Architecture

## The pipeline

```
[1] Theme Editor (Vue SPA at /themes/theme-settings)
    User picks colours, typography, spacing.
    Saved on NCE Theme.theme_json (one record per theme).
            ↓
[2] api.py → save_theme() / save_as_base_theme()
    Persists theme_json.
    Triggers publish_theme() via NCETheme.on_update().
            ↓
[3] css_writer.py → publish_theme()
    Reads EVERY NCE Theme with status="Active" from the DB.
    Reads Site Theme Config.base_theme for the :root block.
    Calls generate_site_css(base_payload, active_themes):
        → :root { --nce-* }                           (base theme — site-wide fallback)
        → [data-nce-theme="ocean"] { --nce-* }        (each Active theme — panel-scoped)
        → .theme-bg-primary, .theme-text-muted, …     (utility class layer, once, from base)
    Writes themes/public/css/nce_theme.css
    Updates css_hash on Site Theme Config (cache-buster).
            ↓
[4] hooks.py → app_include_css = ["css/nce_theme.css?v=<hash>"]
    Loaded site-wide on every Frappe page (downstream contract).
            ↓
[5] Vue panel in a downstream app (e.g. NCE Events)
    <div data-nce-theme="ocean">           ← optional; omit to use :root (base) palette
      <button class="theme-bg-primary">…</button>
    </div>
```

## Two-layer output in nce_theme.css

```css
/* ── BASE (always present) ────────────────────────────── */
:root {
  --nce-color-primary: #3B82F6;
  --nce-color-primary-fg: #ffffff;
  /* … all tokens … */
}

/* ── UTILITY CLASSES (derived from base, once) ─────── */
.theme-bg-primary { background: var(--nce-color-primary); color: var(--nce-color-primary-fg); }
.theme-text-muted  { color: var(--nce-color-muted); }
/* … */

/* ── ACTIVE THEME SCOPED PALETTE (one block per Active theme) ── */
[data-nce-theme="ocean"] {
  --nce-color-primary: #0ea5e9;
  --nce-color-primary-fg: #ffffff;
  /* … only var overrides; no utility classes repeated … */
}

[data-nce-theme="events"] {
  --nce-color-primary: #f59e0b;
  /* … */
}
```

Utility classes (`.theme-bg-primary`, etc.) are **not repeated** per palette — they always
read from whichever `--nce-*` var is in scope. Wrapping a panel in
`data-nce-theme="ocean"` overrides the vars; the same utility classes produce the ocean colours.

## NCE Theme — the data model

| Field | Role |
|---|---|
| `name` | Primary key (set from `theme_name` at creation, never changes after) |
| `theme_name` | Human-readable display label (editable; updates `slug` automatically) |
| `slug` | URL-safe identifier used as the `data-nce-theme` attribute value |
| `status` | `Active` = published as a scoped palette block; `Inactive` = stored, not published |
| `theme_json` | Full token payload (JSON) |
| `is_default` | Legacy — prefer `base_theme` on Site Theme Config |

## Site Theme Config — Single doctype

| Field | Role |
|---|---|
| `base_theme` | Link to the NCE Theme that drives `:root` (site-wide fallback) |
| `css_hash` | SHA1 of last-published CSS, written to `nce_theme.css.hash` for cache-busting |

## Theme lifecycle

```
Create → status defaults to Active (scoped palette enabled)
Edit tokens → Save Changes → tokens persisted, CSS republished
Rename → editor Rename button; updates theme_name + slug only; name (PK) unchanged
Delete → editor Delete button; must be Inactive and not the base theme
Set as base → System tab in editor; becomes :root fallback for entire site
Inactive → still stored, dropped from next CSS publish
Active → included in next publish as [data-nce-theme="slug"] block
```

## Key properties

1. **Class names are stable.** `theme-bg-primary` always means "user's primary." No rebuild needed after re-theming.
2. **Values are live.** CSS vars cascade; swapping `:root` or adding a `data-nce-theme` wrapper is enough.
3. **One publish rewrites everything.** `publish_theme()` always rebuilds from the full DB state — base `:root` + all Active scoped blocks.
4. **Panels opt-in to a palette.** A panel without `data-nce-theme` uses the base palette. Adding the attribute switches it to any Active theme.
5. **Inactive themes don't affect the site.** Setting a theme Inactive removes its block from the next publish.

## Live preview path (editor, before saving)

```
ThemeSettingsPage.vue → computeCSSVariables()
    → root.style.setProperty('--nce-color-primary', '#NEW')   (live, no publish)
    → pushToPreview() → postMessage to /themes/preview window  (preview pane)
```

Inline styles on `:root` override the published CSS during editing. On Revert / theme switch they are cleared.

## Files in the pipeline

| Step | File |
|---|---|
| Editor UI | `frontend/src/pages/ThemeSettingsPage.vue` |
| Color picker | `frontend/src/components/BrandColorPicker.vue` |
| Shade math (TS) | `frontend/src/utils/color-shades.ts` |
| Shade math (Py) | `themes/utils/theme_color_utils.py` |
| CSS emitter | `themes/utils/css_writer.py` → `generate_site_css()`, `publish_theme()` |
| Site base helper | `themes/utils/site_theme_config_helpers.py` |
| Editor SPA Tailwind | `frontend/tailwind.config.js` (SPA internal only — not the downstream contract) |
| Site CSS load | `themes/hooks.py` (`app_include_css`) |
| Login gate | `themes/www/themes.py` (redirects Guest → `/login`) |
| Persistent storage | `themes/themes/doctype/nce_theme/` |
| Site config | `themes/themes/doctype/site_theme_config/` |
| Backend API | `themes/api.py` |
