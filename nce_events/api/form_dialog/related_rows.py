"""
Related-rows endpoints for the panel-V2 Form Dialog.

Reads (``get_form_dialog_related_rows``) and writes
(``save_form_dialog_related_rows``) child-DocType rows shown in the related
tabs of a Form Dialog. All field selection and editability is gated by the
portal_field_config persisted on the Form Dialog Related DocType row.
"""

from __future__ import annotations

from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr

from ._helpers import (
	_assert_doctype_in_wp_tables,
	_filters_for_related_rows,
	_normalize_hop_chain_value,
	_related_list_columns_from_child_row,
	_sanitize_get_list_fields,
)
from .edit_condition import evaluate_edit_condition


def _inline_child_tables_for_vue_api(doc: Any) -> list[dict[str, Any]]:
	"""Inline Table-field tabs for V2 — same portal columns shape as related rows."""
	out: list[dict[str, Any]] = []
	for r in doc.get("inline_child_tables") or []:
		d = r.as_dict()
		pfn = cstr(d.get("parent_fieldname") or "").strip()
		cd = cstr(d.get("child_doctype") or "").strip()
		if not pfn or not cd:
			continue
		lb = cstr(d.get("tab_label") or "").strip() or pfn
		crn = cstr(d.get("name") or getattr(r, "name", None) or "").strip()
		row: dict[str, Any] = {
			"parent_fieldname": pfn,
			"child_doctype": cd,
			"label": lb,
			"child_row_name": crn,
		}
		pfc = d.get("portal_field_config") or getattr(r, "portal_field_config", None)
		if pfc is not None and cstr(pfc).strip():
			row["portal_field_config"] = cstr(pfc)
		row["allow_add_remove"] = cint(getattr(r, "allow_add_remove", 0))
		ec = getattr(r, "edit_condition", None)
		if ec is not None and cstr(ec).strip():
			row["edit_condition"] = cstr(ec)
		info_val = d.get("info")
		if info_val is not None and cstr(info_val).strip():
			row["info"] = cstr(info_val)
		out.append(row)
	return out


def _enforce_related_edit_condition(row: Any, root_doctype: str, root_name: str) -> None:
	if not evaluate_edit_condition(
		getattr(row, "edit_condition", "") or "",
		root_doctype,
		root_name,
	):
		frappe.throw(_("Editing is not allowed for this record"), frappe.PermissionError)


def _load_related_tab_context(
	definition: str,
	related_row_name: str,
	root_doctype: str,
	root_name: str,
	*,
	root_perm: str,
) -> tuple[Any, Any, str, str, list[dict[str, str]]]:
	"""Shared guard for related-tab read/write endpoints."""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)

	definition = cstr(definition or "").strip()
	related_row_name = cstr(related_row_name or "").strip()
	root_doctype = cstr(root_doctype or "").strip()
	root_name = cstr(root_name or "").strip()
	if not definition or not related_row_name or not root_doctype or not root_name:
		frappe.throw(_("Missing parameters"))

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

	if not frappe.has_permission(root_doctype, root_perm, doc=root_name):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	row = None
	for r in doc.related_doctypes or []:
		if cstr(r.name) == related_row_name:
			row = r
			break
	if not row:
		frappe.throw(_("Related DocType row not found"))

	child_dt = cstr(row.child_doctype or "").strip()
	link_f = cstr(row.link_field or "").strip()
	if not child_dt or not link_f:
		frappe.throw(_("Invalid related row configuration"))

	_assert_doctype_in_wp_tables(child_dt)

	hc = _normalize_hop_chain_value(row.hop_chain or getattr(row, "hop_chain", None))
	return doc, row, child_dt, link_f, hc


def _related_tab_flags(
	row: Any,
	root_doctype: str,
	root_name: str,
	pending_root_values: Any = None,
) -> dict[str, Any]:
	return {
		"allow_add_remove": cint(getattr(row, "allow_add_remove", 0)),
		"edit_allowed": evaluate_edit_condition(
			getattr(row, "edit_condition", "") or "",
			root_doctype,
			root_name,
			pending_root_values=pending_root_values,
		),
	}


