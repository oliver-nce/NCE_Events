# Phase A — Coding Instructions

You are implementing Phase A of the Panel Form Dialog feature for the NCE Events Frappe app. This phase creates the data model and server API only. No Vue/frontend work.

Read these instructions completely before writing any code.

---

## Context

- **Frappe app name:** `nce_events`
- **App module:** `NCE Events`
- **DocType directory:** `nce_events/nce_events/doctype/`
- **API directory:** `nce_events/api/`
- **Tests directory:** `nce_events/api/tests/`

You are creating a system where admins can "freeze" a snapshot of a Frappe DocType's field schema into a JSON blob. This frozen snapshot is later used by a Vue frontend to render a form dialog — but that frontend work is NOT part of this phase.

---

## Task 1: Create DocType `Form Dialog`

Create two files:

### File: `nce_events/nce_events/doctype/form_dialog/form_dialog.json`

This is the parent DocType. Use this exact JSON structure. Do not add or remove fields. Do not change field names, types, or options.

```json
{
  "actions": [],
  "autoname": "field:title",
  "creation": "2026-04-01 00:00:00.000000",
  "doctype": "DocType",
  "engine": "InnoDB",
  "field_order": [
    "title",
    "target_doctype",
    "frozen_meta_json",
    "captured_at",
    "dialog_size",
    "is_active",
    "buttons"
  ],
  "fields": [
    {
      "fieldname": "title",
      "fieldtype": "Data",
      "in_list_view": 1,
      "label": "Title",
      "reqd": 1,
      "unique": 1
    },
    {
      "description": "The Frappe DocType this dialog edits. Must exist in WP Tables.",
      "fieldname": "target_doctype",
      "fieldtype": "Link",
      "in_list_view": 1,
      "label": "Target DocType",
      "options": "DocType",
      "reqd": 1
    },
    {
      "description": "Frozen field schema captured from Desk. JSON object with shape: { \"fields\": [...] }",
      "fieldname": "frozen_meta_json",
      "fieldtype": "Code",
      "label": "Frozen Meta JSON",
      "options": "JSON"
    },
    {
      "fieldname": "captured_at",
      "fieldtype": "Datetime",
      "label": "Captured At",
      "read_only": 1
    },
    {
      "default": "xl",
      "fieldname": "dialog_size",
      "fieldtype": "Select",
      "in_list_view": 1,
      "label": "Dialog Size",
      "options": "sm\nmd\nlg\nxl\n2xl\n3xl"
    },
    {
      "default": "1",
      "fieldname": "is_active",
      "fieldtype": "Check",
      "in_list_view": 1,
      "label": "Is Active"
    },
    {
      "fieldname": "buttons",
      "fieldtype": "Table",
      "label": "Buttons",
      "options": "Form Dialog Button"
    }
  ],
  "index_web_pages_for_search": 0,
  "istable": 0,
  "links": [],
  "modified": "2026-04-01 00:00:00.000000",
  "modified_by": "Administrator",
  "module": "NCE Events",
  "name": "Form Dialog",
  "naming_rule": "By fieldname",
  "owner": "Administrator",
  "permissions": [
    {
      "create": 1,
      "delete": 1,
      "email": 1,
      "export": 1,
      "print": 1,
      "read": 1,
      "report": 1,
      "role": "System Manager",
      "share": 1,
      "write": 1
    }
  ],
  "sort_field": "creation",
  "sort_order": "DESC",
  "states": [],
  "track_changes": 1
}
```

### File: `nce_events/nce_events/doctype/form_dialog/form_dialog.py`

```python
import frappe
from frappe.model.document import Document


class FormDialog(Document):
    def validate(self):
        if self.target_doctype:
            _assert_doctype_in_wp_tables(self.target_doctype)


def _assert_doctype_in_wp_tables(doctype: str) -> None:
    """Raise if the DocType is not listed in WP Tables (nce_sync)."""
    if not frappe.get_all("WP Tables", filters={"frappe_doctype": doctype}, limit=1):
        frappe.throw(
            f"DocType '{doctype}' is not listed in WP Tables and cannot be used for Form Dialogs."
        )
```

Also create an empty `__init__.py` in the same directory:

### File: `nce_events/nce_events/doctype/form_dialog/__init__.py`

```python
```

---

## Task 2: Create DocType `Form Dialog Button`

Create two files:

### File: `nce_events/nce_events/doctype/form_dialog_button/form_dialog_button.json`

