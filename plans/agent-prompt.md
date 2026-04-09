# Coding Agent Prompt — Related-Tables Checkbox Picker

## Objective

When a Form Dialog is **created** or **rebuilt** from the Page Panel Dialogs tab, show a checkbox picker listing all one-to-many related DocTypes (from `get_child_doctypes`). Save the user's selection onto the Form Dialog document. On rebuild, pre-populate the checkboxes with the previously saved selection.

**Scope**: picker UI + persistence only. Do NOT touch PanelFormDialogBody.vue or any Vue files — tab rendering comes later.

---

## Files to modify (3 files only)

1. `nce_events/nce_events/doctype/form_dialog/form_dialog.json`
2. `nce_events/api/form_dialog_api.py`
3. `nce_events/nce_events/doctype/page_panel/page_panel.js`

---

## Step 1 — Add `related_doctypes` field to Form Dialog DocType

**File**: `nce_events/nce_events/doctype/form_dialog/form_dialog.json`

In `field_order`, insert `"related_doctypes"` after `"writeback_on_submit"` and before `"buttons"`. The resulting field_order should be:

```json
"field_order": [
    "title",
    "target_doctype",
    "frozen_meta_json",
    "captured_at",
    "dialog_size",
    "is_active",
    "writeback_on_submit",
    "related_doctypes",
    "buttons"
]
```

In the `fields` array, add this entry after the `writeback_on_submit` field object and before the `buttons` field object:

```json
{
    "fieldname": "related_doctypes",
    "fieldtype": "Code",
    "label": "Related DocTypes",
    "options": "JSON",
    "description": "JSON array of selected related DocTypes. Shape: [{\"doctype\":\"...\",\"link_field\":\"...\",\"label\":\"...\"}]. Populated by the picker dialog during capture/rebuild."
}
```

Update the `"modified"` timestamp to the current date (e.g. `"2026-04-06 00:00:00.000000"`).

---

## Step 2 — Update `form_dialog_api.py`

**File**: `nce_events/api/form_dialog_api.py`

### 2A. `capture_form_dialog_from_desk` (line 96)

Change the signature to accept `related_doctypes`:

```python
def capture_form_dialog_from_desk(
    doctype: str,
    title: str | None = None,
    related_doctypes: str | list | None = None,
) -> str:
```

Add a helper near the top of the function body to normalize the arg:

```python
# Normalize related_doctypes to a JSON string (or None)
_related_json = None
if related_doctypes is not None:
    if isinstance(related_doctypes, str):
        _related_json = related_doctypes  # already JSON
    else:
        _related_json = json.dumps(related_doctypes, default=str)
```

In the **existing doc update** branch (line ~123–128), after `doc.captured_at = ...` add:

```python
if _related_json is not None:
    doc.related_doctypes = _related_json
```

In the **new doc creation** branch (line ~130–141), add `"related_doctypes": _related_json or "[]"` to the dict passed to `frappe.get_doc()`.

### 2B. `rebuild_form_dialog` (line 148)

Change the signature:

```python
def rebuild_form_dialog(
    name: str,
    related_doctypes: str | list | None = None,
) -> dict:
```

Add the same normalization block. Then after `doc.captured_at = ...` (line 172), add:

```python
if _related_json is not None:
    doc.related_doctypes = _related_json
# If related_doctypes was not passed, preserve the existing value (don't wipe it)
```

In the return dict (line 176), add:

```python
"related_doctypes": json.loads(doc.related_doctypes or "[]"),
```

### 2C. `get_form_dialog_definition` (line 184)

In the return dict (line 212), add:

```python
"related_doctypes": json.loads(doc.related_doctypes or "[]"),
```

---

## Step 3 — Add the checkbox picker to `page_panel.js`

**File**: `nce_events/nce_events/doctype/page_panel/page_panel.js`

### 3A. Add the `_show_related_picker` helper function

Place this **before** the `_render_dialogs_tab` function (or at the top of the dialogs-tab section — wherever the other `_render_*` helpers live). This function is used by both the create and rebuild flows.

```js
/**
 * Show a checkbox dialog for selecting related DocTypes to include as tabs.
 *
 * @param {Array} available  - [{doctype, link_field, label}] from get_child_doctypes
 * @param {Array} preselected - [{doctype, ...}] previously saved, or []
 * @param {Function} callback - called with (selectedArray) on OK, or [] on Skip
 */
function _show_related_picker(available, preselected, callback) {
    if (!available || !available.length) {
        callback([]);
        return;
    }

    const preselected_set = new Set((preselected || []).map(function (r) { return r.doctype; }));

    const fields = available.map(function (c) {
        return {
            label: c.label || c.doctype,
            fieldname: "sel__" + c.doctype.replace(/ /g, "_"),
            fieldtype: "Check",
            default: preselected_set.has(c.doctype) ? 1 : 0,
        };
    });

    const d = new frappe.ui.Dialog({
        title: __("Add tabs to display related tables?"),
        fields: fields,
        size: "small",
        primary_action_label: __("OK"),
        secondary_action_label: __("Skip"),
        primary_action: function (values) {
            const selected = available.filter(function (c) {
                const key = "sel__" + c.doctype.replace(/ /g, "_");
                return values[key];
            });
            d.hide();
            callback(selected);
        },
        secondary_action: function () {
            d.hide();
            callback([]);
        },
    });
    d.show();
}
```

### 3B. Modify the Create flow (~line 1152)

Currently the code is:

