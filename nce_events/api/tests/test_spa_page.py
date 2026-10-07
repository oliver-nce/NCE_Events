"""Tests for spa_page switch-page target slug parsing from client script handler strings.

code-index:begin
{
 "purpose": "Tests for spa_page switch-page target slug parsing from client script handler strings.",
 "read_when": "When changing switch-page slug extraction in spa_page config helpers.",
 "gotchas": [],
 "keywords": ["test spa page", "switch page", "slug parsing", "unittest"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import unittest

from nce_events.api.spa_page import switch_page_target_slug


class TestSwitchPageTargetSlug(unittest.TestCase):
	def test_parses_slug(self) -> None:
		self.assertEqual(
			switch_page_target_slug("switch_page(panel-page-native)"),
			"panel-page-native",
		)

	def test_ignores_other_handlers(self) -> None:
		self.assertIsNone(switch_page_target_slug("show_dt(Events)"))

	def test_empty(self) -> None:
		self.assertIsNone(switch_page_target_slug(""))
