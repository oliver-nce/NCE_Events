"""Tests for nce_events.api.events_publish."""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

import frappe

from nce_events.api.events_publish import build_woocommerce_product_payload, slugify_product_slug


class TestSlugifyProductSlug(unittest.TestCase):
	def test_lowercase_hyphens(self):
		self.assertEqual(slugify_product_slug("My Event!!"), "my-event")

	def test_empty_fallback(self):
		self.assertEqual(slugify_product_slug(""), "event")
		self.assertEqual(slugify_product_slug("   "), "event")

	def test_max_length(self):
		long_sku = "a" * 300
		out = slugify_product_slug(long_sku)
		self.assertEqual(len(out), 200)


class TestBuildWooCommerceProductPayload(unittest.TestCase):
	def test_basic_mapping(self):
		doc = {
			"event_name": "Spring Camp",
			"content": "<p>Hello</p>",
			"sku": "CAMP-2026",
			"status": "publish",
			"price": 99.5,
			"product_type": "Workshops",
			"first_session_date": "2026-06-01",
			"end_date": "2026-06-05",
			"number_of_sessions": 2,
		}
		p = build_woocommerce_product_payload(doc)
		self.assertEqual(p["name"], "Spring Camp")
		self.assertEqual(p["description"], "<p>Hello</p>")
		self.assertEqual(p["sku"], "CAMP-2026")
		self.assertEqual(p["slug"], "camp-2026")
		self.assertEqual(p["status"], "publish")
		self.assertEqual(p["regular_price"], "99.5")
		self.assertEqual(p["categories"], [{"name": "Workshops"}])
		keys = {m["key"] for m in p["meta_data"]}
		self.assertIn("WooCommerceEventsDateMySQLFormat", keys)
		self.assertIn("WooCommerceEventsEndDateMySQLFormat", keys)
		self.assertIn("product_categories", keys)
		self.assertEqual(next(m["value"] for m in p["meta_data"] if m["key"] == "product_categories"), "Workshops")
		self.assertEqual(
			next(m["value"] for m in p["meta_data"] if m["key"] == "WooCommerceEventsDateMySQLFormat"),
			"2026-06-01",
		)
		self.assertEqual(
			next(m["value"] for m in p["meta_data"] if m["key"] == "WooCommerceEventsEndDateMySQLFormat"),
			"2026-06-15",
		)

	def test_first_session_iso_datetime_string(self):
		doc = {
			"event_name": "E",
			"sku": "s",
			"product_type": "Workshops",
			"first_session_date": "2026-08-20T14:00:00.000Z",
			"number_of_sessions": 1,
		}
		p = build_woocommerce_product_payload(doc)
		self.assertEqual(
			next(m["value"] for m in p["meta_data"] if m["key"] == "WooCommerceEventsDateMySQLFormat"),
			"2026-08-20",
		)
		self.assertEqual(
			next(m["value"] for m in p["meta_data"] if m["key"] == "WooCommerceEventsEndDateMySQLFormat"),
			"2026-08-27",
		)

	def test_us_style_mm_dd_yyyy_first_session(self):
		doc = {
			"event_name": "E",
			"sku": "s",
			"product_type": "Workshops",
			"first_session_date": "05-28-2026",
			"number_of_sessions": 8,
		}
		p = build_woocommerce_product_payload(doc)
		self.assertEqual(
			next(m["value"] for m in p["meta_data"] if m["key"] == "WooCommerceEventsDateMySQLFormat"),
			"2026-05-28",
		)
		self.assertEqual(
			next(m["value"] for m in p["meta_data"] if m["key"] == "WooCommerceEventsEndDateMySQLFormat"),
			"2026-07-23",
		)

	def test_category_numeric_id(self):
		doc = {
			"event_name": "X",
			"sku": "x",
			"type": "12",
			"first_session_date": "2026-01-02",
			"end_date": "2026-01-03",
		}
		p = build_woocommerce_product_payload(doc)
		self.assertEqual(p["categories"], [{"id": 12}])
		self.assertEqual(next(m["value"] for m in p["meta_data"] if m["key"] == "product_categories"), "12")

	def test_event_type_ids_builds_combo_label(self):
		from nce_events.api import events_publish as ep

		doc = {
			"event_name": "E",
			"sku": "s",
			"event_type_id": "ET-1",
			"type": "Ignored When ET",
			"product_type": "Ignored",
			"first_session_date": "2026-01-01",
			"end_date": "2026-01-02",
		}

		meta = MagicMock()
		meta.has_field = lambda fn: fn in {"category", "type"}

		with patch.object(ep.frappe.db, "exists", return_value=True):
			with patch.object(ep.frappe, "get_meta", return_value=meta):
				with patch.object(
					ep.frappe.db,
					"get_value",
					return_value={"category": "Tryouts", "type": "Tryout"},
				):
					p = build_woocommerce_product_payload(doc)
		self.assertEqual(p["categories"], [{"name": "Tryouts, Tryout"}])
		self.assertEqual(
			next(m["value"] for m in p["meta_data"] if m["key"] == "product_categories"),
			"Tryouts, Tryout",
		)

	def test_fallback_type_when_no_event_type(self):
		doc = {
			"event_name": "E",
			"sku": "sku",
			"type": "Clinics",
			"product_type": "Workshops",
			"first_session_date": "2026-01-01",
			"end_date": "2026-01-02",
		}
		p = build_woocommerce_product_payload(doc)
		self.assertEqual(p["categories"], [{"name": "Clinics"}])
		self.assertEqual(next(m["value"] for m in p["meta_data"] if m["key"] == "product_categories"), "Clinics")

	def test_invalid_first_session_date_does_not_truncate_garbage(self):
		doc = {
			"event_name": "E",
			"sku": "sku",
			"type": "Clinics",
			"product_type": "Workshops",
			"first_session_date": "{'fieldname': 'broken'}",
			"end_date": "2026-01-02",
		}
		p = build_woocommerce_product_payload(doc)
		first = next(m["value"] for m in p["meta_data"] if m["key"] == "WooCommerceEventsDateMySQLFormat")
		end = next(m["value"] for m in p["meta_data"] if m["key"] == "WooCommerceEventsEndDateMySQLFormat")
		self.assertEqual(first, "")
		self.assertEqual(end, "")

	def test_wc_end_date_defaults_to_first_when_sessions_missing(self):
		doc = {
			"event_name": "E",
			"sku": "s",
			"first_session_date": "2026-03-10",
			"product_type": "Workshops",
		}
		p = build_woocommerce_product_payload(doc)
		end = next(m["value"] for m in p["meta_data"] if m["key"] == "WooCommerceEventsEndDateMySQLFormat")
		self.assertEqual(end, "2026-03-10")


