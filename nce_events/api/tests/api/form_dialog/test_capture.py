"""
Unit tests for nce_events.api.form_dialog.capture.

Run with:
    bench run-tests --app nce_events --module nce_events.api.tests.api.form_dialog.test_capture
"""

import json
import unittest
from unittest.mock import MagicMock, patch

import frappe
from frappe.tests.utils import FrappeTestCase


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


if __name__ == "__main__":
	unittest.main()
