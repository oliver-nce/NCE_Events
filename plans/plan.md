# Plan: Related-Tables Checkbox Picker on Form Dialog Capture/Rebuild

## Goal
When a user creates or rebuilds a Form Dialog (from the Page Panel Dialogs tab), present a checkbox dialog listing all one-to-many linked DocTypes discovered via `get_child_doctypes()`. The user picks which related tables they want as tabs in the Form Dialog. On rebuild, the previous selection is pre-populated.

This plan covers **only the picker UI and persistence** — the actual rendering of related-table tabs inside PanelFormDialog is a separate, later task.

---

## Current State

### How capture/rebuild works today
1. **Page Panel → Dialogs tab** (`page_panel.js` ~line 1152): User clicks "Create & capture from Desk" → `frappe.prompt` asks for a title → calls `capture_form_dialog_from_desk(doctype, title)`.
2. **Rebuild** (`page_panel.js` ~line 1187): User clicks rebuild → `frappe.confirm` → calls `rebuild_form_dialog(name)`.
3. **Backend** (`form_dialog_api.py`): Both endpoints freeze `frappe.get_meta(doctype).fields` into `frozen_meta_json` on the Form Dialog doc.
4. **Form Dialog DocType** (`form_dialog.json`): Has no field for storing selected related tables.

### How related DocTypes are discovered
- `panel_api.py → get_child_doctypes(root_doctype)`: Scans WP Tables for DocTypes with a Link field pointing at `root_doctype`. Returns `[{ doctype, link_field, label }]`.

---

## Changes Required

### A. Schema — Form Dialog DocType

Add a new field `related_doctypes` (JSON or Code/JSON) to `form_dialog.json`:

```
{
  "fieldname": "related_doctypes",
  "fieldtype": "Code",
  "label": "Related DocTypes",
  "options": "JSON",
  "description": "JSON array of selected related DocTypes, e.g. [{\"doctype\":\"Enrollment\",\"link_field\":\"contact\",\"label\":\"Enrollments\"}]"
}
```

Add it to `field_order` after `writeback_on_submit`, before `buttons`.

**Migration note**: Existing Form Dialog docs will have this field empty/null, which is fine — it means "no related tabs selected".

### B. Backend — `form_dialog_api.py`

#### B1. `capture_form_dialog_from_desk(doctype, title, related_doctypes=None)`

- Accept an optional `related_doctypes` arg (JSON string or list).
- If provided, store it on the doc as `doc.related_doctypes = json.dumps(related_doctypes)`.
- On update of an existing doc, overwrite `related_doctypes` if the arg is provided.

#### B2. `rebuild_form_dialog(name, related_doctypes=None)`

- Same: accept optional `related_doctypes`, store if provided.
- If `related_doctypes` is not passed (None), preserve the existing value on the doc (don't wipe it).

#### B3. `get_form_dialog_definition(name)` — return `related_doctypes`

- Parse and include `related_doctypes` in the returned dict so the Vue frontend can later use it to render tabs.

### C. Frontend — `page_panel.js` (Dialogs tab)

#### C1. Create flow (after the title prompt, before the API call)

Insert a second step between the title prompt and the `capture_form_dialog_from_desk` call:

1. Call `get_child_doctypes(root_doctype)` to get the available related DocTypes.
2. If the list is empty, skip straight to the capture call (no picker needed).
3. If non-empty, show a `frappe.msgprint` or custom dialog with:
   - Heading: **"Add tabs to display related tables?"**
   - A checkbox for each child DocType, using `label` as the display text.
   - OK / Skip buttons.
4. Collect the checked items as `related_doctypes` array.
5. Pass `related_doctypes` to `capture_form_dialog_from_desk`.

#### C2. Rebuild flow (after the confirm, before the API call)

1. Load the current Form Dialog's `related_doctypes` from the server (already available via `get_form_dialog_definition` or a lightweight read).
2. Call `get_child_doctypes(root_doctype)` to get the full available list.
3. Show the same checkbox dialog, **pre-checking** any DocTypes that were previously selected.
4. Pass the updated selection to `rebuild_form_dialog`.

#### C3. Checkbox dialog helper

Create a reusable function, e.g.:

```js
function _show_related_picker(available, preselected, callback) {
    // available: [{ doctype, link_field, label }]
    // preselected: [{ doctype, ... }] or []
    // callback(selected): called with array of selected items

    const preselected_set = new Set((preselected || []).map(r => r.doctype));
    const fields = available.map(c => ({
        label: c.label,
        fieldname: "sel_" + c.doctype.replace(/ /g, "_"),
        fieldtype: "Check",
        default: preselected_set.has(c.doctype) ? 1 : 0,
    }));

    const d = new frappe.ui.Dialog({
        title: "Add tabs to display related tables?",
        fields: fields,
        primary_action_label: "OK",
        secondary_action_label: "Skip",
        primary_action(values) {
            const selected = available.filter(c => {
                const key = "sel_" + c.doctype.replace(/ /g, "_");
                return values[key];
            });
            d.hide();
            callback(selected);
        },
        secondary_action() {
            d.hide();
            callback([]);
        },
    });
    d.show();
}
```

---

## Sequence (Create flow)

```
User clicks "Create & capture from Desk"
  → frappe.prompt for title
  → frappe.call get_child_doctypes(root_doctype)
  → if children: _show_related_picker(children, [], callback)
     else: callback([])
  → frappe.call capture_form_dialog_from_desk(doctype, title, related_doctypes)
  → set form_dialog on Page Panel, save, re-render
```

## Sequence (Rebuild flow)

```
User clicks Rebuild
  → frappe.confirm "Overwrite frozen schema?"
  → frappe.call get_form_dialog_definition(name)   // to get current related_doctypes
  → frappe.call get_child_doctypes(root_doctype)
  → _show_related_picker(children, current_related, callback)
  → frappe.call rebuild_form_dialog(name, related_doctypes)
  → re-render
```

---

## Files to Modify

| File | Change |
|------|--------|
| `nce_events/nce_events/doctype/form_dialog/form_dialog.json` | Add `related_doctypes` field |
| `nce_events/api/form_dialog_api.py` | Accept + store `related_doctypes` in capture/rebuild; return it in get_definition |
| `nce_events/nce_events/doctype/page_panel/page_panel.js` | Insert related-picker dialog into create + rebuild flows |

## Files NOT Modified (yet)

| File | Why later |
|------|-----------|
| `PanelFormDialogBody.vue` | Rendering related-table tabs is the next task |
| `usePanelFormDialog.js` | Same — data loading for related tabs is later |
| `panel_api.py` | `get_child_doctypes` already exists and is sufficient |

---

## Edge Cases

1. **No child DocTypes found** → Skip picker silently, proceed with capture/rebuild as today.
2. **Rebuild with a child DocType that no longer exists in WP Tables** → The pre-populated checkbox will simply not appear (it's filtered by the fresh `get_child_doctypes` result). The old entry in `related_doctypes` is replaced by the new selection.
3. **Existing Form Dialogs with null `related_doctypes`** → Treated as empty array (no related tabs). No migration needed.
