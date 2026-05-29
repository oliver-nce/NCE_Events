"""
Shared helpers for the form_dialog package.

Imported by capture, related_rows, portal_fields, and save submodules. None of
these helpers are part of the @frappe.whitelist surface; they are private API.
"""

from __future__ import annotations

import json
import os
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr


def _panel_required_value_empty(val: object) -> bool:
	"""Match client validatePanelRequiredFields / isMandatoryValueEmpty for root fields."""
	if val is None:
		return True
	if val == "":
		return True
	return False


def _assert_doctype_in_wp_tables(doctype: str) -> None:
	"""Raise if the DocType is not listed in WP Tables (nce_sync)."""
	if not frappe.get_all("WP Tables", filters={"frappe_doctype": doctype}, limit=1):
		frappe.throw(
			_("DocType '{0}' is not listed in WP Tables and cannot be used for Form Dialogs.").format(doctype)
		)


def _require_form_dialog_capture_schema_ready() -> None:
	"""Bench ``migrate`` must have applied Form Dialog child-table fields before capture/rebuild."""
	meta = frappe.get_meta("Form Dialog")
	for fn in ("inline_child_tables", "script_tool_groups"):
		if meta.get_field(fn) is None:
			frappe.throw(
				_(
					"Missing Form Dialog field '{0}' in site metadata — deploy the latest nce_events app "
					"then run '{1}'."
				).format(fn, "bench migrate"),
				title=_("Database update required"),
			)
def _require_system_manager() -> None:
	"""Raise if the current user is not System Manager."""
	if "System Manager" not in frappe.get_roles(frappe.session.user):
		frappe.throw(_("Only System Manager can manage Form Dialogs."), frappe.PermissionError)


# Properties on the SOURCE field that affect how the Vue dialog renders the input.
# If the local field is missing these (e.g. a Data field with fetch_from pointing to
# a Select), we copy them from the source so the dialog renders the correct widget.
_SOURCE_DISPLAY_KEYS = ("fieldtype", "options")


def _enrich_fetch_from_fields(fields_list: list[dict], meta: Any) -> list[dict]:
	"""
	For every field with fetch_from, look up the source field on the linked
	DocType and copy display-relevant properties that the local field is
	missing or has as a generic default (Data / Int with no options).

	This ensures the Vue renderer gets the right input widget (e.g. Select
	with its option list) even when the local field was defined as plain Data.
	"""
	# Build a lookup: fieldname → field dict for the current DocType
	field_map = {f.fieldname: f for f in meta.fields}

	for fd in fields_list:
		fetch_from = fd.get("fetch_from")
		if not fetch_from:
			continue

		parts = fetch_from.split(".")
		if len(parts) != 2:
			continue

		link_fieldname, source_fieldname = parts

		# Find the Link field on the current DocType to get the target DocType
		link_field = field_map.get(link_fieldname)
		if not link_field or link_field.fieldtype != "Link" or not link_field.options:
			continue

		try:
			source_meta = frappe.get_meta(link_field.options)
			source_field = source_meta.get_field(source_fieldname)
			if not source_field:
				continue

			# Copy display-relevant properties from the source when the local
			# field has a generic type that would lose input formatting.
			local_type = fd.get("fieldtype", "")
			source_type = source_field.fieldtype or ""

			# If the source has a more specific type that affects rendering
			# (e.g. Select, Rating, Check) and the local type is generic
			# (Data, Int, or matches but has no options), enrich.
			generic_types = {"Data", "Int", "Float", "Small Text", "Text"}
			if source_type and (
				local_type in generic_types
				or (local_type == source_type and not fd.get("options") and source_field.options)
			):
				fd["fieldtype"] = source_type
				if source_field.options:
					fd["options"] = source_field.options

		except Exception:
			# If we can't resolve the source, leave the field as-is
			continue

	return fields_list


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


def _related_row_signature(doctype: str, hop_chain: list[dict[str, str]]) -> str:
	return f"{doctype}\0{json.dumps(hop_chain, separators=(',', ':'))}"


