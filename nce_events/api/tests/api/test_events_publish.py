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


class TestDuplicateEvent(unittest.TestCase):
	_SOURCE = {
		"doctype": "Events",
		"name": "501",
		"event_name": "Spring Camp",
		"event_type_id": "ET-1",
		"price": 99,
		"first_session_date": "2026-06-01",
		"sku": "CAMP-501",
	}

	@patch("nce_events.api.events_publish.frappe.has_permission", return_value=True)
	@patch("nce_events.api.events_publish._copy_event_sessions", return_value=2)
	@patch("nce_events.api.events_publish._insert_duplicated_events_row")
	@patch("nce_events.api.events_publish._post_wc_private_product_from_events_stub", return_value=902)
	@patch("nce_events.api.events_publish.frappe.get_doc")
	def test_duplicate_posts_wc_and_copies_row(
		self,
		mock_get_doc,
		mock_post_wc,
		mock_insert,
		mock_copy_sessions,
		mock_perm,
	):
		source_doc = MagicMock()
		source_doc.name = "501"
		source_doc.meta.has_field.return_value = False
		source_doc.as_dict.return_value = dict(self._SOURCE)
		mock_get_doc.return_value = source_doc
		new_doc = MagicMock()
		new_doc.name = "902"
		mock_insert.return_value = new_doc

		from nce_events.api.events_publish import duplicate_event

		out = duplicate_event(source_name="501")

		mock_get_doc.assert_called_once_with("Events", "501")
		mock_post_wc.assert_called_once()
		stub = mock_post_wc.call_args[0][0]
		self.assertEqual(stub["event_name"], "Spring Camp")
		self.assertEqual(stub["event_type_id"], "ET-1")
		mock_copy_sessions.assert_called_once_with("501", "902")
		mock_insert.assert_called_once_with(source_doc, 902)
		self.assertEqual(out["ok"], 1)
		self.assertEqual(out["new_name"], "902")
		self.assertEqual(out["wp_id"], 902)
		self.assertEqual(out["sessions_copied"], 2)

	@patch("nce_events.api.events_publish.frappe.has_permission", return_value=True)
	@patch("nce_events.api.events_publish._copy_event_sessions", return_value=0)
	@patch("nce_events.api.events_publish._insert_duplicated_events_row")
	@patch("nce_events.api.events_publish._post_wc_private_product_from_events_stub", return_value=903)
	@patch("nce_events.api.events_publish.frappe.get_doc")
	def test_duplicate_resolves_float_product_id(
		self,
		mock_get_doc,
		mock_post_wc,
		mock_insert,
		mock_copy_sessions,
		mock_perm,
	):
		source_doc = MagicMock()
		source_doc.name = "501"
		source_doc.meta.has_field.return_value = False
		source_doc.as_dict.return_value = dict(self._SOURCE)
		mock_get_doc.return_value = source_doc
		mock_insert.return_value = MagicMock(name="903")

		from nce_events.api.events_publish import duplicate_event

		out = duplicate_event(source_name="501.0")

		mock_get_doc.assert_called_once_with("Events", "501")
		mock_copy_sessions.assert_called_once_with("501", "903")
		self.assertEqual(out["new_name"], "903")


class TestDeleteEvent(unittest.TestCase):
	_SOURCE = {
		"doctype": "Events",
		"name": "501",
		"event_name": "Spring Camp",
	}

	@patch("nce_events.api.events_publish.frappe.db.commit")
	@patch("nce_events.api.events_publish.frappe.has_permission", return_value=True)
	@patch("nce_events.api.events_publish._count_enrollments_for_event", return_value=3)
	@patch("nce_events.api.events_publish.frappe.get_doc")
	def test_refuses_when_enrollments_exist(
		self,
		mock_get_doc,
		mock_count,
		mock_perm,
		mock_commit,
	):
		source_doc = MagicMock()
		source_doc.name = "501"
		mock_get_doc.return_value = source_doc

		from nce_events.api.events_publish import delete_event

		with self.assertRaises(frappe.ValidationError):
			delete_event(source_name="501")
		mock_commit.assert_not_called()

	@patch("nce_events.api.events_publish.frappe.db.commit")
	@patch("nce_events.api.events_publish.frappe.delete_doc")
	@patch("nce_events.api.events_publish._delete_event_sessions_for_product", return_value=2)
	@patch("nce_events.api.events_publish.wc_request")
	@patch("nce_events.api.events_publish.frappe.has_permission", return_value=True)
	@patch("nce_events.api.events_publish._count_enrollments_for_event", return_value=0)
	@patch("nce_events.api.events_publish.frappe.get_doc")
	def test_delete_trashes_wc_product_then_deletes_frappe_rows(
		self,
		mock_get_doc,
		mock_count,
		mock_perm,
		mock_wc,
		mock_delete_sessions,
		mock_delete_doc,
		mock_commit,
	):
		source_doc = MagicMock()
		source_doc.name = "501"
		mock_get_doc.return_value = source_doc
		mock_wc.return_value = {"id": 501, "status": "trash"}

		frappe.local.nce_sync_queued_job_ids = ["job-1", "job-2"]

		from nce_events.api.events_publish import delete_event

		out = delete_event(source_name="501")

		mock_wc.assert_called_once()
		self.assertEqual(mock_wc.call_args[0][1], "DELETE")
		self.assertEqual(mock_wc.call_args[0][2], "/products/501")
		self.assertNotIn("force", mock_wc.call_args[1].get("query_params") or {})
		mock_delete_sessions.assert_called_once_with("501")
		mock_delete_doc.assert_called_once_with("Events", "501", force=True)
		mock_commit.assert_called_once()
		self.assertEqual(out["ok"], 1)
		self.assertEqual(out["name"], "501")
		self.assertEqual(out["sessions_deleted"], 2)
		self.assertEqual(out["sync_job_ids"], ["job-1", "job-2"])
		self.assertIn("deleted", out["message"].lower())


class TestNormalizeWpProductId(unittest.TestCase):
	def test_strips_trailing_decimal_zeros(self):
		from nce_events.api.events_publish import _normalize_wp_product_id

		self.assertEqual(_normalize_wp_product_id("281471.0"), "281471")
		self.assertEqual(_normalize_wp_product_id(281471.0), "281471")

	def test_rejects_non_numeric(self):
		from nce_events.api.events_publish import _normalize_wp_product_id

		self.assertIsNone(_normalize_wp_product_id("EVT-1"))
		self.assertIsNone(_normalize_wp_product_id(""))


if __name__ == "__main__":
	unittest.main()
