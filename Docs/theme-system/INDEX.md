# Theme System — Documentation Index

This folder explains HOW the theme system works. For the catalog of available classes, see `/THEME_CLASS_CONTRACT.json` or `/docs/theme-classes-reference.md` instead.

**Read this INDEX first. Then read ONLY the one file relevant to your question. Do NOT bulk-load this folder.**

## Topic Router

| Question | File |
|---|---|
| How does the editor change classes' values? Architecture overview. | `01-architecture.md` |
| How do multi-theme scoped palettes work? `data-nce-theme`? base vs Active? | `01-architecture.md` |
| What's the naming convention for tokens and classes? | `02-token-naming.md` |
| What is primary vs secondary vs accent vs success/info/warning/danger? | `03-color-roles.md` |
| How does the 11-stop shade scale work? Which stops have classes? | `04-shade-scale.md` |
| How does text contrast auto-pair with backgrounds? Mono vs tonal? Threshold? | `05-foreground-pairing.md` |
| How do I pick a shade at runtime / dynamic backgrounds? | `06-escape-hatch.md` |
| When do I use theme classes vs `:style` with `var()`? Examples for Vue. | `07-using-in-vue.md` |
| How do I add a new role / shade / utility to the system? | `08-extending.md` |
| Which classes for a button? Primary / outline / ghost / destructive? Decision tree + ready recipes. | `09-buttons.md` |
| How do I let a user pick a theme class (e.g. `theme-text-secondary-500`) for a form field? ThemeSwatchPicker widget. | `../theme-swatch-picker.md` |
| How does ThemeSwatchPicker paint swatches? `data-nce-theme` preview, output contract, Desk/Vue embed. | `../theme-swatch-picker.md` |

## ThemeSwatchPicker (shipped widget)

Reusable picker that writes a single `theme-{kind}-{role}-{shade}` class string to a bound form field (e.g. Page Panel `header_color`). Does **not** emit hex or custom colors — distinct from the hex `SwatchPicker.vue` in the theme editor.

| Concern | Location |
|---|---|
| Full spec (layout, API, embed targets, verification) | `../theme-swatch-picker.md` |
| DOM core | `frontend/src/widget/theme-swatch-picker-core.ts` |
| Vue wrapper | `frontend/src/components/ThemeSwatchPicker.vue` |
| Desk API | `frappe.ui.themeSwatchPicker.open({ frm, themeField, valueField })` |
| Standalone API | `window.themeSwatchPicker.open({ themeFieldEl, valueFieldEl })` |
| Build | `npm run build:widget` → `themes/public/dist/` (gitignored; run on deploy) |
| Desk assets | `hooks.py` — `app_include_js` + widget CSS |

**Assumption:** `nce_theme.css` is published on the site (`publish_theme()` on save of Active/base themes). Swatches paint via `theme-bg-*` classes inside a `data-nce-theme="{slug}"` wrapper — zero color math in the widget.

## Quick Answers (vague-question → file)

| Vague phrasing | File |
|---|---|
| "buttons look wrong" / "text unreadable" / "contrast" | `05-foreground-pairing.md` |
| "what classes for a button" / "primary vs secondary button" / "outline button" / "ghost button" | `09-buttons.md` |
| "color picker preview" / "user-selected color at runtime" | `06-escape-hatch.md` |
| "pick a theme class" / "header_color" / "swatch picker" / "theme-text-secondary-500" | `../theme-swatch-picker.md` |
| "what class should I use for X" | (use `THEME_CLASS_CONTRACT.json` instead) |
| "how do themes work in this app" | `01-architecture.md` |
| "I want to add a brand color" | `08-extending.md` |
| "how do I give a panel its own colour palette" / "data-nce-theme" | `01-architecture.md` |
| "what is base theme" / "what is Active vs Inactive" | `01-architecture.md` |

## Source of Truth

| Concern | File |
|---|---|
| Editor SPA Tailwind names | `frontend/tailwind.config.js` |
| CSS variable emission | `themes/utils/css_writer.py` |
| OKLCH shade math | `frontend/src/utils/color-shades.ts`, `themes/utils/theme_color_utils.py` |
| Live preview injection | `frontend/src/utils/theme-injector.ts` |
| ThemeSwatchPicker widget | `../theme-swatch-picker.md`, `frontend/src/widget/` |
| Class catalog | `THEME_CLASS_CONTRACT.json` (root) |