def _script_tool_groups_for_vue_api(doc: Any) -> list[dict[str, Any]]:
	out = []
	for r in doc.get("script_tool_groups") or []:
		gk = cstr(getattr(r, "group_key", None) or "").strip() or "__ungrouped__"
		tl = cstr(getattr(r, "tab_label", None) or "").strip() or gk
		out.append({"group_key": gk, "tab_label": tl})
	return out


def _related_rows_for_vue_api(doc: Any) -> list[dict[str, Any]]:
	"""Child rows for V2: doctype, label, link_field, hop_chain, child_row_name, portal_field_config, info."""
	out: list[dict[str, Any]] = []
	for r in doc.related_doctypes or []:
		d = r.as_dict()
		dt = cstr(d.get("child_doctype") or "").strip()
		if not dt:
			continue
		lb = cstr(d.get("tab_label") or "").strip() or dt
		lf = cstr(d.get("link_field") or "").strip()
		crn = cstr(d.get("name") or getattr(r, "name", None) or "").strip()
		row: dict[str, Any] = {
			"doctype": dt,
			"label": lb,
			"link_field": lf,
			"child_row_name": crn,
		}
		hc_raw = d.get("hop_chain") or getattr(r, "hop_chain", None)
		row["hop_chain"] = _normalize_hop_chain_value(hc_raw)
		pfc = d.get("portal_field_config") or getattr(r, "portal_field_config", None)
		if pfc is not None and cstr(pfc).strip():
			row["portal_field_config"] = cstr(pfc)
		row["allow_add_remove"] = cint(getattr(r, "allow_add_remove", 0))
		ec = getattr(r, "edit_condition", None)
		if ec is not None and cstr(ec).strip():
			row["edit_condition"] = cstr(ec)
		info_val = d.get("info")
		if info_val is not None and cstr(info_val).strip():
			row["info"] = cstr(info_val)
		out.append(row)
	return out


@frappe.whitelist()
def get_form_dialog_related_rows(
	definition: str,
	related_row_name: str,
	root_doctype: str,
	root_name: str,
	limit: int | str = 500,
	pending_root_values: str | dict | None = None,
) -> dict[str, Any]:
	"""
	Fetch rows for one Form Dialog related tab (panel V2).

	Whitelisted for any logged-in user. Validates that ``root_doctype`` matches
	the Form Dialog target, that the related child row belongs to this dialog,
	and that the caller may read the root document. Row fetches use
	``frappe.get_list`` so DocType permissions apply to the child DocType and
	each hop bridge DocType.

	Args:
	    definition: Form Dialog document name (same as ``get_form_dialog_definition``).
	    related_row_name: ``name`` of the ``Form Dialog Related DocType`` child row.
	    root_doctype: Must equal the Form Dialog's ``target_doctype``.
	    root_name: Primary key of the root document open in the dialog.
	    limit: Max rows (1-2000, default 500).
	    pending_root_values: Optional JSON dict of unsaved root field values for edit_condition.

	Returns:
	    ``{ child_doctype, columns, rows, order_by, edit_allowed, allow_add_remove }``.
	"""
	_, row, child_dt, link_f, hc = _load_related_tab_context(
		definition,
		related_row_name,
		root_doctype,
		root_name,
		root_perm="read",
	)

	limit_n = cint(limit)
	if limit_n < 1:
		limit_n = 500
	if limit_n > 2000:
		limit_n = 2000

	filters, force_empty = _filters_for_related_rows(root_name, child_dt, link_f, hc)
	columns, order_by = _related_list_columns_from_child_row(row)
	field_list = _sanitize_get_list_fields(child_dt, [cstr(c.get("fieldname") or "") for c in columns])

	from nce_events.api.form_dialog.portal_actions import get_portal_actions_for_row

	actions = get_portal_actions_for_row(row)
	flags = _related_tab_flags(row, root_doctype, root_name, pending_root_values)

	if force_empty:
		return {
			"child_doctype": child_dt,
			"columns": columns,
			"rows": [],
			"order_by": order_by,
			"actions": actions,
			**flags,
		}

	rows = frappe.get_list(
		child_dt,
		filters=filters,
		fields=field_list,
		order_by=order_by,
		limit_page_length=limit_n,
	)
	return {
		"child_doctype": child_dt,
		"columns": columns,
		"rows": rows,
		"order_by": order_by,
		"actions": actions,
		**flags,
	}


