"""Related-doctype helpers — hop chains, row sync, filters, and column derivation."""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr

from ._fd_fetch_from import _enrich_fetch_from_fields
from ._fd_gating import _assert_doctype_in_wp_tables


def _normalize_hop_chain_value(raw: object) -> list[dict[str, str]]:
	"""Parse hop_chain from JSON string or list; return validated step dicts."""
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
	out: list[dict[str, str]] = []
	for step in raw:
		if not isinstance(step, dict):
			continue
		bridge = cstr(step.get("bridge") or "").strip()
		pl = cstr(step.get("parent_link") or "").strip()
		cl = cstr(step.get("child_link") or "").strip()
		if bridge and pl and cl:
			out.append({"bridge": bridge, "parent_link": pl, "child_link": cl})
	return out


def _related_row_signature(doctype: str, link_field: str, hop_chain: list[dict[str, str]]) -> str:
	lf = cstr(link_field or "").strip()
	return f"{doctype}\0{lf}\0{json.dumps(hop_chain, separators=(',', ':'))}"


def _qbtl_row_signature(qbtl_name: str) -> str:
	return f"qbtl\0{cstr(qbtl_name or '').strip()}"


def _related_tab_portal_config_key(
	child_doctype: str,
	link_field: str,
	hop_chain_raw: object,
	*,
	query_based_table_link: str | None = None,
) -> str:
	"""Stable key for merging portal_field_config across Form Dialog rebuilds."""
	qbtl = cstr(query_based_table_link or "").strip()
	if qbtl:
		return _qbtl_row_signature(qbtl)
	dt = cstr(child_doctype or "").strip()
	lf = cstr(link_field or "").strip()
	hc = _normalize_hop_chain_value(hop_chain_raw)
	return f"{dt}\0{lf}\0{json.dumps(hc, separators=(',', ':'))}"


def _parse_related_doctypes_argument(related_doctypes: str | list | None) -> list[dict[str, Any]]:
	"""Normalize JSON from the Page Panel picker: doctype, link_field, label, optional hop_chain."""
	if related_doctypes is None:
		return []
	if isinstance(related_doctypes, str):
		s = related_doctypes.strip()
		if not s:
			return []
		try:
			related_doctypes = json.loads(s)
		except json.JSONDecodeError:
			return []
	if not isinstance(related_doctypes, list):
		return []
	out: list[dict[str, Any]] = []
	seen: set[str] = set()
	for item in related_doctypes:
		if not isinstance(item, dict):
			continue
		qbtl = cstr(item.get("query_based_table_link") or item.get("qbtl") or "").strip()
		if qbtl:
			sig = _qbtl_row_signature(qbtl)
			if sig in seen:
				continue
			seen.add(sig)
			lb = cstr(item.get("label") or "").strip() or qbtl
			out.append({"query_based_table_link": qbtl, "label": lb})
			continue
		dt = cstr(item.get("doctype") or "").strip()
		if not dt:
			continue
		lf = cstr(item.get("link_field") or "").strip()
		if not lf:
			continue
		hc = _normalize_hop_chain_value(item.get("hop_chain"))
		sig = _related_row_signature(dt, lf, hc)
		if sig in seen:
			continue
		seen.add(sig)
		lb = cstr(item.get("label") or "").strip() or dt
		out.append({"doctype": dt, "link_field": lf, "label": lb, "hop_chain": hc})
	return out


def _build_related_child_row_dict(spec: dict[str, Any]) -> dict[str, str]:
	"""One child row with frozen field list JSON in info; never raises."""
	child_dt = cstr(spec.get("doctype") or "").strip()
	link_f = cstr(spec.get("link_field") or "").strip()
	tab_l = cstr(spec.get("label") or "").strip() or child_dt
	hc_norm = _normalize_hop_chain_value(spec.get("hop_chain"))
	try:
		hop_chain_json = json.dumps(hc_norm, indent=None)
	except Exception:
		hop_chain_json = "[]"
	info_obj: dict[str, Any] = {
		"doctype": child_dt,
		"link_field": link_f,
		"label": tab_l,
		"hop_chain": hc_norm,
	}
	try:
		_assert_doctype_in_wp_tables(child_dt)
		child_meta = frappe.get_meta(child_dt)
		child_fields = [f.as_dict() for f in child_meta.fields]
		child_fields = _enrich_fetch_from_fields(child_fields, child_meta)
		from .portal_fields import _portal_name_field_dict

		name_row = _portal_name_field_dict(child_dt)
		info_obj["name_field_label"] = name_row["label"]
		if not any(cstr(f.get("fieldname") or "").strip() == "name" for f in child_fields):
			child_fields.insert(0, name_row)
		info_obj["fields"] = child_fields
	except Exception as e:
		info_obj["capture_error"] = cstr(e)[:500]
	try:
		info_str = json.dumps(info_obj, default=str)
	except Exception as e:
		info_str = json.dumps(
			{
				"doctype": child_dt,
				"link_field": link_f,
				"label": tab_l,
				"capture_error": cstr(e)[:300],
			},
			default=str,
		)
	from .portal_fields import portal_field_config_from_info

	row: dict[str, str] = {
		"child_doctype": child_dt,
		"link_field": link_f,
		"tab_label": tab_l,
		"hop_chain": hop_chain_json,
		"info": info_str,
	}
	default_pfc = portal_field_config_from_info(info_obj, child_doctype=child_dt)
	if default_pfc:
		row["portal_field_config"] = default_pfc
	return row


