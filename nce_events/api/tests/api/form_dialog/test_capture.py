"""
Unit tests for nce_events.api.form_dialog.capture.

Run with:
    bench run-tests --app nce_events --module nce_events.api.tests.api.form_dialog.test_capture

code-index:begin
{
 "purpose": "Unit tests for form_dialog.capture endpoints: capture, definition load, and list by DocType.",
 "read_when": "When modifying capture_form_dialog_from_desk or get_form_dialog_definition behavior.",
 "gotchas": [],
 "keywords": ["test capture", "form_dialog.capture", "frozen meta", "unittest"],
 "format": 1
}
code-index:end
"""

import json
import unittest
from unittest.mock import MagicMock, patch

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import cint


class TestCaptureFormDialog(FrappeTestCase):
	"""Test that capture stores expected keys in frozen_meta_json."""

	@patch("nce_events.api.form_dialog.capture._require_system_manager")
	@patch("nce_events.api.form_dialog.capture._assert_doctype_in_wp_tables")
	def test_capture_stores_fields_key(self, mock_validate, mock_role):
		"""frozen_meta_json must contain a top-level 'fields' key that is a list."""
		from nce_events.api.form_dialog.capture import capture_form_dialog_from_desk

		# Create a mock meta with a few fields
		mock_field = MagicMock()
		mock_field.as_dict.return_value = {
			"fieldname": "test_field",
			"fieldtype": "Data",
			"label": "Test Field",
		}
		mock_meta = MagicMock()
		mock_meta.fields = [mock_field]

		with patch("nce_events.api.form_dialog.capture.frappe.get_meta", return_value=mock_meta):
			name = capture_form_dialog_from_desk(doctype="Test DocType", title="Test Capture")

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

	def test_buttons_returned_in_sort_order(self):
		"""Buttons must be returned sorted by sort_order ascending."""
		from nce_events.api.form_dialog.capture import get_form_dialog_definition

		# Create a test Form Dialog with buttons in reverse order
		doc = frappe.get_doc(
			{
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
			}
		)
		doc.insert(ignore_permissions=True)
		frappe.db.commit()

		result = get_form_dialog_definition(doc.name)

		self.assertEqual(len(result["buttons"]), 3)
		self.assertEqual(result["buttons"][0]["label"], "First")
		self.assertEqual(result["buttons"][1]["label"], "Second")
		self.assertEqual(result["buttons"][2]["label"], "Third")
		self.assertIn("tab_notes", result)
		self.assertEqual(result["tab_notes"], [])

		# Cleanup
		frappe.delete_doc("Form Dialog", doc.name, force=True)


