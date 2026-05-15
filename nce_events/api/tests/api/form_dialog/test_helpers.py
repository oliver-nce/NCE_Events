"""
Unit tests for nce_events.api.form_dialog._helpers.

Run with:
    bench run-tests --app nce_events --module nce_events.api.tests.api.form_dialog.test_helpers
"""

import json
import unittest
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase


class TestAssertDoctypeInWPTables(FrappeTestCase):
	"""Test the WP Tables validation helper."""

	def test_rejects_doctype_not_in_wp_tables(self):
		"""Should raise ValidationError if DocType is not in WP Tables."""
		from nce_events.api.form_dialog._helpers import _assert_doctype_in_wp_tables

		with patch("nce_events.api.form_dialog._helpers.frappe.get_all", return_value=[]):
			with self.assertRaises(frappe.ValidationError):
				_assert_doctype_in_wp_tables("Nonexistent DocType")

	def test_accepts_doctype_in_wp_tables(self):
		"""Should not raise if DocType exists in WP Tables."""
		from nce_events.api.form_dialog._helpers import _assert_doctype_in_wp_tables

		with patch(
			"nce_events.api.form_dialog._helpers.frappe.get_all",
			return_value=[{"name": "WP-001"}],
		):
			# Should not raise
			_assert_doctype_in_wp_tables("Event")


class TestParseRelatedDoctypes(unittest.TestCase):
	"""related_doctypes JSON from Page Panel Desk (picker shape with optional hop_chain)."""

	def test_json_string_roundtrip(self):
		from nce_events.api.form_dialog._helpers import _parse_related_doctypes_argument

		payload = json.dumps([{"doctype": "People", "link_field": "family", "label": "People"}])
		rows = _parse_related_doctypes_argument(payload)
		self.assertEqual(len(rows), 1)
		self.assertEqual(rows[0]["doctype"], "People")
		self.assertEqual(rows[0]["link_field"], "family")
		self.assertEqual(rows[0]["label"], "People")
		self.assertEqual(rows[0].get("hop_chain"), [])

	def test_dedupes_same_doctype_same_hop_chain(self):
		from nce_events.api.form_dialog._helpers import _parse_related_doctypes_argument

		rows = _parse_related_doctypes_argument(
			[
				{"doctype": "People", "link_field": "a", "label": "A"},
				{"doctype": "People", "link_field": "b", "label": "B"},
			]
		)
		self.assertEqual(len(rows), 1)
		self.assertEqual(rows[0]["link_field"], "a")

	def test_keeps_same_doctype_different_hop_chain(self):
		from nce_events.api.form_dialog._helpers import _parse_related_doctypes_argument

		hc1 = [{"bridge": "Enrollment", "parent_link": "event", "child_link": "person"}]
		hc2 = [{"bridge": "Ticket", "parent_link": "event", "child_link": "person"}]
		rows = _parse_related_doctypes_argument(
			[
				{"doctype": "People", "link_field": "name", "label": "Via A", "hop_chain": hc1},
				{"doctype": "People", "link_field": "name", "label": "Via B", "hop_chain": hc2},
			]
		)
		self.assertEqual(len(rows), 2)

	def test_skips_missing_link_field(self):
		from nce_events.api.form_dialog._helpers import _parse_related_doctypes_argument

		rows = _parse_related_doctypes_argument([{"doctype": "People", "label": "P"}])
		self.assertEqual(rows, [])


