# Feature Spec: Writeback Fetched Fields on Submit

## Overview

When a Vue form dialog submits, and the dialog config record has `writeback_on_submit` checked (1), the system should automatically find all editable fetched fields on the saved document and write their current values back to the source (linked) documents.

---

## Context

- We have a utility that builds Vue dialogs dynamically from a config DocType.
- Each dialog config is stored as a record on that DocType.
- A new Check field `writeback_on_submit` has been added to the dialog config DocType.
- The dialogs already have a working Submit button that saves the document.

---

## What to Build

### 1. Whitelisted Python Method

**Location:** Create a new method in the app's utils (e.g., `my_app/utils/writeback.py`) or add to existing utils.

**Method signature:**

```python
@frappe.whitelist()
def writeback_fetched_fields(doctype, name):
```

**Input:** `doctype` (str) and `name` (str) of the document that was just saved.

**Logic:**

1. Load the document: `frappe.get_doc(doctype, name)`
2. Load the meta: `frappe.get_meta(doctype)`
3. Scan all fields on the meta looking for fields where:
   - `fetch_from` is set (not empty)
   - `read_only` is 0 (the field is editable — meaning the user could have changed it)
4. For each matching field:
   - Parse `fetch_from` — the format is `link_field.source_field` (split on `.`)
   - `link_field` = the Link field on this DocType that points to the related DocType
   - `source_field` = the field on the related DocType where the value was originally fetched from
   - Get the Link field's meta to find `options` — that gives you the target DocType name
   - Get the value of the link field on the current doc — that gives you the target document name
   - Get the current value of the fetched field on the current doc — that is the value to write back
   - Skip if the link field value is empty (no linked doc)
   - Read the current value on the target document for that field
   - If the value differs, write it back using `frappe.db.set_value(target_doctype, target_docname, source_field, new_value)`
5. Repeat the same process for all child tables:
   - Use `meta.get_table_fields()` to get child table fields
   - For each child table, load its meta via `frappe.get_meta(child_table_doctype)`
   - Loop through each row in the child table
   - Apply the same fetch_from detection and writeback logic per row
6. Check `frappe.has_permission(target_doctype, "write", target_docname)` before each write. Skip with a log message if no permission.
7. Wrap each write in try/except. On failure, log the error with `frappe.log_error()` — do NOT block the save.
8. Return a dict: `{"updated_count": <number of fields written back>}`

### 2. Modify the Vue Dialog Submit Handler

**Location:** The existing Submit button handler in the Vue dialog code.

**Logic:**

After the existing save call succeeds (in the callback/promise `.then()`):

1. Check if the dialog config record has `writeback_on_submit == 1`
   - The dialog already has access to its config record — read the flag from there
2. If the flag is 0, do nothing extra (current behavior)
3. If the flag is 1, make an additional call:

```javascript
frappe.call({
    method: "my_app.utils.writeback.writeback_fetched_fields",
    args: {
        doctype: <the doctype of the doc being edited>,
        name: <the name of the doc being edited>
    },
    callback: function(r) {
        if (r.message && r.message.updated_count > 0) {
            frappe.show_alert({
                message: r.message.updated_count + " field(s) written back",
                indicator: "green"
            });
        }
    }
});
```

4. This call should happen AFTER the save is confirmed successful, not before.

---

## Important Details

- **`fetch_from` format** is always `link_field_name.source_field_name` — split on the first `.` only (field names won't contain dots).
- **Only write back fields where `read_only == 0`** — read-only fetched fields are display-only and should not be written back (the user couldn't have edited them).
- **Permission check** is required per target document. Use `frappe.has_permission()`.
- **Compare before writing** — don't call `set_value` if the value hasn't actually changed. Read the target doc's current value first, or compare against `doc.get_doc_before_save()` if available.
- **`update_modified=True`** on `set_value` so the target doc's `modified` timestamp updates.
- **No recursion risk** — `frappe.db.set_value` does not trigger the full doc save cycle, so it won't re-trigger this writeback.

---

## What NOT to Do

- Do not modify any existing DocType definitions.
- Do not add hooks to `doc_events` — this is triggered explicitly from the dialog Submit, not from every save.
- Do not block or delay the dialog save if the writeback fails — log errors silently.
- Do not write back fields that are `read_only == 1`.

---

## Testing

1. Open a dialog where the underlying DocType has editable fetched fields (e.g., `People` with fields fetched from a related Player DocType).
2. With `writeback_on_submit` OFF: edit a fetched field, submit. Verify the source document is unchanged.
3. With `writeback_on_submit` ON: edit a fetched field, submit. Verify the source document now has the updated value.
4. Test with a child table that has fetched fields — same behavior.
5. Test with no write permission on the target doc — should skip gracefully, no error shown to user.
6. Test with the link field empty — should skip, no error.
