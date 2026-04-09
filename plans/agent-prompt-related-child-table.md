# Coding Agent Prompt — Replace `related_doctypes` JSON with a Child Table

## Objective

Replace the `related_doctypes` Code/JSON field on Form Dialog with a proper Frappe child table called **Form Dialog Related DocType**. Each row stores one related DocType with its link field, display label, sort order, and a `column_order` field (comma-separated fieldnames defining which columns to show, in order).

**Scope**: schema + backend + picker wiring. Do NOT touch any Vue files — the tab rendering already reads from `defn.related_doctypes` and that response shape will stay the same (array of objects).

---

## Files to CREATE (new child DocType)

### 1. Directory + files for `Form Dialog Related DocType`

Create the directory: `nce_events/nce_events/doctype/form_dialog_related_doctype/`

With 3 files:

#### `__init__.py`
Empty file.

#### `form_dialog_related_doctype.py`
```python
# Copyright (c) 2026, NCE and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class FormDialogRelatedDoctype(Document):
	pass
```

#### `form_dialog_related_doctype.json`
```json
{
  "actions": [],
  "creation": "2026-04-06 00:00:00.000000",
  "doctype": "DocType",
  "engine": "InnoDB",
  "field_order": [
    "related_doctype",
    "link_field",
    "label",
    "sort_order",
    "column_order"
  ],
  "fields": [
    {
      "fieldname": "related_doctype",
      "fieldtype": "Link",
      "in_list_view": 1,
      "label": "Related DocType",
      "options": "DocType",
      "reqd": 1
    },
    {
      "description": "The fieldname on the related DocType that links back to the parent DocType.",
      "fieldname": "link_field",
      "fieldtype": "Data",
      "in_list_view": 1,
      "label": "Link Field",
      "reqd": 1
    },
    {
      "description": "Display label for the tab in the Form Dialog.",
      "fieldname": "label",
      "fieldtype": "Data",
      "in_list_view": 1,
      "label": "Label",
      "reqd": 1
    },
    {
      "default": "0",
      "fieldname": "sort_order",
      "fieldtype": "Int",
      "in_list_view": 1,
      "label": "Sort Order"
    },
    {
      "description": "Comma-separated list of fieldnames to display as columns, in order. E.g. 'name, first_name, status, registration_date'. Leave blank to use all data fields.",
      "fieldname": "column_order",
      "fieldtype": "Small Text",
      "label": "Column Order"
    }
  ],
  "index_web_pages_for_search": 0,
  "istable": 1,
  "links": [],
  "modified": "2026-04-06 00:00:00.000000",
  "modified_by": "Administrator",
  "module": "NCE Events",
  "name": "Form Dialog Related DocType",
  "owner": "Administrator",
  "permissions": [],
  "sort_field": "creation",
  "sort_order": "DESC",
  "states": [],
  "track_changes": 0
}
```

Key points: `"istable": 1` (child table), no permissions (inherits from parent), follows the same pattern as `Form Dialog Button`.

---

## Files to MODIFY

### 2. `nce_events/nce_events/doctype/form_dialog/form_dialog.json`

**Replace** the `related_doctypes` field entry. Change it from Code/JSON to Table:

Old:
```json
{
    "fieldname": "related_doctypes",
    "fieldtype": "Code",
    "label": "Related DocTypes",
    "options": "JSON",
    "description": "JSON array of selected related DocTypes. Shape: [{\"doctype\":\"...\",\"link_field\":\"...\",\"label\":\"...\"}]. Populated by the picker dialog during capture/rebuild."
}
```

New:
```json
{
    "fieldname": "related_doctypes",
    "fieldtype": "Table",
    "label": "Related DocTypes",
    "options": "Form Dialog Related DocType"
}
```

The `field_order` entry stays the same (`"related_doctypes"` is already in the right position).

Update `"modified"` to `"2026-04-06 12:00:00.000000"`.

---

### 3. `nce_events/api/form_dialog_api.py`

The backend currently reads/writes `related_doctypes` as a JSON string. It needs to switch to reading/writing child table rows.

