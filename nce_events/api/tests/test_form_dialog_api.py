"""
Unit tests for form_dialog_api.py.

Run with: bench run-tests --app nce_events --module nce_events.api.tests.test_form_dialog_api
"""

import json
import unittest
from unittest.mock import MagicMock, patch

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

	@patch("nce_events.api.form_dialog_api._require_system_manager")
	def test_buttons_returned_in_sort_order(self, mock_role):
		"""Buttons must be returned sorted by sort_order ascending."""
		from nce_events.api.form_dialog_api import get_form_dialog_definition

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


if __name__ == "__main__":
	unittest.main()