def _find_relationship_to_doctype(root_doctype: str, target_doctype: str) -> dict[str, Any] | None:
	"""
	Shortest related-tab relationship from root to ``target_doctype``.

	Returns ``{"link_field", "hop_chain"}`` (the same shape the normal related tab
	uses to filter rows), or ``None`` if unreachable. When root equals target the
	relationship is the record itself (``link_field="name"``, empty hop chain).
	"""
	root = cstr(root_doctype or "").strip()
	target = cstr(target_doctype or "").strip()
	if not root or not target:
		return None
	if root == target:
		return {"link_field": "name", "hop_chain": []}
	try:
		from nce_events.api.panel_api_pkg.discovery import get_multi_hop_children

		buckets = get_multi_hop_children(root)
	except Exception:
		return None
	best: dict[str, Any] | None = None
	for key in ("self", "1_hop", "2_hop", "3_hop"):
		bucket = buckets.get(key) or {}
		for row in bucket.get("relationships") or []:
			if cstr(row.get("doctype") or "").strip() != target:
				continue
			hc = _normalize_hop_chain_value(row.get("hop_chain"))
			candidate = {
				"link_field": cstr(row.get("link_field") or "").strip(),
				"hop_chain": hc,
			}
			if best is None or len(hc) < len(best["hop_chain"]):
				best = candidate
	return best


def _resolve_qbtl_tab_plan(root_doctype: str, qbtl_name: str, label: str) -> dict[str, Any]:
	"""Map a QBTL catalog entry to display/bind DocTypes and hop chain from the dialog root."""
	root = cstr(root_doctype or "").strip()
	qbtl_name = cstr(qbtl_name or "").strip()
	tab_label = cstr(label or "").strip() or qbtl_name

	qbtl = frappe.get_doc("Query Based Table Link", qbtl_name)
	left = cstr(qbtl.left_table or "").strip()
	right = cstr(qbtl.right_table or "").strip()
	if not left or not right:
		frappe.throw(_("Query Based Table Link {0} is missing left/right table").format(qbtl_name))

	if root == left:
		return {
			"display_doctype": right,
			"bind_doctype": left,
			"bind_side": "left",
			"bind_link_field": "name",
			"hop_chain": [],
			"tab_label": tab_label or cstr(qbtl.title or qbtl_name).strip(),
			"query_based_table_link": qbtl_name,
		}
	if root == right:
		return {
			"display_doctype": left,
			"bind_doctype": right,
			"bind_side": "right",
			"bind_link_field": "name",
			"hop_chain": [],
			"tab_label": tab_label or cstr(qbtl.title or qbtl_name).strip(),
			"query_based_table_link": qbtl_name,
		}

	rel_left = _find_relationship_to_doctype(root, left)
	rel_right = _find_relationship_to_doctype(root, right)
	if rel_left is None and rel_right is None:
		frappe.throw(
			_("Cannot reach Query Based Table Link {0} from {1}").format(qbtl_name, root_doctype)
		)

	if rel_left is not None and rel_right is not None:
		if len(rel_left["hop_chain"]) <= len(rel_right["hop_chain"]):
			bind_dt, display_dt, bind_side, rel = left, right, "left", rel_left
		else:
			bind_dt, display_dt, bind_side, rel = right, left, "right", rel_right
	elif rel_left is not None:
		bind_dt, display_dt, bind_side, rel = left, right, "left", rel_left
	else:
		bind_dt, display_dt, bind_side, rel = right, left, "right", rel_right  # type: ignore[assignment]

	return {
		"display_doctype": display_dt,
		"bind_doctype": bind_dt,
		"bind_side": bind_side,
		"bind_link_field": cstr(rel.get("link_field") or "").strip(),
		"hop_chain": rel.get("hop_chain") or [],
		"tab_label": tab_label or cstr(qbtl.title or qbtl_name).strip(),
		"query_based_table_link": qbtl_name,
	}


