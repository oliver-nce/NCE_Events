"""
Unit tests for Query Based Table Link related-tab fetch helpers.

Run with:
    bench run-tests --app nce_events --module nce_events.api.tests.api.form_dialog.test_qbtl_rows
"""

from __future__ import annotations

import json
import sys
import types
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch


def _install_frappe_stub() -> None:
	if "frappe" in sys.modules and hasattr(sys.modules["frappe"], "model"):
		return
	frappe_mod = types.ModuleType("frappe")
	frappe_utils = types.ModuleType("frappe.utils")

	def _cint(val):
		if val in (None, False):
			return 0
		if val is True:
			return 1
		try:
			return int(val)
		except (TypeError, ValueError):
			return 0

	frappe_utils.cint = _cint
	frappe_utils.cstr = lambda v: "" if v is None else str(v)
	frappe_mod.utils = frappe_utils
	frappe_mod.get_doc = MagicMock()
	frappe_mod.db = MagicMock()
	frappe_mod.log_error = MagicMock()
	frappe_mod.get_traceback = MagicMock(return_value="")
	frappe_mod._ = lambda s: s
	frappe_mod.throw = MagicMock(side_effect=RuntimeError)
	frappe_model = types.ModuleType("frappe.model")
	frappe_model_doc = types.ModuleType("frappe.model.document")
	frappe_model_doc.Document = object
	frappe_mod.model = frappe_model
	sys.modules["frappe"] = frappe_mod
	sys.modules["frappe.utils"] = frappe_utils
	sys.modules["frappe.model"] = frappe_model
	sys.modules["frappe.model.document"] = frappe_model_doc


def _install_package_stubs() -> None:
	from pathlib import Path

	root = Path(__file__).resolve().parents[4]
	stubs = {
		"nce_events": root,
		"nce_events.api": root / "api",
		"nce_events.api.form_dialog": root / "api" / "form_dialog",
		"nce_events.api.panel_api_pkg": root / "api" / "panel_api_pkg",
		"nce_events.nce_events": root / "nce_events",
		"nce_events.nce_events.doctype": root / "nce_events" / "doctype",
		"nce_events.nce_events.doctype.query_based_table_link": root
		/ "nce_events"
		/ "doctype"
		/ "query_based_table_link",
	}
	for name, path in stubs.items():
		if name in sys.modules:
			continue
		pkg = types.ModuleType(name)
		pkg.__path__ = [str(path)]
		sys.modules[name] = pkg


_install_frappe_stub()
_install_package_stubs()


class TestParseRelatedQbtl(unittest.TestCase):
	def test_parse_qbtl_selection(self):
		from nce_events.api.form_dialog._fd_related import _parse_related_doctypes_argument

		rows = _parse_related_doctypes_argument(
			[{"query_based_table_link": "LIP-LIP on base order id", "label": "Sibling LIPs"}]
		)
		self.assertEqual(len(rows), 1)
		self.assertEqual(rows[0]["query_based_table_link"], "LIP-LIP on base order id")
		self.assertEqual(rows[0]["label"], "Sibling LIPs")

	def test_qbtl_and_link_deduped_separately(self):
		from nce_events.api.form_dialog._fd_related import _parse_related_doctypes_argument

		payload = [
			{"query_based_table_link": "QBTL-A", "label": "A"},
			{"query_based_table_link": "QBTL-A", "label": "A dup"},
			{"doctype": "People", "link_field": "name", "label": "People"},
		]
		rows = _parse_related_doctypes_argument(payload)
		self.assertEqual(len(rows), 2)


class TestQbtlJoinSql(unittest.TestCase):
	def test_bind_left_join_on(self):
		from nce_events.api.form_dialog.qbtl_rows import _build_qbtl_join_on

		on = _build_qbtl_join_on(
			[{"left_field": "base_line_item_id", "op": "=", "right_field": "base_line_item_id"}],
			bind_side="left",
			bind_alias="bind",
			display_alias="display",
		)
		self.assertEqual(on, "bind.`base_line_item_id` = display.`base_line_item_id`")

	def test_bind_right_join_on(self):
		from nce_events.api.form_dialog.qbtl_rows import _build_qbtl_join_on

		on = _build_qbtl_join_on(
			[{"left_field": "a", "op": "=", "right_field": "b"}],
			bind_side="right",
			bind_alias="bind",
			display_alias="display",
		)
		self.assertEqual(on, "display.`a` = bind.`b`")


class TestFetchQbtlRelatedNames(unittest.TestCase):
	def test_self_join_returns_display_names(self):
		from nce_events.api.form_dialog.qbtl_rows import fetch_qbtl_related_row_names

		qbtl_doc = SimpleNamespace(
			conditions_json=json.dumps(
				[{"left_field": "base_order_id", "op": "=", "right_field": "base_order_id"}]
			)
		)
		with patch("nce_events.api.form_dialog.qbtl_rows.frappe.get_doc", return_value=qbtl_doc):
			with patch(
				"nce_events.api.form_dialog.qbtl_rows.frappe.db.sql",
				return_value=[{"name": "LIP-2"}, {"name": "LIP-3"}],
			) as mock_sql:
				names, force_empty = fetch_qbtl_related_row_names(
					"LIP-LIP on base order id",
					"Line Item Payments",
					"LIP-1",
					bind_doctype="Line Item Payments",
					bind_side="left",
					display_doctype="Line Item Payments",
					hop_chain_raw="[]",
				)

		self.assertFalse(force_empty)
		self.assertEqual(names, ["LIP-2", "LIP-3"])
		sql = mock_sql.call_args[0][0]
		self.assertIn("INNER JOIN", sql)
		self.assertIn("bind.name = %s", sql)


class TestPortalConfigKey(unittest.TestCase):
	def test_qbtl_portal_key(self):
		from nce_events.api.form_dialog._fd_related import _related_tab_portal_config_key

		key = _related_tab_portal_config_key("", "", "[]", query_based_table_link="QBTL-A")
		self.assertEqual(key, "qbtl\0QBTL-A")


if __name__ == "__main__":
	unittest.main()
