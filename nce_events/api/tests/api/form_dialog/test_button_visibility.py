"""Tests for Form Dialog custom button hide rules.

Run:
	bench run-tests --app nce_events --module nce_events.api.tests.api.form_dialog.test_button_visibility
"""

import frappe
from frappe.tests.utils import FrappeTestCase
from unittest.mock import patch


class TestValidateHideSql(FrappeTestCase):
	def test_accepts_simple_select(self):
		from nce_events.api.form_dialog.button_visibility import validate_hide_if_sql

		s = validate_hide_if_sql("SELECT 1")
		self.assertEqual(s, "SELECT 1")

	def test_rejects_non_select(self):
		from nce_events.api.form_dialog.button_visibility import validate_hide_if_sql

		with self.assertRaises(frappe.ValidationError):
			validate_hide_if_sql("UPDATE tabItem SET stock = 0")

	def test_rejects_multiple_statements(self):
		from nce_events.api.form_dialog.button_visibility import validate_hide_if_sql

		with self.assertRaises(frappe.ValidationError):
			validate_hide_if_sql("SELECT 1; SELECT 2")


class TestButtonShouldHide(FrappeTestCase):
	def test_never_and_saved(self):
		from nce_events.api.form_dialog.button_visibility import (
			HIDE_IF_NEVER,
			HIDE_IF_NOT_SAVED,
			HIDE_IF_SAVED,
			button_should_hide,
		)

		self.assertFalse(button_should_hide(HIDE_IF_NEVER, None, None))
		self.assertFalse(button_should_hide(HIDE_IF_NEVER, "ABC", None))
		self.assertTrue(button_should_hide(HIDE_IF_NOT_SAVED, None, None))
		self.assertFalse(button_should_hide(HIDE_IF_NOT_SAVED, "X", None))
		self.assertTrue(button_should_hide(HIDE_IF_SAVED, "X", None))
		self.assertFalse(button_should_hide(HIDE_IF_SAVED, None, None))


class TestHiddenMapIntegration(FrappeTestCase):
	@patch("nce_events.nce_events.doctype.form_dialog.form_dialog._assert_doctype_in_wp_tables")
	def test_map_respects_modes(self, mock_wp):
		mock_wp.return_value = None
		from nce_events.api.form_dialog.button_visibility import get_form_dialog_button_hidden_map

		doc = frappe.get_doc(
			{
				"doctype": "Form Dialog",
				"title": "Btn Hide Test " + frappe.generate_hash(length=6),
				"target_doctype": "DocType",
				"frozen_meta_json": '{"fields": []}',
				"captured_at": frappe.utils.now_datetime(),
				"is_active": 1,
				"buttons": [
					{"label": "A", "sort_order": 1, "hide_if": "Never"},
					{"label": "B", "sort_order": 2, "hide_if": "Record not saved"},
					{"label": "C", "sort_order": 3, "hide_if": "Record saved"},
				],
			}
		)
		doc.insert(ignore_permissions=True)
		frappe.db.commit()
		try:
			m1 = get_form_dialog_button_hidden_map(doc.name, None)
			b1 = [k for k, v in m1.items() if v]
			self.assertEqual(len(b1), 1)

			m2 = get_form_dialog_button_hidden_map(doc.name, "SomeName")
			b2 = [k for k, v in m2.items() if v]
			self.assertEqual(len(b2), 1)
		finally:
			frappe.delete_doc("Form Dialog", doc.name, force=True)
			frappe.db.commit()
