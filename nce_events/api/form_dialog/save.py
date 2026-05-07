"""
Server-side Form Dialog document save with optional fetch_from writeback.

The whitelisted endpoint ``save_form_dialog_document`` is the panel-V2 path for
persisting a document edited inside a Form Dialog. It honours per-DocType
required-field rules (root + Page Panel ``required_fields``), then optionally
pushes fetch_from values back into their source records before saving — keeping
the Frappe fetch chain intact when the dialog edits both the parent and the
linked source field in one round trip.
"""

from __future__ import annotations

from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr

from nce_events.api.panel_api_pkg._helpers import validate_document_page_panel_required_roots
from ._helpers import _assert_doctype_in_wp_tables


def _sanitize_scalar_fields(doc: dict[str, Any]) -> None:
	"""
	Guard against frontend bugs that send a change-event payload dict
	``{"fieldname": "x", "value": "y"}`` as a field value instead of the
	scalar ``"y"``.  PyMySQL rejects dict parameters with ``TypeError: dict
	can not be used as parameter``.  Extract the inner value when possible;
	drop keys whose value remains a non-list dict (never valid for a scalar
	field in this save path).
	"""
	for key in list(doc.keys()):
		v = doc[key]
		if isinstance(v, dict) and key not in ("doctype",):
			inner = v.get("value")
			if inner is not None and not isinstance(inner, (dict, list)):
				doc[key] = inner
			else:
				doc.pop(key)


@frappe.whitelist()
def save_form_dialog_document(
	doc: str | dict[str, Any],
	writeback_fetches: int | str | None = None,
) -> dict[str, Any]:
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

	validate_document_page_panel_required_roots(doc, doctype)

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

	_sanitize_scalar_fields(doc)
	d = frappe.get_doc(doc)
	d.save()
	return d.as_dict()
