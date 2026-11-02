# 10 — Panel style audit (CI)

Regression guard for Vue panel / V1 CSS sources. Not Desk chrome.

## Run locally

```bash
bash scripts/style-audit.sh
```

## Rules

1. **`var(--alias)`** — color aliases must exist in `theme_defaults.css` or use `--nce-*` from the published theme.
2. **Bare hex** — only as fallbacks inside `var(--nce-color-*, #hex)`; otherwise use `theme-exempt` on the line for documented exceptions (gender lanes, categorical Tag Finder tiles, dev debug overlay).
3. **Named colors** — no `color: red` / `background: white` as values.
4. **Brand `rgba()`** — no frozen `rgba(18,107,196…)`; use `color-mix(in srgb, var(--nce-color-primary) …)`.

## Fragile surfaces

On `<table>`, teleported menus, and other Desk-cascade targets, prefer **scoped CSS** with `var(--nce-color-*)` (see `PanelTable.vue` zebra rows) instead of `theme-bg-*` utilities.

## CI

`.github/workflows/style-audit.yml` runs on changes under `nce_events/public/**`.
