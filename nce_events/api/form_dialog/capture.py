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

code-index:begin
{
 "purpose": "Form Dialog schema capture endpoints: Desk to frozen meta JSON, rebuild, and list by DocType.",
 "read_when": "When capturing, rebuilding, or loading Form Dialog definitions from Desk or Vue panel.",
 "gotchas": [],
 "keywords": ["capture", "rebuild_form_dialog", "frozen meta", "get_form_dialog_definition", "Form Dialog"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr

from ._helpers import (
	_assert_doctype_in_wp_tables,
	_build_frozen_meta_json,
	_capture_client_scripts,
	_normalize_hop_chain_value,
	_related_doctype_child_rows,
	_require_form_dialog_capture_schema_ready,
	_require_system_manager,
	_sync_inline_child_tables,
	_sync_related_doctypes,
	_sync_script_tool_groups,
	_sync_form_dialog_tab_notes_from_fields,
	table_fields_for_capture_wizard,
)
from .related_rows import (
	_inline_child_tables_for_vue_api,
	_related_rows_for_vue_api,
	_script_tool_groups_for_vue_api,
)


def _next_available_form_dialog_title(title: str) -> str:
	"""Return ``title`` if unused, else ``title (2)``, ``title (3)``, … (autoname = field:title)."""
	base = (title or "").strip() or "Dialog"
	if not frappe.db.exists("Form Dialog", base):
		return base
	n = 2
	while True:
		candidate = f"{base} ({n})"
		if not frappe.db.exists("Form Dialog", candidate):
			return candidate
		n += 1


def _copy_form_dialog_settings_from(source_name: str | None, target: frappe.model.document.Document) -> None:
	"""Copy desk-tuned settings (not frozen meta) from an existing Form Dialog onto ``target``."""
	if not (source_name or "").strip():
		return
	if not frappe.db.exists("Form Dialog", source_name):
		return
	source = frappe.get_doc("Form Dialog", source_name)
	target.dialog_size = source.dialog_size or target.dialog_size or "xl"
	target.submit_hide_if = getattr(source, "submit_hide_if", None) or target.submit_hide_if or "Never"
	target.submit_hide_if_sql = getattr(source, "submit_hide_if_sql", None) or ""
	target.writeback_on_submit = cint(source.writeback_on_submit)
	meta = frappe.get_meta("Form Dialog")
	if meta.has_field("custom_presubmit_script"):
		target.custom_presubmit_script = getattr(source, "custom_presubmit_script", None) or ""

	target.set("buttons", [])
	for row in source.get("buttons") or []:
		target.append(
			"buttons",
			{
				"label": row.label,
				"hide_if": row.hide_if or "Never",
				"hide_if_sql": row.hide_if_sql or "",
				"button_script": row.button_script or "",
				"sort_order": cint(row.sort_order),
				"source_note": row.source_note or "",
			},
		)


@frappe.whitelist()
def capture_form_dialog_from_desk(
	doctype: str,
	title: str | None = None,
	related_doctypes: str | list | None = None,
	inline_child_tables: str | list | None = None,
	script_tool_groups: str | list | None = None,
	create_new: int | str | bool = 0,
	copy_from: str | None = None,
) -> str:
	"""
	Create or update a Form Dialog by capturing the live DocType schema from Desk.

	Args:
	    doctype: The Frappe DocType to capture (must be in WP Tables).
	    title: Optional title for the Form Dialog. Defaults to "{doctype} — dialog".
	    related_doctypes: Optional JSON string or list of selected related DocTypes.
	    inline_child_tables: Optional JSON list of dicts with ``parent_fieldname`` and optional ``tab_label``.
	    script_tool_groups: Optional JSON list of dicts with ``group_key`` and ``tab_label`` for Tools tabs.
	    create_new: When truthy, always insert a new dialog (inactive); never overwrite an existing title.
	    copy_from: Optional Form Dialog name to copy desk settings from (size, submit rules, buttons, etc.).

	Returns:
	    The name of the created/updated Form Dialog document.
	"""
	_require_system_manager()
	_require_form_dialog_capture_schema_ready()
	_assert_doctype_in_wp_tables(doctype)

	frozen_json, fields_list = _build_frozen_meta_json(doctype)

	if not title:
		title = f"{doctype} — dialog"

	if cint(create_new):
		resolved_title = _next_available_form_dialog_title(title)
		doc = frappe.get_doc(
			{
				"doctype": "Form Dialog",
				"title": resolved_title,
				"target_doctype": doctype,
				"frozen_meta_json": frozen_json,
				"captured_at": frappe.utils.now_datetime(),
				"dialog_size": "xl",
				"is_active": 0,
				"related_doctypes": _related_doctype_child_rows(related_doctypes, doctype),
			}
		)
		_sync_inline_child_tables(doc, inline_child_tables, doctype)
		_sync_script_tool_groups(doc, script_tool_groups)
		_sync_form_dialog_tab_notes_from_fields(doc, fields_list)
		_copy_form_dialog_settings_from(copy_from, doc)
		doc.insert(ignore_permissions=True)
	else:
		# Check if a Form Dialog with this title already exists
		existing = frappe.db.exists("Form Dialog", title)
		if existing:
			doc = frappe.get_doc("Form Dialog", title)
			doc.target_doctype = doctype
			doc.frozen_meta_json = frozen_json
			doc.captured_at = frappe.utils.now_datetime()
			_sync_related_doctypes(doc, related_doctypes)
			_sync_inline_child_tables(doc, inline_child_tables, doctype)
			_sync_script_tool_groups(doc, script_tool_groups)
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
					"related_doctypes": _related_doctype_child_rows(related_doctypes, doctype),
				}
			)
			_sync_inline_child_tables(doc, inline_child_tables, doctype)
			_sync_script_tool_groups(doc, script_tool_groups)
			_sync_form_dialog_tab_notes_from_fields(doc, fields_list)
			doc.insert(ignore_permissions=True)

	frappe.db.commit()
	return doc.name