class TestUpdateEventsToWebsite(unittest.TestCase):
	"""Tests for update_events_to_website — PUT-only, with change detection."""

	_DOC = {
		"doctype": "Events",
		"name": "501",
		"sku": "sku-1",
		"event_name": "Spring Camp",
		"price": 50,
		"first_session_date": "2026-06-01",
		"status": "publish",
	}
	_STORED_SAME = {
		"first_session_date": "2026-06-01",
		"event_name": "Spring Camp",
		"event_type_id": "",
		"price": 50.0,
		"status": "publish",
	}

	@patch("nce_events.api.events_publish.frappe.has_permission", return_value=True)
	@patch("nce_events.api.events_publish.validate_document_page_panel_required_roots")
	@patch("nce_events.api.events_publish.frappe.db")
	@patch("nce_events.api.events_publish.wc_request")
	def test_unchanged_fields_skip_wc_call(self, mock_wc, mock_db, mock_validate, mock_perm):
		mock_db.exists.return_value = "501"
		mock_db.get_value.return_value = self._STORED_SAME

		from nce_events.api.events_publish import update_events_to_website

		out = update_events_to_website(dict(self._DOC))

		mock_wc.assert_not_called()
		self.assertEqual(out["skipped"], 1)
		self.assertEqual(out["wp_id"], 501)
		self.assertEqual(out["name"], "501")

	@patch("nce_events.api.events_publish.frappe.has_permission", return_value=True)
	@patch("nce_events.api.events_publish.validate_document_page_panel_required_roots")
	@patch("nce_events.api.events_publish._resolve_and_patch_categories")
	@patch("nce_events.api.events_publish._run_after_publish_hooks")
	@patch("nce_events.api.events_publish.frappe.db")
	@patch("nce_events.api.events_publish.wc_request")
	def test_changed_name_triggers_put(self, mock_wc, mock_db, mock_hooks, mock_cats, mock_validate, mock_perm):
		mock_db.exists.return_value = "501"
		mock_db.get_value.return_value = {**self._STORED_SAME, "event_name": "Old Name"}
		mock_wc.return_value = {"id": 501, "slug": "spring-camp", "sku": "sku-1"}

		from nce_events.api.events_publish import update_events_to_website

		out = update_events_to_website(dict(self._DOC))

		put_calls = [c for c in mock_wc.call_args_list if c[0][1] == "PUT"]
		self.assertEqual(len(put_calls), 1)
		self.assertEqual(put_calls[0][0][2], "/products/501")
		self.assertEqual(out["wp_id"], 501)
		self.assertNotIn("skipped", out)
		mock_hooks.assert_called_once_with("501")

	@patch("nce_events.api.events_publish.frappe.has_permission", return_value=True)
	@patch("nce_events.api.events_publish.validate_document_page_panel_required_roots")
	@patch("nce_events.api.events_publish._resolve_and_patch_categories")
	@patch("nce_events.api.events_publish._run_after_publish_hooks")
	@patch("nce_events.api.events_publish.frappe.db")
	@patch("nce_events.api.events_publish.wc_request")
	def test_changed_status_triggers_put(self, mock_wc, mock_db, mock_hooks, mock_cats, mock_validate, mock_perm):
		mock_db.exists.return_value = "501"
		mock_db.get_value.return_value = {**self._STORED_SAME, "status": "private"}
		mock_wc.return_value = {"id": 501, "slug": "spring-camp", "sku": "sku-1"}

		from nce_events.api.events_publish import update_events_to_website

		out = update_events_to_website(dict(self._DOC))  # _DOC has status="publish"

		put_calls = [c for c in mock_wc.call_args_list if c[0][1] == "PUT"]
		self.assertEqual(len(put_calls), 1)
		self.assertEqual(put_calls[0][0][2], "/products/501")
		self.assertEqual(out["wp_id"], 501)

	@patch("nce_events.api.events_publish.frappe.has_permission", return_value=True)
	@patch("nce_events.api.events_publish.validate_document_page_panel_required_roots")
	@patch("nce_events.api.events_publish._resolve_and_patch_categories")
	@patch("nce_events.api.events_publish._run_after_publish_hooks")
	@patch("nce_events.api.events_publish.frappe.db")
	@patch("nce_events.api.events_publish.wc_request")
	def test_changed_price_triggers_put(self, mock_wc, mock_db, mock_hooks, mock_cats, mock_validate, mock_perm):
		mock_db.exists.return_value = "501"
		mock_db.get_value.return_value = {**self._STORED_SAME, "price": 25.0}
		mock_wc.return_value = {"id": 501, "slug": "spring-camp", "sku": "sku-1"}

		from nce_events.api.events_publish import update_events_to_website

		out = update_events_to_website(dict(self._DOC))

		put_calls = [c for c in mock_wc.call_args_list if c[0][1] == "PUT"]
		self.assertEqual(len(put_calls), 1)
		self.assertEqual(out["wp_id"], 501)

	@patch("nce_events.api.events_publish.frappe.has_permission", return_value=True)
	@patch("nce_events.api.events_publish.frappe.db")
	def test_non_numeric_name_throws(self, mock_db, mock_perm):
		mock_db.exists.return_value = False

		from nce_events.api.events_publish import update_events_to_website

		with self.assertRaises(frappe.ValidationError):
			update_events_to_website({**self._DOC, "name": "EVT-NON-NUMERIC"})