#### 3A. `capture_form_dialog_from_desk`

**Current**: accepts `related_doctypes` as JSON string, stores directly on `doc.related_doctypes`.

**New**: accepts `related_doctypes` as a JSON string (from the frontend picker). Parse it into a list of dicts, then populate the child table rows.

Replace the normalization block and the storage lines. The full updated function:

```python
@frappe.whitelist()
def capture_form_dialog_from_desk(
	doctype: str, title: str | None = None, related_doctypes: str | list | None = None
) -> str:
	"""
	Create or update a Form Dialog by capturing the live DocType schema from Desk.

	Args:
	    doctype: The Frappe DocType to capture (must be in WP Tables).
	    title: Optional title for the Form Dialog. Defaults to "{doctype} — dialog".
	    related_doctypes: Optional JSON string or list of selected related DocTypes.
	        Each item: { doctype, link_field, label }.

	Returns:
	    The name of the created/updated Form Dialog document.
	"""
	_require_system_manager()
	_assert_doctype_in_wp_tables(doctype)

	# Parse related_doctypes from JSON string if needed
	_related_list = None
	if related_doctypes is not None:
		if isinstance(related_doctypes, str):
			_related_list = json.loads(related_doctypes)
		else:
			_related_list = related_doctypes

	meta = frappe.get_meta(doctype)
	fields_list = []
	for f in meta.fields:
		fields_list.append(f.as_dict())

	fields_list = _enrich_fetch_from_fields(fields_list, meta)
	frozen_json = json.dumps({"fields": fields_list}, default=str, indent=None)

	if not title:
		title = f"{doctype} — dialog"

	# Check if a Form Dialog with this title already exists
	existing = frappe.db.exists("Form Dialog", title)
	if existing:
		doc = frappe.get_doc("Form Dialog", title)
		doc.target_doctype = doctype
		doc.frozen_meta_json = frozen_json
		doc.captured_at = frappe.utils.now_datetime()
		if _related_list is not None:
			_set_related_doctypes_rows(doc, _related_list)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc(
			{
				"doctype": "Form Dialog",
				"title": title,
				"target_doctype": doctype,
				"frozen_meta_json": frozen_json,
				"captured_at": frappe.utils.now_datetime(),
				"dialog_size": "xl",
				"is_active": 1,
			}
		)
		if _related_list:
			_set_related_doctypes_rows(doc, _related_list)
		doc.insert(ignore_permissions=True)

	frappe.db.commit()
	return doc.name
```

#### 3B. `rebuild_form_dialog`

Same pattern — replace JSON storage with child table rows:

```python
@frappe.whitelist()
def rebuild_form_dialog(name: str, related_doctypes: str | list | None = None) -> dict:
	"""
	Re-capture the DocType schema from Desk and overwrite the frozen snapshot.

	Args:
	    name: The name (title) of the Form Dialog document.
	    related_doctypes: Optional JSON string or list of selected related DocTypes.

	Returns:
	    Dict with name, target_doctype, captured_at, and related_doctypes.
	"""
	_require_system_manager()

	doc = frappe.get_doc("Form Dialog", name)
	_assert_doctype_in_wp_tables(doc.target_doctype)

	# Parse related_doctypes from JSON string if needed
	_related_list = None
	if related_doctypes is not None:
		if isinstance(related_doctypes, str):
			_related_list = json.loads(related_doctypes)
		else:
			_related_list = related_doctypes

	meta = frappe.get_meta(doc.target_doctype)
	fields_list = []
	for f in meta.fields:
		fields_list.append(f.as_dict())

	fields_list = _enrich_fetch_from_fields(fields_list, meta)
	doc.frozen_meta_json = json.dumps({"fields": fields_list}, default=str, indent=None)
	doc.captured_at = frappe.utils.now_datetime()
	if _related_list is not None:
		_set_related_doctypes_rows(doc, _related_list)
	# If related_doctypes was not passed, preserve existing child rows
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {
		"name": doc.name,
		"target_doctype": doc.target_doctype,
		"captured_at": str(doc.captured_at),
		"related_doctypes": _read_related_doctypes_rows(doc),
	}
```