This is a child table DocType. Note `"istable": 1` and `"permissions": []`.

```json
{
  "actions": [],
  "creation": "2026-04-01 00:00:00.000000",
  "doctype": "DocType",
  "engine": "InnoDB",
  "field_order": [
    "label",
    "button_script",
    "sort_order",
    "source_note"
  ],
  "fields": [
    {
      "fieldname": "label",
      "fieldtype": "Data",
      "in_list_view": 1,
      "label": "Label",
      "reqd": 1
    },
    {
      "description": "Copied script body. Not executed yet — placeholder for future phase.",
      "fieldname": "button_script",
      "fieldtype": "Code",
      "label": "Button Script",
      "options": "JavaScript"
    },
    {
      "default": "0",
      "fieldname": "sort_order",
      "fieldtype": "Int",
      "in_list_view": 1,
      "label": "Sort Order"
    },
    {
      "description": "Human note, e.g. 'Copied from Client Script Events-Form'",
      "fieldname": "source_note",
      "fieldtype": "Small Text",
      "label": "Source Note"
    }
  ],
  "index_web_pages_for_search": 0,
  "istable": 1,
  "links": [],
  "modified": "2026-04-01 00:00:00.000000",
  "modified_by": "Administrator",
  "module": "NCE Events",
  "name": "Form Dialog Button",
  "owner": "Administrator",
  "permissions": [],
  "sort_field": "creation",
  "sort_order": "DESC",
  "states": [],
  "track_changes": 0
}
```

### File: `nce_events/nce_events/doctype/form_dialog_button/form_dialog_button.py`

```python
from frappe.model.document import Document


class FormDialogButton(Document):
    pass
```

### File: `nce_events/nce_events/doctype/form_dialog_button/__init__.py`

```python
```

---

## Task 3: Add `form_dialog` field to `Page Panel`

Edit the existing file `nce_events/nce_events/doctype/page_panel/page_panel.json`.

### 3a. Add to `field_order` array

Add `"form_dialog"` at the end of the `field_order` array, after `"panel_sql"`:

```json
"field_order": [
    "root_doctype",
    "header_text",
    "default_filters",
    "order_by",
    "section_break_computed",
    "unstored_calculation_fields",
    "column_order",
    "bold_fields",
    "gender_column",
    "gender_color_fields",
    "title_field",
    "section_break_widgets",
    "show_filter",
    "show_sheets",
    "column_break_widgets",
    "show_email",
    "show_sms",
    "email_field",
    "sms_field",
    "section_break_tile_actions",
    "show_card_email",
    "show_card_sms",
    "open_card_on_click",
    "panel_sql",
    "form_dialog"
]
```

### 3b. Add field object to `fields` array

Add this object at the end of the `fields` array, after the `panel_sql` field object:

```json
{
    "description": "Which frozen Form Dialog opens for this panel in V2.",
    "fieldname": "form_dialog",
    "fieldtype": "Link",
    "label": "Form Dialog",
    "options": "Form Dialog"
}
```

Do NOT change anything else in `page_panel.json`.

---

## Task 4: Create `form_dialog_api.py`

### File: `nce_events/api/form_dialog_api.py`

