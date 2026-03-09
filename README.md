# NCE Events

A Frappe v15 app that provides a multi-panel floating-window data explorer for NCE soccer operations. Built on top of data synced by the [NCE Sync](https://github.com/oliver-nce/NCE_Sync) app.

## How It Works

- **Panel Explorer** — Floating windows: select a row in Panel 1 (e.g. an event) and Panel 2 opens with related data (e.g. enrollments). Supports filtering, gender color-coding, CSV export, and bulk SMS/email.
- **Tag Finder** — Miller columns tool for generating Jinja2 tags with hop-aware syntax. Pronoun tags (He/She, his/her, etc.) appear when the root DocType has a `gender` field.
- **Legacy Event Explorer** — Two-pane split view (frozen; see `hierarchy_explorer/`).

## Architecture

See `Docs/project_reference.md` for the full file structure and API reference.

Key modules: `api/panel_api.py`, `api/messaging.py`, `public/js/panel_page/` (ui.js, store.js, send_dialog.js), `public/js/schema_explorer.js`.

## Installation

Requires the [NCE Sync](https://github.com/oliver-nce/NCE_Sync) app.

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app https://github.com/oliver-nce/NCE_Events.git
bench --site your-site install-app nce_events
bench build && bench migrate
```

## Contributing

Uses `pre-commit` for formatting and linting (ruff, eslint, prettier, pyupgrade):

```bash
cd apps/nce_events
pre-commit install
```

## License

MIT
