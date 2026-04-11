"""
Unit tests for form_dialog_api.py.

Run with: bench run-tests --app nce_events --module nce_events.api.tests.test_form_dialog_api
"""

import json
import unittest
from unittest.mock import MagicMock, patch

import frappe
from frappe.tests.utils import FrappeTestCase


class TestAssertDoctypeInWPTables(FrappeTestCase):
	"""Test the WP Tables validation helper."""

	def test_rejects_doctype_not_in_wp_tables(self):
		"""Should raise ValidationError if DocType is not in WP Tables."""
		from nce_events.api.form_dialog_api import _assert_doctype_in_wp_tables

		with patch("nce_events.api.form_dialog_api.frappe.get_all", return_value=[]):
			with self.assertRaises(frappe.ValidationError):
				_assert_doctype_in_wp_tables("Nonexistent DocType")

	def test_accepts_doctype_in_wp_tables(self):
		"""Should not raise if DocType exists in WP Tables."""
		from nce_events.api.form_dialog_api import _assert_doctype_in_wp_tables

		with patch(
			"nce_events.api.form_dialog_api.frappe.get_all",
			return_value=[{"name": "WP-001"}],
		):
			# Should not raise
			_assert_doctype_in_wp_tables("Event")


class TestCaptureFormDialog(FrappeTestCase):
	"""Test that capture stores expected keys in frozen_meta_json."""

	@patch("nce_events.api.form_dialog_api._require_system_manager")
	@patch("nce_events.api.form_dialog_api._assert_doctype_in_wp_tables")
	def test_capture_stores_fields_key(self, mock_validate, mock_role):
		"""frozen_meta_json must contain a top-level 'fields' key that is a list."""
		from nce_events.api.form_dialog_api import capture_form_dialog_from_desk

		# Create a mock meta with a few fields
		mock_field = MagicMock()
		mock_field.as_dict.return_value = {
			"fieldname": "test_field",
			"fieldtype": "Data",
			"label": "Test Field",
		}
		mock_meta = MagicMock()
		mock_meta.fields = [mock_field]

		with patch("nce_events.api.form_dialog_api.frappe.get_meta", return_value=mock_meta):
			name = capture_form_dialog_from_desk(doctype="Test DocType", title="Test Capture")

		# Verify the document was created with correct JSON shape
		doc = frappe.get_doc("Form Dialog", name)
		frozen = json.loads(doc.frozen_meta_json)

		self.assertIn("fields", frozen)
		self.assertIsInstance(frozen["fields"], list)
		self.assertEqual(len(frozen["fields"]), 1)
		self.assertEqual(frozen["fields"][0]["fieldname"], "test_field")

		# Cleanup
		frappe.delete_doc("Form Dialog", name, force=True)


class TestGetFormDialogDefinition(FrappeTestCase):
	"""Test that get_form_dialog_definition returns buttons in sort_order."""

	def test_buttons_returned_in_sort_order(self):
		"""Buttons must be returned sorted by sort_order ascending."""
		from nce_events.api.form_dialog_api import get_form_dialog_definition

		# Create a test Form Dialog with buttons in reverse order
		doc = frappe.get_doc(
			{
				"doctype": "Form Dialog",
				"title": "Test Sort Order",
				"target_doctype": "DocType",
				"frozen_meta_json": '{"fields": []}',
				"captured_at": frappe.utils.now_datetime(),
				"is_active": 1,
				"buttons": [
					{"label": "Second", "sort_order": 2},
					{"label": "First", "sort_order": 1},
					{"label": "Third", "sort_order": 3},
				],
			}
		)
		doc.insert(ignore_permissions=True)
		frappe.db.commit()

		result = get_form_dialog_definition(doc.name)

		self.assertEqual(len(result["buttons"]), 3)
		self.assertEqual(result["buttons"][0]["label"], "First")
		self.assertEqual(result["buttons"][1]["label"], "Second")
		self.assertEqual(result["buttons"][2]["label"], "Third")

		# Cleanup
		frappe.delete_doc("Form Dialog", doc.name, force=True)


class TestListFormDialogsForDoctype(FrappeTestCase):
	"""list_form_dialogs_for_doctype attaches related_doctypes (desk summary, no info)."""

	@patch("nce_events.api.form_dialog_api._require_system_manager")
	def test_list_includes_related_doctypes(self, mock_sm):
		from nce_events.api.form_dialog_api import list_form_dialogs_for_doctype

		title = "List Related Test FD " + frappe.generate_hash(length=8)
		doc = frappe.get_doc(
			{
				"doctype": "Form Dialog",
				"title": title,
				"target_doctype": "DocType",
				"frozen_meta_json": '{"fields": []}',
				"captured_at": frappe.utils.now_datetime(),
				"is_active": 1,
				"related_doctypes": [
					{"child_doctype": "User", "link_field": "owner", "tab_label": "Users tab"},
				],
			}
		)
		doc.insert(ignore_permissions=True)
		frappe.db.commit()

		rows = list_form_dialogs_for_doctype("DocType")
		mine = next((r for r in rows if r.get("name") == title), None)
		self.assertIsNotNone(mine)
		self.assertEqual(len(mine["related_doctypes"]), 1)
		rd0 = mine["related_doctypes"][0]
		self.assertEqual(rd0["doctype"], "User")
		self.assertEqual(rd0["label"], "Users tab")
		self.assertEqual(rd0["link_field"], "owner")
		self.assertNotIn("info", rd0)
		self.assertTrue(rd0.get("child_row_name"))

		frappe.delete_doc("Form Dialog", title, force=True)
		frappe.db.commit()


