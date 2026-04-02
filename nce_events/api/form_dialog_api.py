"""
Server API for Form Dialog CRUD and frozen schema capture.

All methods require System Manager role.
"""

import json

import frappe
from frappe import _


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


@frappe.whitelist()
def capture_form_dialog_from_desk(doctype: str, title: str | None = None) -> str:
	"""
	Create or update a Form Dialog by capturing the live DocType schema from Desk.

	Args:
	    doctype: The Frappe DocType to capture (must be in WP Tables).
	    title: Optional title for the Form Dialog. Defaults to "{doctype} — dialog".

	Returns:
	    The name of the created/updated Form Dialog document.
	"""
	_require_system_manager()
	_assert_doctype_in_wp_tables(doctype)

	meta = frappe.get_meta(doctype)
	fields_list = []
	for f in meta.fields:
		fields_list.append(f.as_dict())

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
			}
		)
		doc.insert(ignore_permissions=True)

	frappe.db.commit()
	return doc.name


@frappe.whitelist()
def rebuild_form_dialog(name: str) -> dict:
	"""
	Re-capture the DocType schema from Desk and overwrite the frozen snapshot.

	The UI must confirm with the user before calling this — the overwrite is destructive.

	Args:
	    name: The name (title) of the Form Dialog document.

	Returns:
	    Dict with name, target_doctype, and captured_at.
	"""
	_require_system_manager()

	doc = frappe.get_doc("Form Dialog", name)
	_assert_doctype_in_wp_tables(doc.target_doctype)

	meta = frappe.get_meta(doc.target_doctype)
	fields_list = []
	for f in meta.fields:
		fields_list.append(f.as_dict())

	doc.frozen_meta_json = json.dumps({"fields": fields_list}, default=str, indent=None)
	doc.captured_at = frappe.utils.now_datetime()
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {
		"name": doc.name,
		"target_doctype": doc.target_doctype,
		"captured_at": str(doc.captured_at),
	}


@frappe.whitelist()
def get_form_dialog_definition(name: str) -> dict:
	"""
	Return the frozen schema, button rows, and dialog size for the Vue renderer.

	Args:
	    name: The name (title) of the Form Dialog document.

	Returns:
	    Dict with: name, title, target_doctype, dialog_size, frozen_meta_json (as parsed dict),
	    and buttons (list of dicts with label, sort_order).
	"""
	_require_system_manager()

	doc = frappe.get_doc("Form Dialog", name)

	frozen = {}
	if doc.frozen_meta_json:
		frozen = json.loads(doc.frozen_meta_json)

	buttons = []
	for row in sorted(doc.buttons or [], key=lambda r: r.sort_order or 0):
		buttons.append(
			{
				"label": row.label,
				"sort_order": row.sort_order,
			}
		)

	return {
		"name": doc.name,
		"title": doc.title,
		"target_doctype": doc.target_doctype,
		"dialog_size": doc.dialog_size or "xl",
		"frozen_meta": frozen,
		"buttons": buttons,
		"writeback_on_submit": doc.writeback_on_submit or 0,
	}


@frappe.whitelist()
def list_form_dialogs_for_doctype(doctype: str) -> list[dict]:
	"""
	List active Form Dialogs for a given target DocType.
	Used by the Dialogs tab in the Page Panel Desk form.

	Args:
	    doctype: The target DocType to filter by.

	Returns:
	    List of dicts with: name, title, target_doctype, dialog_size, captured_at, is_active.
	"""
	_require_system_manager()

	return frappe.get_all(
		"Form Dialog",
		filters={"target_doctype": doctype, "is_active": 1},
		fields=["name", "title", "target_doctype", "dialog_size", "captured_at", "is_active"],
		order_by="title asc",
	)