@frappe.whitelist()
def reevaluate_related_tab_edit_allowed(
	definition: str,
	related_row_name: str,
	root_doctype: str,
	root_name: str,
	pending_root_values: str | dict | None = None,
) -> dict[str, Any]:
	"""Recompute edit_allowed / allow_add_remove without refetching child rows."""
	_, row, _child_dt, _link_f, _hc = _load_related_tab_context(
		definition,
		related_row_name,
		root_doctype,
		root_name,
		root_perm="read",
	)
	return _related_tab_flags(row, root_doctype, root_name, pending_root_values)


# Fieldtypes not editable through the related grid (use Desk for links / files / tables).
_RELATED_SAVE_SKIP_FIELDTYPES: frozenset[str] = frozenset(
	{
		"Link",
		"Dynamic Link",
		"Table",
		"Attach",
		"Attach Image",
		"HTML",
		"Read Only",
		"Button",
		"Barcode",
		"Geolocation",
	}
)


def _editable_related_fieldnames_for_save(row: Any, child_dt: str) -> set[str]:
	"""Portal columns with show=1, editable=1, and safe fieldtypes on ``child_dt``."""
	columns, _ob = _related_list_columns_from_child_row(row)
	meta = frappe.get_meta(child_dt)
	out: set[str] = set()
	for c in columns:
		if not cint(c.get("editable")):
			continue
		fn = cstr(c.get("fieldname") or "").strip()
		if not fn or fn == "name":
			continue
		df = meta.get_field(fn)
		if not df:
			continue
		if getattr(df, "read_only", 0):
			continue
		ft = cstr(df.fieldtype or "").strip()
		if ft in _RELATED_SAVE_SKIP_FIELDTYPES:
			continue
		out.add(fn)
	return out


def _allowed_child_names_for_related_tab(
	root_name: str,
	child_dt: str,
	link_f: str,
	hc: list[dict[str, str]],
) -> set[str]:
	filters, force_empty = _filters_for_related_rows(root_name, child_dt, link_f, hc)
	if force_empty:
		return set()
	names = frappe.get_all(child_dt, filters=filters, pluck="name", limit=5000)
	return {cstr(n).strip() for n in (names or []) if cstr(n).strip()}


@frappe.whitelist()
def save_form_dialog_related_rows(
	definition: str,
	related_row_name: str,
	root_doctype: str,
	root_name: str,
	updates: str | list | None,
) -> dict[str, Any]:
	"""
	Persist field changes on related-tab rows (panel V2).

	Only fieldnames marked editable in the related portal config are accepted.
	Each document must appear in the same filtered set as ``get_form_dialog_related_rows``.
	Root document must be writable (same session contract as ``save_form_dialog_document``).

	Args:
	    definition: Form Dialog document name.
	    related_row_name: ``Form Dialog Related DocType`` child row ``name``.
	    root_doctype: Must match Form Dialog ``target_doctype``.
	    root_name: Root document primary key.
	    updates: JSON list of ``{ "name": "<child docname>", "values": { "<field>": <value>, ... } }``.

	Returns:
	    ``{ "ok": 1, "saved": <int> }`` — number of child documents saved (0 if updates empty).
	"""
	_, row, child_dt, link_f, hc = _load_related_tab_context(
		definition,
		related_row_name,
		root_doctype,
		root_name,
		root_perm="write",
	)

	updates = frappe.parse_json(updates) if isinstance(updates, str) else updates
	if updates is None:
		updates = []
	if not isinstance(updates, list):
		frappe.throw(_("updates must be a list"))

	_enforce_related_edit_condition(row, root_doctype, root_name)

	allowed_names = _allowed_child_names_for_related_tab(root_name, child_dt, link_f, hc)
	allowed_fields = _editable_related_fieldnames_for_save(row, child_dt)

	if not updates:
		return {"ok": 1, "saved": 0, "sync_job_ids": []}

	saved = 0
	for item in updates:
		if not isinstance(item, dict):
			frappe.throw(_("Each update must be an object"))
		cname = cstr(item.get("name") or "").strip()
		if not cname:
			frappe.throw(_("Each update needs a name"))
		if cname not in allowed_names:
			frappe.throw(_("Not permitted to update this row"), frappe.PermissionError)
		values = item.get("values")
		if not isinstance(values, dict):
			frappe.throw(_("values must be an object"))
		if not values:
			continue
		if not frappe.has_permission(child_dt, "write", doc=cname):
			frappe.throw(_("Not permitted"), frappe.PermissionError)

		child = frappe.get_doc(child_dt, cname)
		for fn, raw_val in values.items():
			fn = cstr(fn).strip()
			if not fn or fn not in allowed_fields:
				frappe.throw(_("Field '{0}' is not editable in this related tab").format(fn))
			child.set(fn, raw_val)
		child.save()
		saved += 1

	return {
		"ok": 1,
		"saved": saved,
		"sync_job_ids": list(getattr(frappe.local, "nce_sync_queued_job_ids", [])),
	}


