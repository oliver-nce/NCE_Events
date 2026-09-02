"""Tests for WP Tables catalog sync-status helpers on get_panel_data."""

from __future__ import annotations

import sys
import types
import unittest
from unittest.mock import MagicMock


def _cint(val):
	if val in (None, False):
		return 0
	if val is True:
		return 1
	try:
		return int(val)
	except (TypeError, ValueError):
		return 0


def _install_frappe_stub() -> None:
	if "frappe" in sys.modules:
		return
	frappe_mod = types.ModuleType("frappe")
	frappe_utils = types.ModuleType("frappe.utils")
	frappe_utils.cint = _cint
	frappe_utils.cstr = lambda v: "" if v is None else str(v)
	frappe_mod.utils = frappe_utils
	frappe_mod.get_doc = MagicMock()
	frappe_mod.get_cached_doc = MagicMock()
	frappe_mod.has_permission = MagicMock(return_value=True)
	frappe_mod.throw = MagicMock(side_effect=RuntimeError)
	frappe_mod.session = types.SimpleNamespace(user="Administrator")
	frappe_mod._ = lambda s: s
	frappe_mod.db = MagicMock()
	frappe_mod.get_all = MagicMock()
	frappe_mod.get_meta = MagicMock()
	frappe_mod.whitelist = lambda *a, **k: (lambda f: f)
	sys.modules["frappe"] = frappe_mod
	sys.modules["frappe.utils"] = frappe_utils


def _install_package_stubs() -> None:
	from pathlib import Path

	root = Path(__file__).resolve().parents[4]
	stubs = {
		"nce_events": root,
		"nce_events.api": root / "api",
		"nce_events.api.panel_api_pkg": root / "api" / "panel_api_pkg",
	}
	for name, path in stubs.items():
		if name in sys.modules:
			continue
		pkg = types.ModuleType(name)
		pkg.__path__ = [str(path)]
		sys.modules[name] = pkg


_install_frappe_stub()
_install_package_stubs()

from nce_events.api.panel_api_pkg.panel_data import (
	_flag_last_sync_status_column,
	_format_sync_duration,
	_insert_elapsed_column,
	_merge_latest_sync_log,
)


class TestFlagLastSyncStatusColumn(unittest.TestCase):
	def test_sets_sync_error_drill_on_status_column(self) -> None:
		columns = [
			{"fieldname": "last_synced", "label": "Last Synced"},
			{"fieldname": "last_sync_status", "label": "Last Sync Status"},
		]
		_flag_last_sync_status_column(columns)
		self.assertTrue(columns[1].get("sync_error_drill"))
		self.assertNotIn("sync_error_drill", columns[0])

	def test_noop_when_status_column_missing(self) -> None:
		columns = [{"fieldname": "name", "label": "ID"}]
		_flag_last_sync_status_column(columns)
		self.assertEqual(columns, [{"fieldname": "name", "label": "ID"}])


class TestMergeLatestSyncLog(unittest.TestCase):
	def test_fills_empty_last_sync_log_and_error_fields(self) -> None:
		rows = [{"name": "tbl-1", "last_sync_log": ""}]
		_merge_latest_sync_log(
			rows,
			{"tbl-1": {"error_message": "lock held", "name": "SLOG-1"}},
			{"tbl-1": {"last_sync_log": "Pre-flight lock check found blockers"}},
		)
		self.assertEqual(rows[0]["last_sync_log"], "Pre-flight lock check found blockers")
		self.assertEqual(rows[0]["last_sync_error_message"], "lock held")
		self.assertEqual(rows[0]["last_sync_log_name"], "SLOG-1")
		self.assertEqual(rows[0]["last_sync_duration"], "")

	def test_keeps_existing_last_sync_log(self) -> None:
		rows = [{"name": "tbl-1", "last_sync_log": "already set"}]
		_merge_latest_sync_log(
			rows,
			{},
			{"tbl-1": {"last_sync_log": "from wp tables"}},
		)
		self.assertEqual(rows[0]["last_sync_log"], "already set")
		self.assertEqual(rows[0]["last_sync_error_message"], "")
		self.assertEqual(rows[0]["last_sync_log_name"], "")
		self.assertEqual(rows[0]["last_sync_duration"], "")

	def test_formats_duration_seconds(self) -> None:
		rows = [{"name": "tbl-1", "last_sync_log": "x"}]
		_merge_latest_sync_log(
			rows,
			{"tbl-1": {"error_message": "", "name": "SLOG-1", "duration_seconds": 183.2}},
			{},
		)
		self.assertEqual(rows[0]["last_sync_duration"], "3m 03s")


class TestFormatSyncDuration(unittest.TestCase):
	def test_seconds(self) -> None:
		self.assertEqual(_format_sync_duration(32), "32s")

	def test_minutes(self) -> None:
		self.assertEqual(_format_sync_duration(183), "3m 03s")

	def test_hours(self) -> None:
		self.assertEqual(_format_sync_duration(3723), "1h 02m 03s")

	def test_empty(self) -> None:
		self.assertEqual(_format_sync_duration(None), "")
		self.assertEqual(_format_sync_duration(""), "")


class TestInsertElapsedColumn(unittest.TestCase):
	def test_inserts_after_last_synced(self) -> None:
		columns = [
			{"fieldname": "last_synced", "label": "Last Synced"},
			{"fieldname": "last_sync_status", "label": "Last Sync Status"},
		]
		_insert_elapsed_column(columns)
		self.assertEqual(
			[c["fieldname"] for c in columns],
			["last_synced", "last_sync_duration", "last_sync_status"],
		)
		self.assertEqual(columns[1]["label"], "Elapsed")

	def test_idempotent(self) -> None:
		columns = [
			{"fieldname": "last_synced", "label": "Last Synced"},
			{"fieldname": "last_sync_duration", "label": "Elapsed"},
		]
		_insert_elapsed_column(columns)
		self.assertEqual(len(columns), 2)


if __name__ == "__main__":
	unittest.main()