class TestRelatedPortalFieldEditor(FrappeTestCase):
	"""get_related_portal_field_editor + save_related_portal_field_config."""

	@patch("nce_events.api.form_dialog_api._require_system_manager")
	def test_save_persists_portal_field_config(self, mock_sm):
		from nce_events.api.form_dialog_api import (
			get_related_portal_field_editor,
			save_related_portal_field_config,
		)

		title = "Portal Ed " + frappe.generate_hash(length=8)
		doc = frappe.get_doc(
			{
				"doctype": "Form Dialog",
				"title": title,
				"target_doctype": "DocType",
				"frozen_meta_json": '{"fields": []}',
				"captured_at": frappe.utils.now_datetime(),
				"is_active": 1,
				"related_doctypes": [
					{"child_doctype": "User", "link_field": "owner", "tab_label": "Staff"},
				],
			}
		)
		doc.insert(ignore_permissions=True)
		frappe.db.commit()

		child_name = doc.related_doctypes[0].name
		data = get_related_portal_field_editor(title, child_name)
		self.assertIn("rows", data)
		self.assertGreater(len(data["rows"]), 0)
		fn0 = data["rows"][0]["fieldname"]

		save_related_portal_field_config(
			title,
			child_name,
			[{"fieldname": fn0, "show": 1, "editable": 1}],
		)

		doc.reload()
		raw = doc.related_doctypes[0].portal_field_config or "[]"
		cfg = json.loads(raw)
		self.assertEqual(len(cfg), 1)
		self.assertEqual(cfg[0]["fieldname"], fn0)
		self.assertEqual(cfg[0]["show"], 1)
		self.assertEqual(cfg[0]["editable"], 1)

		save_related_portal_field_config(
			title,
			child_name,
			[{"fieldname": fn0, "show": 1, "editable": 0, "sort_rank": 1, "sort_dir": "desc"}],
		)
		doc.reload()
		cfg2 = json.loads(doc.related_doctypes[0].portal_field_config or "[]")
		self.assertEqual(cfg2[0].get("sort_rank"), 1)
		self.assertEqual(cfg2[0].get("sort_dir"), "desc")

		frappe.delete_doc("Form Dialog", title, force=True)
		frappe.db.commit()


class TestNormalizePortalFieldConfig(unittest.TestCase):
	def test_strips_sort_when_show_off(self):
		from nce_events.api.form_dialog_api import _normalize_portal_field_config_for_save

		out = _normalize_portal_field_config_for_save(
			[
				{
					"fieldname": "status",
					"show": 0,
					"editable": 0,
					"sort_rank": 2,
					"sort_dir": "desc",
				},
			],
			{"status"},
		)
		self.assertEqual(len(out), 1)
		self.assertNotIn("sort_rank", out[0])
		self.assertNotIn("sort_dir", out[0])


class TestParseRelatedDoctypes(unittest.TestCase):
	"""related_doctypes JSON from Page Panel Desk (picker shape with optional hop_chain)."""

	def test_json_string_roundtrip(self):
		from nce_events.api.form_dialog_api import _parse_related_doctypes_argument

		payload = json.dumps(
			[{"doctype": "People", "link_field": "family", "label": "People"}]
		)
		rows = _parse_related_doctypes_argument(payload)
		self.assertEqual(len(rows), 1)
		self.assertEqual(rows[0]["doctype"], "People")
		self.assertEqual(rows[0]["link_field"], "family")
		self.assertEqual(rows[0]["label"], "People")
		self.assertEqual(rows[0].get("hop_chain"), [])

	def test_dedupes_same_doctype_same_hop_chain(self):
		from nce_events.api.form_dialog_api import _parse_related_doctypes_argument

		rows = _parse_related_doctypes_argument(
			[
				{"doctype": "People", "link_field": "a", "label": "A"},
				{"doctype": "People", "link_field": "b", "label": "B"},
			]
		)
		self.assertEqual(len(rows), 1)
		self.assertEqual(rows[0]["link_field"], "a")

	def test_keeps_same_doctype_different_hop_chain(self):
		from nce_events.api.form_dialog_api import _parse_related_doctypes_argument

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
		from nce_events.api.form_dialog_api import _parse_related_doctypes_argument

		rows = _parse_related_doctypes_argument([{"doctype": "People", "label": "P"}])
		self.assertEqual(rows, [])