def _build_related_qbtl_child_row_dict(spec: dict[str, Any], root_doctype: str) -> dict[str, str]:
	"""One QBTL related tab row with frozen field list on the display DocType."""
	qbtl_name = cstr(spec.get("query_based_table_link") or "").strip()
	tab_l = cstr(spec.get("label") or "").strip()
	plan: dict[str, Any]
	try:
		plan = _resolve_qbtl_tab_plan(root_doctype, qbtl_name, tab_l)
	except Exception as e:
		plan = {
			"display_doctype": "",
			"bind_doctype": "",
			"bind_side": "",
			"bind_link_field": "",
			"hop_chain": [],
			"tab_label": tab_l or qbtl_name,
			"query_based_table_link": qbtl_name,
			"capture_error": cstr(e)[:500],
		}

	child_dt = cstr(plan.get("display_doctype") or "").strip()
	hc_norm = _normalize_hop_chain_value(plan.get("hop_chain"))
	try:
		hop_chain_json = json.dumps(hc_norm, indent=None)
	except Exception:
		hop_chain_json = "[]"

	info_obj: dict[str, Any] = {
		"source_type": "qbtl",
		"doctype": child_dt,
		"query_based_table_link": qbtl_name,
		"bind_doctype": cstr(plan.get("bind_doctype") or "").strip(),
		"bind_side": cstr(plan.get("bind_side") or "").strip(),
		"bind_link_field": cstr(plan.get("bind_link_field") or "").strip(),
		"label": cstr(plan.get("tab_label") or "").strip() or qbtl_name,
		"hop_chain": hc_norm,
	}
	if plan.get("capture_error"):
		info_obj["capture_error"] = plan["capture_error"]

	if child_dt and not info_obj.get("capture_error"):
		try:
			_assert_doctype_in_wp_tables(child_dt)
			child_meta = frappe.get_meta(child_dt)
			child_fields = [f.as_dict() for f in child_meta.fields]
			child_fields = _enrich_fetch_from_fields(child_fields, child_meta)
			from .portal_fields import _portal_name_field_dict

			name_row = _portal_name_field_dict(child_dt)
			info_obj["name_field_label"] = name_row["label"]
			if not any(cstr(f.get("fieldname") or "").strip() == "name" for f in child_fields):
				child_fields.insert(0, name_row)
			info_obj["fields"] = child_fields
		except Exception as e:
			info_obj["capture_error"] = cstr(e)[:500]

	try:
		info_str = json.dumps(info_obj, default=str)
	except Exception as e:
		info_str = json.dumps(
			{
				"source_type": "qbtl",
				"query_based_table_link": qbtl_name,
				"label": tab_l or qbtl_name,
				"capture_error": cstr(e)[:300],
			},
			default=str,
		)

	from .portal_fields import portal_field_config_from_info

	row: dict[str, str] = {
		"child_doctype": child_dt or qbtl_name,
		"link_field": "",
		"query_based_table_link": qbtl_name,
		"tab_label": cstr(plan.get("tab_label") or "").strip() or qbtl_name,
		"hop_chain": hop_chain_json,
		"info": info_str,
		"allow_add_remove": "0",
	}
	if child_dt and not info_obj.get("capture_error"):
		default_pfc = portal_field_config_from_info(info_obj, child_doctype=child_dt)
		if default_pfc:
			row["portal_field_config"] = default_pfc
	return row


def _related_doctype_child_rows(
	related_doctypes: str | list | None,
	root_doctype: str = "",
) -> list[dict[str, Any]]:
	root = cstr(root_doctype or "").strip()
	out: list[dict[str, Any]] = []
	for spec in _parse_related_doctypes_argument(related_doctypes):
		if spec.get("query_based_table_link"):
			out.append(_build_related_qbtl_child_row_dict(spec, root))
		else:
			out.append(_build_related_child_row_dict(spec))
	return out