class TestFiltersForRelatedRows(unittest.TestCase):
	def test_direct_one_hop(self):
		from nce_events.api.form_dialog._helpers import _filters_for_related_rows

		filters, force_empty = _filters_for_related_rows("ROOT", "People", "event", [])
		self.assertFalse(force_empty)
		self.assertEqual(filters, {"event": "ROOT"})

	@patch("nce_events.api.form_dialog._helpers._hop_walk_final_identifiers")
	def test_multihop_no_bridge_rows_force_empty(self, mock_hop):
		from nce_events.api.form_dialog._helpers import _filters_for_related_rows

		mock_hop.return_value = None
		hc = [{"bridge": "Enrollment", "parent_link": "event", "child_link": "person"}]
		filters, force_empty = _filters_for_related_rows("ROOT", "People", "name", hc)
		self.assertTrue(force_empty)
		self.assertEqual(filters, {})

	@patch("nce_events.api.form_dialog._helpers._hop_walk_final_identifiers")
	def test_multihop_in_filter(self, mock_hop):
		from nce_events.api.form_dialog._helpers import _filters_for_related_rows

		mock_hop.return_value = ["A", "B"]
		hc = [{"bridge": "Enrollment", "parent_link": "event", "child_link": "person"}]
		filters, force_empty = _filters_for_related_rows("ROOT", "People", "name", hc)
		self.assertFalse(force_empty)
		self.assertEqual(filters, {"name": ["in", ["A", "B"]]})

	@patch("nce_events.api.form_dialog._helpers._hop_walk_final_identifiers")
	def test_multihop_single_final_id(self, mock_hop):
		from nce_events.api.form_dialog._helpers import _filters_for_related_rows

		mock_hop.return_value = ["OnlyOne"]
		hc = [{"bridge": "Enrollment", "parent_link": "event", "child_link": "person"}]
		filters, force_empty = _filters_for_related_rows("ROOT", "People", "name", hc)
		self.assertFalse(force_empty)
		self.assertEqual(filters, {"name": "OnlyOne"})


class TestRelatedListColumnsOptions(unittest.TestCase):
	def test_columns_merge_options_from_meta(self):
		from types import SimpleNamespace

		from nce_events.api.form_dialog._helpers import _related_list_columns_from_child_row

		info = {
			"fields": [
				{
					"fieldname": "status",
					"fieldtype": "Select",
					"options": "Open\nClosed",
					"label": "Status",
				},
				{"fieldname": "name", "fieldtype": "Data", "label": "ID"},
			]
		}
		portal = [
			{"fieldname": "status", "show": 1},
			{"fieldname": "name", "show": 1},
		]
		row = SimpleNamespace(
			info=json.dumps(info),
			portal_field_config=json.dumps(portal),
		)
		columns, _ob = _related_list_columns_from_child_row(row)
		by_fn = {c["fieldname"]: c for c in columns}
		self.assertEqual(by_fn["status"]["options"], "Open\nClosed")
		self.assertEqual(by_fn["status"]["fieldtype"], "Select")


class TestHopWalkFinalIdentifiers(unittest.TestCase):
	@patch("nce_events.api.form_dialog._helpers.frappe.get_list")
	def test_single_step_collects_child_link(self, mock_gl):
		from nce_events.api.form_dialog._helpers import _hop_walk_final_identifiers

		mock_gl.return_value = [
			{"name": "en1", "person": "P1"},
			{"name": "en2", "person": "P2"},
		]
		hc = [{"bridge": "Enrollment", "parent_link": "event", "child_link": "person"}]
		out = _hop_walk_final_identifiers("EVT1", hc)
		self.assertEqual(out, ["P1", "P2"])
		self.assertEqual(len(mock_gl.call_args_list), 1)
		args0, kwargs0 = mock_gl.call_args_list[0]
		self.assertEqual(args0, ("Enrollment",))
		self.assertEqual(
			kwargs0,
			{
				"filters": {"event": "EVT1"},
				"fields": ["name", "person"],
				"limit_page_length": 5000,
			},
		)

	@patch("nce_events.api.form_dialog._helpers.frappe.get_list")
	def test_two_steps_passes_bridge_names_then_final_ids(self, mock_gl):
		from nce_events.api.form_dialog._helpers import _hop_walk_final_identifiers

		mock_gl.side_effect = [
			[{"name": "en1", "middle": "M1"}],
			[{"name": "M1", "person": "P9"}],
		]
		hc = [
			{"bridge": "Enrollment", "parent_link": "event", "child_link": "middle"},
			{"bridge": "Middle", "parent_link": "enrollment", "child_link": "person"},
		]
		out = _hop_walk_final_identifiers("EVT1", hc)
		self.assertEqual(out, ["P9"])
		self.assertEqual(mock_gl.call_count, 2)
		args0, kwargs0 = mock_gl.call_args_list[0]
		self.assertEqual(args0, ("Enrollment",))
		self.assertEqual(kwargs0["filters"], {"event": "EVT1"})
		args1, kwargs1 = mock_gl.call_args_list[1]
		self.assertEqual(args1, ("Middle",))
		self.assertEqual(kwargs1["filters"], {"enrollment": ["in", ["en1"]]})


