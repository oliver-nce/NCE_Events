"""Publish Events to WooCommerce and insert Frappe Events with ``name`` = WC product id."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr, getdate, now_datetime, today

from nce_events.api.panel_api_pkg._helpers import validate_document_page_panel_required_roots
from nce_events.api.woocommerce_client import (
	DEFAULT_WOOCOMMERCE_CONNECTOR,
	get_woocommerce_v3_base_url,
	wc_request,
)

_EVENTS_DOCTYPE: str = "Events"
_EVENT_TYPES_DOCTYPE: str = "Event Types"


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


def _fill_missing_required_event_dates(meta: Any, row: dict[str, Any]) -> None:
	"""Set required date/timestamp fields left empty (e.g. WP mirrors not on the panel form)."""
	for f in meta.fields:
		if not f.reqd or not f.fieldname:
			continue
		v = row.get(f.fieldname)
		if v is not None and cstr(v).strip() != "":
			continue
		fn_lower = f.fieldname.lower()
		ts_suffix = "_ts" in fn_lower
		if f.fieldtype == "Date":
			row[f.fieldname] = today()
		elif f.fieldtype == "Datetime":
			row[f.fieldname] = now_datetime()
		elif f.fieldtype in ("Data", "Small Text") and ts_suffix:
			row[f.fieldname] = cstr(now_datetime())


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


def _allowed_events_row(doc: dict[str, Any], wp_id: int) -> dict[str, Any]:
	meta = frappe.get_meta(_EVENTS_DOCTYPE)
	allowed = {f.fieldname for f in meta.fields}
	out: dict[str, Any] = {"doctype": _EVENTS_DOCTYPE, "name": str(wp_id)}
	for k, v in doc.items():
		if k in ("doctype", "name"):
			continue
		if k in allowed:
			out[k] = v
	out["name"] = str(wp_id)
	if "wp_id" in allowed:
		wf = meta.get_field("wp_id")
		if wf and wf.fieldtype in ("Int", "Float", "Currency"):
			out["wp_id"] = wp_id
		else:
			out["wp_id"] = str(wp_id)
	if "pk" in allowed:
		pkf = meta.get_field("pk")
		if pkf and pkf.fieldtype in ("Int", "Float", "Currency"):
			out["pk"] = wp_id
		else:
			out["pk"] = str(wp_id)
	_fill_missing_required_event_dates(meta, out)
	return out


def _run_after_publish_hooks(name: str) -> None:
	for fn in frappe.get_hooks("after_events_publish_to_woocommerce") or []:
		try:
			frappe.call(fn, doctype=_EVENTS_DOCTYPE, name=name)
		except Exception as e:
			frappe.log_error(
				title="after_events_publish_to_woocommerce hook failed",
				message=f"{fn}: {e!s}",
			)


def _prepare_events_publish(
	doc: dict[str, Any] | str,
	connector_name: str | None = None,
) -> tuple[dict[str, Any], dict[str, Any], str]:
	"""Parse ``doc``, enforce permissions and panel required fields, build WooCommerce body."""
	doc = frappe.parse_json(doc) if isinstance(doc, str) else dict(doc)
	if (doc.get("doctype") or _EVENTS_DOCTYPE) != _EVENTS_DOCTYPE:
		frappe.throw(_("Document must be doctype {0}.").format(_EVENTS_DOCTYPE))

	if not frappe.has_permission(_EVENTS_DOCTYPE, "create"):
		frappe.throw(_("Not permitted to create {0}").format(_EVENTS_DOCTYPE), frappe.PermissionError)

	validate_document_page_panel_required_roots(
		doc, _EVENTS_DOCTYPE, include_meta_mandatory=False
	)

	wc_body = build_woocommerce_product_payload(doc)
	conn = (connector_name or "").strip() or DEFAULT_WOOCOMMERCE_CONNECTOR
	return doc, wc_body, conn


@frappe.whitelist()
def preview_publish_events_to_website(
	doc: dict[str, Any] | str,
	connector_name: str | None = None,
) -> dict[str, Any]:
	"""Same validation and payload as publish, but do not call WooCommerce or insert Events."""
	_doc, wc_body, conn = _prepare_events_publish(doc, connector_name)
	api_base = get_woocommerce_v3_base_url(conn)
	return {
		"ok": 1,
		"dry_run": 1,
		"method": "POST",
		"path": "/products",
		"api_base_url": api_base,
		"connector_name": conn,
		"json_body": wc_body,
	}


@frappe.whitelist()
def publish_events_to_website(
	doc: dict[str, Any] | str,
	connector_name: str | None = None,
) -> dict[str, Any]:
	"""
	Validate Events payload, create WooCommerce product, insert ``Events`` with
	``name`` = new product id, then run ``after_events_publish_to_woocommerce`` hooks.

	``doc`` may be a JSON string from ``frappe.call``. WP Tables **derived** SQL (``sql_expression``)
	is **not** run on publish — only the values on ``doc`` are used. Page Panel ``required_fields``
	for Events are enforced before WooCommerce (not DocType meta ``reqd``, since the row is inserted
	after the WC call). (WP ``column_mapping`` defaults are applied in the panel New Form Dialog.)

	Other apps (e.g. nce_sync) may register::

	    after_events_publish_to_woocommerce = ["my.module.push_fn"]
	"""
	_doc, wc_body, conn = _prepare_events_publish(doc, connector_name)

	wc_resp = wc_request(conn, "POST", "/products", json_body=wc_body)
	wpid = wc_resp.get("id") if isinstance(wc_resp, dict) else None
	if wpid is None:
		frappe.throw(_("WooCommerce response did not include a product id."))
	wp_id = int(wpid)

	row = _allowed_events_row(_doc, wp_id)
	ev = frappe.get_doc(row)
	ev.insert(ignore_permissions=True)

	_run_after_publish_hooks(ev.name)

	return {
		"ok": 1,
		"name": ev.name,
		"wp_id": wp_id,
		"woocommerce": {"id": wp_id, "slug": wc_resp.get("slug"), "sku": wc_resp.get("sku")},
	}
