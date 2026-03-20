# Composer Prompt — Phase 1a: Infrastructure

**Paste this entire prompt into a new Composer session.**

---

## CONTEXT

Read these files FIRST before making any changes:
- `Docs/form_builder_design.md` — the full architecture
- `Docs/project_reference.md` — codebase conventions
- `AGENTS.md` — where to add new code

You are building a card/form builder system for an existing Frappe v15 app.
This prompt covers infrastructure: CSS theming, DocType creation, and hooks.
Vue components come in a separate prompt.

## CONVENTIONS

- Python: `from __future__ import annotations`, type hints
- All new DocTypes go in `nce_events/nce_events/doctype/<name>/`
- Module name for all DocTypes: `NCE Events`
- Do NOT run `bench` commands — just create/edit files

---

## TASK 1: Create `theme_defaults.css`

**Create file:** `nce_events/public/css/theme_defaults.css`

Write this exact content:

```css
:root {
  --primary: #126BC4;
  --primary-light: #e8f0fe;
  --bg-surface: #fafafa;
  --bg-card: #ffffff;
  --bg-header: #126BC4;
  --text-color: #333333;
  --text-muted: #888888;
  --text-header: #ffffff;
  --border-color: #b0b8c0;
  --shadow: 0 4px 16px rgba(0,0,0,0.15);
  --male-hex: #dce6f0;
  --female-hex: #f0dce6;
  --font-family: 'Instrument Sans', -apple-system, sans-serif;
  --font-size-base: 13px;
  --font-size-sm: 11px;
  --font-size-lg: 16px;
  --font-weight-bold: 600;
  --border-radius: 6px;
  --border-radius-sm: 4px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --input-border: #ccc;
  --input-focus-border: var(--primary);
  --btn-primary-bg: var(--primary);
  --btn-primary-text: #ffffff;
  --tab-active-border: var(--primary);
  --portal-header-bg: #e8ecf0;
  --portal-alt-row: #f5f7f9;
}
```

---

## TASK 2: Add theme CSS to hooks.py

**Modify:** `nce_events/hooks.py`

The current `app_include_css` line is:
```python
app_include_css = "/assets/nce_events/css/schema_explorer.css"
```

Change it to a list that includes both files:
```python
app_include_css = [
    "/assets/nce_events/css/schema_explorer.css",
    "/assets/nce_events/css/theme_defaults.css",
]
```

Do NOT change anything else in hooks.py.

---

## TASK 3: Refactor PanelFloat.vue to use CSS variables

**Modify:** `nce_events/public/js/panel_page_v2/components/PanelFloat.vue`

In the `<style scoped>` section only, make these exact replacements:

| Find | Replace with |
|------|-------------|
| `background: #fafafa;` | `background: var(--bg-surface);` |
| `border: 1px solid #b0b8c0;` | `border: 1px solid var(--border-color);` |
| `border-radius: 6px;` | `border-radius: var(--border-radius);` |
| `box-shadow: 0 4px 16px rgba(0,0,0,0.15);` | `box-shadow: var(--shadow);` |
| `background: #e8ecf0;` | `background: var(--portal-header-bg);` |
| `font-size: 11px;` | `font-size: var(--font-size-sm);` |
| `color: #555;` | `color: var(--text-muted);` |
| In `.ppv2-resize-handle`, replace `#b0b8c0` | `var(--border-color)` |
| `border-radius: 0 0 6px 0;` | `border-radius: 0 0 var(--border-radius) 0;` |

Do NOT change the `<template>` or `<script>` sections.

---

## TASK 4: Refactor TagFinder.vue to use CSS variables

**Modify:** `nce_events/public/js/panel_page_v2/components/TagFinder.vue`

In the `<style scoped>` section only:

| Find | Replace with |
|------|-------------|
| `background: #fafafa;` | `background: var(--bg-surface);` |
| `border: 1px solid #b0b8c0;` | `border: 1px solid var(--border-color);` |
| `border-radius: 6px;` | `border-radius: var(--border-radius);` |
| `box-shadow: 0 4px 16px rgba(0,0,0,0.15);` | `box-shadow: var(--shadow);` |
| `background: #126BC4;` | `background: var(--bg-header);` |
| `color: #fff;` (in .tf-header) | `color: var(--text-header);` |
| `font-size: 13px;` | `font-size: var(--font-size-base);` |
| `background: #e8ecf0;` | `background: var(--portal-header-bg);` |
| `font-size: 11px;` | `font-size: var(--font-size-sm);` |
| `color: #555;` | `color: var(--text-muted);` |
| `border-radius: 6px 6px 0 0;` | `border-radius: var(--border-radius) var(--border-radius) 0 0;` |
| `border-radius: 0 0 6px 6px;` | `border-radius: 0 0 var(--border-radius) var(--border-radius);` |

