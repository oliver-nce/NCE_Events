"""Form Dialog FileMaker-style find: match rows by frozen-meta fields."""

from __future__ import annotations

import json
import re

import frappe
from frappe import _
from frappe.utils import cstr

_SAFE_FIELDNAME = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")

_SKIP_FIELDTYPES = frozenset({
	"Table",
	"Attach",
	"Attach Image",
	"HTML",
	"Button",
	"Signature",
	"Geolocation",
	"Barcode",
	"Color",
	"Code",
	"Section Break",
	"Column Break",
	"Tab Break",
	"Fold",
	"Heading",
})
_NUMERIC_FIELDTYPES = frozenset({"Int", "Float", "Currency", "Percent", "Rating"})


def _parse_find_term(raw: str) -> dict:
	"""Parse a FileMaker-style find term into { mode, op?, value? }."""
	s = raw.strip()
	if s == "=":
		return {"mode": "empty"}
	if s == "*":
		return {"mode": "nonempty"}
	for op in (">=", "<=", "!=", "≠", ">", "<"):
		if s.startswith(op):
			sql_op = "!=" if op == "≠" else op
			return {"mode": "operator", "op": sql_op, "value": s[len(op) :].strip()}
	if s.startswith("="):
		return {"mode": "exact", "value": s[1:].strip()}
	if s.startswith("~"):
		return {"mode": "contains", "value": s[1:].strip()}
	if "*" in s or "%" in s:
		return {"mode": "wildcard", "value": s.replace("*", "%")}
	return {"mode": "contains", "value": s}


def _field_condition(
	table: str,
	fieldname: str,
	parsed: dict,
	fieldtype: str,
	params: list,
) -> str | None:
	mode = parsed["mode"]
	col = f"{table}.`{fieldname}`"

	if mode == "empty":
		return f"({col} IS NULL OR CAST({col} AS CHAR) = '')"
	if mode == "nonempty":
		return f"({col} IS NOT NULL AND CAST({col} AS CHAR) != '')"
	if mode == "operator":
		if fieldtype not in _NUMERIC_FIELDTYPES:
			return None
		params.append(parsed["value"])
		return f"{col} {parsed['op']} %s"
	if mode == "exact":
		params.append(parsed["value"])
		return f"CAST({col} AS CHAR) = %s"
	if mode == "wildcard":
		params.append(parsed["value"])
		return f"CAST({col} AS CHAR) LIKE %s"
	if mode == "contains":
		params.append(f"%{parsed['value']}%")
		return f"CAST({col} AS CHAR) LIKE %s"
	return None