def _related_tab_portal_config_key(child_doctype: str, link_field: str, hop_chain_raw: object) -> str:
	"""Stable key for merging portal_field_config across Form Dialog rebuilds."""
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
		dt = cstr(item.get("doctype") or "").strip()
		if not dt:
			continue
		lf = cstr(item.get("link_field") or "").strip()
		if not lf:
			continue
		hc = _normalize_hop_chain_value(item.get("hop_chain"))
		sig = _related_row_signature(dt, hc)
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
	return {
		"child_doctype": child_dt,
		"link_field": link_f,
		"tab_label": tab_l,
		"hop_chain": hop_chain_json,
		"info": info_str,
	}


def _related_doctype_child_rows(related_doctypes: str | list | None) -> list[dict[str, Any]]:
	return [_build_related_child_row_dict(r) for r in _parse_related_doctypes_argument(related_doctypes)]


def _sync_related_doctypes(doc: Any, related_doctypes: str | list | None) -> None:
	preserved_portal: dict[str, str] = {}
	preserved_actions: dict[str, str] = {}
	for old in list(doc.get("related_doctypes") or []):
		key = _related_tab_portal_config_key(
			getattr(old, "child_doctype", None),
			getattr(old, "link_field", None),
			getattr(old, "hop_chain", None),
		)
		pfc = cstr(getattr(old, "portal_field_config", None) or "").strip()
		if pfc:
			preserved_portal[key] = pfc
		pa = cstr(getattr(old, "portal_actions", None) or "").strip()
		if pa:
			preserved_actions[key] = pa

	parsed_rows = _related_doctype_child_rows(related_doctypes)
	if not parsed_rows and doc.get("related_doctypes"):
		return

	doc.related_doctypes = []
	for row in parsed_rows:
		key = _related_tab_portal_config_key(
			row.get("child_doctype"),
			row.get("link_field"),
			row.get("hop_chain"),
		)
		if key in preserved_portal:
			row["portal_field_config"] = preserved_portal[key]
		if key in preserved_actions:
			row["portal_actions"] = preserved_actions[key]
		doc.append("related_doctypes", row)


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


def _parse_script_tool_groups_argument(raw: object) -> list[dict[str, str]]:
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
	for item in raw:
		if not isinstance(item, dict):
			continue
		gk = cstr(item.get("group_key") or "").strip() or "__ungrouped__"
		tl = cstr(item.get("tab_label") or "").strip()
		out.append({"group_key": gk, "tab_label": tl})
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


