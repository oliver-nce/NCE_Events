"""Tests for nce_events.api.panel_api_pkg.discovery."""

from __future__ import annotations

import sys
import types
import unittest
from types import SimpleNamespace
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
	if "frappe" in sys.modules:
		return
	frappe_mod = types.ModuleType("frappe")
	frappe_utils = types.ModuleType("frappe.utils")
	frappe_utils.cint = _cint
	frappe_utils.cstr = lambda v: "" if v is None else str(v)
	frappe_mod.utils = frappe_utils
	frappe_mod.get_all = MagicMock()
	frappe_mod.get_meta = MagicMock()
	frappe_mod.whitelist = lambda *a, **k: (lambda f: f)
	frappe_mod._ = lambda s: s
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
		), patch(
			"nce_events.api.panel_api_pkg.discovery._load_query_based_table_links",
			return_value=[],
		):
			out = get_multi_hop_children("Events")

		one_dts = {r["doctype"] for r in out["1_hop"]["relationships"]}
		self.assertIn("Enrollments", one_dts)
		self.assertIn("Event Metadata", one_dts)

		two_dts = {r["doctype"] for r in out["2_hop"]["relationships"]}
		self.assertIn("People", two_dts)
		self.assertIn("WC Settlement History", two_dts)
		self.assertNotIn("Eligibility", two_dts)

		three_dts = {r["doctype"] for r in out["3_hop"]["relationships"]}
		self.assertIn("Eligibility", three_dts)

		two_labels = [r["label"] for r in out["2_hop"]["relationships"]]
		self.assertFalse(any("Events" in lb for lb in two_labels))

		for key in ("self", "1_hop", "2_hop", "3_hop"):
			self.assertIn("relationships", out[key])
			self.assertIn("query_based_links", out[key])

	def test_self_link_moves_to_self_column(self):
		from nce_events.api.panel_api_pkg.discovery import get_multi_hop_children

		wp = {"Line Item Payments", "Enrollments"}

		def fake_get_meta(doctype: str):
			if doctype == "Line Item Payments":
				return _meta(
					_field("parent_id", "Link", "Line Item Payments"),
					_field("enrollment_id", "Link", "Enrollments"),
				)
			if doctype == "Enrollments":
				return _meta(_field("product_id", "Link", "Events"))
			return _meta()

		with patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_all",
			return_value=_wp_rows(*sorted(wp)),
		), patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_meta",
			side_effect=fake_get_meta,
		), patch(
			"nce_events.api.panel_api_pkg.discovery._find_link_field",
			return_value=None,
		), patch(
			"nce_events.api.panel_api_pkg.discovery._load_query_based_table_links",
			return_value=[],
		):
			out = get_multi_hop_children("Line Item Payments")

		self_rows = [r for r in out["1_hop"]["relationships"] if r["doctype"] == "Line Item Payments"]
		self.assertEqual(self_rows, [])

		self_col = out["self"]["relationships"]
		self_links = [r for r in self_col if r.get("link_field") == "parent_id"]
		self.assertEqual(len(self_links), 1)

	def test_same_doc_group_lists_scalar_fields_excluding_self_link(self):
		from nce_events.api.panel_api_pkg.discovery import get_multi_hop_children

		wp = {"Line Item Payments", "Enrollments"}

		def fake_get_meta(doctype: str):
			if doctype == "Line Item Payments":
				return _meta(
					_field("parent_id", "Link", "Line Item Payments"),
					_field("base_line_item_id", "Int"),
					_field("enrollment_id", "Link", "Enrollments"),
				)
			if doctype == "Enrollments":
				return _meta(_field("product_id", "Link", "Events"))
			return _meta()

		with patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_all",
			return_value=_wp_rows(*sorted(wp)),
		), patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_meta",
			side_effect=fake_get_meta,
		), patch(
			"nce_events.api.panel_api_pkg.discovery._find_link_field",
			return_value=None,
		), patch(
			"nce_events.api.panel_api_pkg.discovery._load_query_based_table_links",
			return_value=[],
		):
			out = get_multi_hop_children("Line Item Payments")

		group = out["self"]["relationships"]
		group_fns = {
			r["link_field"]
			for r in group
			if "group by" in str(r.get("label") or "")
		}
		self.assertIn("base_line_item_id", group_fns)
		self.assertNotIn("parent_id", group_fns)
		self_link_fns = {
			r["link_field"] for r in group if "self-Link" in str(r.get("label") or "")
		}
		self.assertIn("parent_id", self_link_fns)

	def test_qbtl_mixed_path_two_hop(self):
		from nce_events.api.panel_api_pkg.discovery import get_multi_hop_children

		wp = {"Events", "Enrollments", "People"}
		qbtl = [
			{
				"name": "Enrollments to People",
				"title": "Enrollments to People",
				"left_table": "Enrollments",
				"right_table": "People",
			}
		]

		def fake_get_meta(doctype: str):
			if doctype == "Events":
				return _meta()
			if doctype == "Enrollments":
				return _meta(
					_field("product_id", "Link", "Events"),
					_field("player_id", "Link", "People"),
				)
			return _meta()

		with patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_all",
			return_value=_wp_rows(*sorted(wp)),
		), patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_meta",
			side_effect=fake_get_meta,
		), patch(
			"nce_events.api.panel_api_pkg.discovery._find_link_field",
			return_value=None,
		), patch(
			"nce_events.api.panel_api_pkg.discovery._load_query_based_table_links",
			return_value=qbtl,
		):
			out = get_multi_hop_children("Events")

		two_q = out["2_hop"]["query_based_links"]
		self.assertEqual(len(two_q), 1)
		self.assertEqual(two_q[0]["name"], "Enrollments to People")

	def test_qbtl_self_join_on_root(self):
		from nce_events.api.panel_api_pkg.discovery import get_multi_hop_children

		wp = {"Line Item Payments"}
		qbtl = [
			{
				"name": "LIP self",
				"title": "LIP self",
				"left_table": "Line Item Payments",
				"right_table": "Line Item Payments",
			}
		]

		def fake_get_meta(doctype: str):
			if doctype == "Line Item Payments":
				return _meta(_field("base_line_item_id", "Int"))
			return _meta()

		with patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_all",
			return_value=_wp_rows(*sorted(wp)),
		), patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_meta",
			side_effect=fake_get_meta,
		), patch(
			"nce_events.api.panel_api_pkg.discovery._load_query_based_table_links",
			return_value=qbtl,
		):
			out = get_multi_hop_children("Line Item Payments")

		self.assertEqual(len(out["self"]["query_based_links"]), 1)
		self.assertEqual(out["self"]["query_based_links"][0]["name"], "LIP self")

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

	def test_includes_self_link(self):
		from nce_events.api.panel_api_pkg.discovery import get_child_doctypes

		wp_rows = [
			{
				"frappe_doctype": "Line Item Payments",
				"nce_name": "Line Item Payments",
				"table_name": "line_item_payments",
			},
		]

		def fake_get_meta(doctype: str):
			return SimpleNamespace(
				issingle=0,
				is_virtual=0,
				fields=[_field("parent_id", "Link", "Line Item Payments")],
			)

		with patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_all",
			return_value=wp_rows,
		), patch(
			"nce_events.api.panel_api_pkg.discovery.frappe.get_meta",
			side_effect=fake_get_meta,
		):
			result = get_child_doctypes("Line Item Payments")

		self.assertEqual(len(result), 1)
		self.assertEqual(result[0]["doctype"], "Line Item Payments")
		self.assertEqual(result[0]["link_field"], "parent_id")


if __name__ == "__main__":
	unittest.main()