def _sync_related_doctypes(doc: Any, related_doctypes: str | list | None) -> None:
	if related_doctypes is None:
		return

	preserved_portal: dict[str, str] = {}
	preserved_actions: dict[str, str] = {}
	for old in list(doc.get("related_doctypes") or []):
		key = _related_tab_portal_config_key(
			getattr(old, "child_doctype", None),
			getattr(old, "link_field", None),
			getattr(old, "hop_chain", None),
			query_based_table_link=getattr(old, "query_based_table_link", None),
		)
		pfc = cstr(getattr(old, "portal_field_config", None) or "").strip()
		if pfc:
			preserved_portal[key] = pfc
		pa = cstr(getattr(old, "portal_actions", None) or "").strip()
		if pa:
			preserved_actions[key] = pa

	parsed_rows = _related_doctype_child_rows(
		related_doctypes, cstr(getattr(doc, "target_doctype", None) or "").strip()
	)

	doc.related_doctypes = []
	for row in parsed_rows:
		key = _related_tab_portal_config_key(
			row.get("child_doctype"),
			row.get("link_field"),
			row.get("hop_chain"),
			query_based_table_link=row.get("query_based_table_link"),
		)
		if key in preserved_portal:
			row["portal_field_config"] = preserved_portal[key]
		if key in preserved_actions:
			row["portal_actions"] = preserved_actions[key]
		doc.append("related_doctypes", row)


def _hop_walk_final_identifiers(root_name: str, hop_chain: list[dict[str, str]]) -> list[str] | None:
	"""
	Walk hop_chain using permission-aware get_list.

	- Non-last hop: pass bridge row ``name`` values to the next filter.
	- Last hop: return distinct ``child_link`` values (final DocType keys).

	Returns:
	    ``None`` if an intermediate hop matched no rows (caller should return empty rows).
	    A (possibly empty) list of final DocType identifiers otherwise.
	"""
	prev_values: list[str] = [cstr(root_name or "").strip()]
	if not prev_values[0]:
		return None

	for i, step in enumerate(hop_chain):
		bridge = cstr(step.get("bridge") or "").strip()
		parent_link = cstr(step.get("parent_link") or "").strip()
		child_link = cstr(step.get("child_link") or "").strip()
		if not bridge or not parent_link or not child_link:
			frappe.throw(_("Invalid hop_chain step"))

		is_last = i == len(hop_chain) - 1
		flt: dict[str, Any]
		if len(prev_values) == 1:
			flt = {parent_link: prev_values[0]}
		else:
			flt = {parent_link: ["in", prev_values]}

		bridge_rows = frappe.get_list(
			bridge,
			filters=flt,
			fields=["name", child_link],
			limit_page_length=5000,
		)
		if not bridge_rows:
			return None

		if is_last:
			seen: set[str] = set()
			out: list[str] = []
			for br in bridge_rows:
				v = br.get(child_link)
				if v is None or v == "":
					continue
				s = cstr(v).strip()
				if s and s not in seen:
					seen.add(s)
					out.append(s)
			return out

		seen_n: set[str] = set()
		next_names: list[str] = []
		for br in bridge_rows:
			nm = br.get("name")
			if nm is None or nm == "":
				continue
			s = cstr(nm).strip()
			if s and s not in seen_n:
				seen_n.add(s)
				next_names.append(s)
		prev_values = next_names

	raise RuntimeError("hop_chain walk did not return")  # pragma: no cover


