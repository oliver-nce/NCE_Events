"""Update existing Frappe Events records on WooCommerce via the REST API."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr, flt, getdate

from nce_events.api.panel_api_pkg._helpers import validate_document_page_panel_required_roots
from nce_events.api.woocommerce_client import (
	DEFAULT_WOOCOMMERCE_CONNECTOR,
	wc_request,
)

_EVENTS_DOCTYPE: str = "Events"
_EVENT_TYPES_DOCTYPE: str = "Event Types"
_WC_TRACKED_FIELDS: tuple[str, ...] = ("first_session_date", "event_name", "event_type_id", "price", "status")


def slugify_product_slug(raw: str | None) -> str:
	"""Lowercase URL-safe slug from SKU (or similar) for WooCommerce ``slug``."""
	s = (raw or "").strip().lower()
	s = re.sub(r"[^a-z0-9\-_]+", "-", s)
	s = re.sub(r"-{2,}", "-", s).strip("-")
	return (s or "event")[:200]


def _wc_status_from_events(status: object) -> str:
	s = cstr(status).strip().lower()
	if s in ("publish", "published", "live", "active"):
		return "publish"
	if s in ("private",):
		return "private"
	if s in ("pending",):
		return "pending"
	return "draft"


def _categories_payload(product_type: object) -> list[dict[str, Any]]:
	raw = cstr(product_type).strip()
	if not raw:
		return []
	if raw.isdigit():
		return [{"id": cint(raw)}]
	return [{"name": raw}]


def _event_types_meta_field(meta: Any, candidates: tuple[str, ...]) -> str | None:
	for fn in candidates:
		if meta.has_field(fn):
			return fn
	return None


def _woo_category_label_from_event_type_row(event_type_id: str) -> str | None:
	"""e.g. ``Tryouts, Tryout`` when category + type are set on Event Types."""
	if not event_type_id or not frappe.db.exists(_EVENT_TYPES_DOCTYPE, event_type_id):
		return None
	meta = frappe.get_meta(_EVENT_TYPES_DOCTYPE)

	type_fn = _event_types_meta_field(meta, ("type",))
	if not type_fn:
		return None
	parent_fn = _event_types_meta_field(meta, ("category", "parent_category", "event_category"))

	fields = list({type_fn, parent_fn} - {None})
	row = frappe.db.get_value(_EVENT_TYPES_DOCTYPE, event_type_id, fields, as_dict=True)
	if not row:
		return None
	typ = cstr(row.get(type_fn)).strip()
	if not typ:
		return None
	if parent_fn:
		parent_val = cstr(row.get(parent_fn) or "").strip()
		if parent_val:
			return f"{parent_val}, {typ}"
	return typ


def _wc_categories_payload_from_doc(doc: dict[str, Any]) -> list[dict[str, Any]]:
	"""Prefer Event Types via ``event_type_id``, then Events ``type``, else ``product_type``."""
	et_id = cstr(doc.get("event_type_id") or "").strip()
	if et_id:
		label = _woo_category_label_from_event_type_row(et_id)
		if label:
			return _categories_payload(label)

	fb_typ = doc.get("type")
	if fb_typ is None or str(fb_typ).strip() == "":
		return _categories_payload(doc.get("product_type"))
	return _categories_payload(fb_typ)


def _product_categories_meta_value(categories: list[dict[str, Any]]) -> str:
	"""WooCommerce Events / site convention: ``product_categories`` meta mirrors category assignment."""
	if not categories:
		return ""
	first = categories[0]
	if isinstance(first, dict):
		if first.get("name") is not None:
			return cstr(first["name"]).strip()
		if first.get("id") is not None:
			return cstr(first["id"]).strip()
	return ""



def _parse_events_date(value: object) -> date | None:
	if value is None or value == "":
		return None
	if isinstance(value, (dict, list)):
		return None
	s = cstr(value).strip()
	if not s:
		return None
	if s[0] in "{[" or (s.startswith("'") and len(s) >= 2 and s[1] == "{"):
		return None
	# JSON-serialized JS Date: 2026-05-05T00:00:00.000Z
	if len(s) >= 10 and s[4] == "-" and s[7] == "-":
		if "T" in s or (len(s) > 10 and s[10] == " "):
			try:
				return getdate(s[:10])
			except Exception:
				pass
	# Desk US-style picker: 05-28-2026 (getdate may not parse depending on system)
	us_m = re.fullmatch(r"(\d{1,2})-(\d{1,2})-(\d{4})", s)
	if us_m:
		mm, dd, yyyy = int(us_m.group(1)), int(us_m.group(2)), int(us_m.group(3))
		try:
			return date(yyyy, mm, dd)
		except ValueError:
			pass
	try:
		raw = getdate(s)
	except Exception:
		return None
	if isinstance(raw, datetime):
		return raw.date()
	if isinstance(raw, date):
		return raw
	return None


def _mysql_date(value: object) -> str:
	d = _parse_events_date(value)
	return d.strftime("%Y-%m-%d") if d else ""


def _wc_events_end_date_mysql_from_doc(doc: dict[str, Any]) -> str:
	"""Woo end meta = first session date + ``7 * number_of_sessions`` days (MySQL ``Y-m-d``)."""
	first = _parse_events_date(doc.get("first_session_date"))
	if first is None:
		return ""
	n_sessions = max(0, cint(doc.get("number_of_sessions") or 0))
	end = first + timedelta(days=7 * n_sessions)
	return end.strftime("%Y-%m-%d")


def build_woocommerce_product_payload(doc: dict[str, Any]) -> dict[str, Any]:
	"""Map Events fields to WooCommerce REST product create body (subset)."""
	sku = cstr(doc.get("sku")).strip()
	slug = slugify_product_slug(sku or cstr(doc.get("event_name")))
	price_val = doc.get("price")
	regular_price = "" if price_val is None or price_val == "" else cstr(price_val).strip()

	wc_categories = _wc_categories_payload_from_doc(doc)
	meta_rows: list[dict[str, Any]] = [
		{
			"key": "WooCommerceEventsDateMySQLFormat",
			"value": _mysql_date(doc.get("first_session_date")),
		},
		{
			"key": "WooCommerceEventsEndDateMySQLFormat",
			"value": _wc_events_end_date_mysql_from_doc(doc),
		},
		{"key": "product_categories", "value": _product_categories_meta_value(wc_categories)},
	]

	payload: dict[str, Any] = {
		"name": cstr(doc.get("event_name")).strip() or _("Untitled"),
		"type": "simple",
		"slug": slug,
		"status": _wc_status_from_events(doc.get("status")),
		"sku": sku,
		"regular_price": regular_price,
		"description": cstr(doc.get("content") or ""),
		"categories": wc_categories,
		"meta_data": meta_rows,
	}
	return payload



def _run_after_publish_hooks(name: str) -> None:
	for fn in frappe.get_hooks("after_events_publish_to_woocommerce") or []:
		try:
			frappe.call(fn, doctype=_EVENTS_DOCTYPE, name=name)
		except Exception as e:
			frappe.log_error(
				title="after_events_publish_to_woocommerce hook failed",
				message=f"{fn}: {e!s}",
			)


def _is_existing_events_row(name: object) -> int | None:
	"""Return the numeric WC product id if ``name`` is a positive integer string and the Events row exists, else None."""
	s = cstr(name).strip()
	if not s or not s.isdigit():
		return None
	n = int(s)
	if n <= 0:
		return None
	if not frappe.db.exists(_EVENTS_DOCTYPE, str(n)):
		return None
	return n


def _wc_tracked_fields_changed(doc: dict[str, Any], wp_id: int) -> bool:
	"""Return True if any tracked WC field (first_session_date, event_name, event_type_id, price, status) differs from the stored Events row."""
	stored = frappe.db.get_value(
		_EVENTS_DOCTYPE, str(wp_id), list(_WC_TRACKED_FIELDS), as_dict=True
	)
	if not stored:
		return True
	if _mysql_date(doc.get("first_session_date")) != _mysql_date(stored.get("first_session_date")):
		return True
	if cstr(doc.get("event_name")).strip() != cstr(stored.get("event_name")).strip():
		return True
	if cstr(doc.get("event_type_id")).strip() != cstr(stored.get("event_type_id")).strip():
		return True
	if flt(doc.get("price") or 0) != flt(stored.get("price") or 0):
		return True
	if _wc_status_from_events(doc.get("status")) != _wc_status_from_events(stored.get("status")):
		return True
	return False


def _do_woo_product_put(wp_id: int, wc_body: dict[str, Any], conn: str) -> dict[str, Any]:
	"""Resolve category IDs then PUT ``wc_body`` to ``/products/{wp_id}``. Returns the WooCommerce response."""
	_resolve_and_patch_categories(wc_body, conn)
	return wc_request(conn, "PUT", f"/products/{wp_id}", json_body=wc_body)


def _prepare_events_publish(
	doc: dict[str, Any] | str,
	connector_name: str | None = None,
) -> tuple[dict[str, Any], dict[str, Any], str]:
	"""Parse ``doc``, enforce write permissions and panel required fields, build WooCommerce body."""
	doc = frappe.parse_json(doc) if isinstance(doc, str) else dict(doc)
	if (doc.get("doctype") or _EVENTS_DOCTYPE) != _EVENTS_DOCTYPE:
		frappe.throw(_("Document must be doctype {0}.").format(_EVENTS_DOCTYPE))

	if not frappe.has_permission(_EVENTS_DOCTYPE, "write"):
		frappe.throw(
			_("Not permitted to write {0}").format(_EVENTS_DOCTYPE),
			frappe.PermissionError,
		)

	validate_document_page_panel_required_roots(
		doc, _EVENTS_DOCTYPE, include_meta_mandatory=False
	)

	wc_body = build_woocommerce_product_payload(doc)
	conn = (connector_name or "").strip() or DEFAULT_WOOCOMMERCE_CONNECTOR
	return doc, wc_body, conn


@frappe.whitelist()
def update_events_to_website(
	doc: dict[str, Any] | str,
	connector_name: str | None = None,
) -> dict[str, Any]:
	"""
	Check tracked fields against the stored Events row and PUT to WooCommerce if changed.

	``doc["name"]`` must be a numeric WC product id matching an existing Frappe Events row.
	Returns ``{"ok": 1, "skipped": 1}`` when no tracked fields differ.

	Does not persist the Frappe record — the caller's Submit handles that.

	Other apps (e.g. nce_sync) may register::

	    after_events_publish_to_woocommerce = ["my.module.push_fn"]
	"""
	raw = frappe.parse_json(doc) if isinstance(doc, str) else dict(doc)
	wp_id = _is_existing_events_row(raw.get("name"))
	if wp_id is None:
		frappe.throw(
			_("{0} does not have a valid WooCommerce product id as its name.").format(_EVENTS_DOCTYPE)
		)

	_doc, wc_body, conn = _prepare_events_publish(raw, connector_name)

	if not _wc_tracked_fields_changed(_doc, wp_id):
		return {"ok": 1, "name": str(wp_id), "wp_id": wp_id, "skipped": 1}

	wc_resp = _do_woo_product_put(wp_id, wc_body, conn)
	_run_after_publish_hooks(str(wp_id))
	return {
		"ok": 1,
		"name": str(wp_id),
		"wp_id": wp_id,
		"woocommerce": {
			"id": wc_resp.get("id", wp_id),
			"slug": wc_resp.get("slug"),
			"sku": wc_resp.get("sku"),
		},
	}


@frappe.whitelist()
def update_woo_commerce_product(
	doc: dict[str, Any] | str,
	connector_name: str | None = None,
) -> dict[str, Any]:
	"""
	Update an existing WooCommerce product from an Events doc.

	``doc["name"]`` must be the WooCommerce product id (numeric string, matching the
	Frappe ``Events`` row ``name``).  Builds the same payload as
	:func:`publish_events_to_website`, resolves category IDs via the WooCommerce
	categories API, then PUTs to ``/products/{id}``.

	Does NOT modify the Frappe Events record — the caller is responsible for saving.
	"""
	doc = frappe.parse_json(doc) if isinstance(doc, str) else dict(doc)
	if (doc.get("doctype") or _EVENTS_DOCTYPE) != _EVENTS_DOCTYPE:
		frappe.throw(_("Document must be doctype {0}.").format(_EVENTS_DOCTYPE))

	if not frappe.has_permission(_EVENTS_DOCTYPE, "write"):
		frappe.throw(_("Not permitted to write {0}").format(_EVENTS_DOCTYPE), frappe.PermissionError)

	wp_id = _is_existing_events_row(doc.get("name"))
	if wp_id is None:
		frappe.throw(
			_("{0} does not have a valid WooCommerce product id as its name.").format(_EVENTS_DOCTYPE)
		)

	conn = (connector_name or "").strip() or DEFAULT_WOOCOMMERCE_CONNECTOR
	wc_body = build_woocommerce_product_payload(doc)
	wc_resp = _do_woo_product_put(wp_id, wc_body, conn)

	return {
		"ok": 1,
		"wp_id": wp_id,
		"woocommerce": {
			"id": wc_resp.get("id", wp_id),
			"slug": wc_resp.get("slug"),
			"sku": wc_resp.get("sku"),
		},
	}


_NEW_WOO_DOCTYPE: str = "New Woo Commerce Product"
_NEW_WOO_FIELDS: tuple[str, ...] = ("event_name", "type_id", "price", "start_date")


def _patch_new_woo_body(wc_body: dict[str, Any]) -> None:
	"""
	Post-process the WooCommerce payload for New Woo Commerce Product:
	  - Force status = 'private' and post_type = 'product'.
	Mutates wc_body in place.
	"""
	wc_body["status"] = "private"
	wc_body["post_type"] = "product"


def _wc_slug(label: str) -> str:
	"""Derive a WooCommerce-style slug from a category label (lowercase, hyphens)."""
	return re.sub(r"[^a-z0-9]+", "-", label.strip().lower()).strip("-")


def _resolve_wc_category_term_id(label: str, connector: str) -> int | None:
	"""
	Return the WooCommerce product category term_id for *label*.

	Strategy (most-precise first):
	1. ``?slug=<derived-slug>`` — exact slug lookup, no pagination.
	2. ``?search=<label>&per_page=100`` — name-contains search with exact-name
	   filter as fallback (handles slugs that differ from the computed value).
	"""
	slug = _wc_slug(label)
	by_slug = wc_request(connector, "GET", "/products/categories", query_params={"slug": slug})
	if isinstance(by_slug, list) and by_slug:
		cid = by_slug[0].get("id")
		if cid is not None:
			return int(cid)

	results = wc_request(
		connector,
		"GET",
		"/products/categories",
		query_params={"search": label, "per_page": "100"},
	)
	if not isinstance(results, list):
		return None
	label_lower = label.strip().lower()
	for cat in results:
		if isinstance(cat, dict) and cstr(cat.get("name")).strip().lower() == label_lower:
			cid = cat.get("id")
			return int(cid) if cid is not None else None
	return None


def _resolve_and_patch_categories(wc_body: dict[str, Any], connector: str) -> None:
	"""
	Replace the name-based ``categories`` entry built by the payload helper with
	``[{"id": term_id}]`` resolved from the WooCommerce categories API.
	Throws if the category cannot be found.
	"""
	cats = wc_body.get("categories", [])
	if not cats or not isinstance(cats[0], dict):
		return
	label = cstr(cats[0].get("name") or "").strip()
	if not label:
		return

	term_id = _resolve_wc_category_term_id(label, connector)
	if term_id is None:
		frappe.throw(_("WooCommerce product category not found for: {0}").format(label))
	wc_body["categories"] = [{"id": term_id}]


@frappe.whitelist()
def publish_new_woo_commerce_product(
	doc: dict[str, Any] | str,
) -> dict[str, Any]:
	"""
	Validate New Woo Commerce Product form values, POST to WooCommerce, and return the new
	product id.  Does NOT insert a Frappe document — the caller clears the Singleton after success.
	"""
	doc = frappe.parse_json(doc) if isinstance(doc, str) else dict(doc)

	if not frappe.has_permission(_NEW_WOO_DOCTYPE, "write"):
		frappe.throw(_("Not permitted to write {0}").format(_NEW_WOO_DOCTYPE), frappe.PermissionError)

	missing = [f for f in _NEW_WOO_FIELDS if not cstr(doc.get(f)).strip()]
	if missing:
		frappe.throw(_("Please fill all required fields: {0}").format(", ".join(missing)))

	mapped: dict[str, Any] = dict(doc)
	mapped["event_type_id"] = mapped.pop("type_id", None)
	mapped["first_session_date"] = mapped.pop("start_date", None)

	wc_body = build_woocommerce_product_payload(mapped)
	_patch_new_woo_body(wc_body)
	_resolve_and_patch_categories(wc_body, DEFAULT_WOOCOMMERCE_CONNECTOR)

	wc_resp = wc_request(DEFAULT_WOOCOMMERCE_CONNECTOR, "POST", "/products", json_body=wc_body)

	wpid = wc_resp.get("id") if isinstance(wc_resp, dict) else None
	if wpid is None:
		frappe.throw(_("WooCommerce response did not include a product id."))

	return {"ok": 1, "wp_id": int(wpid)}


@frappe.whitelist()
def clear_new_woo_commerce_product() -> dict[str, Any]:
	"""Clear all editable fields on the New Woo Commerce Product Singleton after a successful publish."""
	if not frappe.has_permission(_NEW_WOO_DOCTYPE, "write"):
		frappe.throw(_("Not permitted to write {0}").format(_NEW_WOO_DOCTYPE), frappe.PermissionError)

	doc = frappe.get_doc(_NEW_WOO_DOCTYPE)
	doc.event_name = ""
	doc.type_id = None
	doc.price = 0
	doc.start_date = None
	doc.save(ignore_permissions=True)
	return {"ok": 1}