class TestMainTabSkeletonAndTabNotes(unittest.TestCase):
	def test_lead_anchor_single_visible_field(self):
		from nce_events.api.form_dialog._helpers import (
			FD_LEAD_TAB_ANCHOR,
			_main_tab_skeleton_from_frozen_fields,
		)

		fields = [{"hidden": 0, "fieldtype": "Data", "fieldname": "a"}]
		sk = _main_tab_skeleton_from_frozen_fields(fields)
		self.assertEqual(len(sk), 1)
		self.assertEqual(sk[0]["anchor"], FD_LEAD_TAB_ANCHOR)

	def test_second_tab_uses_tab_break_fieldname_anchor(self):
		from nce_events.api.form_dialog._helpers import FD_LEAD_TAB_ANCHOR, _main_tab_skeleton_from_frozen_fields

		fields = [
			{"hidden": 0, "fieldtype": "Data", "fieldname": "a"},
			{"hidden": 0, "fieldtype": "Tab Break", "fieldname": "tab_extra", "label": "Extra"},
			{"hidden": 0, "fieldtype": "Data", "fieldname": "b"},
		]
		sk = _main_tab_skeleton_from_frozen_fields(fields)
		self.assertEqual(len(sk), 2)
		self.assertEqual(sk[0]["anchor"], FD_LEAD_TAB_ANCHOR)
		self.assertEqual(sk[1]["anchor"], "tab_extra")
		self.assertEqual(sk[1]["label"], "Extra")

	def test_sync_tab_notes_keeps_matching_anchors(self):
		from unittest.mock import MagicMock

		from nce_events.api.form_dialog._helpers import (
			FD_LEAD_TAB_ANCHOR,
			_sync_form_dialog_tab_notes_from_fields,
		)

		fields = [
			{"hidden": 0, "fieldtype": "Data", "fieldname": "a"},
			{"hidden": 0, "fieldtype": "Tab Break", "fieldname": "tab_extra", "label": "Extras"},
			{"hidden": 0, "fieldtype": "Data", "fieldname": "b"},
		]
		old_lead = MagicMock()
		old_lead.tab_anchor = FD_LEAD_TAB_ANCHOR
		old_lead.note = "Hello"
		old_extra = MagicMock()
		old_extra.tab_anchor = "tab_extra"
		old_extra.note = "World"
		doc = MagicMock()
		doc.tab_notes = [old_lead, old_extra]
		appended = []

		def _append(dn, row):
			appended.append((dn, row))

		doc.append = _append

		_sync_form_dialog_tab_notes_from_fields(doc, fields)

		self.assertEqual(doc.tab_notes, [])
		self.assertEqual(len(appended), 2)
		self.assertEqual(appended[0][0], "tab_notes")
		self.assertEqual(appended[0][1]["note"], "Hello")
		self.assertEqual(appended[1][1]["note"], "World")


class TestSyncRelatedPreservesPortalConfig(unittest.TestCase):
	"""_sync_related_doctypes must keep portal_field_config when related tab is re-selected."""

	def test_preserves_portal_field_config_when_same_child_link_and_hop(self):
		from types import SimpleNamespace

		from nce_events.api.form_dialog._helpers import _sync_related_doctypes

		cfg = json.dumps([{"fieldname": "date_time", "show": 1}])
		old = SimpleNamespace(
			child_doctype="Event Sessions",
			link_field="product_id",
			hop_chain="[]",
			portal_field_config=cfg,
		)

		class StubDoc:
			def __init__(self):
				self.related_doctypes = [old]

			def get(self, key, default=None):
				if key == "related_doctypes":
					return self.related_doctypes
				return default

			def append(self, fieldname, row):
				self.related_doctypes.append(row)

		doc = StubDoc()
		fake_rows = [
			{
				"child_doctype": "Event Sessions",
				"link_field": "product_id",
				"tab_label": "Event Sessions",
				"hop_chain": "[]",
				"info": "{}",
			}
		]

		with patch(
			"nce_events.api.form_dialog._helpers._related_doctype_child_rows",
			return_value=fake_rows,
		):
			_sync_related_doctypes(doc, [{"doctype": "Event Sessions", "link_field": "product_id"}])

		self.assertEqual(len(doc.related_doctypes), 1)
		self.assertEqual(doc.related_doctypes[0].get("portal_field_config"), cfg)


if __name__ == "__main__":
	unittest.main()
