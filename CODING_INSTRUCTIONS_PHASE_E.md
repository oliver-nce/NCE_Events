# Phase E — Coding Instructions

You are implementing Phase E of the Panel Form Dialog feature. This phase is documentation and polish only.

**Prerequisite:** Phases A through D are complete.

---

## Task 1: Update `Docs/project_reference.md`

Add a new section to the existing `Docs/project_reference.md` file. Insert it after the existing content.

Add this content:

```markdown
## Form Dialog System

### DocTypes

| DocType | Type | Module | Purpose |
|---------|------|--------|---------|
| Form Dialog | Parent | NCE Events | Stores frozen DocType schema + dialog config |
| Form Dialog Button | Child table | NCE Events | Action buttons (placeholder, scripts not yet executed) |

### Form Dialog Fields

| Field | Type | Notes |
|-------|------|-------|
| title | Data | Required. Human name, autoname source. |
| target_doctype | Link → DocType | Must exist in WP Tables (frappe_doctype field). |
| frozen_meta_json | Code (JSON) | `{ "fields": [...] }` — frozen schema snapshot. |
| captured_at | Datetime | Set on capture/rebuild. Read-only. |
| dialog_size | Select | sm, md, lg, xl, 2xl, 3xl. Default xl. |
| is_active | Check | Default 1. Inactive dialogs hidden from pickers. |
| buttons | Table → Form Dialog Button | Placeholder action buttons. |

### Form Dialog Button Fields

| Field | Type | Notes |
|-------|------|-------|
| label | Data | Required. Button label. |
| button_script | Code (JS) | Copied script body. Not executed yet. |
| sort_order | Int | Display order (ascending). |
| source_note | Small Text | Optional human note about script origin. |

### Page Panel Integration

`Page Panel` has a Link field `form_dialog` → `Form Dialog`. Filtered by `target_doctype == root_doctype` and `is_active == 1`.

When `form_dialog` is set, `get_panel_config()` returns it. The Vue frontend opens `PanelFormDialog` on row click instead of navigating to a new tab.

### Server API: `nce_events/api/form_dialog_api.py`

| Method | Args | Returns | Purpose |
|--------|------|---------|---------|
| `capture_form_dialog_from_desk` | doctype, title | name | Create/update Form Dialog from live Desk schema |
| `rebuild_form_dialog` | name | {name, target_doctype, captured_at} | Re-capture schema, overwrite frozen JSON |
| `get_form_dialog_definition` | name | {name, title, target_doctype, dialog_size, frozen_meta, buttons} | Load definition for Vue renderer |
| `list_form_dialogs_for_doctype` | doctype | [{name, title, ...}] | List active dialogs for a DocType |

### Vue Components

| File | Purpose |
|------|---------|
| `panel_page_v2/utils/parseLayout.js` | Parse flat field list → Tabs → Sections → Columns → Fields |
| `panel_page_v2/utils/fieldTypeMap.js` | Map Frappe fieldtype → component config |
| `panel_page_v2/composables/usePanelFormDialog.js` | Load definition, manage form state, save, validate, fetch_from |
| `panel_page_v2/components/PanelFormDialog.vue` | Dialog wrapper with tabs, sections, columns, Cancel/Submit |
| `panel_page_v2/components/PanelFormField.vue` | Individual field renderer |

### Frozen JSON Contract

`get_form_dialog_definition(name)` returns:

```json
{
  "name": "Events — dialog",
  "title": "Events — dialog",
  "target_doctype": "Event",
  "dialog_size": "xl",
  "frozen_meta": {
    "fields": [
      { "fieldname": "subject", "fieldtype": "Data", "label": "Subject", "reqd": 1, ... },
      { "fieldname": "", "fieldtype": "Section Break", "label": "Details", ... },
      ...
    ]
  },
  "buttons": [
    { "label": "Validate", "sort_order": 1 }
  ]
}
```

The `frozen_meta.fields` array has the same shape as `frappe.get_meta(doctype).fields` — each object is a DocField dict.
```

---

## Task 2: Final theming check

Review `nce_events/public/css/theme_defaults.css` and confirm that `.ppv2-form-dialog` and `.ppv2-form-dialog-backdrop` are in the selector list. If they were already added in Phase C-D, no action needed.

---

## Verification

1. `Docs/project_reference.md` has the Form Dialog System section.
2. The documentation accurately reflects what was built in Phases A-D.
3. No code changes were made beyond documentation.
