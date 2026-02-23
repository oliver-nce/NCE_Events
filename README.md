# NCE Events

A Frappe v15 app that provides a two-pane **Event Explorer** for browsing NCE soccer events and their registered players. Built on top of data synced by the [NCE Sync](https://github.com/oliver-nce/NCE_Sync) app.

## How It Works

The Event Explorer is a split-view page with two linked panes:

### Pane 1 — Events

Displays upcoming events (Training, Tryouts, Camp) with first session dates in the next 30 days. Each row shows:

- **First Session** date
- **Event Name**
- **# Females** / **# Males** / **Total** — per-event player counts, color-coded and bold

Gender counts are computed server-side by joining `Registrations` with `Family Members` and aggregating by gender.

### Pane 2 — Players

Click an event to load its registered players. Each row shows:

- **Name** (last, first) — color-coded by gender (purple = female, blue = male)
- **YOB**, **Rating**, **Position**, **Player Number**
- **Email** — pulled from the parent `Families` record via `Family Members.wp_parent_user_id`

Players are sorted by gender (females first), then last name.

### Roster Export

The Players pane supports CSV and JSON export:

- **CSV export** saves the roster to the server at a deterministic public URL:
  `https://manager.ncesoccer.com/files/rosters/{hash}/{sku}.csv`
- The CSV includes metadata rows: **A1** = first session date (mm/dd/yyyy), **B1** = event name, with the data table starting at **A3** using DocType field labels as headers.
- **Sheets Link** button copies a Google Sheets `IMPORTDATA` formula (with the event's SKU baked in) to the clipboard for one-click spreadsheet integration.

### Layout

- Chrome-style split-view with draggable dividers between panes
- Each pane scrolls independently
- Supports 2–4 panes (panes 3 and 4 are reserved for future use)
- Responsive: horizontal scroll on narrow screens, minimum 200px per pane
- Touch support for mobile/tablet drag resizing

## Architecture

```
nce_events/
├── api/hierarchy_explorer.py    # Server API: get_pane_data, export_pane_data
├── public/
│   ├── css/hierarchy_explorer.css   # All styles (theme tokens, table, dividers)
│   └── js/hierarchy_explorer/
│       ├── config.js    # Pane column definitions, style rules, buttons
│       ├── store.js     # Client-side state, pagination, data fetching
│       └── ui.js        # DOM rendering, drag resize, event binding
├── nce_events/
│   ├── page/hierarchy_explorer/     # Frappe Page definition
│   └── workspace/nce_events/        # Workspace with Event Explorer shortcut
└── hooks.py             # App metadata, apps screen entry with logo
```

### Data Flow

1. **Page load** → `config.js` defines pane columns and style rules
2. **Store** fetches data via `frappe.call` → `get_pane_data` API
3. **API** runs raw SQL joining `Events`, `Registrations`, `Family Members`, and `Families`
4. **UI** renders tables with inline styles for color-coding and bold formatting
5. **Row click** → store updates selection → loads child pane data
6. **Export** → `export_pane_data` generates CSV/JSON, saves roster to public path

## Technical Issues Resolved

### Frappe v15/v16 Workspace Compatibility

The workspace JSON uses the v15 `content` field format (JSON-encoded array of blocks) rather than v16's `links` array. The shortcut block references the page by its `link_to` name, ensuring the Event Explorer appears correctly in the workspace sidebar across Frappe v15 deployments.

### App Logo Visibility on Apps Screen

Frappe's apps screen requires both the `app_logo_url` in `hooks.py` and the `add_to_apps_screen` configuration with an explicit `logo` path pointing to `/assets/nce_events/images/logo.png`. Without the `add_to_apps_screen` entry, the app icon would not appear on the app selector. The logo file lives in `public/images/` which Frappe symlinks to the `assets` folder during `bench build`.

## Installation

Requires the [NCE Sync](https://github.com/oliver-nce/NCE_Sync) app (provides the underlying DocTypes and WordPress data sync).

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app https://github.com/oliver-nce/NCE_Events.git
bench --site your-site install-app nce_events
bench build
bench migrate
```

## Contributing

This app uses `pre-commit` for code formatting and linting:

```bash
cd apps/nce_events
pre-commit install
```

Tools: ruff, eslint, prettier, pyupgrade.

## License

MIT
