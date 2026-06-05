"""Tests for nce_events.api.panel_api_pkg.discovery."""

from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import patch


def _field(fieldname: str, fieldtype: str, options: str = "") -> SimpleNamespace:
	return SimpleNamespace(fieldname=fieldname, fieldtype=fieldtype, options=options)


def _meta(*fields: SimpleNamespace) -> SimpleNamespace:
	return SimpleNamespace(fields=list(fields))


class TestDiscoverViaLinkPaths(unittest.TestCase):
	def test_enrollments_root_junction_and_eligibility(self):
		from nce_events.api.panel_api_pkg.discovery import _discover_via_link_paths

		wp = {"Enrollments", "People", "Events", "Eligibility"}
		labels = {d: d for d in wp}
		one_hop: list[dict] = []

		def fake_get_meta(doctype: str):
			mapping = {
				"Enrollments": _meta(
					_field("player_id", "Link", "People"),
					_field("product_id", "Link", "Events"),
				),
				"Eligibility": _meta(_field("person_id", "Link", "People")),
			}
			return mapping.get(doctype, _meta())

		with patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_meta",
			side_effect=fake_get_meta,
		):
			one_extra, two_extra = _discover_via_link_paths("Enrollments", one_hop, wp, labels)

		one_dts = {r["doctype"] for r in one_extra}
		self.assertEqual(one_dts, {"People", "Events"})

		elig = next(r for r in two_extra if r["doctype"] == "Eligibility")
		self.assertEqual(elig["link_field"], "person_id")
		self.assertEqual(elig["hop_chain"][0]["child_link"], "player_id")

	def test_events_root_eligibility_via_enrollments_and_people(self):
		from nce_events.api.panel_api_pkg.discovery import _discover_via_link_paths

		wp = {"Enrollments", "People", "Events", "Eligibility"}
		labels = {d: d for d in wp}
		one_hop = [{"doctype": "Enrollments", "link_field": "product_id", "label": "Enrollments", "hop_chain": []}]

		def fake_get_meta(doctype: str):
			mapping = {
				"Enrollments": _meta(
					_field("product_id", "Link", "Events"),
					_field("player_id", "Link", "People"),
				),
				"Eligibility": _meta(_field("person_id", "Link", "People")),
			}
			return mapping.get(doctype, _meta())

		with patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_meta",
			side_effect=fake_get_meta,
		):
			one_extra, two_extra = _discover_via_link_paths("Events", one_hop, wp, labels)

		self.assertEqual(one_extra, [])
		elig = next(r for r in two_extra if r["doctype"] == "Eligibility")
		self.assertEqual(elig["link_field"], "person_id")
		self.assertEqual(elig["hop_chain"][0]["bridge"], "Enrollments")
		self.assertEqual(elig["hop_chain"][0]["parent_link"], "product_id")
		self.assertEqual(elig["hop_chain"][0]["child_link"], "player_id")


class TestGetChildDoctypes(unittest.TestCase):
	def test_excludes_single_doctype_with_link_to_root(self):
		from nce_events.api.panel_api_pkg.discovery import get_child_doctypes

		wp_rows = [
			{"frappe_doctype": "Events", "nce_name": "Events", "table_name": "events"},
			{
				"frappe_doctype": "New Woo Commerce Product",
				"nce_name": "New Woo",
				"table_name": "new_woo",
			},
		]

		def fake_get_meta(doctype: str):
			if doctype == "Events":
				return SimpleNamespace(
					issingle=0,
					is_virtual=0,
					fields=[_field("event_type_id", "Link", "Event Types")],
				)
			if doctype == "New Woo Commerce Product":
				return SimpleNamespace(
					issingle=1,
					is_virtual=0,
					fields=[_field("type_id", "Link", "Event Types")],
				)
			return _meta()

		with patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_all",
			return_value=wp_rows,
		), patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_meta",
			side_effect=fake_get_meta,
		):
			result = get_child_doctypes("Event Types")

		self.assertEqual(len(result), 1)
		self.assertEqual(result[0]["doctype"], "Events")
		self.assertEqual(result[0]["link_field"], "event_type_id")


if __name__ == "__main__":
	unittest.main()