def _sync_script_tool_groups(doc: Any, script_tool_groups: object) -> None:
	"""Sync ``script_tool_groups`` child rows on ``doc``.

	- If the incoming list is non-empty, merge it with preserved labels from existing rows.
	- If the incoming list is **empty** (wizard sent nothing / legacy mode):
	  * Preserve any existing rows so user-edited labels survive Rebuild.
	  * If there are no existing rows but the frozen meta includes client scripts,
	    auto-seed one ``__ungrouped__`` / ``Tools`` row so users can rename it
	    directly on the Form Dialog without re-running the wizard.
	"""
	parsed = _parse_script_tool_groups_argument(script_tool_groups)

	if not parsed:
		# Nothing incoming — preserve existing rows unchanged.
		if doc.get("script_tool_groups"):
			return
		# No existing rows: auto-seed when client scripts are present.
		try:
			fm = json.loads(cstr(doc.frozen_meta_json or "{}"))
			has_scripts = bool(fm.get("client_scripts"))
		except Exception:
			has_scripts = False
		if has_scripts:
			doc.append("script_tool_groups", {"group_key": "__ungrouped__", "tab_label": "Tools"})
		return

	preserved_labels: dict[str, str] = {}
	for old in list(doc.get("script_tool_groups") or []):
		gk = cstr(getattr(old, "group_key", None) or "").strip() or "__ungrouped__"
		tl = cstr(getattr(old, "tab_label", None) or "").strip()
		if tl:
			preserved_labels[gk] = tl

	doc.script_tool_groups = []
	for item in parsed:
		gk = cstr(item.get("group_key") or "").strip() or "__ungrouped__"
		incoming_tl = cstr(item.get("tab_label") or "").strip()
		tab_l = preserved_labels.get(gk) or incoming_tl or gk
		doc.append("script_tool_groups", {"group_key": gk, "tab_label": tab_l})


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
	from .portal_fields import _build_portal_editor_rows, _parse_portal_field_config_entries

	info: dict[str, Any] = {}
	if row.info:
		try:
			info = json.loads(row.info)
		except json.JSONDecodeError:
			info = {}
	meta_fields = info.get("fields") if isinstance(info.get("fields"), list) else []
	portal_raw = cstr(getattr(row, "portal_field_config", None) or "").strip()
	portal_entries = _parse_portal_field_config_entries(portal_raw)
	editor_rows = _build_portal_editor_rows(meta_fields, portal_entries)

	by_fn: dict[str, dict] = {}
	for f in meta_fields:
		if not isinstance(f, dict):
			continue
		fn0 = cstr(f.get("fieldname") or "").strip()
		if fn0:
			by_fn[fn0] = f

	shown = [r for r in editor_rows if cint(r.get("show")) == 1]
	if not shown:
		meta_name = by_fn.get("name", {})
		return (
			[
				{
					"fieldname": "name",
					"label": _("ID"),
					"fieldtype": cstr(meta_name.get("fieldtype") or "Data"),
					"options": cstr(meta_name.get("options") or "").strip(),
					"editable": 0,
					"reqd": cint(meta_name.get("reqd")),
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
				"editable": cint(r.get("editable")),
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
) -> tuple[dict[str, Any], bool]:
	"""
	Build get_list filters for the final related DocType.

	Returns ``(filters, force_empty)``. When ``force_empty`` is True, the caller
	must not call get_list and should return zero rows (hop miss or empty keys).
	"""
	if not hop_chain:
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


# --- Main-form tab anchors (mirror public/js/panel_page_v2/utils/parseLayout.js) ---
FD_LEAD_TAB_ANCHOR = "__lead__"


def _frozen_tab_visually_nonempty(sections: list[dict[str, Any]]) -> bool:
	for sec in sections:
		for col in sec.get("columns") or []:
			if col.get("fields"):
				return True
	return False


def _main_tab_skeleton_from_frozen_fields(fields_list: list[dict]) -> list[dict[str, str]]:
	"""
	Collect {anchor, label} for each logical tab Desk/Vue derive from frozen fields.

	Anchor is FD_LEAD_TAB_ANCHOR for the leading tab (before first Tab Break), otherwise
	the Tab Break fieldname. Drops tabs with no visible data fields — same rule as JS
	``parseLayout`` + ``hasVisibleFields``.
	"""
	visible_fields = [f for f in fields_list if not cint((f.get("hidden") or 0))]

	tabs_skeleton: list[dict[str, str]] = []

	cur_anchor = FD_LEAD_TAB_ANCHOR
	cur_label = "Details"
	cur_sections: list[dict[str, Any]] = []

	cur_section: dict[str, Any] = {
		"label": "",
		"collapsible": False,
		"description": "",
		"columns": [],
	}
	cur_column: dict[str, list[Any]] = {"fields": []}

	def maybe_push_tab_done() -> None:
		if _frozen_tab_visually_nonempty(cur_sections):
			tabs_skeleton.append({"anchor": cur_anchor, "label": cur_label})

	for field in visible_fields:
		ft = cstr(field.get("fieldtype") or "")
		if ft == "Tab Break":
			cur_section["columns"].append(cur_column)
			cur_sections.append(cur_section)
			maybe_push_tab_done()
			tab_break_fn = cstr(field.get("fieldname") or "").strip()
			cur_anchor = tab_break_fn or FD_LEAD_TAB_ANCHOR
			cur_label = cstr(field.get("label") or "").strip() or "Details"
			cur_sections = []
			cur_section = {
				"label": "",
				"collapsible": False,
				"description": "",
				"columns": [],
			}
			cur_column = {"fields": []}
			continue

		if ft == "Section Break":
			cur_section["columns"].append(cur_column)
			cur_sections.append(cur_section)
			cur_section = {
				"label": cstr(field.get("label") or "").strip(),
				"collapsible": bool(cint(field.get("collapsible"))),
				"description": cstr(field.get("description") or "").strip(),
				"columns": [],
			}
			cur_column = {"fields": []}
			continue

		if ft == "Column Break":
			cur_section["columns"].append(cur_column)
			cur_column = {"fields": []}
			continue

		cur_column["fields"].append(field)

	cur_section["columns"].append(cur_column)
	cur_sections.append(cur_section)
	maybe_push_tab_done()

	return tabs_skeleton


def _build_frozen_meta_json(doctype: str) -> tuple[str, list[dict]]:
	"""
	Build the ``frozen_meta_json`` string for a DocType by snapshotting its meta,
	enriching fetch_from fields, and capturing client scripts.

	Returns ``(frozen_json, fields_list)``. ``fields_list`` is returned alongside
	so callers can hand it to ``_sync_form_dialog_tab_notes_from_fields`` without
	re-fetching ``meta``.
	"""
	meta = frappe.get_meta(doctype)
	fields_list = [f.as_dict() for f in meta.fields]
	fields_list = _enrich_fetch_from_fields(fields_list, meta)
	client_scripts = _capture_client_scripts(doctype)
	frozen_json = json.dumps(
		{"fields": fields_list, "client_scripts": client_scripts},
		default=str,
		indent=None,
	)
	return frozen_json, fields_list


def _capture_client_scripts(doctype: str) -> list[str]:
	"""
	Collect all Form-view JS for a DocType from two sources:

	1. ``Client Script`` DocType records (enabled, view=Form) — custom scripts
	   added via Desk for any doctype.
	2. The doctype's own app-level ``.js`` file on disk (e.g.
	   ``page_panel/page_panel.js``) — present for standard doctypes defined in
	   app code. Uses the same ``frappe.ui.form.on(doctype, {...})`` pattern.

	Returns a list of script strings. Never raises.
	"""
	scripts: list[str] = []

	# ── 1. Client Script DocType records ─────────────────────────────────────
	try:
		rows = frappe.get_all(
			"Client Script",
			filters={"dt": doctype, "enabled": 1, "view": "Form"},
			fields=["script"],
			order_by="name asc",
		)
		for r in rows:
			s = cstr(r.get("script") or "").strip()
			if s:
				scripts.append(s)
	except Exception:
		pass

	# ── 2. App-level doctype .js file ─────────────────────────────────────────
	try:
		meta = frappe.get_meta(doctype)
		module = cstr(meta.module or "").strip()
		if module:
			app = frappe.db.get_value("Module Def", module, "app_name")
			if app:
				doctype_snake = frappe.scrub(doctype)
				module_snake = frappe.scrub(module)
				js_path = frappe.get_app_path(
					app, module_snake, "doctype", doctype_snake, f"{doctype_snake}.js"
				)
				if os.path.isfile(js_path):
					with open(js_path, encoding="utf-8") as fh:
						content = fh.read().strip()
					if content:
						scripts.append(content)
	except Exception:
		pass

	return scripts


def _sync_form_dialog_tab_notes_from_fields(doc: Any, fields_list: list[dict]) -> None:
	"""Rebuild ``tab_notes`` child rows from frozen fields; reuse ``note`` by ``tab_anchor``."""
	skeleton = _main_tab_skeleton_from_frozen_fields(fields_list)
	prev: dict[str, str] = {}
	for row in list(getattr(doc, "tab_notes", None) or []):
		ac = (cstr(getattr(row, "tab_anchor", None)) or "").strip()
		if not ac:
			continue
		prev[ac] = cstr(getattr(row, "note", "") or "") if getattr(row, "note", None) is not None else ""

	doc.tab_notes = []
	for sk in skeleton:
		doc.append(
			"tab_notes",
			{
				"tab_anchor": sk["anchor"],
				"tab_label": sk["label"],
				"note": prev.get(sk["anchor"], ""),
			},
		)
