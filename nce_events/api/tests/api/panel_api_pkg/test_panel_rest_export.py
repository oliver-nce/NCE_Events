"""Tests for Page Panel REST CSV export helpers."""

from __future__ import annotations

import sys
import types
import unittest
from unittest.mock import MagicMock


def _install_frappe_stub() -> None:
	if "frappe" in sys.modules:
		return
	frappe_mod = types.ModuleType("frappe")
	frappe_mod.db = MagicMock()
	frappe_mod.get_doc = MagicMock()
	frappe_mod.throw = MagicMock(side_effect=RuntimeError)
	frappe_mod.has_permission = MagicMock(return_value=True)
	frappe_mod.utils = types.ModuleType("frappe.utils")
	sys.modules["frappe"] = frappe_mod


_install_frappe_stub()

from nce_events.api.panel_api_pkg.panel_export import (
	_csv_export_columns,
	build_panel_csv_text,
)


class TestCsvExportColumns(unittest.TestCase):
	def test_appends_search_only_not_in_visible_columns(self):
		columns = [{"fieldname": "name", "label": "ID"}]
		config = {
			"search_only_columns": [
				{"fieldname": "session1_time", "label": "Session1 Time"},
			],
		}
		out = _csv_export_columns(columns, config)
		self.assertEqual([c["fieldname"] for c in out], ["name", "session1_time"])

	def test_does_not_duplicate_search_only_already_shown(self):
		columns = [{"fieldname": "name", "label": "ID"}]
		config = {
			"search_only_columns": [{"fieldname": "name", "label": "ID"}],
		}
		out = _csv_export_columns(columns, config)
		self.assertEqual(len(out), 1)


class TestBuildPanelCsvText(unittest.TestCase):
	def test_header_and_rows(self):
		columns = [
			{"fieldname": "name", "label": "ID"},
			{"fieldname": "session1_time", "label": "Session1 Time"},
		]
		rows = [{"name": "101", "session1_time": "08:00:00"}]
		csv_text = build_panel_csv_text(columns, rows)
		lines = csv_text.strip().splitlines()
		self.assertEqual(lines[0], "ID,Session1 Time")
		self.assertEqual(lines[1], "101,08:00:00")


if __name__ == "__main__":
	unittest.main()
