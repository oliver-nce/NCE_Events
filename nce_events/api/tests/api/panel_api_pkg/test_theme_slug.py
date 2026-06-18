"""Tests for Page Panel theme slug resolution (live Default vs stale links)."""

from __future__ import annotations

import sys
import types
import unittest
from unittest.mock import MagicMock, patch


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
	frappe_mod = types.ModuleType("frappe")
	frappe_utils = types.ModuleType("frappe.utils")
	frappe_utils.cint = _cint
	frappe_mod.utils = frappe_utils
	frappe_mod.db = MagicMock()
	frappe_mod.get_all = MagicMock()
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

from nce_events.api.panel_api_pkg.theme_slug import resolve_theme_slug


def _theme_rows():
	return {
		"Default": {
			"is_default": 0,
			"theme_name": "Default",
			"slug": "default",
			"status": "Active",
		},
		"NCE": {
			"is_default": 1,
			"theme_name": "NCE",
			"slug": "nce",
			"status": "Active",
		},
		"Ocean": {
			"is_default": 0,
			"theme_name": "Ocean",
			"slug": "ocean",
			"status": "Active",
		},
	}


def _mock_get_value(rows):
	def get_value(doctype, name, fieldname):
		row = rows[name]
		if isinstance(fieldname, list):
			return [row[f] for f in fieldname]
		return row[fieldname]

	return get_value


class TestResolveThemeSlug(unittest.TestCase):
	def test_blank_link_inherits_site_base(self):
		self.assertIsNone(resolve_theme_slug(None))
		self.assertIsNone(resolve_theme_slug(""))

	def test_stale_default_doc_follows_live_default(self):
		rows = _theme_rows()
		with patch("nce_events.api.panel_api_pkg.theme_slug.frappe") as frappe_mock:
			frappe_mock.db.exists.return_value = True
			frappe_mock.get_all.return_value = ["NCE"]
			frappe_mock.db.get_value.side_effect = _mock_get_value(rows)
			result = resolve_theme_slug("Default")

		self.assertEqual(result, "nce")

	def test_explicit_override_uses_linked_theme(self):
		rows = _theme_rows()
		with patch("nce_events.api.panel_api_pkg.theme_slug.frappe") as frappe_mock:
			frappe_mock.db.exists.return_value = True
			frappe_mock.get_all.return_value = ["NCE"]
			frappe_mock.db.get_value.side_effect = _mock_get_value(rows)
			result = resolve_theme_slug("Ocean")

		self.assertEqual(result, "ocean")

	def test_current_default_doc_resolves_its_slug(self):
		rows = _theme_rows()
		with patch("nce_events.api.panel_api_pkg.theme_slug.frappe") as frappe_mock:
			frappe_mock.db.exists.return_value = True
			frappe_mock.get_all.return_value = ["NCE"]
			frappe_mock.db.get_value.side_effect = _mock_get_value(rows)
			result = resolve_theme_slug("NCE")

		self.assertEqual(result, "nce")


if __name__ == "__main__":
	unittest.main()
