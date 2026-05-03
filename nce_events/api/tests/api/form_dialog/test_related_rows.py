"""
Unit tests for nce_events.api.form_dialog.related_rows.

Run with:
    bench run-tests --app nce_events --module nce_events.api.tests.api.form_dialog.test_related_rows
"""

import json
import unittest
from unittest.mock import MagicMock, patch

import frappe
from frappe.tests.utils import FrappeTestCase


class TestSaveFormDialogRelatedRows(FrappeTestCase):
	"""save_form_dialog_related_rows validates and saves child docs (mocked)."""

	def test_guest_rejected(self):
		from nce_events.api.form_dialog.related_rows import save_form_dialog_related_rows

		mock_session = MagicMock()
		mock_session.user = "Guest"
		with patch("nce_events.api.form_dialog.related_rows.frappe.session", mock_session):
			with self.assertRaises(frappe.PermissionError):
				save_form_dialog_related_rows("FD", "r1", "Event", "E1", [])

	@patch("nce_events.api.form_dialog.related_rows._assert_doctype_in_wp_tables")
	@patch(
		"nce_events.api.form_dialog.related_rows._allowed_child_names_for_related_tab", return_value={"P1"}
	)
	@patch(
		"nce_events.api.form_dialog.related_rows._editable_related_fieldnames_for_save",
		return_value={"rating"},
	)
	def test_save_calls_child_save(self, mock_editable, mock_allowed, mock_wp):
		from nce_events.api.form_dialog.related_rows import save_form_dialog_related_rows

		mock_row = MagicMock()
		mock_row.name = "REL1"
		mock_row.child_doctype = "People"
		mock_row.link_field = "event"
		mock_row.hop_chain = []

		mock_doc = MagicMock()
		mock_doc.is_active = 1
		mock_doc.target_doctype = "Event"
		mock_doc.related_doctypes = [mock_row]

		mock_child = MagicMock()

		mock_session = MagicMock()
		mock_session.user = "Administrator"
		with patch("nce_events.api.form_dialog.related_rows.frappe.session", mock_session):
			with patch(
				"nce_events.api.form_dialog.related_rows.frappe.get_doc",
				side_effect=[mock_doc, mock_child],
			):
				with patch(
					"nce_events.api.form_dialog.related_rows.frappe.has_permission", return_value=True
				):
					out = save_form_dialog_related_rows(
						"FD",
						"REL1",
						"Event",
						"EVT1",
						[{"name": "P1", "values": {"rating": "5"}}],
					)

		self.assertEqual(out.get("saved"), 1)
		mock_child.set.assert_called_once_with("rating", "5")
		mock_child.save.assert_called_once()


class TestGetFormDialogRelatedRows(FrappeTestCase):
	"""Whitelist read for related tab rows."""

	def test_guest_rejected(self):
		from nce_events.api.form_dialog.related_rows import get_form_dialog_related_rows

		mock_session = MagicMock()
		mock_session.user = "Guest"
		with patch("nce_events.api.form_dialog.related_rows.frappe.session", mock_session):
			with self.assertRaises(frappe.PermissionError):
				get_form_dialog_related_rows("FD", "row1", "Event", "E1")

	def test_wrong_root_doctype_rejected(self):
		from nce_events.api.form_dialog.related_rows import get_form_dialog_related_rows

		mock_doc = MagicMock()
		mock_doc.is_active = 1
		mock_doc.target_doctype = "Event"
		mock_doc.related_doctypes = []

		with patch("nce_events.api.form_dialog.related_rows.frappe.session.user", "Administrator"):
			with patch("nce_events.api.form_dialog.related_rows.frappe.get_doc", return_value=mock_doc):
				with self.assertRaises(frappe.PermissionError):
					get_form_dialog_related_rows("FD", "row1", "User", "x")

	def test_direct_hop_calls_get_list(self):
		from nce_events.api.form_dialog.related_rows import get_form_dialog_related_rows

		mock_row = MagicMock()
		mock_row.name = "RELROW1"
		mock_row.child_doctype = "User"
		mock_row.link_field = "owner"
		mock_row.hop_chain = []
		mock_row.portal_field_config = None
		mock_row.info = json.dumps({"fields": [{"fieldname": "name", "fieldtype": "Data", "label": "ID"}]})

		mock_doc = MagicMock()
		mock_doc.is_active = 1
		mock_doc.target_doctype = "DocType"
		mock_doc.related_doctypes = [mock_row]

		with patch("nce_events.api.form_dialog.related_rows.frappe.session.user", "Administrator"):
			with patch("nce_events.api.form_dialog.related_rows._assert_doctype_in_wp_tables"):
				with patch("nce_events.api.form_dialog.related_rows.frappe.get_doc", return_value=mock_doc):
					with patch(
						"nce_events.api.form_dialog.related_rows.frappe.has_permission", return_value=True
					):
						with patch(
							"nce_events.api.form_dialog.related_rows.frappe.get_list",
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
