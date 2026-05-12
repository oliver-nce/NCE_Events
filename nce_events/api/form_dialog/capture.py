"""
Form Dialog schema-capture endpoints (Desk → frozen meta JSON).

Whitelisted as System Manager:
- ``capture_form_dialog_from_desk`` — create / update a Form Dialog by capturing
  the live DocType schema.
- ``rebuild_form_dialog`` — re-capture and overwrite an existing Form Dialog's
  frozen schema.
- ``get_form_dialog_definition`` — read the frozen schema for the V2 panel
  renderer (logged-in users; the DocType itself stays SM-only for Desk).
- ``list_form_dialogs_for_doctype`` — Desk Page Panel "Dialogs" tab listing.
"""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.utils import cint, cstr

from ._helpers import (
	_assert_doctype_in_wp_tables,
	_enrich_fetch_from_fields,
	_normalize_hop_chain_value,
	_related_doctype_child_rows,
	_require_system_manager,
	_sync_related_doctypes,
	_sync_form_dialog_tab_notes_from_fields,
)
from .related_rows import _related_rows_for_vue_api


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
		_sync_form_dialog_tab_notes_from_fields(doc, fields_list)
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
		_sync_form_dialog_tab_notes_from_fields(doc, fields_list)
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
	_sync_form_dialog_tab_notes_from_fields(doc, fields_list)
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

	tab_notes = [
		{
			"tab_anchor": cstr(getattr(r, "tab_anchor", None) or "").strip(),
			"tab_label": cstr(getattr(r, "tab_label", None) or ""),
			"note": cstr(getattr(r, "note", None) or ""),
		}
		for r in sorted(doc.get("tab_notes") or [], key=lambda row: int(getattr(row, "idx", 0) or 0))
	]

	return {
		"name": doc.name,
		"title": doc.title,
		"target_doctype": doc.target_doctype,
		"dialog_size": doc.dialog_size or "xl",
		"frozen_meta": frozen,
		"writeback_on_submit": doc.writeback_on_submit or 0,
		"submit_hide_if": (getattr(doc, "submit_hide_if", None) or "").strip() or "Never",
		"submit_hide_if_sql": (getattr(doc, "submit_hide_if_sql", None) or "").strip(),
		"custom_presubmit_script": (getattr(doc, "custom_presubmit_script", None) or "").strip(),
		"buttons": buttons,
		"related_doctypes": related_doctypes,
		"tab_notes": tab_notes,
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
	by_parent: dict[str, list[dict[str, str | int | list]]] = {}
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
