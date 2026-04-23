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
		self.assertIn("_sku", keys)
		self.assertIn("WooCommerceEventsDateMySQLFormat", keys)
		self.assertIn("WooCommerceEventsEndDateMySQLFormat", keys)

	def test_category_numeric_id(self):
		doc = {
			"event_name": "X",
			"sku": "x",
			"product_type": "12",
			"first_session_date": "2026-01-02",
			"end_date": "2026-01-03",
		}
		p = build_woocommerce_product_payload(doc)
		self.assertEqual(p["categories"], [{"id": 12}])


class TestPublishEventsToWebsite(unittest.TestCase):
	@patch("nce_events.api.events_publish.frappe.has_permission", return_value=True)
	@patch("nce_events.api.events_publish._validate_events_for_publish")
	@patch("nce_events.api.events_publish._run_after_publish_hooks")
	@patch("nce_events.api.events_publish._allowed_events_row")
	@patch("nce_events.api.events_publish.frappe.get_doc")
	@patch("nce_events.api.events_publish.wc_request")
	@patch("nce_events.api.events_publish.apply_derived_fields_to_doc")
	def test_derived_merged_before_wc_post(
		self,
		mock_apply_derived,
		mock_wc,
		mock_get_doc,
		mock_allowed,
		mock_hooks,
		mock_validate,
		mock_perm,
	):
		def _allowed(doc, wp_id):
			return {
				"doctype": "Events",
				"name": str(wp_id),
				"sku": doc.get("sku"),
				"event_name": doc.get("event_name"),
			}

		mock_allowed.side_effect = _allowed

		def _apply_derived(_dt, d, **kwargs):
			d["sku"] = "derived-sku-1"
			return d

		mock_apply_derived.side_effect = _apply_derived
		mock_wc.return_value = {"id": 501, "slug": "s", "sku": "derived-sku-1"}
		ev = MagicMock()
		ev.name = "501"
		mock_get_doc.return_value = ev

		from nce_events.api.events_publish import publish_events_to_website

		doc = {
			"doctype": "Events",
			"event_name": "Spring",
			"content": "c",
			"status": "publish",
			"price": 10,
			"product_type": "Workshops",
			"first_session_date": "2026-06-01",
			"end_date": "2026-06-02",
		}
		out = publish_events_to_website(doc)
		self.assertEqual(out["name"], "501")
		mock_apply_derived.assert_called_once()
		self.assertEqual(mock_wc.call_args[0][2], "/products")
		kwargs = mock_wc.call_args[1]
		self.assertEqual(kwargs["json_body"]["sku"], "derived-sku-1")
		insert_row = mock_get_doc.call_args[0][0]
		self.assertEqual(insert_row.get("sku"), "derived-sku-1")


if __name__ == "__main__":
	unittest.main()