```python
"""
Server API for Form Dialog CRUD and frozen schema capture.

All methods require System Manager role.
"""

import json
import frappe
from frappe import _


def _assert_doctype_in_wp_tables(doctype: str) -> None:
    """Raise if the DocType is not listed in WP Tables (nce_sync)."""
    if not frappe.get_all("WP Tables", filters={"frappe_doctype": doctype}, limit=1):
        frappe.throw(
            _("DocType '{0}' is not listed in WP Tables and cannot be used for Form Dialogs.").format(doctype)
        )


def _require_system_manager() -> None:
    """Raise if the current user is not System Manager."""
    if "System Manager" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Only System Manager can manage Form Dialogs."), frappe.PermissionError)


@frappe.whitelist()
def capture_form_dialog_from_desk(doctype: str, title: str | None = None) -> str:
    """
    Create or update a Form Dialog by capturing the live DocType schema from Desk.

    Args:
        doctype: The Frappe DocType to capture (must be in WP Tables).
        title: Optional title for the Form Dialog. Defaults to "{doctype} — dialog".

    Returns:
        The name of the created/updated Form Dialog document.
    """
    _require_system_manager()
    _assert_doctype_in_wp_tables(doctype)

    meta = frappe.get_meta(doctype)
    fields_list = []
    for f in meta.fields:
        fields_list.append(f.as_dict())

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
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.get_doc({
            "doctype": "Form Dialog",
            "title": title,
            "target_doctype": doctype,
            "frozen_meta_json": frozen_json,
            "captured_at": frappe.utils.now_datetime(),
            "dialog_size": "xl",
            "is_active": 1,
        })
        doc.insert(ignore_permissions=True)

    frappe.db.commit()
    return doc.name


@frappe.whitelist()
def rebuild_form_dialog(name: str) -> dict:
    """
    Re-capture the DocType schema from Desk and overwrite the frozen snapshot.

    The UI must confirm with the user before calling this — the overwrite is destructive.

    Args:
        name: The name (title) of the Form Dialog document.

    Returns:
        Dict with name, target_doctype, and captured_at.
    """
    _require_system_manager()

    doc = frappe.get_doc("Form Dialog", name)
    _assert_doctype_in_wp_tables(doc.target_doctype)

    meta = frappe.get_meta(doc.target_doctype)
    fields_list = []
    for f in meta.fields:
        fields_list.append(f.as_dict())

    doc.frozen_meta_json = json.dumps({"fields": fields_list}, default=str, indent=None)
    doc.captured_at = frappe.utils.now_datetime()
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": doc.name,
        "target_doctype": doc.target_doctype,
        "captured_at": str(doc.captured_at),
    }


@frappe.whitelist()
def get_form_dialog_definition(name: str) -> dict:
    """
    Return the frozen schema, button rows, and dialog size for the Vue renderer.

    Args:
        name: The name (title) of the Form Dialog document.

    Returns:
        Dict with: name, title, target_doctype, dialog_size, frozen_meta_json (as parsed dict),
        and buttons (list of dicts with label, sort_order).
    """
    _require_system_manager()

    doc = frappe.get_doc("Form Dialog", name)

    frozen = {}
    if doc.frozen_meta_json:
        frozen = json.loads(doc.frozen_meta_json)

    buttons = []
    for row in sorted(doc.buttons or [], key=lambda r: r.sort_order or 0):
        buttons.append({
            "label": row.label,
            "sort_order": row.sort_order,
        })

    return {
        "name": doc.name,
        "title": doc.title,
        "target_doctype": doc.target_doctype,
        "dialog_size": doc.dialog_size or "xl",
        "frozen_meta": frozen,
        "buttons": buttons,
    }


@frappe.whitelist()
def list_form_dialogs_for_doctype(doctype: str) -> list[dict]:
    """
    List active Form Dialogs for a given target DocType.
    Used by the Dialogs tab in the Page Panel Desk form.

    Args:
        doctype: The target DocType to filter by.

    Returns:
        List of dicts with: name, title, target_doctype, dialog_size, captured_at, is_active.
    """
    _require_system_manager()

    return frappe.get_all(
        "Form Dialog",
        filters={"target_doctype": doctype, "is_active": 1},
        fields=["name", "title", "target_doctype", "dialog_size", "captured_at", "is_active"],
        order_by="title asc",
    )
```

---

## Task 5: Create unit tests

### File: `nce_events/api/tests/test_form_dialog_api.py`