def _related_list_columns_from_child_row(row: Any) -> tuple[list[dict[str, Any]], str]:
	"""
	Build column metadata and order_by for related-row list fetch.

	Uses portal_field_config when present (show=1 columns, in editor order);
	otherwise ``name`` only.
	"""
	# Local import to avoid a circular module-load between _helpers and portal_fields:
	# portal_fields imports _require_system_manager from _helpers at module load,
	# while this helper only needs portal_fields' parsers at call time.
	from .portal_fields import (
		_build_portal_editor_rows,
		_parse_portal_field_config_entries,
		_portal_meta_fields_for_editor,
		_portal_name_field_dict,
	)

	info: dict[str, Any] = {}
	if row.info:
		try:
			info = json.loads(row.info)
		except json.JSONDecodeError:
			info = {}
	child_dt = cstr(getattr(row, "child_doctype", None) or info.get("doctype") or "").strip()
	meta_fields = info.get("fields") if isinstance(info.get("fields"), list) else []
	name_field_label = cstr(info.get("name_field_label") or "").strip() or None
	portal_raw = cstr(getattr(row, "portal_field_config", None) or "").strip()
	portal_entries = _parse_portal_field_config_entries(portal_raw)
	editor_rows = _build_portal_editor_rows(
		meta_fields,
		portal_entries,
		child_doctype=child_dt or None,
		name_field_label=name_field_label,
	)

	by_fn: dict[str, dict] = {}
	for f in _portal_meta_fields_for_editor(meta_fields, child_dt or None, name_field_label):
		if not isinstance(f, dict):
			continue
		fn0 = cstr(f.get("fieldname") or "").strip()
		if fn0:
			by_fn[fn0] = f

	shown = [r for r in editor_rows if cint(r.get("show")) == 1]
	if not shown:
		name_meta = by_fn.get("name", {})
		if child_dt and not name_meta:
			name_meta = _portal_name_field_dict(child_dt)
		return (
			[
				{
					"fieldname": "name",
					"label": cstr(name_meta.get("label") or "").strip() or "name",
					"fieldtype": cstr(name_meta.get("fieldtype") or "Data"),
					"options": cstr(name_meta.get("options") or "").strip(),
					"read_only": cint(name_meta.get("read_only")) or 1,
					"reqd": cint(name_meta.get("reqd")),
				}
			],
			"name asc",
		)

	columns: list[dict[str, Any]] = []
	for r in shown:
		fn = cstr(r.get("fieldname") or "").strip()
		meta_f = by_fn.get(fn, {})
		ft = cstr(r.get("fieldtype") or "").strip() or cstr(meta_f.get("fieldtype") or "").strip()
		columns.append(
			{
				"fieldname": fn,
				"label": cstr(r.get("label") or "").strip() or fn,
				"fieldtype": ft,
				"options": cstr(meta_f.get("options") or "").strip(),
				"read_only": cint(meta_f.get("read_only")),
				"reqd": cint(meta_f.get("reqd")),
			},
		)

	sort_parts: list[str] = []
	for r in shown:
		fn = cstr(r.get("fieldname") or "").strip()
		if not fn or not cint(r.get("sort_rank", 0)):
			continue
		sd = cstr(r.get("sort_dir") or "asc").strip().lower()
		if sd not in ("asc", "desc"):
			sd = "asc"
		sort_parts.append((cint(r.get("sort_rank")), f"{fn} {sd.upper()}"))
	sort_parts.sort(key=lambda x: x[0])
	order_by = ", ".join(p[1] for p in sort_parts) if sort_parts else "name asc"

	return (columns, order_by)


def _filters_for_related_rows(
	root_name: str,
	child_doctype: str,
	link_field: str,
	hop_chain: list[dict[str, str]],
	root_doctype: str = "",
) -> tuple[dict[str, Any], bool]:
	"""
	Build get_list filters for the final related DocType.

	Returns ``(filters, force_empty)``. When ``force_empty`` is True, the caller
	must not call get_list and should return zero rows (hop miss or empty keys).

	When ``child_doctype`` equals ``root_doctype`` (same-table related tab), rows
	are matched by the opened row's own ``link_field`` **value** (sibling group),
	not by ``root_name`` (row id).
	"""
	if not hop_chain:
		root_dt = cstr(root_doctype or "").strip()
		if root_dt and child_doctype == root_dt:
			try:
				df = frappe.get_meta(child_doctype).get_field(link_field)
			except Exception:
				df = None
			if not df:
				return ({}, True)
			own_value = frappe.db.get_value(child_doctype, root_name, link_field)
			if own_value is None or cstr(own_value).strip() == "":
				return ({}, True)
			return ({link_field: own_value}, False)
		return ({link_field: root_name}, False)

	final_ids = _hop_walk_final_identifiers(root_name, hop_chain)
	if final_ids is None:
		return ({}, True)
	if not final_ids:
		return ({}, True)

	if len(final_ids) == 1:
		return ({link_field: final_ids[0]}, False)
	return ({link_field: ["in", final_ids]}, False)


def _sanitize_get_list_fields(child_doctype: str, fieldnames: list[str]) -> list[str]:
	"""Restrict to fields that exist on the DocType; always include ``name`` first."""
	meta = frappe.get_meta(child_doctype)
	valid = {f.fieldname for f in meta.fields} | {"name"}
	out: list[str] = []
	for fn in fieldnames:
		fn = cstr(fn).strip()
		if fn and fn in valid and fn not in out:
			out.append(fn)
	if "name" not in out:
		out.insert(0, "name")
	return out
