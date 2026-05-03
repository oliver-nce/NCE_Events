"""
Unit tests for nce_events.api.form_dialog.portal_fields.

Run with:
    bench run-tests --app nce_events --module nce_events.api.tests.api.form_dialog.test_portal_fields
"""

import json
import unittest
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase


class TestRelatedPortalFieldEditor(FrappeTestCase):
	"""get_related_portal_field_editor + save_related_portal_field_config."""

	@patch("nce_events.api.form_dialog.portal_fields._require_system_manager")
	def test_save_persists_portal_field_config(self, mock_sm):
		from nce_events.api.form_dialog.portal_fields import (
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
		from nce_events.api.form_dialog.portal_fields import _normalize_portal_field_config_for_save

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


if __name__ == "__main__":
	unittest.main()
