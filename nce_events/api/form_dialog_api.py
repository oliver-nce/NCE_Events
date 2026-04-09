"""
Server API for Form Dialog CRUD and frozen schema capture.

Capture/rebuild/list/get require System Manager.
save_form_dialog_document uses normal DocType create/write permission.
"""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.utils import cint, cstr

# Debug wrapper to capture SQL queries for troubleshooting
_original_db_sql = None


def _enable_sql_debugging():
	"""Wrap frappe.db.sql to log queries before execution."""
	global _original_db_sql
	if _original_db_sql is None:
		_original_db_sql = frappe.db.sql

		def _debug_sql(query, values=None, *args, **kwargs):
			try:
				result = _original_db_sql(query, values, *args, **kwargs)
				return result
			except Exception as e:
				# Log the query when an error occurs
				frappe.log_error(
					f"SQL Error in Form Dialog loading:\nQuery: {query}\nValues: {values}\nError: {e}",
					"form_dialog_sql_error",
				)
				raise

		frappe.db.sql = _debug_sql


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

	# Normalize related_doctypes to a JSON string (or None)
	_related_json = None
	if related_doctypes is not None:
		if isinstance(related_doctypes, str):
			_related_json = related_doctypes  # already JSON
		else:
			_related_json = json.dumps(related_doctypes, default=str)

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
		if _related_json is not None:
			doc.related_doctypes = _related_json
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
				"related_doctypes": _related_json or "[]",
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

	# Normalize related_doctypes to a JSON string (or None)
	_related_json = None
	if related_doctypes is not None:
		if isinstance(related_doctypes, str):
			_related_json = related_doctypes  # already JSON
		else:
			_related_json = json.dumps(related_doctypes, default=str)

	meta = frappe.get_meta(doc.target_doctype)
	fields_list = []
	for f in meta.fields:
		fields_list.append(f.as_dict())

	fields_list = _enrich_fetch_from_fields(fields_list, meta)
	doc.frozen_meta_json = json.dumps({"fields": fields_list}, default=str, indent=None)
	doc.captured_at = frappe.utils.now_datetime()
	if _related_json is not None:
		doc.related_doctypes = _related_json
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {
		"name": doc.name,
		"target_doctype": doc.target_doctype,
		"captured_at": str(doc.captured_at),
		"related_doctypes": json.loads(doc.related_doctypes or "[]"),
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

	# Enable SQL debugging to capture the error
	_enable_sql_debugging()

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
		"related_doctypes": json.loads(doc.related_doctypes or "[]"),
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