```js
$container.on("click", ".pp-dialog-create", function () {
    frappe.prompt(
        { label: "Dialog title", fieldname: "title", fieldtype: "Data", reqd: 1, default: doctype + " — dialog" },
        function (values) {
            frappe.call({
                method: "nce_events.api.form_dialog_api.capture_form_dialog_from_desk",
                args: { doctype: doctype, title: values.title },
                ...
            });
        },
        "Create Form Dialog",
        "Create",
    );
});
```

Replace the callback inside `frappe.prompt` so it inserts the picker step between the prompt and the API call. The new flow:

```js
$container.on("click", ".pp-dialog-create", function () {
    frappe.prompt(
        {
            label: "Dialog title",
            fieldname: "title",
            fieldtype: "Data",
            reqd: 1,
            default: doctype + " — dialog",
        },
        function (values) {
            // Fetch related DocTypes, then show picker, then capture
            frappe.call({
                method: "nce_events.api.panel_api.get_child_doctypes",
                args: { root_doctype: frm.doc.root_doctype },
                callback: function (r) {
                    const children = (r && r.message) || [];
                    _show_related_picker(children, [], function (selected) {
                        frappe.call({
                            method: "nce_events.api.form_dialog_api.capture_form_dialog_from_desk",
                            args: {
                                doctype: doctype,
                                title: values.title,
                                related_doctypes: JSON.stringify(selected),
                            },
                            freeze: true,
                            freeze_message: "Capturing schema from Desk…",
                            callback: function (r) {
                                if (r && r.message) {
                                    frm.set_value("form_dialog", r.message);
                                    frm.dirty();
                                    frm.save().then(function () {
                                        _render_dialogs_tab(frm);
                                    });
                                    frappe.show_alert({
                                        message: "Dialog captured: " + r.message,
                                        indicator: "green",
                                    });
                                }
                            },
                        });
                    });
                },
            });
        },
        "Create Form Dialog",
        "Create",
    );
});
```

### 3C. Modify the Rebuild flow (~line 1187)

Currently the code is:

```js
$container.on("click", ".pp-dialog-rebuild", function () {
    if (!current) return;
    frappe.confirm(
        "This will overwrite the frozen schema with the current Desk definition. Continue?",
        function () {
            frappe.call({
                method: "nce_events.api.form_dialog_api.rebuild_form_dialog",
                args: { name: current },
                ...
            });
        },
    );
});
```

Replace the callback inside `frappe.confirm` to: (a) fetch the current Form Dialog definition to get previous `related_doctypes`, (b) fetch available children, (c) show picker pre-populated, (d) call rebuild with the selection.

```js
$container.on("click", ".pp-dialog-rebuild", function () {
    if (!current) return;
    frappe.confirm(
        "This will overwrite the frozen schema with the current Desk definition. Continue?",
        function () {
            // 1. Get current definition (for pre-populated selection)
            frappe.call({
                method: "nce_events.api.form_dialog_api.get_form_dialog_definition",
                args: { name: current },
                callback: function (defn_r) {
                    const current_related = (defn_r && defn_r.message && defn_r.message.related_doctypes) || [];

                    // 2. Get available child doctypes
                    frappe.call({
                        method: "nce_events.api.panel_api.get_child_doctypes",
                        args: { root_doctype: frm.doc.root_doctype },
                        callback: function (r) {
                            const children = (r && r.message) || [];

                            // 3. Show picker with pre-selection
                            _show_related_picker(children, current_related, function (selected) {
                                // 4. Rebuild with selection
                                frappe.call({
                                    method: "nce_events.api.form_dialog_api.rebuild_form_dialog",
                                    args: {
                                        name: current,
                                        related_doctypes: JSON.stringify(selected),
                                    },
                                    freeze: true,
                                    freeze_message: "Rebuilding schema…",
                                    callback: function () {
                                        frappe.show_alert({ message: "Schema rebuilt.", indicator: "green" });
                                        _render_dialogs_tab(frm);
                                    },
                                });
                            });
                        },
                    });
                },
            });
        },
    );
});
```

---

## What NOT to do

- Do NOT modify any Vue files (no PanelFormDialogBody.vue, no usePanelFormDialog.js, etc.)
- Do NOT modify `panel_api.py` — `get_child_doctypes` already works as needed
- Do NOT add new API endpoints — use only the existing `get_child_doctypes` endpoint
- Do NOT add migration scripts — the new field defaults to null/empty which is safe
- Do NOT change the behavior of any existing functionality — only add the picker step

---

## Testing checklist

After implementing, verify:

1. **Create new Form Dialog**: Click "Create & capture from Desk" on a Page Panel that has a root_doctype with known child DocTypes in WP Tables. After entering the title, the related-tables picker should appear with unchecked checkboxes. Check some, click OK. Open the Form Dialog doc in Desk and confirm `related_doctypes` field contains the correct JSON array.

2. **Create with no children**: For a root_doctype that has no child DocTypes in WP Tables, the picker should NOT appear — it should skip straight to capture.

3. **Rebuild existing**: Click Rebuild on a Form Dialog that already has `related_doctypes` saved. The picker should appear with the previously selected items pre-checked. Change the selection, click OK. Verify the saved JSON is updated.

4. **Rebuild — skip**: Click Rebuild, and in the picker click "Skip". Verify that `related_doctypes` is set to `[]` (empty array), not preserved from before. (The user explicitly chose to skip = clear selection.)

5. **`get_form_dialog_definition` response**: Call the API directly or check the network tab — the response should now include `related_doctypes` as a parsed array.
