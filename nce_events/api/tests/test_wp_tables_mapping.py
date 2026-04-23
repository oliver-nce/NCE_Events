"""Tests for nce_events.api.wp_tables_mapping."""

from __future__ import annotations

import unittest
from unittest.mock import patch

from nce_events.api.wp_tables_mapping import (
	derived_sql_specs_from_column_mapping,
	get_derived_sql_specs,
)


class TestDerivedSqlSpecsFromColumnMapping(unittest.TestCase):
	def test_extracts_derived_only(self):
		cm = {
			"plain": "event_name",
			"sku": {
				"fieldname": "sku",
				"is_derived": 1,
				"sql_expression": "LOWER(event_name)",
			},
			"bad": {"is_derived": 1, "sql_expression": "", "fieldname": "x"},
		}
		specs = derived_sql_specs_from_column_mapping(cm)
		self.assertEqual(len(specs), 1)
		self.assertEqual(specs[0]["fieldname"], "sku")


class TestGetDerivedSqlSpecs(unittest.TestCase):
	@patch("nce_events.api.wp_tables_mapping.get_wp_tables_column_mapping")
	def test_delegates_to_mapping_and_filter(self, mock_cm):
		mock_cm.return_value = {
			"sku": {"fieldname": "sku", "is_derived": 1, "sql_expression": "LOWER(x)"},
		}
		specs = get_derived_sql_specs("Any DocType")
		self.assertEqual(len(specs), 1)
		self.assertEqual(specs[0]["sql_expression"], "LOWER(x)")
		mock_cm.assert_called_once_with("Any DocType")

	@patch("nce_events.api.wp_tables_mapping.get_wp_tables_column_mapping")
	def test_empty_mapping(self, mock_cm):
		mock_cm.return_value = {}
		self.assertEqual(get_derived_sql_specs("X"), [])


if __name__ == "__main__":
	unittest.main()