@frappe.whitelist()
def add_form_dialog_related_row(
	definition: str,
	related_row_name: str,
	root_doctype: str,
	root_name: str,
	values: str | dict | None = None,
) -> dict[str, Any]:
	"""Create a child row linked to the open root document (direct child tabs only)."""
	_, row, child_dt, link_f, hc = _load_related_tab_context(
		definition,
		related_row_name,
		root_doctype,
		root_name,
		root_perm="write",
	)

	if not cint(getattr(row, "allow_add_remove", 0)):
		frappe.throw(_("Add/remove is not enabled for this tab"), frappe.PermissionError)
	_enforce_related_edit_condition(row, root_doctype, root_name)

	if hc:
		frappe.throw(_("Add row is only supported for direct child tabs (no hop chain)."))

	if not frappe.has_permission(child_dt, "create"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	values = frappe.parse_json(values) if isinstance(values, str) else (values or {})
	allowed_fields = _editable_related_fieldnames_for_save(row, child_dt)
	new = frappe.new_doc(child_dt)
	new.set(link_f, root_name)
	for fn, v in (values or {}).items():
		fn = cstr(fn).strip()
		if fn and fn in allowed_fields:
			new.set(fn, v)
	new.insert()
	return {
		"ok": 1,
		"name": new.name,
		"sync_job_ids": list(getattr(frappe.local, "nce_sync_queued_job_ids", [])),
	}


@frappe.whitelist()
def delete_form_dialog_related_row(
	definition: str,
	related_row_name: str,
	root_doctype: str,
	root_name: str,
	child_name: str,
) -> dict[str, Any]:
	"""Delete one child row from a related tab."""
	_, row, child_dt, link_f, hc = _load_related_tab_context(
		definition,
		related_row_name,
		root_doctype,
		root_name,
		root_perm="write",
	)

	if not cint(getattr(row, "allow_add_remove", 0)):
		frappe.throw(_("Add/remove is not enabled for this tab"), frappe.PermissionError)
	_enforce_related_edit_condition(row, root_doctype, root_name)

	child_name = cstr(child_name or "").strip()
	if not child_name:
		frappe.throw(_("Missing child_name"))

	allowed = _allowed_child_names_for_related_tab(root_name, child_dt, link_f, hc)
	if child_name not in allowed:
		frappe.throw(_("Not permitted to delete this row"), frappe.PermissionError)
	if not frappe.has_permission(child_dt, "delete", doc=child_name):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	frappe.delete_doc(child_dt, child_name)
	return {
		"ok": 1,
		"deleted": child_name,
		"sync_job_ids": list(getattr(frappe.local, "nce_sync_queued_job_ids", [])),
	}
