"""
Server API for Form Dialog CRUD and frozen schema capture.

Capture, rebuild, and list require System Manager. get_form_dialog_definition and
get_form_dialog_related_rows are readable by any logged-in user for active dialogs
(V2 panel). save_form_dialog_related_rows writes child rows allowed by the related portal
editor (editable fields). save uses normal DocType create/write permission on the target record.
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr


def _assert_doctype_in_wp_tables(doctype: str) -> None:
	"""Raise if the DocType is not listed in WP Tables (nce_sync)."""
	if not frappe.get_all("WP Tables", filters={"frappe_doctype": doctype}, limit=1):
		frappe.throw(
			_("DocType '{0}' is not listed in WP Tables and cannot be used for Form Dialogs.").format(doctype)
		)


def _require_system_manager() -> None:
	"""Raise if the current user is not System Manager."""
	if "System Manager" not in frappe.get_roles(frappe.session.user):
		frappe.throw(_("Only System Manager can manage Form Dialogs."), frappe.PermissionError)


# Properties on the SOURCE field that affect how the Vue dialog renders the input.
# If the local field is missing these (e.g. a Data field with fetch_from pointing to
# a Select), we copy them from the source so the dialog renders the correct widget.
_SOURCE_DISPLAY_KEYS = ("fieldtype", "options")


def _enrich_fetch_from_fields(fields_list: list[dict], meta) -> list[dict]:
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


def _sync_related_doctypes(doc, related_doctypes: str | list | None) -> None:
	doc.related_doctypes = []
	for row in _related_doctype_child_rows(related_doctypes):
		doc.append("related_doctypes", row)


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
	meta_fields: list[dict], portal_entries: list[dict]
) -> list[dict[str, str | int]]:
	eligible = [f for f in meta_fields if _portal_meta_field_eligible_for_editor(f)]
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
		(i, r)
		for i, r in enumerate(parsed)
		if cint(r.get("show")) == 1 and cint(r.get("sort_rank", 0)) > 0
	]
	indexed.sort(key=lambda x: (cint(x[1].get("sort_rank", 0)), x[0]))
	for new_rank, (_, r) in enumerate(indexed, start=1):
		r["sort_rank"] = new_rank

	for r in parsed:
		if cint(r.get("show")) != 1 or cint(r.get("sort_rank", 0)) <= 0:
			r.pop("sort_rank", None)
			r.pop("sort_dir", None)
		elif cstr(r.get("sort_dir") or "").strip().lower() not in ("asc", "desc"):
			r["sort_dir"] = "asc"

	return parsed


def _related_rows_for_vue_api(doc) -> list[dict[str, Any]]:
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
		info_val = d.get("info")
		if info_val is not None and cstr(info_val).strip():
			row["info"] = cstr(info_val)
		out.append(row)
	return out


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


def _related_list_columns_from_child_row(row) -> tuple[list[dict[str, Any]], str]:
	"""
	Build column metadata and order_by for related-row list fetch.

	Uses portal_field_config when present (show=1 columns, in editor order);
	otherwise ``name`` only.
	"""
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


@frappe.whitelist()
def capture_form_dialog_from_desk(
	doctype: str, title: str | None = None, related_doctypes: str | list | None = None
) -> str:
	"""
	Create or update a Form Dialog by capturing the live DocType schema from Desk.

	Args:
	    doctype: The Frappe DocType to capture (must be in WP Tables).
	    title: Optional title for the Form Dialog. Defaults to "{doctype} — dialog".
	    related_doctypes: Optional JSON string or list of selected related DocTypes.

	Returns:
	    The name of the created/updated Form Dialog document.
	"""
	_require_system_manager()
	_assert_doctype_in_wp_tables(doctype)

	meta = frappe.get_meta(doctype)
	fields_list = []
	for f in meta.fields:
		fields_list.append(f.as_dict())

	fields_list = _enrich_fetch_from_fields(fields_list, meta)
	frozen_json = json.dumps({"fields": fields_list}, default=str, indent=None)

	if not title:
		title = f"{doctype} — dialog"

	# Check if a Form Dialog with this title already exists
	existing = frappe.db.exists("Form Dialog", title)
	if existing:
		doc = frappe.get_doc("Form Dialog", title)
		doc.target_doctype = doctype
		doc.frozen_meta_json = frozen_json
		doc.captured_at = frappe.utils.now_datetime()
		_sync_related_doctypes(doc, related_doctypes)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc(
			{
				"doctype": "Form Dialog",
				"title": title,
				"target_doctype": doctype,
				"frozen_meta_json": frozen_json,
				"captured_at": frappe.utils.now_datetime(),
				"dialog_size": "xl",
				"is_active": 1,
				"related_doctypes": _related_doctype_child_rows(related_doctypes),
			}
		)
		doc.insert(ignore_permissions=True)

	frappe.db.commit()
	return doc.name


@frappe.whitelist()
def rebuild_form_dialog(name: str, related_doctypes: str | list | None = None) -> dict:
	"""
	Re-capture the DocType schema from Desk and overwrite the frozen snapshot.

	The UI must confirm with the user before calling this — the overwrite is destructive.

	Args:
	    name: The name (title) of the Form Dialog document.
	    related_doctypes: Optional JSON string or list of selected related DocTypes.

	Returns:
	    Dict with name, target_doctype, captured_at, and related_doctypes.
	"""
	_require_system_manager()

	doc = frappe.get_doc("Form Dialog", name)
	_assert_doctype_in_wp_tables(doc.target_doctype)

	meta = frappe.get_meta(doc.target_doctype)
	fields_list = []
	for f in meta.fields:
		fields_list.append(f.as_dict())

	fields_list = _enrich_fetch_from_fields(fields_list, meta)
	doc.frozen_meta_json = json.dumps({"fields": fields_list}, default=str, indent=None)
	doc.captured_at = frappe.utils.now_datetime()
	_sync_related_doctypes(doc, related_doctypes)
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {
		"name": doc.name,
		"target_doctype": doc.target_doctype,
		"captured_at": str(doc.captured_at),
		"related_doctypes": _related_rows_for_vue_api(doc),
	}


@frappe.whitelist()
def get_form_dialog_definition(name: str) -> dict:
	"""
	Return the frozen schema and dialog size for the Vue renderer.

	Any logged-in user may read an *active* Form Dialog definition so the V2
	panel form can load; the Form Dialog DocType itself stays SM-only for Desk.
	Guests are rejected.

	Args:
	    name: The name (title) of the Form Dialog document.

	Returns:
	    Dict with: name, title, target_doctype, dialog_size, frozen_meta (parsed),
	    writeback_on_submit, buttons (sorted), related_doctypes.
	"""
	if not (name or "").strip():
		frappe.throw(_("Missing name"))

	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)

	prev = frappe.flags.ignore_permissions
	frappe.flags.ignore_permissions = True
	try:
		doc = frappe.get_doc("Form Dialog", name)
	finally:
		frappe.flags.ignore_permissions = prev

	if not cint(doc.is_active):
		frappe.throw(_("This Form Dialog is not active."), frappe.PermissionError)

	frozen: dict = {}
	raw = doc.frozen_meta_json
	if raw and str(raw).strip():
		try:
			frozen = json.loads(raw)
		except json.JSONDecodeError as err:
			frappe.log_error(
				message=f"Form Dialog {name!r}: {err}\n{str(raw)[:2000]!r}",
				title="form_dialog_invalid_json",
			)
			frappe.throw(
				_(
					"Form Dialog schema is invalid. Open this Form Dialog in Desk and use Rebuild or re-capture from Desk."
				)
			)

	buttons = sorted(
		[b.as_dict() for b in (doc.buttons or [])],
		key=lambda b: (cint(b.get("sort_order")), cint(b.get("idx")), cstr(b.get("name") or "")),
	)
	related_doctypes = _related_rows_for_vue_api(doc)

	return {
		"name": doc.name,
		"title": doc.title,
		"target_doctype": doc.target_doctype,
		"dialog_size": doc.dialog_size or "xl",
		"frozen_meta": frozen,
		"writeback_on_submit": doc.writeback_on_submit or 0,
		"buttons": buttons,
		"related_doctypes": related_doctypes,
	}


@frappe.whitelist()
def get_form_dialog_related_rows(
	definition: str,
	related_row_name: str,
	root_doctype: str,
	root_name: str,
	limit: int | str = 500,
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
	    limit: Max rows (1–2000, default 500).

	Returns:
	    ``{ child_doctype, columns, rows, order_by }`` — columns from portal config
	    (show=1); if none, only ``name`` is returned.
	"""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)

	definition = cstr(definition or "").strip()
	related_row_name = cstr(related_row_name or "").strip()
	root_doctype = cstr(root_doctype or "").strip()
	root_name = cstr(root_name or "").strip()
	if not definition or not related_row_name or not root_doctype or not root_name:
		frappe.throw(_("Missing parameters"))

	limit_n = cint(limit)
	if limit_n < 1:
		limit_n = 500
	if limit_n > 2000:
		limit_n = 2000

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

	if not frappe.has_permission(root_doctype, "read", doc=root_name):
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
	filters, force_empty = _filters_for_related_rows(root_name, child_dt, link_f, hc)
	columns, order_by = _related_list_columns_from_child_row(row)
	field_list = _sanitize_get_list_fields(child_dt, [cstr(c.get("fieldname") or "") for c in columns])

	if force_empty:
		return {
			"child_doctype": child_dt,
			"columns": columns,
			"rows": [],
			"order_by": order_by,
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
	}


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


