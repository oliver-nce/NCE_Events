"""Inline child-table helpers for Form Dialog capture."""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe.utils import cstr

from ._fd_fetch_from import _enrich_fetch_from_fields


def table_fields_for_capture_wizard(root_doctype: str) -> list[dict[str, str]]:
	"""Table fields on ``root_doctype`` for the Page Panel capture picker."""
	meta = frappe.get_meta(root_doctype)
	out: list[dict[str, str]] = []
	for f in meta.fields:
		if f.fieldtype != "Table" or not (f.options or "").strip():
			continue
		out.append(
			{
				"parent_fieldname": f.fieldname,
				"label": cstr(f.label or "").strip() or f.fieldname,
				"child_doctype": cstr(f.options).strip(),
			}
		)
	return out


def _parse_inline_child_tables_argument(raw: object) -> list[dict[str, Any]]:
	if raw is None:
		return []
	if isinstance(raw, str):
		s = raw.strip()
		if not s:
			return []
		try:
			raw = json.loads(s)
		except json.JSONDecodeError:
			return []
	if not isinstance(raw, list):
		return []
	out: list[dict[str, Any]] = []
	for item in raw:
		if not isinstance(item, dict):
			continue
		pfn = cstr(item.get("parent_fieldname") or "").strip()
		if not pfn:
			continue
		out.append(
			{
				"parent_fieldname": pfn,
				"tab_label": cstr(item.get("tab_label") or "").strip(),
			}
		)
	return out


def _build_inline_child_row_dict(spec: dict[str, Any], root_meta: Any) -> dict[str, Any] | None:
	"""One ``Form Dialog Inline Child Table`` row with frozen child fields JSON in ``info``."""
	pfn = cstr(spec.get("parent_fieldname") or "").strip()
	if not pfn:
		return None
	tab_l = cstr(spec.get("tab_label") or "").strip()
	df = root_meta.get_field(pfn)
	if not df or df.fieldtype != "Table" or not (df.options or "").strip():
		return None

	child_dt = cstr(df.options).strip()
	if not tab_l:
		tab_l = cstr(df.label or "").strip() or pfn

	info_obj: dict[str, Any] = {
		"doctype": child_dt,
		"parent_fieldname": pfn,
		"label": tab_l,
	}
	try:
		# Nested Table targets (e.g. Page Panel Default Filter) are schema-only helpers and are
		# not listed in WP Tables. Root ``target_doctype`` was already gated at capture/rebuild entry.
		child_meta = frappe.get_meta(child_dt)
		child_fields = [cf.as_dict() for cf in child_meta.fields]
		child_fields = _enrich_fetch_from_fields(child_fields, child_meta)
		info_obj["fields"] = child_fields
	except Exception as e:
		info_obj["capture_error"] = cstr(e)[:500]

	try:
		info_str = json.dumps(info_obj, default=str)
	except Exception as e:
		info_str = json.dumps(
			{"parent_fieldname": pfn, "doctype": child_dt, "capture_error": cstr(e)[:300]},
			default=str,
		)

	return {
		"parent_fieldname": pfn,
		"child_doctype": child_dt,
		"tab_label": tab_l,
		"info": info_str,
	}


def _sync_inline_child_tables(doc: Any, inline_child_tables: object, root_doctype: str) -> None:
	preserved_portal: dict[str, str] = {}
	preserved_actions: dict[str, str] = {}
	for old in list(doc.get("inline_child_tables") or []):
		pfn = cstr(getattr(old, "parent_fieldname", None) or "").strip()
		pfc = cstr(getattr(old, "portal_field_config", None) or "").strip()
		if pfn and pfc:
			preserved_portal[pfn] = pfc
		pa = cstr(getattr(old, "portal_actions", None) or "").strip()
		if pfn and pa:
			preserved_actions[pfn] = pa

	doc.inline_child_tables = []
	meta = frappe.get_meta(root_doctype)
	for spec in _parse_inline_child_tables_argument(inline_child_tables):
		row = _build_inline_child_row_dict(spec, meta)
		if not row:
			continue
		pfn = cstr(row.get("parent_fieldname") or "").strip()
		if pfn in preserved_portal:
			row["portal_field_config"] = preserved_portal[pfn]
		if pfn in preserved_actions:
			row["portal_actions"] = preserved_actions[pfn]
		doc.append("inline_child_tables", row)