class TestFiltersForRelatedRows(unittest.TestCase):
	def test_direct_one_hop(self):
		from nce_events.api.form_dialog_api import _filters_for_related_rows

		filters, force_empty = _filters_for_related_rows("ROOT", "People", "event", [])
		self.assertFalse(force_empty)
		self.assertEqual(filters, {"event": "ROOT"})

	@patch("nce_events.api.form_dialog_api._hop_walk_final_identifiers")
	def test_multihop_no_bridge_rows_force_empty(self, mock_hop):
		from nce_events.api.form_dialog_api import _filters_for_related_rows

		mock_hop.return_value = None
		hc = [{"bridge": "Enrollment", "parent_link": "event", "child_link": "person"}]
		filters, force_empty = _filters_for_related_rows("ROOT", "People", "name", hc)
		self.assertTrue(force_empty)
		self.assertEqual(filters, {})

	@patch("nce_events.api.form_dialog_api._hop_walk_final_identifiers")
	def test_multihop_in_filter(self, mock_hop):
		from nce_events.api.form_dialog_api import _filters_for_related_rows

		mock_hop.return_value = ["A", "B"]
		hc = [{"bridge": "Enrollment", "parent_link": "event", "child_link": "person"}]
		filters, force_empty = _filters_for_related_rows("ROOT", "People", "name", hc)
		self.assertFalse(force_empty)
		self.assertEqual(filters, {"name": ["in", ["A", "B"]]})

	@patch("nce_events.api.form_dialog_api._hop_walk_final_identifiers")
	def test_multihop_single_final_id(self, mock_hop):
		from nce_events.api.form_dialog_api import _filters_for_related_rows

		mock_hop.return_value = ["OnlyOne"]
		hc = [{"bridge": "Enrollment", "parent_link": "event", "child_link": "person"}]
		filters, force_empty = _filters_for_related_rows("ROOT", "People", "name", hc)
		self.assertFalse(force_empty)
		self.assertEqual(filters, {"name": "OnlyOne"})


class TestHopWalkFinalIdentifiers(unittest.TestCase):
	@patch("nce_events.api.form_dialog_api.frappe.get_list")
	def test_single_step_collects_child_link(self, mock_gl):
		from nce_events.api.form_dialog_api import _hop_walk_final_identifiers

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

	@patch("nce_events.api.form_dialog_api.frappe.get_list")
	def test_two_steps_passes_bridge_names_then_final_ids(self, mock_gl):
		from nce_events.api.form_dialog_api import _hop_walk_final_identifiers

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


class TestGetFormDialogRelatedRows(FrappeTestCase):
	"""Whitelist read for related tab rows."""

	def test_guest_rejected(self):
		from nce_events.api.form_dialog_api import get_form_dialog_related_rows

		mock_session = MagicMock()
		mock_session.user = "Guest"
		with patch("nce_events.api.form_dialog_api.frappe.session", mock_session):
			with self.assertRaises(frappe.PermissionError):
				get_form_dialog_related_rows("FD", "row1", "Event", "E1")

	def test_wrong_root_doctype_rejected(self):
		from nce_events.api.form_dialog_api import get_form_dialog_related_rows

		mock_doc = MagicMock()
		mock_doc.is_active = 1
		mock_doc.target_doctype = "Event"
		mock_doc.related_doctypes = []

		with patch("nce_events.api.form_dialog_api.frappe.session.user", "Administrator"):
			with patch("nce_events.api.form_dialog_api.frappe.get_doc", return_value=mock_doc):
				with self.assertRaises(frappe.PermissionError):
					get_form_dialog_related_rows("FD", "row1", "User", "x")

	def test_direct_hop_calls_get_list(self):
		from nce_events.api.form_dialog_api import get_form_dialog_related_rows

		mock_row = MagicMock()
		mock_row.name = "RELROW1"
		mock_row.child_doctype = "User"
		mock_row.link_field = "owner"
		mock_row.hop_chain = []
		mock_row.portal_field_config = None
		mock_row.info = json.dumps(
			{"fields": [{"fieldname": "name", "fieldtype": "Data", "label": "ID"}]}
		)

		mock_doc = MagicMock()
		mock_doc.is_active = 1
		mock_doc.target_doctype = "DocType"
		mock_doc.related_doctypes = [mock_row]

		with patch("nce_events.api.form_dialog_api.frappe.session.user", "Administrator"):
			with patch("nce_events.api.form_dialog_api._assert_doctype_in_wp_tables"):
				with patch("nce_events.api.form_dialog_api.frappe.get_doc", return_value=mock_doc):
					with patch("nce_events.api.form_dialog_api.frappe.has_permission", return_value=True):
						with patch(
							"nce_events.api.form_dialog_api.frappe.get_list",
							return_value=[{"name": "u1"}],
						) as mock_list:
							out = get_form_dialog_related_rows(
								"FD1", "RELROW1", "DocType", "DocType", limit=50
							)

		self.assertEqual(out["rows"], [{"name": "u1"}])
		self.assertEqual(out["child_doctype"], "User")
		mock_list.assert_called_once()
		kw = mock_list.call_args.kwargs
		self.assertEqual(kw["filters"], {"owner": "DocType"})
		self.assertEqual(kw["limit_page_length"], 50)


if __name__ == "__main__":
	unittest.main()
