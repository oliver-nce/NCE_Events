"""Tests for nce_events.api.panel_api_pkg.discovery."""

from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import patch


def _field(fieldname: str, fieldtype: str, options: str = "") -> SimpleNamespace:
	return SimpleNamespace(fieldname=fieldname, fieldtype=fieldtype, options=options)


def _meta(*fields: SimpleNamespace) -> SimpleNamespace:
	return SimpleNamespace(fields=list(fields))


def _events_graph_meta(doctype: str):
	"""Minimal Events / Enrollments / People / Eligibility graph for discovery tests."""
	mapping = {
		"Events": _meta(
			_field("event_type_id", "Link", "Event Types"),
			_field("venue_id", "Link", "Venues"),
		),
		"Enrollments": _meta(
			_field("product_id", "Link", "Events"),
			_field("player_id", "Link", "People"),
			_field("settlement_id", "Link", "WC Settlement History"),
		),
		"Event Metadata": _meta(_field("event_id", "Link", "Events")),
		"Event Sessions": _meta(_field("event_id", "Link", "Events")),
		"Eligibility": _meta(_field("person_id", "Link", "People")),
		"People": _meta(),
		"WC Settlement History": _meta(_field("enrollment_id", "Link", "Enrollments")),
	}
	return mapping.get(doctype, _meta())


def _wp_rows(*doctypes: str) -> list[dict[str, str]]:
	return [{"frappe_doctype": d, "nce_name": d, "table_name": d.lower()} for d in doctypes]


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
			one_extra, two_extra, three_extra = _discover_via_link_paths(
				"Enrollments", one_hop, wp, labels
			)

		one_dts = {r["doctype"] for r in one_extra}
		self.assertEqual(one_dts, {"People", "Events"})
		self.assertEqual(two_extra, [])

		elig = next(r for r in three_extra if r["doctype"] == "Eligibility")
		self.assertEqual(elig["link_field"], "person_id")
		self.assertEqual(elig["hop_chain"][0]["child_link"], "player_id")

	def test_events_root_people_two_hop_and_eligibility_three_hop(self):
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
			one_extra, two_extra, three_extra = _discover_via_link_paths(
				"Events", one_hop, wp, labels
			)

		self.assertEqual(one_extra, [])

		people = next(r for r in two_extra if r["doctype"] == "People")
		self.assertEqual(people["link_field"], "name")
		self.assertEqual(people["hop_chain"][0]["bridge"], "Enrollments")
		self.assertEqual(people["hop_chain"][0]["child_link"], "player_id")

		elig = next(r for r in three_extra if r["doctype"] == "Eligibility")
		self.assertEqual(elig["link_field"], "person_id")
		self.assertEqual(elig["hop_chain"][0]["bridge"], "Enrollments")

	def test_skips_circular_three_hop_when_via_target_is_root(self):
		from nce_events.api.panel_api_pkg.discovery import _discover_via_link_paths

		wp = {"Enrollments", "Events", "Event Metadata"}
		labels = {d: d for d in wp}
		one_hop = [
			{"doctype": "Enrollments", "link_field": "product_id", "label": "Enrollments", "hop_chain": []},
			{"doctype": "Event Metadata", "link_field": "event_id", "label": "Event Metadata", "hop_chain": []},
		]

		def fake_get_meta(doctype: str):
			mapping = {
				"Enrollments": _meta(_field("product_id", "Link", "Events")),
				"Event Metadata": _meta(_field("event_id", "Link", "Events")),
			}
			return mapping.get(doctype, _meta())

		with patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_meta",
			side_effect=fake_get_meta,
		):
			_, two_extra, three_extra = _discover_via_link_paths("Events", one_hop, wp, labels)

		self.assertEqual(two_extra, [])
		labels_3 = [r["label"] for r in three_extra]
		self.assertFalse(any("Enrollments" in lb and "Events" in lb for lb in labels_3))


class TestGetMultiHopChildren(unittest.TestCase):
	def test_events_root_people_two_hop_eligibility_three_hop(self):
		from nce_events.api.panel_api_pkg.discovery import get_multi_hop_children

		wp = {
			"Events",
			"Enrollments",
			"People",
			"Eligibility",
			"Event Metadata",
			"Event Sessions",
			"Event Types",
			"Venues",
			"WC Settlement History",
		}

		with patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_all",
			return_value=_wp_rows(*sorted(wp)),
		), patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_meta",
			side_effect=_events_graph_meta,
		), patch(
			"nce_events.api.panel_api_pkg.discovery._find_link_field",
			return_value=None,
		):
			out = get_multi_hop_children("Events")

		one_dts = {r["doctype"] for r in out["1_hop"]}
		self.assertIn("Enrollments", one_dts)
		self.assertIn("Event Metadata", one_dts)

		two_dts = {r["doctype"] for r in out["2_hop"]}
		self.assertIn("People", two_dts)
		self.assertIn("WC Settlement History", two_dts)
		self.assertNotIn("Eligibility", two_dts)

		three_dts = {r["doctype"] for r in out["3_hop"]}
		self.assertIn("Eligibility", three_dts)

		two_labels = [r["label"] for r in out["2_hop"]]
		self.assertFalse(any("Events" in lb for lb in two_labels))


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
