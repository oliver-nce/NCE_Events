"""Tests for Form Dialog related-tab edit conditions.

Run:
	bench run-tests --app nce_events --module nce_events.api.tests.api.form_dialog.test_edit_condition
"""

import frappe
from frappe.tests.utils import FrappeTestCase
from unittest.mock import patch


class TestValidateEditCondition(FrappeTestCase):
	def test_empty_returns_empty(self):
		from nce_events.api.form_dialog.edit_condition import validate_edit_condition

		self.assertEqual(validate_edit_condition("", "DocType"), "")

	def test_rejects_semicolon(self):
		from nce_events.api.form_dialog.edit_condition import validate_edit_condition

		with self.assertRaises(frappe.ValidationError):
			validate_edit_condition("1=1; DROP tabDocType", "DocType")

	def test_rejects_select_from(self):
		from nce_events.api.form_dialog.edit_condition import validate_edit_condition

		with self.assertRaises(frappe.ValidationError):
			validate_edit_condition("SELECT 1 FROM tabDocType", "DocType")

	def test_rejects_forbidden_keyword(self):
		from nce_events.api.form_dialog.edit_condition import validate_edit_condition

		with self.assertRaises(frappe.ValidationError):
			validate_edit_condition("delete from x", "DocType")

	def test_rejects_unbalanced_parens(self):
		from nce_events.api.form_dialog.edit_condition import validate_edit_condition

		with self.assertRaises(frappe.ValidationError):
			validate_edit_condition("(docstatus = 0", "DocType")

	@patch("nce_events.api.form_dialog.edit_condition.frappe.db.sql")
	def test_accepts_valid_condition(self, mock_sql):
		from nce_events.api.form_dialog.edit_condition import validate_edit_condition

		mock_sql.return_value = [(1,)]
		out = validate_edit_condition("docstatus = 0", "DocType")
		self.assertEqual(out, "docstatus = 0")
		mock_sql.assert_called_once()


class TestEvaluateEditCondition(FrappeTestCase):
	def test_empty_is_true(self):
		from nce_events.api.form_dialog.edit_condition import evaluate_edit_condition

		self.assertTrue(evaluate_edit_condition("", "DocType", "X"))

	def test_unsaved_root_is_false(self):
		from nce_events.api.form_dialog.edit_condition import evaluate_edit_condition

		self.assertFalse(evaluate_edit_condition("docstatus = 0", "DocType", None))
		self.assertFalse(evaluate_edit_condition("docstatus = 0", "DocType", ""))

	@patch("nce_events.api.form_dialog.edit_condition.frappe.db.sql")
	def test_truthy_result(self, mock_sql):
		from nce_events.api.form_dialog.edit_condition import evaluate_edit_condition

		mock_sql.return_value = [(1,)]
		self.assertTrue(evaluate_edit_condition("docstatus = 0", "DocType", "DT-1"))

	@patch("nce_events.api.form_dialog.edit_condition.frappe.db.sql")
	def test_falsy_result(self, mock_sql):
		from nce_events.api.form_dialog.edit_condition import evaluate_edit_condition

		mock_sql.return_value = [(0,)]
		self.assertFalse(evaluate_edit_condition("docstatus = 0", "DocType", "DT-1"))

	@patch("nce_events.api.form_dialog.edit_condition.frappe.log_error")
	@patch("nce_events.api.form_dialog.edit_condition.frappe.db.sql", side_effect=Exception("boom"))
	def test_sql_error_fail_closed(self, mock_sql, mock_log):
		from nce_events.api.form_dialog.edit_condition import evaluate_edit_condition

		self.assertFalse(evaluate_edit_condition("docstatus = 0", "DocType", "DT-1"))
		mock_log.assert_called_once()


class TestResolveEditConditionLabels(FrappeTestCase):
	@patch(
		"nce_events.api.form_dialog.edit_condition._edit_condition_fieldnames_for_root",
		return_value=["title"],
	)
	def test_backtick_label_resolves(self, mock_fns):
		from nce_events.api.form_dialog.edit_condition import resolve_edit_condition_labels

		meta = frappe.get_meta("DocType")
		with patch.object(meta, "get_field") as mock_get:
			mock_df = frappe._dict(label="Title", fieldname="title")
			mock_get.return_value = mock_df
			with patch(
				"nce_events.api.form_dialog.edit_condition.frappe.get_meta",
				return_value=meta,
			):
				out = resolve_edit_condition_labels("`Title` = 'x'", "DocType")
		self.assertEqual(out, "title = 'x'")

	@patch(
		"nce_events.api.form_dialog.edit_condition._edit_condition_fieldnames_for_root",
		return_value=[],
	)
	def test_quoted_literal_not_rewritten(self, mock_fns):
		from nce_events.api.form_dialog.edit_condition import resolve_edit_condition_labels

		out = resolve_edit_condition_labels("name = 'Some Label'", "DocType")
		self.assertEqual(out, "name = 'Some Label'")
