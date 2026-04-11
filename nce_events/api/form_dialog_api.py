"""
Server API for Form Dialog CRUD and frozen schema capture.

Capture, rebuild, and list require System Manager. get_form_dialog_definition is
readable by any logged-in user for active dialogs (V2 panel). save uses normal
DocType create/write permission on the target record.
"""

from __future__ import annotations

import json

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


def _parse_related_doctypes_argument(related_doctypes: str | list | None) -> list[dict[str, str]]:
	"""Normalize Desk JSON string or list of {doctype, link_field, label} from get_child_doctypes."""
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
	out: list[dict[str, str]] = []
	seen: set[str] = set()
	for item in related_doctypes:
		if not isinstance(item, dict):
			continue
		dt = cstr(item.get("doctype") or "").strip()
		if not dt or dt in seen:
			continue
		lf = cstr(item.get("link_field") or "").strip()
		if not lf:
			continue
		seen.add(dt)
		lb = cstr(item.get("label") or "").strip() or dt
		out.append({"doctype": dt, "link_field": lf, "label": lb})
	return out


def _build_related_child_row_dict(spec: dict[str, str]) -> dict[str, str]:
	"""One child row with frozen field list JSON in info; never raises."""
	child_dt = spec["doctype"]
	link_f = spec["link_field"]
	tab_l = spec["label"]
	info_obj: dict = {
		"doctype": child_dt,
		"link_field": link_f,
		"label": tab_l,
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
		"info": info_str,
	}


def _related_doctype_child_rows(related_doctypes: str | list | None) -> list[dict[str, str]]:
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
		out.append(
			{
				"fieldname": fn,
				"label": cstr(f.get("label") or "").strip() or fn,
				"fieldtype": cstr(f.get("fieldtype") or ""),
				"show": 1 if cint(entry.get("show")) else 0,
				"editable": 1 if cint(entry.get("editable")) else 0,
			}
		)

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


def _related_rows_for_vue_api(doc) -> list[dict[str, str]]:
	"""Child rows for V2: doctype, label, link_field, and raw info JSON for tab rendering."""
	out: list[dict[str, str]] = []
	for r in doc.related_doctypes or []:
		d = r.as_dict()
		dt = cstr(d.get("child_doctype") or "").strip()
		if not dt:
			continue
		lb = cstr(d.get("tab_label") or "").strip() or dt
		lf = cstr(d.get("link_field") or "").strip()
		row: dict[str, str] = {"doctype": dt, "label": lb, "link_field": lf}
		info_val = d.get("info")
		if info_val is not None and cstr(info_val).strip():
			row["info"] = cstr(info_val)
		out.append(row)
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
def list_form_dialogs_for_doctype(doctype: str) -> list[dict]:
	"""
	List active Form Dialogs for a given target DocType.
	Used by the Dialogs tab in the Page Panel Desk form.

	Args:
	    doctype: The target DocType to filter by.

	Returns:
	    List of dicts with: name, title, target_doctype, dialog_size, captured_at, is_active,
	    and related_doctypes (list of {doctype, label, link_field, child_row_name} per child row, no info JSON).
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
		fields=["name", "parent", "child_doctype", "link_field", "tab_label", "idx"],
		order_by="parent asc, idx asc",
	)
	by_parent: dict[str, list[dict[str, str]]] = {}
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
		by_parent.setdefault(pid, []).append(
			{
				"doctype": dt,
				"label": lb,
				"link_field": lf,
				"child_row_name": crn,
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

	normalized: list[dict[str, int | str]] = []
	seen: set[str] = set()
	for entry in portal_field_config:
		if not isinstance(entry, dict):
			continue
		fn = cstr(entry.get("fieldname") or "").strip()
		if not fn or fn not in allowed or fn in seen:
			continue
		seen.add(fn)
		normalized.append(
			{
				"fieldname": fn,
				"show": 1 if cint(entry.get("show")) else 0,
				"editable": 1 if cint(entry.get("editable")) else 0,
			}
		)

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