@frappe.whitelist()
def set_form_dialog_active(
	name: str,
	active: int | str | bool = 1,
	page_panel: str | None = None,
) -> dict[str, Any]:
	"""
	Set ``is_active`` on a Form Dialog. At most one dialog per ``target_doctype`` may be active.

	Used by the Page Panel Dialogs tab exclusive Active checkbox (System Manager only).

	One UPDATE, with no ``get_doc`` before it. Reading the row and then updating it in the
	same request raises MariaDB ER_CHECKREAD, which Desk shows as "Deadlock Occurred".
	When ``page_panel`` is passed, that panel's ``form_dialog`` link is updated here too,
	so the Desk form does not have to save the whole Page Panel.
	"""
	_require_system_manager()
	name = (name or "").strip()
	if not name:
		frappe.throw(_("Missing Form Dialog name."))

	active_flag = 1 if cint(active) else 0
	# No get_doc / exists before this UPDATE. A read of the same row earlier in
	# the request makes MariaDB raise ER_CHECKREAD, shown in Desk as a deadlock.
	if active_flag:
		frappe.db.sql(
			"""
			UPDATE `tabForm Dialog` AS d
			INNER JOIN `tabForm Dialog` AS src ON src.name = %s
			SET d.is_active = IF(d.name = src.name, 1, 0)
			WHERE d.target_doctype = src.target_doctype
			""",
			(name,),
		)
	else:
		frappe.db.sql(
			"UPDATE `tabForm Dialog` SET is_active = 0 WHERE name = %s",
			(name,),
		)
	if not frappe.db.sql("select name from `tabForm Dialog` where name=%s", name):
		frappe.throw(_("Form Dialog {0} not found.").format(name))
	frappe.clear_document_cache("Form Dialog", name)

	panel = (page_panel or "").strip()
	linked = name if active_flag else ""
	if panel and frappe.db.exists("Page Panel", panel):
		# Leave `modified` alone so the open Page Panel form can still be saved.
		frappe.db.set_value("Page Panel", panel, "form_dialog", linked, update_modified=False)

	return {"name": name, "is_active": active_flag, "form_dialog": linked}


@frappe.whitelist()
def rebuild_form_dialog(
	name: str,
	related_doctypes: str | list | None = None,
	inline_child_tables: str | list | None = None,
	script_tool_groups: str | list | None = None,
) -> dict:
	"""
	Re-capture the DocType schema from Desk and overwrite the frozen snapshot.

	The UI must confirm with the user before calling this — the overwrite is destructive.

	Args:
	    name: The name (title) of the Form Dialog document.
	    related_doctypes: Optional JSON string or list of selected related DocTypes.
	    inline_child_tables: Optional JSON list of dicts with ``parent_fieldname`` and optional ``tab_label``.
	    script_tool_groups: Optional JSON list of dicts with ``group_key`` and ``tab_label``.

	Returns:
	    Dict with name, target_doctype, captured_at, related_doctypes, inline_child_tables, script_tool_groups.
	"""
	_require_system_manager()
	_require_form_dialog_capture_schema_ready()

	doc = frappe.get_doc("Form Dialog", name)
	_assert_doctype_in_wp_tables(doc.target_doctype)

	frozen_json, fields_list = _build_frozen_meta_json(doc.target_doctype)
	doc.frozen_meta_json = frozen_json
	doc.captured_at = frappe.utils.now_datetime()
	_sync_related_doctypes(doc, related_doctypes)
	_sync_inline_child_tables(doc, inline_child_tables, doc.target_doctype)
	_sync_script_tool_groups(doc, script_tool_groups)
	_sync_form_dialog_tab_notes_from_fields(doc, fields_list)
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {
		"name": doc.name,
		"target_doctype": doc.target_doctype,
		"captured_at": str(doc.captured_at),
		"related_doctypes": _related_rows_for_vue_api(doc),
		"inline_child_tables": _inline_child_tables_for_vue_api(doc),
		"script_tool_groups": _script_tool_groups_for_vue_api(doc),
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
	inline_child_tables = _inline_child_tables_for_vue_api(doc)
	script_tool_groups = _script_tool_groups_for_vue_api(doc)

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
		"inline_child_tables": inline_child_tables,
		"script_tool_groups": script_tool_groups,
		"tab_notes": tab_notes,
	}


