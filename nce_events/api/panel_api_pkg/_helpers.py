from __future__ import annotations

from typing import Any

import frappe
from frappe import _
from frappe.utils import cint

_EMAIL_NAMES: set[str] = {"email", "email_address", "email_id"}
_PHONE_NAMES: set[str] = {"phone", "mobile", "mobile_no", "phone_number", "cell", "contact_number"}


def _auto_detect_contact_fields(doctype: str) -> tuple[str, str]:
	"""Auto-detect email and phone/SMS fields directly on a DocType.

	Matches by fieldtype (Email/Phone) or common fieldnames.
	Returns (email_field, sms_field) — either may be empty string.
	"""
	email_field = ""
	sms_field = ""

	try:
		meta = frappe.get_meta(doctype)
	except Exception:
		return email_field, sms_field

	for f in meta.fields:
		fn = f.fieldname.lower()
		ft = (f.fieldtype or "").strip()
		if not email_field and (ft == "Email" or fn in _EMAIL_NAMES):
			email_field = f.fieldname
		if not sms_field and (ft == "Phone" or fn in _PHONE_NAMES):
			sms_field = f.fieldname
		if email_field and sms_field:
			break

	return email_field, sms_field


def _find_link_field(doctype: str, target_doctype: str) -> str | None:
	"""Return the first Link fieldname on doctype that points to target_doctype."""
	try:
		meta = frappe.get_meta(doctype)
		for field in meta.fields:
			if field.fieldtype == "Link" and field.options == target_doctype:
				return field.fieldname
	except Exception:
		pass
	return None


def _title_case(fieldname: str) -> str:
	return fieldname.replace("_", " ").title()


def _safe_filename(value: str) -> str:
	"""Sanitize a string for use as a filesystem filename component."""
	return "".join(c if c.isalnum() or c in "-_" else "_" for c in str(value))


def _wp_doctype_label_map() -> tuple[set[str], dict[str, str]]:
	wp_rows = frappe.get_all(
		"WP Tables",
		filters={"frappe_doctype": ["is", "set"]},
		fields=["frappe_doctype", "nce_name", "table_name"],
	)
	label_map: dict[str, str] = {}
	wp_doctypes: set[str] = set()
	for row in wp_rows:
		dt = row.get("frappe_doctype")
		if dt:
			wp_doctypes.add(dt)
			label_map[dt] = row.get("nce_name") or row.get("table_name") or dt
	return wp_doctypes, label_map


def _get_link_fieldnames(doctype: str) -> list[str]:
	"""Return Link fieldnames on doctype for fetch-only (future use)."""
	try:
		meta = frappe.get_meta(doctype)
		return [f.fieldname for f in meta.fields if f.fieldtype == "Link" and f.fieldname]
	except Exception:
		return []


def _get_link_fields_with_target(doctype: str) -> list[dict[str, str]]:
	"""Return Link fields with their target DocType: [{fieldname, options}]."""
	try:
		meta = frappe.get_meta(doctype)
		return [
			{"fieldname": f.fieldname, "options": f.options}
			for f in meta.fields
			if f.fieldtype == "Link" and f.fieldname and f.options
		]
	except Exception:
		return []


def _get_gender_field_key(root_doctype: str) -> str | None:
	"""Return 'gender' or 'link_field.gender'. Case-insensitive field search."""
	try:
		meta = frappe.get_meta(root_doctype)
		for f in meta.fields:
			if (f.fieldname or "").lower() == "gender":
				return f.fieldname
			if f.fieldtype == "Link" and f.options:
				child_meta = frappe.get_meta(f.options)
				if any((cf.fieldname or "").lower() == "gender" for cf in child_meta.fields):
					return f"{f.fieldname}.gender"
	except Exception:
		pass
	return None


def _meta_reqd_root_fieldnames(root_doctype: str) -> list[str]:
	"""Fieldnames on root DocType with Mandatory (reqd) set — same field scope as get_doctype_fields."""
	_SKIP_FIELDTYPES: frozenset[str] = frozenset(
		{
			"Section Break",
			"Column Break",
			"Tab Break",
			"HTML",
			"Fold",
			"Heading",
			"Button",
			"Table",
			"Table MultiSelect",
		}
	)
	_SKIP_FIELDNAMES: frozenset[str] = frozenset(
		{
			"owner",
			"creation",
			"modified",
			"modified_by",
			"docstatus",
			"idx",
			"parent",
			"parentfield",
			"parenttype",
		}
	)
	try:
		meta = frappe.get_meta(root_doctype)
	except Exception:
		return []
	out: list[str] = []
	for f in meta.fields:
		if f.fieldtype in _SKIP_FIELDTYPES or f.fieldname in _SKIP_FIELDNAMES:
			continue
		if cint(f.reqd):
			out.append(f.fieldname)
	return out


def _parse_csv(value: str | None) -> list[str]:
	"""Parse a comma-delimited string into a list of stripped, non-empty values."""
	if not value:
		return []
	return [v.strip() for v in value.split(",") if v.strip()]


def validate_document_page_panel_required_roots(
	doc: dict[str, Any],
	doctype: str,
	*,
	include_meta_mandatory: bool = True,
) -> None:
	"""
	Raise if required root fields are empty. Skips dotted keys (link child paths).
	Same emptiness rules as Form Dialog save via ``_panel_required_value_empty``.

	When ``include_meta_mandatory`` is True (default): Page Panel ``required_fields``
	for this doctype plus DocType meta-mandatory (``reqd``) root fields.

	When False: only Page Panel ``required_fields`` (e.g. Woo publish before insert).
	"""
	from nce_events.api.form_dialog._helpers import _panel_required_value_empty

	required_keys: list[str] = []
	if frappe.db.exists("Page Panel", doctype):
		pp = frappe.get_doc("Page Panel", doctype)
		required_keys.extend(_parse_csv(getattr(pp, "required_fields", None) or ""))
	if include_meta_mandatory:
		required_keys = list(dict.fromkeys(required_keys + _meta_reqd_root_fieldnames(doctype)))
	else:
		required_keys = list(dict.fromkeys(required_keys))
	for fn in required_keys:
		if "." in fn:
			continue
		if _panel_required_value_empty(doc.get(fn)):
			frappe.throw(_("Missing value for required field: {0}").format(fn))
