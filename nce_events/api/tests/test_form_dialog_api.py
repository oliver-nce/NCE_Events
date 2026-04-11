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

	def test_buttons_returned_in_sort_order(self):
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


class TestListFormDialogsForDoctype(FrappeTestCase):
	"""list_form_dialogs_for_doctype attaches related_doctypes (desk summary, no info)."""

	@patch("nce_events.api.form_dialog_api._require_system_manager")
	def test_list_includes_related_doctypes(self, mock_sm):
		from nce_events.api.form_dialog_api import list_form_dialogs_for_doctype

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


class TestRelatedPortalFieldEditor(FrappeTestCase):
	"""get_related_portal_field_editor + save_related_portal_field_config."""

	@patch("nce_events.api.form_dialog_api._require_system_manager")
	def test_save_persists_portal_field_config(self, mock_sm):
		from nce_events.api.form_dialog_api import (
			get_related_portal_field_editor,
			save_related_portal_field_config,
		)

		title = "Portal Ed " + frappe.generate_hash(length=8)
		doc = frappe.get_doc(
			{
				"doctype": "Form Dialog",
				"title": title,
				"target_doctype": "DocType",
				"frozen_meta_json": '{"fields": []}',
				"captured_at": frappe.utils.now_datetime(),
				"is_active": 1,
				"related_doctypes": [
					{"child_doctype": "User", "link_field": "owner", "tab_label": "Staff"},
				],
			}
		)
		doc.insert(ignore_permissions=True)
		frappe.db.commit()

		child_name = doc.related_doctypes[0].name
		data = get_related_portal_field_editor(title, child_name)
		self.assertIn("rows", data)
		self.assertGreater(len(data["rows"]), 0)
		fn0 = data["rows"][0]["fieldname"]

		save_related_portal_field_config(
			title,
			child_name,
			[{"fieldname": fn0, "show": 1, "editable": 1}],
		)

		doc.reload()
		raw = doc.related_doctypes[0].portal_field_config or "[]"
		cfg = json.loads(raw)
		self.assertEqual(len(cfg), 1)
		self.assertEqual(cfg[0]["fieldname"], fn0)
		self.assertEqual(cfg[0]["show"], 1)
		self.assertEqual(cfg[0]["editable"], 1)

		frappe.delete_doc("Form Dialog", title, force=True)
		frappe.db.commit()


class TestParseRelatedDoctypes(unittest.TestCase):
	"""related_doctypes JSON from Page Panel Desk (get_child_doctypes shape)."""

	def test_json_string_roundtrip(self):
		from nce_events.api.form_dialog_api import _parse_related_doctypes_argument

		payload = json.dumps(
			[{"doctype": "People", "link_field": "family", "label": "People"}]
		)
		rows = _parse_related_doctypes_argument(payload)
		self.assertEqual(len(rows), 1)
		self.assertEqual(rows[0]["doctype"], "People")
		self.assertEqual(rows[0]["link_field"], "family")
		self.assertEqual(rows[0]["label"], "People")

	def test_dedupes_by_doctype(self):
		from nce_events.api.form_dialog_api import _parse_related_doctypes_argument

		rows = _parse_related_doctypes_argument(
			[
				{"doctype": "People", "link_field": "a", "label": "A"},
				{"doctype": "People", "link_field": "b", "label": "B"},
			]
		)
		self.assertEqual(len(rows), 1)
		self.assertEqual(rows[0]["link_field"], "a")

	def test_skips_missing_link_field(self):
		from nce_events.api.form_dialog_api import _parse_related_doctypes_argument

		rows = _parse_related_doctypes_argument([{"doctype": "People", "label": "P"}])
		self.assertEqual(rows, [])


if __name__ == "__main__":
	unittest.main()