@frappe.whitelist()
def get_capture_wizard_options(doctype: str) -> dict[str, Any]:
	"""Page Panel capture picker: Table fields on ``doctype`` eligible as inline tabs."""
	_require_system_manager()
	_assert_doctype_in_wp_tables(doctype)
	return {"inline_table_fields": table_fields_for_capture_wizard(doctype)}


@frappe.whitelist()
def preview_capture_client_scripts(doctype: str) -> dict[str, Any]:
	"""Desk-only: script bodies used for Tools-tab discovery before capture completes."""
	_require_system_manager()
	_assert_doctype_in_wp_tables(doctype)
	return {"scripts": _capture_client_scripts(doctype)}


@frappe.whitelist()
def list_form_dialogs_for_doctype(doctype: str) -> list[dict]:
	"""
	List Form Dialogs (all versions) for a given target DocType.
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
		filters={"target_doctype": doctype},
		fields=["name", "title", "target_doctype", "dialog_size", "captured_at", "is_active"],
		order_by="title asc",
	)
	if not dialogs:
		return []

	names = [d["name"] for d in dialogs]
	hook_by_name: dict[str, str] = {}
	# The column exists on sites that use "Run this script first on Submit". It is not in
	# form_dialog.json, so only read it when the table actually has it.
	if frappe.db.has_column("Form Dialog", "custom_presubmit_script"):
		for row in frappe.db.sql(
			"""
			SELECT name, custom_presubmit_script
			FROM `tabForm Dialog`
			WHERE name IN %s
			""",
			[names],
			as_dict=True,
		):
			hook_by_name[cstr(row.get("name") or "")] = cstr(row.get("custom_presubmit_script") or "").strip()
	for d in dialogs:
		script = hook_by_name.get(cstr(d.get("name") or ""), "")
		d["submit_hook"] = script
		d["has_submit_hook"] = 1 if script else 0
	child_rows = frappe.get_all(
		"Form Dialog Related DocType",
		filters={
			"parent": ("in", names),
			"parenttype": "Form Dialog",
			"parentfield": "related_doctypes",
		},
		fields=["name", "parent", "child_doctype", "link_field", "query_based_table_link", "tab_label", "hop_chain", "idx"],
		order_by="parent asc, idx asc",
	)
	by_parent: dict[str, list[dict[str, str | int | list]]] = {}
	for r in child_rows:
		dt = cstr(r.get("child_doctype") or "").strip()
		if not dt:
			continue
		lb = cstr(r.get("tab_label") or "").strip() or dt
		lf = cstr(r.get("link_field") or "").strip()
		qbtl = cstr(r.get("query_based_table_link") or "").strip()
		pid = cstr(r.get("parent") or "").strip()
		if not pid:
			continue
		crn = cstr(r.get("name") or "").strip()
		hc = _normalize_hop_chain_value(r.get("hop_chain"))
		entry: dict[str, str | int | list] = {
			"doctype": dt,
			"label": lb,
			"link_field": lf,
			"child_row_name": crn,
			"hop_chain": hc,
		}
		if qbtl:
			entry["query_based_table_link"] = qbtl
		by_parent.setdefault(pid, []).append(entry)

	# Requires ``bench migrate`` after deploying child DocTypes; avoid breaking Desk if table missing.
	try:
		inline_rows = frappe.get_all(
			"Form Dialog Inline Child Table",
			filters={
				"parent": ("in", names),
				"parenttype": "Form Dialog",
				"parentfield": "inline_child_tables",
			},
			fields=["name", "parent", "parent_fieldname", "child_doctype", "tab_label", "idx"],
			order_by="parent asc, idx asc",
		)
	except Exception:
		inline_rows = []
	inline_by_parent: dict[str, list[dict[str, str]]] = {}
	for r in inline_rows:
		pid = cstr(r.get("parent") or "").strip()
		if not pid:
			continue
		pfn = cstr(r.get("parent_fieldname") or "").strip()
		cd = cstr(r.get("child_doctype") or "").strip()
		if not pfn or not cd:
			continue
		crn = cstr(r.get("name") or "").strip()
		lb = cstr(r.get("tab_label") or "").strip() or pfn
		inline_by_parent.setdefault(pid, []).append(
			{
				"parent_fieldname": pfn,
				"child_doctype": cd,
				"label": lb,
				"child_row_name": crn,
			},
		)

	for d in dialogs:
		d["related_doctypes"] = by_parent.get(d["name"], [])
		d["inline_child_tables"] = inline_by_parent.get(d["name"], [])

	return dialogs
