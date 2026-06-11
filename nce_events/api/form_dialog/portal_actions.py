"""
Run allow-listed portal actions from Form Dialog related / inline grids.
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr

from .action_registry import get_action_method_spec
from .related_rows import _allowed_child_names_for_related_tab
from ._helpers import _normalize_hop_chain_value


def _parse_portal_actions_raw(raw: object) -> list[dict[str, Any]]:
	if raw is None:
		return []
	s = cstr(raw).strip()
	if not s:
		return []
	try:
		data = json.loads(s)
	except json.JSONDecodeError:
		return []
	if not isinstance(data, list):
		return []
	return [x for x in data if isinstance(x, dict)]


def get_portal_actions_for_row(row: Any) -> list[dict[str, Any]]:
	"""Parse ``portal_actions`` on a child row and attach runtime prompt-arg specs."""
	try:
		actions = _parse_portal_actions_raw(getattr(row, "portal_actions", None))
	except Exception:
		return []

	out: list[dict[str, Any]] = []
	for action in actions:
		try:
			method_key = cstr(action.get("method") or "").strip()
			spec = get_action_method_spec(method_key) if method_key else None
			param_by_arg: dict[str, dict[str, Any]] = {}
			for p in action.get("params") or []:
				if isinstance(p, dict):
					arg = cstr(p.get("arg") or "").strip()
					if arg:
						param_by_arg[arg] = p

			prompt_args: list[dict[str, Any]] = []
			if spec:
				for arg_spec in spec.get("args") or []:
					if not isinstance(arg_spec, dict):
						continue
					arg_name = cstr(arg_spec.get("arg") or "").strip()
					if not arg_name:
						continue
					param = param_by_arg.get(arg_name) or {}
					source = cstr(param.get("source") or arg_spec.get("default_source") or "prompt").strip()
					if source == "prompt":
						prompt_entry: dict[str, Any] = {
							"arg": arg_name,
							"label": cstr(arg_spec.get("label") or "").strip() or arg_name,
							"fieldtype": cstr(arg_spec.get("fieldtype") or "Data").strip() or "Data",
							"options": cstr(arg_spec.get("options") or "").strip(),
							"reqd": 1 if cint(arg_spec.get("reqd")) else 0,
						}
						desc = cstr(arg_spec.get("description") or "").strip()
						if desc:
							prompt_entry["description"] = desc
						prompt_args.append(prompt_entry)

			enriched = dict(action)
			enriched["promptArgs"] = prompt_args
			out.append(enriched)
		except Exception:
			continue
	return out


def _resolve_param_value(
	source: str,
	field: str,
	*,
	child_doc: Any,
	root_doc: Any,
	child_name: str,
	root_name: str,
	prompt_values: dict[str, Any],
	const_value: object,
) -> Any:
	src = cstr(source or "").strip().lower()
	fn = cstr(field or "").strip()
	if src == "row":
		if fn == "name" or not fn:
			return child_name
		return child_doc.get(fn)
	if src == "root":
		if fn == "name" or not fn:
			return root_name
		return root_doc.get(fn)
	if src == "prompt":
		return prompt_values.get(field) if field else prompt_values.get("")
	if src == "const":
		return const_value
	return None


def _allowed_child_names_for_context(
	context_kind: str,
	root_doctype: str,
	root_name: str,
	row: Any,
) -> set[str]:
	kind = cstr(context_kind or "related").strip().lower()
	if kind == "inline":
		pfn = cstr(getattr(row, "parent_fieldname", None) or "").strip()
		if not pfn:
			return set()
		root_doc = frappe.get_doc(root_doctype, root_name)
		return {
			cstr(r.name).strip()
			for r in (root_doc.get(pfn) or [])
			if cstr(getattr(r, "name", None) or "").strip()
		}

	child_dt = cstr(getattr(row, "child_doctype", None) or "").strip()
	link_f = cstr(getattr(row, "link_field", None) or "").strip()
	hc = _normalize_hop_chain_value(getattr(row, "hop_chain", None))
	allowed = _allowed_child_names_for_related_tab(root_name, child_dt, link_f, hc)
	return set(allowed or [])


def _action_applies_to_tab(spec: dict[str, Any], child_doctype: str, root_doctype: str) -> bool:
	"""True when the method is allowed on this related tab (child grid) / root combo."""
	applies_child = spec.get("applies_to_doctypes") or []
	applies_root = spec.get("applies_to_root_doctypes") or []
	if not applies_child and not applies_root:
		return True
	if applies_child and child_doctype in applies_child:
		return True
	if applies_root and root_doctype in applies_root:
		return True
	return False


@frappe.whitelist()
def run_portal_action(
	definition: str,
	context_kind: str = "related",
	related_row_name: str = "",
	root_doctype: str = "",
	root_name: str = "",
	child_name: str = "",
	action_id: str = "",
	prompt_values: str | dict | None = None,
) -> dict[str, Any]:
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)

	definition = cstr(definition or "").strip()
	kind = cstr(context_kind or "related").strip().lower() or "related"
	related_row_name = cstr(related_row_name or "").strip()
	root_doctype = cstr(root_doctype or "").strip()
	root_name = cstr(root_name or "").strip()
	child_name = cstr(child_name or "").strip()
	action_id = cstr(action_id or "").strip()

	if not definition or not related_row_name or not root_doctype or not root_name:
		frappe.throw(_("Missing parameters"))
	if not child_name or not action_id:
		frappe.throw(_("Missing child row or action"))

	if isinstance(prompt_values, str):
		prompt_values = frappe.parse_json(prompt_values) if prompt_values.strip() else {}
	if prompt_values is None:
		prompt_values = {}
	if not isinstance(prompt_values, dict):
		frappe.throw(_("prompt_values must be an object"))

	prev = frappe.flags.ignore_permissions
	frappe.flags.ignore_permissions = True
	try:
		doc = frappe.get_doc("Form Dialog", definition)
	finally:
		frappe.flags.ignore_permissions = prev

	if not cint(doc.is_active):
		frappe.throw(_("This Form Dialog is not active."), frappe.PermissionError)

	if cstr(doc.target_doctype or "").strip() != root_doctype:
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	if not frappe.has_permission(root_doctype, "write", doc=root_name):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	row = None
	if kind == "inline":
		for r in doc.get("inline_child_tables") or []:
			if cstr(r.name) == related_row_name:
				row = r
				break
	else:
		for r in doc.related_doctypes or []:
			if cstr(r.name) == related_row_name:
				row = r
				break
	if not row:
		frappe.throw(_("Portal tab row not found"))

	actions = _parse_portal_actions_raw(getattr(row, "portal_actions", None))
	action = next((a for a in actions if cstr(a.get("action_id") or "").strip() == action_id), None)
	if not action:
		frappe.throw(_("Portal action not found"))

	roles = action.get("roles") or []
	if roles:
		user_roles = set(frappe.get_roles(frappe.session.user))
		required = {cstr(r).strip() for r in roles if cstr(r).strip()}
		if required and not (user_roles & required):
			frappe.throw(_("Not permitted"), frappe.PermissionError)

	method_key = cstr(action.get("method") or "").strip()
	spec = get_action_method_spec(method_key)
	if not spec:
		frappe.throw(_("Action method is not registered"))

	child_dt = cstr(getattr(row, "child_doctype", None) or "").strip()
	if not _action_applies_to_tab(spec, child_dt, root_doctype):
		frappe.throw(_("Action does not apply to this DocType"))

	allowed_names = _allowed_child_names_for_context(kind, root_doctype, root_name, row)
	if child_name not in allowed_names:
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	child_doc = frappe.get_doc(child_dt, child_name)
	root_doc = frappe.get_doc(root_doctype, root_name)

	param_by_arg: dict[str, dict[str, Any]] = {}
	for p in action.get("params") or []:
		if isinstance(p, dict):
			arg = cstr(p.get("arg") or "").strip()
			if arg:
				param_by_arg[arg] = p

	kwargs: dict[str, Any] = {}
	for arg_spec in spec.get("args") or []:
		if not isinstance(arg_spec, dict):
			continue
		arg_name = cstr(arg_spec.get("arg") or "").strip()
		if not arg_name:
			continue
		param = param_by_arg.get(arg_name) or {}
		source = cstr(param.get("source") or arg_spec.get("default_source") or "prompt").strip()
		field = cstr(param.get("field") or arg_spec.get("default_field") or "").strip()
		if source == "prompt":
			field = arg_name
		value = _resolve_param_value(
			source,
			field,
			child_doc=child_doc,
			root_doc=root_doc,
			child_name=child_name,
			root_name=root_name,
			prompt_values=prompt_values,
			const_value=param.get("value"),
		)
		if cint(arg_spec.get("reqd")) and (value is None or cstr(value).strip() == ""):
			label = cstr(arg_spec.get("label") or "").strip() or arg_name
			frappe.throw(_("Missing required value for {0}").format(label))
		kwargs[arg_name] = value

	fn = frappe.get_attr(spec["dotted_path"])
	result = fn(**kwargs)

	return {
		"ok": 1,
		"action_id": action_id,
		"method": method_key,
		"result": result,
	}
