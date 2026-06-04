# Theme System — Documentation Index

This folder explains HOW the theme system works. For the catalog of available classes, see `/THEME_CLASS_CONTRACT.json` or `/docs/theme-classes-reference.md` instead.

**Read this INDEX first. Then read ONLY the one file relevant to your question. Do NOT bulk-load this folder.**

## Topic Router

| Question | File |
|---|---|
| How does the editor change classes' values? Architecture overview. | `01-architecture.md` |
| What's the naming convention for tokens and classes? | `02-token-naming.md` |
| What is primary vs secondary vs accent vs success/info/warning/danger? | `03-color-roles.md` |
| How does the 11-stop shade scale work? Which stops have classes? | `04-shade-scale.md` |
| How does text contrast auto-pair with backgrounds? Mono vs tonal? Threshold? | `05-foreground-pairing.md` |
| How do I pick a shade at runtime / dynamic backgrounds? | `06-escape-hatch.md` |
| When do I use theme classes vs `:style` with `var()`? Examples for Vue. | `07-using-in-vue.md` |
| How do I add a new role / shade / utility to the system? | `08-extending.md` |
| Which classes for a button? Primary / outline / ghost / destructive? Decision tree + ready recipes. | `09-buttons.md` |
| CI / local guard for panel Vue styles? Fragile table surfaces? | `10-panel-style-audit.md` |

## Quick Answers (vague-question → file)

| Vague phrasing | File |
|---|---|
| "buttons look wrong" / "text unreadable" / "contrast" | `05-foreground-pairing.md` |
| "what classes for a button" / "primary vs secondary button" / "outline button" / "ghost button" | `09-buttons.md` |
| "color picker preview" / "user-selected color at runtime" | `06-escape-hatch.md` |
| "what class should I use for X" | (use `THEME_CLASS_CONTRACT.json` instead) |
| "how do themes work in this app" | `01-architecture.md` |
| "I want to add a brand color" | `08-extending.md` |

## Source of Truth

| Concern | File |
|---|---|
| Editor SPA Tailwind names | `frontend/tailwind.config.js` |
| CSS variable emission | `themes/utils/css_writer.py` |
| OKLCH shade math | `frontend/src/utils/color-shades.ts`, `themes/utils/theme_color_utils.py` |
| Live preview injection | `frontend/src/utils/theme-injector.ts` |
| Class catalog | `THEME_CLASS_CONTRACT.json` (root) |
