"""
Portal field editor for Form Dialog Related DocType rows.

Configures which fields appear (and are editable) in the related-rows grid that
lives inside a Form Dialog's "related tabs". The editor is Desk-only (System
Manager) and persists its state on the Form Dialog Related DocType child row.
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr

from ._helpers import _require_system_manager

from .action_registry import get_action_method_spec

# Fieldtypes excluded from the related-table portal field editor (layout / non-data).
_PORTAL_EDITOR_SKIP_FIELDTYPES: frozenset[str] = frozenset(
	{
		"Tab Break",
		"Section Break",
		"Column Break",
		"Heading",
		"HTML",
		"Image",
		"Fold",
		"Table",
		"Button",
	}
)


def _portal_meta_field_eligible_for_editor(f: dict) -> bool:
	fn = cstr(f.get("fieldname") or "").strip()
	if not fn:
		return False
	if cint(f.get("hidden")):
		return False
	ft = cstr(f.get("fieldtype") or "").strip()
	return ft not in _PORTAL_EDITOR_SKIP_FIELDTYPES


def _portal_name_field_dict(child_doctype: str) -> dict[str, Any]:
	"""Frappe PK ``name`` — not in ``meta.fields``; label from ``meta.get_label('name')``."""
	meta = frappe.get_meta(child_doctype)
	label = cstr(meta.get_label("name") or "").strip() or "name"
	return {
		"fieldname": "name",
		"label": label,
		"fieldtype": "Data",
		"read_only": 1,
	}


def _portal_meta_fields_for_editor(
	meta_fields: list[dict],
	child_doctype: str | None = None,
	name_field_label: str | None = None,
) -> list[dict]:
	"""Eligible frozen fields plus ``name`` when missing (uses DocType label)."""
	eligible = [f for f in meta_fields if _portal_meta_field_eligible_for_editor(f)]
	if any(cstr(f.get("fieldname") or "").strip() == "name" for f in eligible):
		return eligible
	if name_field_label and cstr(name_field_label).strip():
		name_row: dict[str, Any] = {
			"fieldname": "name",
			"label": cstr(name_field_label).strip(),
			"fieldtype": "Data",
			"read_only": 1,
		}
	elif child_doctype and cstr(child_doctype).strip():
		name_row = _portal_name_field_dict(cstr(child_doctype).strip())
	else:
		name_row = {"fieldname": "name", "label": "name", "fieldtype": "Data", "read_only": 1}
	return [name_row, *eligible]


def _portal_allowed_fieldnames(
	meta_fields: list[dict],
	child_doctype: str | None = None,
	name_field_label: str | None = None,
) -> set[str]:
	return {
		cstr(f.get("fieldname") or "").strip()
		for f in _portal_meta_fields_for_editor(meta_fields, child_doctype, name_field_label)
		if cstr(f.get("fieldname") or "").strip()
	}


def _parse_portal_actions_entries(raw: str | None) -> list[dict]:
	if not raw or not cstr(raw).strip():
		return []
	try:
		data = json.loads(raw)
	except json.JSONDecodeError:
		return []
	if not isinstance(data, list):
		return []
	return [x for x in data if isinstance(x, dict)]


_VALID_PARAM_SOURCES = frozenset({"row", "root", "prompt", "const"})


def _normalize_portal_actions_for_save(portal_actions: list) -> list[dict[str, Any]]:
	normalized: list[dict[str, Any]] = []
	seen_ids: set[str] = set()
	for entry in portal_actions:
		if not isinstance(entry, dict):
			continue
		action_id = cstr(entry.get("action_id") or "").strip()
		if not action_id:
			action_id = frappe.generate_hash(length=10)
		if action_id in seen_ids:
			continue
		seen_ids.add(action_id)

		label = cstr(entry.get("label") or "").strip()
		method = cstr(entry.get("method") or "").strip()
		if not label or not method:
			frappe.throw(_("Each portal action requires a label and method"))

		spec = get_action_method_spec(method)
		if not spec:
			frappe.throw(_("Unknown portal action method: {0}").format(method))

		roles_raw = entry.get("roles")
		roles: list[str] = []
		if isinstance(roles_raw, list):
			roles = [cstr(r).strip() for r in roles_raw if cstr(r).strip()]
		elif isinstance(roles_raw, str) and roles_raw.strip():
			roles = [r.strip() for r in roles_raw.split(",") if r.strip()]

		confirm = cstr(entry.get("confirm") or "").strip()
		hide_if = cstr(entry.get("hide_if") or "").strip()

		spec_arg_names = {
			cstr(a.get("arg") or "").strip()
			for a in (spec.get("args") or [])
			if isinstance(a, dict) and cstr(a.get("arg") or "").strip()
		}
		params_out: list[dict[str, Any]] = []
		for p in entry.get("params") or []:
			if not isinstance(p, dict):
				continue
			arg = cstr(p.get("arg") or "").strip()
			if not arg or arg not in spec_arg_names:
				frappe.throw(_("Invalid param arg for method {0}: {1}").format(method, arg))
			source = cstr(p.get("source") or "").strip().lower()
			if source not in _VALID_PARAM_SOURCES:
				frappe.throw(_("Invalid param source for {0}: {1}").format(arg, source))
			param_rec: dict[str, Any] = {"arg": arg, "source": source}
			if source in ("row", "root"):
				field = cstr(p.get("field") or "").strip()
				if field:
					param_rec["field"] = field
			elif source == "const":
				param_rec["value"] = p.get("value")
			params_out.append(param_rec)

		rec: dict[str, Any] = {
			"action_id": action_id,
			"label": label,
			"method": method,
			"params": params_out,
		}
		if roles:
			rec["roles"] = roles
		if confirm:
			rec["confirm"] = confirm
		if hide_if:
			rec["hide_if"] = hide_if
		normalized.append(rec)
	return normalized


def _parse_portal_field_config_entries(raw: str | None) -> list[dict]:
	if not raw or not cstr(raw).strip():
		return []
	try:
		data = json.loads(raw)
	except json.JSONDecodeError:
		return []
	if not isinstance(data, list):
		return []
	return [x for x in data if isinstance(x, dict)]


def _build_portal_editor_rows(
	meta_fields: list[dict],
	portal_entries: list[dict],
	child_doctype: str | None = None,
	name_field_label: str | None = None,
) -> list[dict[str, str | int]]:
	eligible = _portal_meta_fields_for_editor(meta_fields, child_doctype, name_field_label)
	by_fn: dict[str, dict] = {}
	for f in eligible:
		fn = cstr(f.get("fieldname") or "").strip()
		by_fn[fn] = f

	out: list[dict[str, str | int]] = []
	seen: set[str] = set()

	for entry in portal_entries:
		fn = cstr(entry.get("fieldname") or "").strip()
		if not fn or fn not in by_fn or fn in seen:
			continue
		f = by_fn[fn]
		seen.add(fn)
		show_b = 1 if cint(entry.get("show")) else 0
		row_out: dict[str, str | int] = {
			"fieldname": fn,
			"label": cstr(f.get("label") or "").strip() or fn,
			"fieldtype": cstr(f.get("fieldtype") or ""),
			"show": show_b,
			"editable": 1 if cint(entry.get("editable")) else 0,
		}
		sr = cint(entry.get("sort_rank")) if show_b else 0
		sd = cstr(entry.get("sort_dir") or "").strip().lower()
		if sd not in ("asc", "desc"):
			sd = "asc"
		if sr > 0 and show_b:
			row_out["sort_rank"] = sr
			row_out["sort_dir"] = sd
		out.append(row_out)

	for f in eligible:
		fn = cstr(f.get("fieldname") or "").strip()
		if fn in seen:
			continue
		seen.add(fn)
		out.append(
			{
				"fieldname": fn,
				"label": cstr(f.get("label") or "").strip() or fn,
				"fieldtype": cstr(f.get("fieldtype") or ""),
				"show": 0,
				"editable": 0,
			}
		)
	return out


def _normalize_portal_field_config_for_save(
	portal_field_config: list, allowed: set[str]
) -> list[dict[str, int | str]]:
	"""Validate fieldnames, strip sort when Show≠1, renumber sort_rank 1..n."""
	parsed: list[dict[str, int | str]] = []
	seen: set[str] = set()
	for entry in portal_field_config:
		if not isinstance(entry, dict):
			continue
		fn = cstr(entry.get("fieldname") or "").strip()
		if not fn or fn not in allowed or fn in seen:
			continue
		seen.add(fn)
		show_b = 1 if cint(entry.get("show")) else 0
		sd = cstr(entry.get("sort_dir") or "").strip().lower()
		if sd not in ("asc", "desc"):
			sd = "asc"
		sr = cint(entry.get("sort_rank")) if show_b else 0
		if sr < 0:
			sr = 0
		rec: dict[str, int | str] = {
			"fieldname": fn,
			"show": show_b,
			"editable": 1 if cint(entry.get("editable")) else 0,
		}
		if show_b and sr > 0:
			rec["sort_rank"] = sr
			rec["sort_dir"] = sd
		parsed.append(rec)

	indexed = [
		(i, r) for i, r in enumerate(parsed) if cint(r.get("show")) == 1 and cint(r.get("sort_rank", 0)) > 0
	]
	indexed.sort(key=lambda x: (cint(x[1].get("sort_rank", 0)), x[0]))
	for new_rank, (_idx, r) in enumerate(indexed, start=1):
		r["sort_rank"] = new_rank

	for r in parsed:
		if cint(r.get("show")) != 1 or cint(r.get("sort_rank", 0)) <= 0:
			r.pop("sort_rank", None)
			r.pop("sort_dir", None)
		elif cstr(r.get("sort_dir") or "").strip().lower() not in ("asc", "desc"):
			r["sort_dir"] = "asc"

	return parsed


@frappe.whitelist()
def get_related_portal_field_editor(form_dialog: str, child_row_name: str) -> dict:
	"""Desk Page Panel: load rows for the floating portal-field editor (System Manager)."""
	_require_system_manager()

	doc = frappe.get_doc("Form Dialog", form_dialog)
	row = None
	for r in doc.related_doctypes or []:
		if cstr(r.name) == cstr(child_row_name).strip():
			row = r
			break
	if not row:
		frappe.throw(_("Related DocType row not found"))

	info: dict = {}
	if row.info:
		try:
			info = json.loads(row.info)
		except json.JSONDecodeError:
			info = {}

	meta_fields = info.get("fields") if isinstance(info.get("fields"), list) else []
	name_field_label = cstr(info.get("name_field_label") or "").strip() or None
	portal_raw = cstr(getattr(row, "portal_field_config", None) or "").strip()
	portal_entries = _parse_portal_field_config_entries(portal_raw)
	rows = _build_portal_editor_rows(
		meta_fields,
		portal_entries,
		child_doctype=cstr(row.child_doctype or "").strip() or None,
		name_field_label=name_field_label,
	)
	actions_raw = cstr(getattr(row, "portal_actions", None) or "").strip()
	actions = _parse_portal_actions_entries(actions_raw)

	return {
		"form_dialog": doc.name,
		"child_row_name": row.name,
		"child_doctype": row.child_doctype,
		"tab_label": cstr(row.tab_label or "").strip() or row.child_doctype,
		"rows": rows,
		"actions": actions,
		"capture_error": info.get("capture_error"),
	}


@frappe.whitelist()
def save_related_portal_field_config(
	form_dialog: str, child_row_name: str, portal_field_config: str | list
) -> dict:
	"""Desk Page Panel: persist portal_field_config JSON on a Form Dialog Related DocType row."""
	_require_system_manager()

	if isinstance(portal_field_config, str):
		s = portal_field_config.strip()
		if not s:
			portal_field_config = []
		else:
			try:
				portal_field_config = json.loads(s)
			except json.JSONDecodeError:
				frappe.throw(_("Invalid portal_field_config JSON"))
	if not isinstance(portal_field_config, list):
		frappe.throw(_("portal_field_config must be a list"))

	doc = frappe.get_doc("Form Dialog", form_dialog)
	row = None
	for r in doc.related_doctypes or []:
		if cstr(r.name) == cstr(child_row_name).strip():
			row = r
			break
	if not row:
		frappe.throw(_("Related DocType row not found"))

	info: dict = {}
	if row.info:
		try:
			info = json.loads(row.info)
		except json.JSONDecodeError:
			info = {}
	meta_fields = info.get("fields") if isinstance(info.get("fields"), list) else []
	name_field_label = cstr(info.get("name_field_label") or "").strip() or None
	allowed = _portal_allowed_fieldnames(
		meta_fields,
		child_doctype=cstr(row.child_doctype or "").strip() or None,
		name_field_label=name_field_label,
	)

	normalized = _normalize_portal_field_config_for_save(portal_field_config, allowed)

	row.portal_field_config = json.dumps(normalized, indent=None)
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {"ok": 1, "portal_field_config": normalized}


@frappe.whitelist()
def save_related_portal_actions(
	form_dialog: str, child_row_name: str, portal_actions: str | list
) -> dict:
	"""Desk Page Panel: persist portal_actions JSON on a Form Dialog Related DocType row."""
	_require_system_manager()

	if isinstance(portal_actions, str):
		s = portal_actions.strip()
		if not s:
			portal_actions = []
		else:
			try:
				portal_actions = json.loads(s)
			except json.JSONDecodeError:
				frappe.throw(_("Invalid portal_actions JSON"))
	if not isinstance(portal_actions, list):
		frappe.throw(_("portal_actions must be a list"))

	doc = frappe.get_doc("Form Dialog", form_dialog)
	row = None
	for r in doc.related_doctypes or []:
		if cstr(r.name) == cstr(child_row_name).strip():
			row = r
			break
	if not row:
		frappe.throw(_("Related DocType row not found"))

	normalized = _normalize_portal_actions_for_save(portal_actions)
	row.portal_actions = json.dumps(normalized, indent=None)
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {"ok": 1, "actions": normalized}


def _find_inline_child_row(doc: Any, child_row_name: str) -> Any:
	for r in doc.get("inline_child_tables") or []:
		if cstr(r.name) == cstr(child_row_name).strip():
			return r
	return None


@frappe.whitelist()
def get_inline_child_portal_field_editor(form_dialog: str, child_row_name: str) -> dict:
	"""Desk: portal column editor for a Form Dialog Inline Child Table row (System Manager)."""
	_require_system_manager()

	doc = frappe.get_doc("Form Dialog", form_dialog)
	row = _find_inline_child_row(doc, child_row_name)
	if not row:
		frappe.throw(_("Inline child table row not found"))

	info: dict = {}
	if row.info:
		try:
			info = json.loads(row.info)
		except json.JSONDecodeError:
			info = {}

	meta_fields = info.get("fields") if isinstance(info.get("fields"), list) else []
	name_field_label = cstr(info.get("name_field_label") or "").strip() or None
	portal_raw = cstr(getattr(row, "portal_field_config", None) or "").strip()
	portal_entries = _parse_portal_field_config_entries(portal_raw)
	rows = _build_portal_editor_rows(
		meta_fields,
		portal_entries,
		child_doctype=cstr(row.child_doctype or "").strip() or None,
		name_field_label=name_field_label,
	)
	actions_raw = cstr(getattr(row, "portal_actions", None) or "").strip()
	actions = _parse_portal_actions_entries(actions_raw)

	return {
		"form_dialog": doc.name,
		"child_row_name": row.name,
		"child_doctype": row.child_doctype,
		"parent_fieldname": cstr(row.parent_fieldname or "").strip(),
		"tab_label": cstr(row.tab_label or "").strip() or row.child_doctype,
		"rows": rows,
		"actions": actions,
		"capture_error": info.get("capture_error"),
	}


@frappe.whitelist()
def save_inline_child_portal_field_config(
	form_dialog: str, child_row_name: str, portal_field_config: str | list
) -> dict:
	"""Desk: persist portal_field_config on a Form Dialog Inline Child Table row."""
	_require_system_manager()

	if isinstance(portal_field_config, str):
		s = portal_field_config.strip()
		if not s:
			portal_field_config = []
		else:
			try:
				portal_field_config = json.loads(s)
			except json.JSONDecodeError:
				frappe.throw(_("Invalid portal_field_config JSON"))
	if not isinstance(portal_field_config, list):
		frappe.throw(_("portal_field_config must be a list"))

	doc = frappe.get_doc("Form Dialog", form_dialog)
	row = _find_inline_child_row(doc, child_row_name)
	if not row:
		frappe.throw(_("Inline child table row not found"))

	info: dict = {}
	if row.info:
		try:
			info = json.loads(row.info)
		except json.JSONDecodeError:
			info = {}
	meta_fields = info.get("fields") if isinstance(info.get("fields"), list) else []
	name_field_label = cstr(info.get("name_field_label") or "").strip() or None
	allowed = _portal_allowed_fieldnames(
		meta_fields,
		child_doctype=cstr(row.child_doctype or "").strip() or None,
		name_field_label=name_field_label,
	)

	normalized = _normalize_portal_field_config_for_save(portal_field_config, allowed)

	row.portal_field_config = json.dumps(normalized, indent=None)
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {"ok": 1, "portal_field_config": normalized}


@frappe.whitelist()
def save_inline_child_portal_actions(
	form_dialog: str, child_row_name: str, portal_actions: str | list
) -> dict:
	"""Desk: persist portal_actions on a Form Dialog Inline Child Table row."""
	_require_system_manager()

	if isinstance(portal_actions, str):
		s = portal_actions.strip()
		if not s:
			portal_actions = []
		else:
			try:
				portal_actions = json.loads(s)
			except json.JSONDecodeError:
				frappe.throw(_("Invalid portal_actions JSON"))
	if not isinstance(portal_actions, list):
		frappe.throw(_("portal_actions must be a list"))

	doc = frappe.get_doc("Form Dialog", form_dialog)
	row = _find_inline_child_row(doc, child_row_name)
	if not row:
		frappe.throw(_("Inline child table row not found"))

	normalized = _normalize_portal_actions_for_save(portal_actions)
	row.portal_actions = json.dumps(normalized, indent=None)
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {"ok": 1, "actions": normalized}