```python
"""
Unit tests for form_dialog_api.py.

Run with: bench run-tests --app nce_events --module nce_events.api.tests.test_form_dialog_api
"""

import json
import unittest
from unittest.mock import patch, MagicMock

import frappe
from frappe.tests.utils import FrappeTestCase


class TestAssertDoctypeInWPTables(FrappeTestCase):
    """Test the WP Tables validation helper."""

    def test_rejects_doctype_not_in_wp_tables(self):
        """Should raise ValidationError if DocType is not in WP Tables."""
        from nce_events.api.form_dialog_api import _assert_doctype_in_wp_tables

        with patch("nce_events.api.form_dialog_api.frappe.get_all", return_value=[]):
            with self.assertRaises(frappe.ValidationError):
                _assert_doctype_in_wp_tables("Nonexistent DocType")

    def test_accepts_doctype_in_wp_tables(self):
        """Should not raise if DocType exists in WP Tables."""
        from nce_events.api.form_dialog_api import _assert_doctype_in_wp_tables

        with patch(
            "nce_events.api.form_dialog_api.frappe.get_all",
            return_value=[{"name": "WP-001"}],
        ):
            # Should not raise
            _assert_doctype_in_wp_tables("Event")


class TestCaptureFormDialog(FrappeTestCase):
    """Test that capture stores expected keys in frozen_meta_json."""

    @patch("nce_events.api.form_dialog_api._require_system_manager")
    @patch("nce_events.api.form_dialog_api._assert_doctype_in_wp_tables")
    def test_capture_stores_fields_key(self, mock_validate, mock_role):
        """frozen_meta_json must contain a top-level 'fields' key that is a list."""
        from nce_events.api.form_dialog_api import capture_form_dialog_from_desk

        # Create a mock meta with a few fields
        mock_field = MagicMock()
        mock_field.as_dict.return_value = {
            "fieldname": "test_field",
            "fieldtype": "Data",
            "label": "Test Field",
        }
        mock_meta = MagicMock()
        mock_meta.fields = [mock_field]

        with patch("nce_events.api.form_dialog_api.frappe.get_meta", return_value=mock_meta):
            name = capture_form_dialog_from_desk(
                doctype="Test DocType", title="Test Capture"
            )

        # Verify the document was created with correct JSON shape
        doc = frappe.get_doc("Form Dialog", name)
        frozen = json.loads(doc.frozen_meta_json)

        self.assertIn("fields", frozen)
        self.assertIsInstance(frozen["fields"], list)
        self.assertEqual(len(frozen["fields"]), 1)
        self.assertEqual(frozen["fields"][0]["fieldname"], "test_field")

        # Cleanup
        frappe.delete_doc("Form Dialog", name, force=True)


class TestGetFormDialogDefinition(FrappeTestCase):
    """Test that get_form_dialog_definition returns buttons in sort_order."""

    @patch("nce_events.api.form_dialog_api._require_system_manager")
    def test_buttons_returned_in_sort_order(self, mock_role):
        """Buttons must be returned sorted by sort_order ascending."""
        from nce_events.api.form_dialog_api import get_form_dialog_definition

        # Create a test Form Dialog with buttons in reverse order
        doc = frappe.get_doc({
            "doctype": "Form Dialog",
            "title": "Test Sort Order",
            "target_doctype": "DocType",
            "frozen_meta_json": '{"fields": []}',
            "captured_at": frappe.utils.now_datetime(),
            "is_active": 1,
            "buttons": [
                {"label": "Second", "sort_order": 2},
                {"label": "First", "sort_order": 1},
                {"label": "Third", "sort_order": 3},
            ],
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        result = get_form_dialog_definition(doc.name)

        self.assertEqual(len(result["buttons"]), 3)
        self.assertEqual(result["buttons"][0]["label"], "First")
        self.assertEqual(result["buttons"][1]["label"], "Second")
        self.assertEqual(result["buttons"][2]["label"], "Third")

        # Cleanup
        frappe.delete_doc("Form Dialog", doc.name, force=True)


if __name__ == "__main__":
    unittest.main()
```

If the file `nce_events/api/tests/__init__.py` does not exist, create it as an empty file.

---

## Task 6: Verify `__init__.py` files exist

Ensure these `__init__.py` files exist (create as empty files if missing):

- `nce_events/nce_events/doctype/form_dialog/__init__.py`
- `nce_events/nce_events/doctype/form_dialog_button/__init__.py`
- `nce_events/api/tests/__init__.py`

---

## Verification

After completing all tasks, verify:

1. The directory `nce_events/nce_events/doctype/form_dialog/` contains exactly: `__init__.py`, `form_dialog.json`, `form_dialog.py`.
2. The directory `nce_events/nce_events/doctype/form_dialog_button/` contains exactly: `__init__.py`, `form_dialog_button.json`, `form_dialog_button.py`.
3. The file `nce_events/api/form_dialog_api.py` exists and contains four whitelisted functions: `capture_form_dialog_from_desk`, `rebuild_form_dialog`, `get_form_dialog_definition`, `list_form_dialogs_for_doctype`.
4. The file `nce_events/nce_events/doctype/page_panel/page_panel.json` has `"form_dialog"` in its `field_order` array and a corresponding field object in its `fields` array.
5. No other files were modified.

---

## What NOT to do

- Do NOT create any Vue/frontend files. That is Phase C/D.
- Do NOT modify `page_panel.js`. That is Phase B.
- Do NOT modify `panel_api.py`. That is Phase C.
- Do NOT modify `theme_defaults.css`. That is Phase E.
- Do NOT create any migration scripts. `bench migrate` handles schema changes from DocType JSON files automatically.
- Do NOT use Tailwind classes anywhere.
- Do NOT add any fields beyond what is specified above.
