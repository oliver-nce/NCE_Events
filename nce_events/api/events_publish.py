"""Publish Events to WooCommerce and insert Frappe Events with ``name`` = WC product id."""

from __future__ import annotations

import re
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr, get_datetime, getdate

from nce_events.api.derived_fields import apply_derived_fields_to_doc
from nce_events.api.woocommerce_client import DEFAULT_WOOCOMMERCE_CONNECTOR, wc_request

_EVENTS_DOCTYPE: str = "Events"
_SKIP_FIELDTYPES: frozenset[str] = frozenset(
	{
		"Tab Break",
		"Section Break",
		"Column Break",
		"HTML",
		"Fold",
		"Heading",
		"Button",
		"Table",
		"Table MultiSelect",
	},
)


def slugify_product_slug(raw: str | None) -> str:
	"""Lowercase URL-safe slug from SKU (or similar) for WooCommerce ``slug``."""
	s = (raw or "").strip().lower()
	s = re.sub(r"[^a-z0-9\-_]+", "-", s)
	s = re.sub(r"-{2,}", "-", s).strip("-")
	return (s or "event")[:200]


def _field_value_empty(df: Any, value: object) -> bool:
	if value is None:
		return True
	if isinstance(value, str) and not value.strip():
		return True
	if df.fieldtype == "Check":
		return False
	if value in ((), []):
		return True
	return False


def _is_midnight_time_value(value: object) -> bool:
	if value is None:
		return False
	s = str(value).strip()
	if not s:
		return False
	if s in ("00:00:00", "00:00:00.000000"):
		return True
	parts = s.replace(".", ":").split(":")
	return len(parts) >= 3 and parts[0] == "00" and parts[1] == "00" and parts[2].startswith("00")


def _is_year_2000_date_value(df: Any, value: object) -> bool:
	if value is None or value == "":
		return False
	try:
		if df.fieldtype == "Date":
			d = getdate(value)
			return d.year == 2000
		if df.fieldtype == "Datetime":
			dt = get_datetime(value)
			return dt.year == 2000
	except Exception:
		return False
	return False


def _validate_events_for_publish(doc: dict[str, Any]) -> None:
	meta = frappe.get_meta(_EVENTS_DOCTYPE)
	errors: list[str] = []

	for df in meta.fields:
		if df.fieldtype in _SKIP_FIELDTYPES:
			continue
		if cint(getattr(df, "is_virtual", 0)):
			continue
		fn = df.fieldname
		if not fn:
			continue
		val = doc.get(fn)
		if cint(df.reqd):
			if _field_value_empty(df, val):
				errors.append(_("{0} is required.").format(df.label or fn))
				continue
			if df.fieldtype == "Time" and _is_midnight_time_value(val):
				errors.append(_("{0} cannot be 00:00:00.").format(df.label or fn))
			if df.fieldtype in ("Date", "Datetime") and _is_year_2000_date_value(df, val):
				errors.append(_("{0} cannot be in the year 2000.").format(df.label or fn))

	if errors:
		frappe.throw(_("Fix the following before publishing:\n{0}").format("\n".join(errors)))


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


def _mysql_date(value: object) -> str:
	if value is None or value == "":
		return ""
	try:
		return getdate(value).strftime("%Y-%m-%d")
	except Exception:
		return cstr(value).strip()[:10]


def build_woocommerce_product_payload(doc: dict[str, Any]) -> dict[str, Any]:
	"""Map Events fields to WooCommerce REST product create body (subset)."""
	sku = cstr(doc.get("sku")).strip()
	slug = slugify_product_slug(sku or cstr(doc.get("event_name")))
	price_val = doc.get("price")
	regular_price = "" if price_val is None or price_val == "" else cstr(price_val).strip()

	payload: dict[str, Any] = {
		"name": cstr(doc.get("event_name")).strip() or _("Untitled"),
		"type": "simple",
		"slug": slug,
		"status": _wc_status_from_events(doc.get("status")),
		"sku": sku,
		"regular_price": regular_price,
		"description": cstr(doc.get("content") or ""),
		"categories": _categories_payload(doc.get("product_type")),
		"meta_data": [
			{"key": "_sku", "value": sku},
			{
				"key": "WooCommerceEventsDateMySQLFormat",
				"value": _mysql_date(doc.get("first_session_date")),
			},
			{
				"key": "WooCommerceEventsEndDateMySQLFormat",
				"value": _mysql_date(doc.get("end_date")),
			},
		],
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


@frappe.whitelist()
def publish_events_to_website(
	doc: dict[str, Any] | str,
	connector_name: str | None = None,
) -> dict[str, Any]:
	"""
	Validate Events payload, create WooCommerce product, insert ``Events`` with
	``name`` = new product id, then run ``after_events_publish_to_woocommerce`` hooks.

	``doc`` may be a JSON string from ``frappe.call``. Derived fields from ``WP Tables``
	(``is_derived`` / ``sql_expression``) are merged before validation.

	Other apps (e.g. nce_sync) may register::

	    after_events_publish_to_woocommerce = ["my.module.push_fn"]
	"""
	doc = frappe.parse_json(doc) if isinstance(doc, str) else dict(doc)
	if (doc.get("doctype") or _EVENTS_DOCTYPE) != _EVENTS_DOCTYPE:
		frappe.throw(_("Document must be doctype {0}.").format(_EVENTS_DOCTYPE))

	if not frappe.has_permission(_EVENTS_DOCTYPE, "create"):
		frappe.throw(_("Not permitted to create {0}").format(_EVENTS_DOCTYPE), frappe.PermissionError)

	apply_derived_fields_to_doc(_EVENTS_DOCTYPE, doc)
	_validate_events_for_publish(doc)

	wc_body = build_woocommerce_product_payload(doc)
	conn = (connector_name or "").strip() or DEFAULT_WOOCOMMERCE_CONNECTOR

	wc_resp = wc_request(conn, "POST", "/products", json_body=wc_body)
	wpid = wc_resp.get("id") if isinstance(wc_resp, dict) else None
	if wpid is None:
		frappe.throw(_("WooCommerce response did not include a product id."))
	wp_id = int(wpid)

	row = _allowed_events_row(doc, wp_id)
	ev = frappe.get_doc(row)
	ev.insert(ignore_permissions=True)

	_run_after_publish_hooks(ev.name)

	return {
		"ok": 1,
		"name": ev.name,
		"wp_id": wp_id,
		"woocommerce": {"id": wp_id, "slug": wc_resp.get("slug"), "sku": wc_resp.get("sku")},
	}
