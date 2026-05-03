"""Tests for nce_events.api.derived_fields (composition over sql_eval + wp_tables_mapping)."""

from __future__ import annotations

import json
import unittest
from unittest.mock import MagicMock, patch

import frappe

from nce_events.api.derived_fields import (
	_split_sql_code_and_string_literals,
	apply_derived_fields_to_doc,
	evaluate_derived_fields,
	get_derived_field_specs,
)


class TestSplitSqlLiterals(unittest.TestCase):
	def test_concat_literal_not_substituted(self):
		segs = _split_sql_code_and_string_literals("CONCAT('event_name=', event_name)")
		self.assertEqual(
			segs,
			[
				("code", "CONCAT("),
				("str", "event_name="),
				("code", ", event_name)"),
			],
		)

	def test_escaped_quote_inside_string(self):
		segs = _split_sql_code_and_string_literals("CONCAT('a''b', x)")
		self.assertIn(("str", "a'b"), segs)


class TestGetDerivedFieldSpecs(unittest.TestCase):
	@patch("nce_events.api.wp_tables_mapping.frappe.get_all")
	def test_parses_mapping(self, mock_all):
		mapping = {
			"sku": {
				"fieldname": "sku",
				"is_derived": 1,
				"sql_expression": "LOWER(event_name)",
			},
		}
		mock_all.return_value = [{"column_mapping": json.dumps(mapping)}]
		specs = get_derived_field_specs("Some DocType")
		self.assertEqual(len(specs), 1)
		self.assertEqual(specs[0]["fieldname"], "sku")
		self.assertEqual(specs[0]["sql_expression"], "LOWER(event_name)")

	@patch("nce_events.api.wp_tables_mapping.frappe.get_all")
	def test_empty_when_no_row(self, mock_all):
		mock_all.return_value = []
		self.assertEqual(get_derived_field_specs("Some DocType"), [])


class TestEvaluateDerivedFields(unittest.TestCase):
	@patch("nce_events.api.sql_eval.frappe.db.sql")
	@patch("nce_events.api.sql_eval.frappe.get_meta")
	@patch("nce_events.api.wp_tables_mapping.frappe.get_all")
	def test_single_select_and_params(self, mock_all, mock_meta, mock_sql):
		mapping = {
			"sku": {
				"fieldname": "sku",
				"is_derived": 1,
				"sql_expression": "CONCAT('event_name=', event_name)",
			},
		}
		mock_all.return_value = [{"column_mapping": json.dumps(mapping)}]
		df = MagicMock()
		df.fieldname = "event_name"
		mock_meta.return_value.fields = [df]
		mock_sql.return_value = [{"sku": "event_name=Camp"}]

		out = evaluate_derived_fields("Some DocType", {"event_name": "Camp"})
		self.assertEqual(out["sku"], "event_name=Camp")
		mock_sql.assert_called_once()
		sql, params = mock_sql.call_args[0][:2]
		self.assertIn("FROM DUAL", sql)
		self.assertIn("event_name=", sql)
		self.assertEqual(params.get("event_name"), "Camp")

	@patch("nce_events.api.sql_eval.frappe.db.sql")
	@patch("nce_events.api.sql_eval.frappe.get_meta")
	@patch("nce_events.api.wp_tables_mapping.frappe.get_all")
	def test_sql_error_throws(self, mock_all, mock_meta, mock_sql):
		mapping = {
			"x": {"fieldname": "bad", "is_derived": 1, "sql_expression": "1/0"},
		}
		mock_all.return_value = [{"column_mapping": json.dumps(mapping)}]
		mock_meta.return_value.fields = []
		mock_sql.side_effect = Exception("boom")

		with self.assertRaises(frappe.ValidationError):
			evaluate_derived_fields("Some DocType", {})


class TestApplyDerivedFieldsToDoc(unittest.TestCase):
	@patch("nce_events.api.derived_fields.evaluate_derived_fields")
	def test_in_place_updates_original(self, mock_eval):
		mock_eval.return_value = {"sku": "S1", "year": 2026}
		doc = {"doctype": "Some DocType", "event_name": "X"}
		out = apply_derived_fields_to_doc("Some DocType", doc, in_place=True)
		self.assertIs(out, doc)
		self.assertEqual(doc["sku"], "S1")
		self.assertEqual(doc["year"], 2026)

	@patch("nce_events.api.derived_fields.evaluate_derived_fields")
	def test_copy_leaves_original_unchanged(self, mock_eval):
		mock_eval.return_value = {"sku": "S2"}
		doc = {"doctype": "Some DocType", "event_name": "Y"}
		out = apply_derived_fields_to_doc("Some DocType", doc, in_place=False)
		self.assertIsNot(out, doc)
		self.assertNotIn("sku", doc)
		self.assertEqual(out["sku"], "S2")
		self.assertEqual(out["event_name"], "Y")

	@patch("nce_events.api.derived_fields.evaluate_derived_fields")
	def test_no_derived_returns_same_doc(self, mock_eval):
		mock_eval.return_value = {}
		doc = {"a": 1}
		out = apply_derived_fields_to_doc("Some DocType", doc, in_place=False)
		self.assertEqual(out, doc)


if __name__ == "__main__":
	unittest.main()
