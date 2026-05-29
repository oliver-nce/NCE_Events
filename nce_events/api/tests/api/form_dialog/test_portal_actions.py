"""
Unit tests for nce_events.api.form_dialog.portal_actions.

Run with:
    bench run-tests --app nce_events --module nce_events.api.tests.api.form_dialog.test_portal_actions
"""

import json
import unittest
from unittest.mock import MagicMock, patch

import frappe
from frappe.tests.utils import FrappeTestCase


def _sample_action() -> dict:
	return {
		"action_id": "act1",
		"label": "Switch Event",
		"method": "execute_product_exchange",
		"params": [
			{"arg": "enrollment_name", "source": "row", "field": "name"},
			{"arg": "new_product_id", "source": "prompt"},
		],
	}


class TestRunPortalAction(FrappeTestCase):
	@patch("nce_events.api.form_dialog.portal_actions.frappe.get_attr")
	@patch("nce_events.api.form_dialog.portal_actions._allowed_child_names_for_context")
	@patch("nce_events.api.form_dialog.portal_actions.get_action_method_spec")
	@patch("nce_events.api.form_dialog.portal_actions.frappe.has_permission", return_value=True)
	@patch("nce_events.api.form_dialog.portal_actions.frappe.get_doc")
	def test_param_resolution_row_root_const_prompt(
		self, mock_get_doc, mock_perm, mock_spec, mock_allowed, mock_get_attr
	):
		from nce_events.api.form_dialog.portal_actions import run_portal_action

		mock_allowed.return_value = {"EN1"}
		mock_spec.return_value = {
			"key": "execute_product_exchange",
			"dotted_path": "nce_events.api.exchange.execute_product_exchange",
			"applies_to_doctypes": ["Enrollments"],
			"args": [
				{"arg": "enrollment_name", "label": "Enrollment", "reqd": 1},
				{"arg": "new_product_id", "label": "New Event", "reqd": 1},
			],
		}

		mock_row = MagicMock()
		mock_row.name = "REL1"
		mock_row.child_doctype = "Enrollments"
		mock_row.link_field = "player_id"
		mock_row.hop_chain = []
		mock_row.portal_actions = json.dumps([_sample_action()])

		mock_doc = MagicMock()
		mock_doc.is_active = 1
		mock_doc.target_doctype = "People"
		mock_doc.related_doctypes = [mock_row]

		mock_child = MagicMock()
		mock_child.get.return_value = None
		mock_root = MagicMock()
		mock_get_doc.side_effect = [mock_doc, mock_child, mock_root]

		mock_fn = MagicMock(return_value={"success": True})
		mock_get_attr.return_value = mock_fn

		mock_session = MagicMock()
		mock_session.user = "Administrator"
		with patch("nce_events.api.form_dialog.portal_actions.frappe.session", mock_session):
			out = run_portal_action(
				"FD1",
				"related",
				"REL1",
				"People",
				"P1",
				"EN1",
				"act1",
				{"new_product_id": "999"},
			)

		self.assertEqual(out.get("ok"), 1)
		mock_fn.assert_called_once_with(enrollment_name="EN1", new_product_id="999")

	@patch("nce_events.api.form_dialog.portal_actions._allowed_child_names_for_context")
	@patch("nce_events.api.form_dialog.portal_actions.get_action_method_spec", return_value=None)
	@patch("nce_events.api.form_dialog.portal_actions.frappe.has_permission", return_value=True)
	@patch("nce_events.api.form_dialog.portal_actions.frappe.get_doc")
	def test_rejects_unregistered_method(self, mock_get_doc, mock_perm, mock_spec, mock_allowed):
		from nce_events.api.form_dialog.portal_actions import run_portal_action

		mock_allowed.return_value = {"EN1"}
		action = dict(_sample_action())
		action["method"] = "not_registered"

		mock_row = MagicMock()
		mock_row.name = "REL1"
		mock_row.child_doctype = "Enrollments"
		mock_row.portal_actions = json.dumps([action])

		mock_doc = MagicMock()
		mock_doc.is_active = 1
		mock_doc.target_doctype = "People"
		mock_doc.related_doctypes = [mock_row]
		mock_get_doc.return_value = mock_doc

		mock_session = MagicMock()
		mock_session.user = "Administrator"
		with patch("nce_events.api.form_dialog.portal_actions.frappe.session", mock_session):
			with self.assertRaises(frappe.ValidationError):
				run_portal_action(
					"FD1",
					"related",
					"REL1",
					"People",
					"P1",
					"EN1",
					"act1",
					{},
				)

	@patch("nce_events.api.form_dialog.portal_actions._allowed_child_names_for_context", return_value=set())
	@patch("nce_events.api.form_dialog.portal_actions.get_action_method_spec")
	@patch("nce_events.api.form_dialog.portal_actions.frappe.has_permission", return_value=True)
	@patch("nce_events.api.form_dialog.portal_actions.frappe.get_doc")
	def test_rejects_child_not_in_allowed_names(self, mock_get_doc, mock_perm, mock_spec, mock_allowed):
		from nce_events.api.form_dialog.portal_actions import run_portal_action

		mock_spec.return_value = {
			"key": "execute_product_exchange",
			"dotted_path": "nce_events.api.exchange.execute_product_exchange",
			"applies_to_doctypes": ["Enrollments"],
			"args": [],
		}

		mock_row = MagicMock()
		mock_row.name = "REL1"
		mock_row.child_doctype = "Enrollments"
		mock_row.portal_actions = json.dumps([_sample_action()])

		mock_doc = MagicMock()
		mock_doc.is_active = 1
		mock_doc.target_doctype = "People"
		mock_doc.related_doctypes = [mock_row]
		mock_get_doc.return_value = mock_doc

		mock_session = MagicMock()
		mock_session.user = "Administrator"
		with patch("nce_events.api.form_dialog.portal_actions.frappe.session", mock_session):
			with self.assertRaises(frappe.PermissionError):
				run_portal_action(
					"FD1",
					"related",
					"REL1",
					"People",
					"P1",
					"EN1",
					"act1",
					{},
				)

	@patch("nce_events.api.form_dialog.portal_actions._allowed_child_names_for_context")
	@patch("nce_events.api.form_dialog.portal_actions.get_action_method_spec")
	@patch("nce_events.api.form_dialog.portal_actions.frappe.has_permission", return_value=True)
	@patch("nce_events.api.form_dialog.portal_actions.frappe.get_doc")
	def test_applies_to_doctypes_gate(self, mock_get_doc, mock_perm, mock_spec, mock_allowed):
		from nce_events.api.form_dialog.portal_actions import run_portal_action

		mock_allowed.return_value = {"P1"}
		mock_spec.return_value = {
			"key": "execute_product_exchange",
			"dotted_path": "nce_events.api.exchange.execute_product_exchange",
			"applies_to_doctypes": ["Enrollments"],
			"args": [],
		}

		mock_row = MagicMock()
		mock_row.name = "REL1"
		mock_row.child_doctype = "People"
		mock_row.portal_actions = json.dumps([_sample_action()])

		mock_doc = MagicMock()
		mock_doc.is_active = 1
		mock_doc.target_doctype = "Event"
		mock_doc.related_doctypes = [mock_row]
		mock_get_doc.return_value = mock_doc

		mock_session = MagicMock()
		mock_session.user = "Administrator"
		with patch("nce_events.api.form_dialog.portal_actions.frappe.session", mock_session):
			with self.assertRaises(frappe.ValidationError):
				run_portal_action(
					"FD1",
					"related",
					"REL1",
					"Event",
					"E1",
					"P1",
					"act1",
					{},
				)


if __name__ == "__main__":
	unittest.main()
