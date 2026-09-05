"""
Unit tests for Query Based Table Link condition / sort helpers.

Run with:
    bench run-tests --app nce_events --module nce_events.api.tests.api.test_query_based_table_link
"""

import json
import unittest

import frappe

from unittest.mock import patch

from nce_events.nce_events.doctype.query_based_table_link.query_based_table_link import (
	_assert_in_wp_tables,
	build_where_clause,
	normalize_conditions,
	normalize_op,
	normalize_sort,
)


class TestNormalizeOp(unittest.TestCase):
	def test_unicode_and_aliases(self):
		self.assertEqual(normalize_op("≠"), "<>")
		self.assertEqual(normalize_op("!="), "<>")
		self.assertEqual(normalize_op("≤"), "<=")
		self.assertEqual(normalize_op("≥"), ">=")
		self.assertEqual(normalize_op("="), "=")

	def test_rejects_unknown(self):
		with self.assertRaises(frappe.ValidationError):
			normalize_op("LIKE")


class TestNormalizeConditions(unittest.TestCase):
	def test_builds_canonical_clause(self):
		raw = json.dumps(
			[
				{"left_field": "base_line_item_id", "op": "=", "right_field": "base_line_item_id"},
				{"left_field": "status", "op": "≠", "right_field": "status"},
			]
		)
		conds = normalize_conditions(raw)
		self.assertEqual(len(conds), 2)
		self.assertEqual(conds[1]["op"], "<>")
		self.assertEqual(
			build_where_clause(conds),
			"left.base_line_item_id = right.base_line_item_id AND left.status <> right.status",
		)

	def test_empty_list(self):
		self.assertEqual(normalize_conditions("[]"), [])
		self.assertEqual(normalize_conditions(None), [])

	def test_rejects_bad_field(self):
		with self.assertRaises(frappe.ValidationError):
			normalize_conditions([{"left_field": "a;drop", "op": "=", "right_field": "name"}])


class TestNormalizeSort(unittest.TestCase):
	def test_normalizes_dir(self):
		rows = normalize_sort([{"fieldname": "name", "dir": "DESC"}, {"fieldname": "", "dir": "asc"}])
		self.assertEqual(rows, [{"fieldname": "name", "dir": "desc"}])


class TestAssertInWpTables(unittest.TestCase):
	def test_rejects_missing(self):
		with patch(
			"nce_events.nce_events.doctype.query_based_table_link.query_based_table_link.frappe.get_all",
			return_value=[],
		):
			with self.assertRaises(frappe.ValidationError):
				_assert_in_wp_tables("Not A Table")

	def test_accepts_listed(self):
		with patch(
			"nce_events.nce_events.doctype.query_based_table_link.query_based_table_link.frappe.get_all",
			return_value=[{"name": "WP-1"}],
		):
			_assert_in_wp_tables("Line Item Payments")