Do NOT change the `<template>` or `<script>` sections.
The `.tf-close` button color `#fff` should become `var(--text-header)`.

---

## TASK 5: Add `theme_json` field to Display Settings

**Modify:** `nce_events/nce_events/doctype/display_settings/display_settings.json`

Add `"theme_json"` to the `field_order` array, right before `"section_preview"`.

Add this object to the `fields` array, right before the `section_preview` Section Break:

```json
{
  "fieldname": "section_theme",
  "fieldtype": "Section Break",
  "label": "Theme JSON"
},
{
  "fieldname": "theme_json",
  "fieldtype": "Code",
  "label": "Theme Variables (JSON)",
  "options": "JSON",
  "description": "JSON object of CSS custom properties. Keys must start with --. Example: {\"--primary\": \"#126BC4\"}"
}
```

Also add `"section_theme"` and `"theme_json"` to the `field_order` array
in the correct position (before `"section_preview"`).

---

## TASK 6: Modify main.js to apply theme on mount

**Modify:** `nce_events/public/js/panel_page_v2/main.js`

Replace the entire file with:

```js
import { createApp } from "vue";
import App from "./App.vue";

async function applyTheme() {
	try {
		const doc = await new Promise((resolve) => {
			frappe.call({
				method: "frappe.client.get",
				args: { doctype: "Display Settings", name: "Display Settings" },
				callback: (r) => resolve(r.message || {}),
				error: () => resolve({}),
			});
		});
		if (!doc.theme_json) return;
		const vars = JSON.parse(doc.theme_json);
		for (const [key, value] of Object.entries(vars)) {
			if (key.startsWith("--")) {
				document.documentElement.style.setProperty(key, value);
			}
		}
	} catch (e) {
		console.warn("applyTheme failed:", e);
	}
}

const app = createApp(App);

window.NCEPanelPageV2 = {
	async mount(selector) {
		await applyTheme();
		return app.mount(selector);
	},
};
```

---

## TASK 7: Create all 13 Card DocTypes

Create the parent DocType and 12 child table DocTypes. For each DocType,
create a directory with these files:
- `__init__.py` (empty)
- `<name>.py` (minimal Document subclass)
- `<name>.json` (DocType definition)

### 7a: Child DocType `Card Tab`

**Directory:** `nce_events/nce_events/doctype/card_tab/`

**`card_tab.py`:**
```python
from __future__ import annotations
from frappe.model.document import Document

class CardTab(Document):
    pass
```

**`card_tab.json`:** Create a DocType JSON with:
- `name`: "Card Tab"
- `module`: "NCE Events"
- `istable`: 1
- `editable_grid`: 1
- Fields:
  - `label` — Data, required, in_list_view: 1
  - `sort_order` — Int, default: 0, in_list_view: 1
  - `hide_bar` — Check, description: "If only one tab, hide the tab bar"

### 7b: Child DocType `Card Field`

**Directory:** `nce_events/nce_events/doctype/card_field/`

**`card_field.json`:** istable: 1, editable_grid: 1. Fields:
- `tab` — Data, in_list_view: 1, description: "Tab label this field belongs to"
- `path` — Data, required, in_list_view: 1, description: "Field path, e.g. event_name or venue.venue_name"
- `editable` — Check, default: 1
- `x` — Int, default: 0, in_list_view: 1
- `y` — Int, default: 0, in_list_view: 1
- `w` — Int, default: 3, in_list_view: 1, description: "Column span"
- `h` — Int, default: 1, in_list_view: 1, description: "Row span"

### 7c: Child DocType `Card Display`

**Directory:** `nce_events/nce_events/doctype/card_display/`

**`card_display.json`:** istable: 1, editable_grid: 1. Fields:
- `tab` — Data
- `path` — Data, required, in_list_view: 1
- `label` — Data, description: "Override label (default: from path)"
- `x` — Int, default: 0, in_list_view: 1
- `y` — Int, default: 0, in_list_view: 1
- `w` — Int, default: 3
- `h` — Int, default: 1

### 7d: Child DocType `Card Portal`

**Directory:** `nce_events/nce_events/doctype/card_portal/`

