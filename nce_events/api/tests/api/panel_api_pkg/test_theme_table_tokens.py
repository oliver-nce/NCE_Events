"""Tests for theme table token resolution (Page Panel Colours tab previews)."""

from __future__ import annotations

import sys
import types
import unittest
from unittest.mock import MagicMock, patch


def _install_frappe_stub() -> None:
	frappe_mod = types.ModuleType("frappe")
	frappe_utils = types.ModuleType("frappe.utils")
	frappe_mod._ = lambda s: s
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

from nce_events.api.panel_api_pkg.theme_table_tokens import (
	get_theme_table_tokens,
	normalize_table_width_tier,
	tier_to_border_class,
)


class TestThemeTableTokens(unittest.TestCase):
	def test_normalize_table_width_tier(self) -> None:
		self.assertEqual(normalize_table_width_tier("normal"), "normal")
		self.assertEqual(normalize_table_width_tier("1px"), "normal")
		self.assertEqual(normalize_table_width_tier("bogus"), "thin")

	def test_tier_to_border_class(self) -> None:
		self.assertEqual(tier_to_border_class("normal"), "theme-border")
		self.assertEqual(tier_to_border_class("strong"), "theme-border-strong")

	@patch("nce_events.api.panel_api_pkg.theme_table_tokens._parse_theme_json")
	@patch("nce_events.api.panel_api_pkg.theme_table_tokens._theme_doc_name")
	def test_get_theme_table_tokens_from_payload(
		self, mock_doc_name: MagicMock, mock_parse: MagicMock
	) -> None:
		mock_doc_name.return_value = "Default"
		mock_parse.return_value = {
			"table_header_bg_color": "#0E59C9",
			"row_color": "#DDE5F8",
			"row_alt_color": "#D1D5DB",
			"table_row_divider_color": "#5C89FF",
			"table_col_divider_color": "#5C89FF",
			"table_row_divider_width": "normal",
			"table_col_divider_width": "thin",
		}
		tokens = get_theme_table_tokens("Default")
		self.assertEqual(tokens["header_bg_hex"], "#0E59C9")
		self.assertEqual(tokens["row_divider_width_tier"], "normal")
		self.assertEqual(tokens["col_divider_width_tier"], "thin")
		self.assertEqual(tokens["row_divider_width_class"], "theme-border")
		self.assertEqual(tokens["col_divider_width_class"], "theme-border-thin")
		self.assertEqual(tokens["col_header_line_width_class"], "theme-border")


if __name__ == "__main__":
	unittest.main()
