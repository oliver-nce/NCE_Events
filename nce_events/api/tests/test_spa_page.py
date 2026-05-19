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