class TestUpdateWooCommerceProduct(unittest.TestCase):
	@patch("nce_events.api.events_publish.frappe.has_permission", return_value=True)
	@patch("nce_events.api.events_publish._resolve_and_patch_categories")
	@patch("nce_events.api.events_publish.frappe.db")
	@patch("nce_events.api.events_publish.wc_request")
	def test_put_called_with_correct_path(self, mock_wc, mock_db, mock_cats, mock_perm):
		mock_db.exists.return_value = "501"
		mock_wc.return_value = {"id": 501, "slug": "spring-camp", "sku": "sku-1"}

		from nce_events.api.events_publish import update_woo_commerce_product

		doc = {
			"doctype": "Events",
			"name": "501",
			"event_name": "Spring Camp",
			"price": 50,
			"first_session_date": "2026-06-01",
			"status": "publish",
		}
		out = update_woo_commerce_product(doc)

		put_calls = [c for c in mock_wc.call_args_list if c[0][1] == "PUT"]
		self.assertEqual(len(put_calls), 1)
		self.assertEqual(put_calls[0][0][2], "/products/501")
		self.assertEqual(out["ok"], 1)
		self.assertEqual(out["wp_id"], 501)

	@patch("nce_events.api.events_publish.frappe.has_permission", return_value=True)
	@patch("nce_events.api.events_publish.frappe.db")
	def test_non_numeric_name_throws(self, mock_db, mock_perm):
		mock_db.exists.return_value = False

		from nce_events.api.events_publish import update_woo_commerce_product

		with self.assertRaises(frappe.ValidationError):
			update_woo_commerce_product({"doctype": "Events", "name": "EVT-NON-NUMERIC"})


if __name__ == "__main__":
	unittest.main()