#### 3C. `get_form_dialog_definition`

Replace the JSON parse with child table read. In the return dict, change:

Old:
```python
"related_doctypes": json.loads(doc.related_doctypes or "[]"),
```

New:
```python
"related_doctypes": _read_related_doctypes_rows(doc),
```

#### 3D. Add two private helper functions

Place these near the top of the file, after `_enrich_fetch_from_fields`:

```python
def _set_related_doctypes_rows(doc, related_list: list[dict]) -> None:
	"""Replace the related_doctypes child table rows from a list of dicts."""
	doc.related_doctypes = []
	for i, item in enumerate(related_list):
		doc.append("related_doctypes", {
			"related_doctype": item.get("doctype") or item.get("related_doctype", ""),
			"link_field": item.get("link_field", ""),
			"label": item.get("label", ""),
			"sort_order": item.get("sort_order", i),
			"column_order": item.get("column_order", ""),
		})


def _read_related_doctypes_rows(doc) -> list[dict]:
	"""Read the related_doctypes child table into a list of plain dicts.

	Returns the same shape the Vue side expects:
	[{ doctype, link_field, label, sort_order, column_order }]
	"""
	rows = sorted(doc.related_doctypes or [], key=lambda r: r.sort_order or 0)
	return [
		{
			"doctype": row.related_doctype,
			"link_field": row.link_field,
			"label": row.label,
			"sort_order": row.sort_order or 0,
			"column_order": row.column_order or "",
		}
		for row in rows
	]
```

Note: `_read_related_doctypes_rows` returns `"doctype"` (not `"related_doctype"`) in the output dicts — this matches the existing shape the picker and the Vue `_related` marker expect.

---

## Files NOT modified

| File | Why |
|------|-----|
| `page_panel.js` | The picker already sends `JSON.stringify(selected)` where each item has `{ doctype, link_field, label }` — this is parsed by the updated backend. No JS changes needed. |
| `useFrozenFormLoad.js` | Already reads `defn.related_doctypes` as an array — the response shape is unchanged. |
| `PanelFormDialogBody.vue` | Already renders placeholder tabs from `tab._related` — no change. |
| `parseLayout.js` | Not involved. |

---

## Migration note

After these changes, run `bench migrate` on the site. This will:
1. Create the new `tabForm Dialog Related DocType` table.
2. Change the `related_doctypes` column on `tabForm Dialog` from a text column to the standard Frappe child-table pattern (the old Code field data becomes irrelevant — any existing Form Dialogs that had JSON in this field will need their related doctypes re-selected via the picker on next rebuild).

---

## What NOT to do

- Do NOT modify any Vue files
- Do NOT modify `page_panel.js`
- Do NOT modify `panel_api.py`
- Do NOT add any new whitelisted API endpoints
- Do NOT try to migrate old JSON data — it's fine to lose it; users just re-select on next rebuild

---

## Testing checklist

1. **bench migrate succeeds** — new child table `tabForm Dialog Related DocType` is created.

2. **Create new Form Dialog**: Click "Create & capture from Desk", pick some related tables in the checkbox dialog. Open the Form Dialog in Desk — the "Related DocTypes" child table should show the selected rows with `related_doctype`, `link_field`, `label`, and `sort_order`.

3. **Rebuild**: Rebuild an existing Form Dialog. The picker should show with previous selections pre-populated (read from child table via `get_form_dialog_definition`). Change selection, confirm. Child table rows should update.

4. **Vue tabs still work**: Open the panel Form Dialog in the V2 UI. The related-DocType placeholder tabs should still appear at the right of the tab bar (the response shape is the same).

5. **column_order field is present**: Check that each child row in Desk has an editable `column_order` field. For now it will be blank — it can be manually populated for testing.

6. **get_form_dialog_definition response**: Verify the API response includes `related_doctypes` as an array of dicts, each with `doctype`, `link_field`, `label`, `sort_order`, `column_order`.