**`card_portal.json`:** istable: 1, editable_grid: 1. Fields:
- `tab` — Data
- `portal_name` — Data, required, in_list_view: 1, description: "Identifier for portal columns to reference"
- `child_doctype` — Link, options: DocType, required, in_list_view: 1
- `link_field` — Data, required, in_list_view: 1, description: "Field on child DocType linking back to root"
- `editable` — Check
- `allow_insert` — Check
- `allow_delete` — Check
- `x` — Int, default: 0
- `y` — Int, default: 0
- `w` — Int, default: 12
- `h` — Int, default: 6

### 7e: Child DocType `Card Portal Column`

**Directory:** `nce_events/nce_events/doctype/card_portal_column/`

**`card_portal_column.json`:** istable: 1, editable_grid: 1. Fields:
- `portal_name` — Data, required, in_list_view: 1, description: "Must match portal_name on a Card Portal row"
- `fieldname` — Data, required, in_list_view: 1
- `column_type` — Select, options: "data\ndata+link\naction", default: "data", in_list_view: 1
- `label` — Data, description: "Column header override"
- `action_label` — Data, description: "Button text (if column_type=action)"
- `action_script` — Data, description: "Script name from Card Script"
- `sort_order` — Int, default: 0

### 7f: Child DocType `Card Text Block`

**Directory:** `nce_events/nce_events/doctype/card_text_block/`

**`card_text_block.json`:** istable: 1, editable_grid: 1. Fields:
- `tab` — Data
- `template` — Small Text, required, in_list_view: 1
- `x` — Int, default: 0
- `y` — Int, default: 0
- `w` — Int, default: 6
- `h` — Int, default: 2

### 7g: Child DocType `Card Pivot Table`

**Directory:** `nce_events/nce_events/doctype/card_pivot_table/`

**`card_pivot_table.json`:** istable: 1, editable_grid: 1. Fields:
- `tab` — Data
- `child_doctype` — Link, options: DocType, required, in_list_view: 1
- `link_field` — Data, required
- `pivot_rows` — Data, description: "Comma-separated row group-by fields"
- `pivot_cols` — Data, description: "Comma-separated column fields"
- `pivot_vals` — Data, description: "Comma-separated value fields"
- `aggregator` — Select, options: "Count\nSum\nAverage\nMin\nMax", default: "Count"
- `x` — Int, default: 0
- `y` — Int, default: 0
- `w` — Int, default: 8
- `h` — Int, default: 5

### 7h: Child DocType `Card Graphic`

**Directory:** `nce_events/nce_events/doctype/card_graphic/`

**`card_graphic.json`:** istable: 1, editable_grid: 1. Fields:
- `tab` — Data
- `source` — Select, options: "static\nfield", default: "static", in_list_view: 1
- `src` — Data, description: "Static URL or Jinja-tokenised URL"
- `fieldname` — Data, description: "Attach Image field name (if source=field)"
- `alt_text` — Data
- `object_fit` — Select, options: "contain\ncover\nfill", default: "contain"
- `x` — Int, default: 0
- `y` — Int, default: 0
- `w` — Int, default: 3
- `h` — Int, default: 3

### 7i: Child DocType `Card Video`

**Directory:** `nce_events/nce_events/doctype/card_video/`

**`card_video.json`:** istable: 1, editable_grid: 1. Fields:
- `tab` — Data
- `source` — Select, options: "static\nfield", default: "static", in_list_view: 1
- `url` — Data, description: "YouTube/Vimeo URL"
- `fieldname` — Data, description: "Field containing video URL (if source=field)"
- `x` — Int, default: 0
- `y` — Int, default: 0
- `w` — Int, default: 6
- `h` — Int, default: 4

### 7j: Child DocType `Card Web Viewer`

**Directory:** `nce_events/nce_events/doctype/card_web_viewer/`

**`card_web_viewer.json`:** istable: 1, editable_grid: 1. Fields:
- `tab` — Data
- `url_template` — Data, required, in_list_view: 1, description: "URL with {{ field }} tokens"
- `x` — Int, default: 0
- `y` — Int, default: 0
- `w` — Int, default: 4
- `h` — Int, default: 5

### 7k: Child DocType `Card Action`

**Directory:** `nce_events/nce_events/doctype/card_action/`

**`card_action.json`:** istable: 1, editable_grid: 1. Fields:
- `label` — Data, required, in_list_view: 1
- `action_script` — Data, required, in_list_view: 1, description: "Must match script_name on a Card Script row"
- `sort_order` — Int, default: 0

### 7l: Child DocType `Card Script`

**Directory:** `nce_events/nce_events/doctype/card_script/`

**`card_script.json`:** istable: 1, editable_grid: 1. Fields:
- `script_name` — Data, required, in_list_view: 1, description: "Unique identifier referenced by actions"
- `script_type` — Select, options: "server\nclient\nopen_url\nopen_card\nfrappe_action", required, in_list_view: 1
- `method` — Data, in_list_view: 1, description: "Python method path, JS function name, URL, card def name, or Frappe action"
- `description` — Small Text