class TestListFormDialogsForDoctype(FrappeTestCase):
	"""list_form_dialogs_for_doctype attaches related_doctypes (desk summary, no info)."""

	@patch("nce_events.api.form_dialog.capture._require_system_manager")
	def test_list_includes_related_doctypes(self, mock_sm):
		from nce_events.api.form_dialog.capture import list_form_dialogs_for_doctype

		title = "List Related Test FD " + frappe.generate_hash(length=8)
		doc = frappe.get_doc(
			{
				"doctype": "Form Dialog",
				"title": title,
				"target_doctype": "DocType",
				"frozen_meta_json": '{"fields": []}',
				"captured_at": frappe.utils.now_datetime(),
				"is_active": 1,
				"related_doctypes": [
					{"child_doctype": "User", "link_field": "owner", "tab_label": "Users tab"},
				],
			}
		)
		doc.insert(ignore_permissions=True)
		frappe.db.commit()

		rows = list_form_dialogs_for_doctype("DocType")
		mine = next((r for r in rows if r.get("name") == title), None)
		self.assertIsNotNone(mine)
		self.assertEqual(len(mine["related_doctypes"]), 1)
		rd0 = mine["related_doctypes"][0]
		self.assertEqual(rd0["doctype"], "User")
		self.assertEqual(rd0["label"], "Users tab")
		self.assertEqual(rd0["link_field"], "owner")
		self.assertNotIn("info", rd0)
		self.assertTrue(rd0.get("child_row_name"))

		frappe.delete_doc("Form Dialog", title, force=True)
		frappe.db.commit()

	@patch("nce_events.api.form_dialog.capture._require_system_manager")
	def test_list_includes_inactive_dialogs(self, mock_sm):
		from nce_events.api.form_dialog.capture import list_form_dialogs_for_doctype

		suffix = frappe.generate_hash(length=8)
		active_title = f"List Inactive Active {suffix}"
		inactive_title = f"List Inactive Off {suffix}"
		for title, active in ((active_title, 1), (inactive_title, 0)):
			doc = frappe.get_doc(
				{
					"doctype": "Form Dialog",
					"title": title,
					"target_doctype": "DocType",
					"frozen_meta_json": '{"fields": []}',
					"captured_at": frappe.utils.now_datetime(),
					"is_active": active,
				}
			)
			doc.insert(ignore_permissions=True)
		frappe.db.commit()

		rows = list_form_dialogs_for_doctype("DocType")
		names = {r.get("name") for r in rows}
		self.assertIn(active_title, names)
		self.assertIn(inactive_title, names)
		inactive_row = next(r for r in rows if r.get("name") == inactive_title)
		self.assertEqual(inactive_row.get("is_active"), 0)

		for title in (active_title, inactive_title):
			frappe.delete_doc("Form Dialog", title, force=True)
		frappe.db.commit()


class TestCaptureFormDialogCreateNew(FrappeTestCase):
	"""create_new=1 always inserts; copy_from copies desk settings."""

	@patch("nce_events.api.form_dialog.capture._require_system_manager")
	@patch("nce_events.api.form_dialog.capture._assert_doctype_in_wp_tables")
	def test_create_new_second_dialog_inactive_copies_writeback_and_buttons(
		self, mock_validate, mock_role
	):
		from nce_events.api.form_dialog.capture import capture_form_dialog_from_desk

		suffix = frappe.generate_hash(length=8)
		base_title = f"Create New Source {suffix}"

		source = frappe.get_doc(
			{
				"doctype": "Form Dialog",
				"title": base_title,
				"target_doctype": "Test DocType",
				"frozen_meta_json": '{"fields": []}',
				"captured_at": frappe.utils.now_datetime(),
				"is_active": 1,
				"writeback_on_submit": 1,
				"buttons": [{"label": "Copy Me", "sort_order": 1, "button_script": "test_token"}],
			}
		)
		source.insert(ignore_permissions=True)
		frappe.db.commit()

		mock_field = MagicMock()
		mock_field.as_dict.return_value = {
			"fieldname": "test_field",
			"fieldtype": "Data",
			"label": "Test Field",
		}
		mock_meta = MagicMock()
		mock_meta.fields = [mock_field]

		with patch("nce_events.api.form_dialog.capture.frappe.get_meta", return_value=mock_meta):
			new_name = capture_form_dialog_from_desk(
				doctype="Test DocType",
				title=base_title,
				create_new=1,
				copy_from=base_title,
			)

		self.assertNotEqual(new_name, base_title)
		self.assertTrue(new_name.startswith(base_title))

		new_doc = frappe.get_doc("Form Dialog", new_name)
		self.assertEqual(cint(new_doc.is_active), 0)
		self.assertEqual(cint(new_doc.writeback_on_submit), 1)
		self.assertEqual(len(new_doc.buttons or []), 1)
		self.assertEqual(new_doc.buttons[0].label, "Copy Me")

		source_after = frappe.get_doc("Form Dialog", base_title)
		self.assertEqual(cint(source_after.is_active), 1)

		for name in (new_name, base_title):
			frappe.delete_doc("Form Dialog", name, force=True)
		frappe.db.commit()


if __name__ == "__main__":
	unittest.main()