@frappe.whitelist()
def get_form_dialog_search_matches(definition: str, term: str) -> dict:
	"""
	Search non-structural fields from frozen Form Dialog meta (+ name).

	Returns ``{"names": [...]}`` (may be empty).
	"""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)

	definition = cstr(definition or "").strip()
	term = cstr(term or "").strip()
	if not definition or not term:
		return {"names": []}

	prev = frappe.flags.ignore_permissions
	frappe.flags.ignore_permissions = True
	try:
		doc = frappe.get_doc("Form Dialog", definition)
	finally:
		frappe.flags.ignore_permissions = prev

	if not doc.is_active:
		return {"names": []}

	doctype = doc.target_doctype
	if not frappe.has_permission(doctype, "read"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	try:
		frozen = json.loads(doc.frozen_meta_json or "{}")
	except Exception:
		return {"names": []}

	fields = frozen.get("fields") or []
	parsed = _parse_find_term(term)

	table = f"`tab{doctype}`"
	conditions: list[str] = []
	params: list = []

	name_cond = _field_condition(table, "name", parsed, "Data", params)
	if name_cond:
		conditions.append(name_cond)

	for f in fields:
		ft = cstr(f.get("fieldtype") or "").strip()
		fn = cstr(f.get("fieldname") or "").strip()
		if not fn or not ft or not _SAFE_FIELDNAME.match(fn):
			continue
		if ft in _SKIP_FIELDTYPES or ft == "Check":
			continue
		cond = _field_condition(table, fn, parsed, ft, params)
		if cond:
			conditions.append(cond)

	if not conditions:
		return {"names": []}

	where = " OR ".join(conditions)
	sql = f"SELECT `name` FROM {table} WHERE ({where}) ORDER BY `name`"
	rows = frappe.db.sql(sql, tuple(params), as_dict=True)
	return {"names": [r["name"] for r in rows]}


def _criteria_as_dict(criteria) -> dict:
	if criteria is None:
		return {}
	if isinstance(criteria, dict):
		return criteria
	if isinstance(criteria, str):
		try:
			parsed = json.loads(criteria or "{}")
			return parsed if isinstance(parsed, dict) else {}
		except Exception:
			return {}
	return {}


def _fieldtype_by_name(fields: list, fieldname: str) -> str:
	fn = cstr(fieldname or "").strip()
	for f in fields:
		if cstr(f.get("fieldname") or "").strip() == fn:
			return cstr(f.get("fieldtype") or "").strip()
	return "Data"


@frappe.whitelist()
def get_form_dialog_search_matches_criteria(
	definition: str, criteria=None, root_doctype: str = None
) -> dict:
	"""
	AND-combined find: each non-empty criterion applies only to that field.
	``criteria`` is a JSON object (or dict from client) ``{ fieldname: raw_term, ... }``.
	Same per-field operators as ``get_form_dialog_search_matches``.

	``root_doctype`` is the Page Panel's root DocType. When supplied, fields listed
	in that panel's ``search_fields`` are also eligible as search criteria even if
	they are not present in the Form Dialog's frozen layout.
	"""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)

	definition = cstr(definition or "").strip()
	cmap = _criteria_as_dict(criteria)
	if not definition:
		return {"names": []}

	prev = frappe.flags.ignore_permissions
	frappe.flags.ignore_permissions = True
	try:
		doc = frappe.get_doc("Form Dialog", definition)
	finally:
		frappe.flags.ignore_permissions = prev

	if not doc.is_active:
		return {"names": []}

	doctype = doc.target_doctype
	if not frappe.has_permission(doctype, "read"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	try:
		frozen = json.loads(doc.frozen_meta_json or "{}")
	except Exception:
		return {"names": []}

	fields = frozen.get("fields") or []
	allowed = set()
	for f in fields:
		ft = cstr(f.get("fieldtype") or "").strip()
		fn = cstr(f.get("fieldname") or "").strip()
		if not fn or not ft or not _SAFE_FIELDNAME.match(fn):
			continue
		if ft in _SKIP_FIELDTYPES or ft == "Check":
			continue
		allowed.add(fn)

	# Also allow all panel-visible and search-only fields from the linked Page Panel
	root_dt = cstr(root_doctype or "").strip()
	if root_dt and frappe.db.exists("Page Panel", root_dt):
		pp_vals = frappe.db.get_value(
			"Page Panel", root_dt, ["column_order", "search_fields"], as_dict=True
		) or {}
		raw = ",".join(filter(None, [pp_vals.get("column_order"), pp_vals.get("search_fields")]))
		pp_fields = [s.strip() for s in raw.split(",") if s.strip()]
		if pp_fields:
			try:
				_meta_pp = frappe.get_meta(doctype)
				_meta_pp_fns = {mf.fieldname for mf in _meta_pp.fields}
				for fn in pp_fields:
					if fn and _SAFE_FIELDNAME.match(fn) and fn in _meta_pp_fns:
						allowed.add(fn)
			except Exception:
				pass

	table = f"`tab{doctype}`"
	field_conds: list[str] = []
	params: list = []

	for fn_key, raw_term in cmap.items():
		fn = cstr(fn_key or "").strip()
		if not fn or fn not in allowed or not _SAFE_FIELDNAME.match(fn):
			continue
		term = cstr(raw_term or "").strip()
		if not term:
			continue
		ft = _fieldtype_by_name(fields, fn)
		parsed = _parse_find_term(term)
		cond = _field_condition(table, fn, parsed, ft, params)
		if cond:
			field_conds.append(cond)

	if not field_conds:
		return {"names": []}

	where = " AND ".join(f"({c})" for c in field_conds)
	sql = f"SELECT `name` FROM {table} WHERE {where} ORDER BY `name`"
	rows = frappe.db.sql(sql, tuple(params), as_dict=True)
	return {"names": [r["name"] for r in rows]}