### 7m: Parent DocType `Card Definition`

**Directory:** `nce_events/nce_events/doctype/card_definition/`

**`card_definition.json`:** This is the parent DocType. NOT a child table
(`istable` must be 0 or absent). Set:
- `name`: "Card Definition"
- `module`: "NCE Events"
- `autoname`: "format:CARD-{####}"
- `sort_field`: "title"
- `sort_order`: "ASC"

Fields (in this exact order in `field_order`):

1. `title` — Data, required, in_list_view: 1
2. `root_doctype` — Link, options: DocType, required, in_list_view: 1
3. `is_default` — Check, description: "Default card for this DocType"
4. `grid_columns` — Int, default: 12
5. `grid_rows` — Int, default: 10
6. `grid_cell_size` — Int, default: 50, description: "Pixel size of one grid square (width = height)"
7. `offset_x` — Int, default: 80, description: "Horizontal offset from parent when opening"
8. `offset_y` — Int, default: 60, description: "Vertical offset from parent when opening"
9. Section Break: `section_tabs` — label: "Tabs"
10. `tabs` — Table, options: Card Tab
11. Section Break: `section_fields` — label: "Fields"
12. `fields_list` — Table, options: Card Field
13. Section Break: `section_displays` — label: "Displays"
14. `displays` — Table, options: Card Display
15. Section Break: `section_portals` — label: "Portals"
16. `portals` — Table, options: Card Portal
17. `portal_columns` — Table, options: Card Portal Column
18. Section Break: `section_text_blocks` — label: "Text Blocks"
19. `text_blocks` — Table, options: Card Text Block
20. Section Break: `section_pivot_tables` — label: "Pivot Tables"
21. `pivot_tables` — Table, options: Card Pivot Table
22. Section Break: `section_media` — label: "Media"
23. `graphics` — Table, options: Card Graphic
24. `videos` — Table, options: Card Video
25. `web_viewers` — Table, options: Card Web Viewer
26. Section Break: `section_actions` — label: "Actions & Scripts"
27. `scripts` — Table, options: Card Script
28. `actions` — Table, options: Card Action
29. Section Break: `section_styles` — label: "Style Overrides"
30. `styles_json` — Code, options: JSON, description: "Per-card CSS variable overrides"

**`card_definition.py`:**
```python
from __future__ import annotations
import frappe
from frappe.model.document import Document

class CardDefinition(Document):
    def after_insert(self):
        if not self.tabs:
            self.append("tabs", {"label": "Home", "sort_order": 0, "hide_bar": 1})
            self.save()
```

---

## TASK 8: Refactor PanelTable.vue to use CSS variables

**Modify:** `nce_events/public/js/panel_page_v2/components/PanelTable.vue`

In the `<style scoped>` section, search for ALL hardcoded hex color values
(like `#126BC4`, `#fafafa`, `#b0b8c0`, `#555`, `#e8ecf0`, `#333`, etc.)
and replace them with the matching CSS variable from theme_defaults.css.

General mapping:
- Blue header backgrounds (`#126BC4`) → `var(--bg-header)`
- White text on headers → `var(--text-header)`
- Light backgrounds (`#fafafa`, `#f5f7f9`) → `var(--bg-surface)` or `var(--portal-alt-row)`
- Gray borders (`#b0b8c0`) → `var(--border-color)`
- Dark text (`#333`) → `var(--text-color)`
- Muted text (`#555`, `#888`) → `var(--text-muted)`
- Footer/header bar (`#e8ecf0`) → `var(--portal-header-bg)`
- Font sizes (`11px`) → `var(--font-size-sm)`, (`13px`) → `var(--font-size-base)`
- Border radius (`6px`) → `var(--border-radius)`
- Box shadow → `var(--shadow)`

Do NOT change the `<template>` or `<script>` sections.

---

## IMPORTANT NOTES

- For every new DocType JSON file: use `"creation"` and `"modified"` timestamps
  of `"2026-03-13 00:00:00.000000"`. Set `"owner"` to `"Administrator"`.
  Set `"engine"` to `"InnoDB"`.
- Every child DocType must have `"istable": 1`.
- The parent DocType must NOT have `"istable": 1`.
- Every `.py` file must start with `from __future__ import annotations`.
- Every `__init__.py` file is empty.
- Do NOT run bench commands. Do NOT modify any files not listed above.
- After all tasks, list the files you created/modified.