def _editable_related_fieldnames_for_save(row, child_dt: str) -> set[str]:
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
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)

	definition = cstr(definition or "").strip()
	related_row_name = cstr(related_row_name or "").strip()
	root_doctype = cstr(root_doctype or "").strip()
	root_name = cstr(root_name or "").strip()
	if not definition or not related_row_name or not root_doctype or not root_name:
		frappe.throw(_("Missing parameters"))

	updates = frappe.parse_json(updates) if isinstance(updates, str) else updates
	if updates is None:
		updates = []
	if not isinstance(updates, list):
		frappe.throw(_("updates must be a list"))

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
	allowed_names = _allowed_child_names_for_related_tab(root_name, child_dt, link_f, hc)
	allowed_fields = _editable_related_fieldnames_for_save(row, child_dt)

	if not updates:
		return {"ok": 1, "saved": 0}

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

	return {"ok": 1, "saved": saved}


@frappe.whitelist()
def list_form_dialogs_for_doctype(doctype: str) -> list[dict]:
	"""
	List active Form Dialogs for a given target DocType.
	Used by the Dialogs tab in the Page Panel Desk form.

	Args:
	    doctype: The target DocType to filter by.

	Returns:
	    List of dicts with: name, title, target_doctype, dialog_size, captured_at, is_active,
	    and related_doctypes (list of {doctype, label, link_field, hop_chain, child_row_name} per child row, no info JSON).
	"""
	_require_system_manager()

	dialogs = frappe.get_all(
		"Form Dialog",
		filters={"target_doctype": doctype, "is_active": 1},
		fields=["name", "title", "target_doctype", "dialog_size", "captured_at", "is_active"],
		order_by="title asc",
	)
	if not dialogs:
		return []

	names = [d["name"] for d in dialogs]
	child_rows = frappe.get_all(
		"Form Dialog Related DocType",
		filters={
			"parent": ("in", names),
			"parenttype": "Form Dialog",
			"parentfield": "related_doctypes",
		},
		fields=["name", "parent", "child_doctype", "link_field", "tab_label", "hop_chain", "idx"],
		order_by="parent asc, idx asc",
	)
	by_parent: dict[str, list[dict[str, Any]]] = {}
	for r in child_rows:
		dt = cstr(r.get("child_doctype") or "").strip()
		if not dt:
			continue
		lb = cstr(r.get("tab_label") or "").strip() or dt
		lf = cstr(r.get("link_field") or "").strip()
		pid = cstr(r.get("parent") or "").strip()
		if not pid:
			continue
		crn = cstr(r.get("name") or "").strip()
		hc = _normalize_hop_chain_value(r.get("hop_chain"))
		by_parent.setdefault(pid, []).append(
			{
				"doctype": dt,
				"label": lb,
				"link_field": lf,
				"child_row_name": crn,
				"hop_chain": hc,
			},
		)

	for d in dialogs:
		d["related_doctypes"] = by_parent.get(d["name"], [])

	return dialogs


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
	portal_raw = cstr(getattr(row, "portal_field_config", None) or "").strip()
	portal_entries = _parse_portal_field_config_entries(portal_raw)
	rows = _build_portal_editor_rows(meta_fields, portal_entries)

	return {
		"form_dialog": doc.name,
		"child_row_name": row.name,
		"child_doctype": row.child_doctype,
		"tab_label": cstr(row.tab_label or "").strip() or row.child_doctype,
		"rows": rows,
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
	allowed = {cstr(f.get("fieldname") or "").strip() for f in meta_fields if _portal_meta_field_eligible_for_editor(f)}

	normalized = _normalize_portal_field_config_for_save(portal_field_config, allowed)

	row.portal_field_config = json.dumps(normalized, indent=None)
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {"ok": 1, "portal_field_config": normalized}


@frappe.whitelist()
def save_form_dialog_document(doc, writeback_fetches: int | str | None = None) -> dict:
	"""
	Save a document from the panel Form Dialog.

	When writeback_fetches is truthy: for each meta field with fetch_from that
	is not read_only on the parent, push the submitted value to the linked
	document *before* saving this document, so Document.save()'s fetch logic
	reads the updated source (same as Desk). Read-only fetch fields are skipped.

	Client-side frappe.client.set_value + save is unreliable (empty API responses,
	permission noise, and ordering). This runs everything server-side with normal
	permission checks.
	"""
	doc = frappe.parse_json(doc) if isinstance(doc, str) else doc
	doctype = doc.get("doctype")
	if not doctype:
		frappe.throw(_("Missing doctype"))

	_assert_doctype_in_wp_tables(doctype)

	name = doc.get("name")
	if name:
		if not frappe.has_permission(doctype, "write", doc=name):
			frappe.throw(_("Not permitted"), frappe.PermissionError)
	else:
		if not frappe.has_permission(doctype, "create"):
			frappe.throw(_("Not permitted"), frappe.PermissionError)

	if cint(writeback_fetches):
		meta = frappe.get_meta(doctype)
		# (link_doctype, link_name) -> { source_fieldname: value }
		pending: dict[tuple[str, str], dict[str, object]] = {}

		for df in meta.fields:
			if not df.fetch_from or df.read_only:
				continue
			parts = df.fetch_from.split(".", 1)
			if len(parts) != 2:
				continue
			link_fn, src_fn = parts
			link_field = meta.get_field(link_fn)
			if not link_field or link_field.fieldtype != "Link" or not link_field.options:
				continue
			target_name = doc.get(link_fn)
			if not target_name:
				continue
			target_dt = link_field.options
			key = (target_dt, str(target_name))
			pending.setdefault(key, {})[src_fn] = doc.get(df.fieldname)

		for (target_dt, target_name), field_map in pending.items():
			if not frappe.has_permission(target_dt, "write", target_name):
				frappe.log_error(
					_("save_form_dialog_document: no write permission on {0}/{1}").format(
						target_dt, target_name
					),
					"form_dialog_writeback",
				)
				continue
			target = frappe.get_doc(target_dt, target_name)
			changed = False
			for fn, val in field_map.items():
				if cstr(target.get(fn)) != cstr(val):
					target.set(fn, val)
					changed = True
			if changed:
				target.save()

	d = frappe.get_doc(doc)
	d.save()
	return d.as_dict()
