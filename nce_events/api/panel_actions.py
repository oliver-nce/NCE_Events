from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr

from nce_events.api.form_dialog._helpers import (
	_assert_doctype_in_wp_tables,
	_enrich_fetch_from_fields,
	_require_system_manager,
)

_PUBLIC_FIELDS: tuple[str, ...] = (
	"name",
	"action_id",
	"label",
	"sort_order",
	"action_type",
	"target_doctype",
	"record_mode",
	"record_name",
	"client_handler",
	"scope",
)


def _user_role_set() -> frozenset[str]:
	return frozenset(frappe.get_roles(frappe.session.user))


@frappe.whitelist()
def get_panel_actions(scope: str | None = None) -> list[dict[str, Any]]:
	"""Return enabled Panel Actions visible to the current user, sorted."""
	if not frappe.has_permission("Panel Action", "read"):
		return []

	rows = frappe.get_all(
		"Panel Action",
		filters={"enabled": 1},
		fields=list(_PUBLIC_FIELDS),
		order_by="sort_order asc, modified desc",
	)

	requested = (scope or "").strip()
	if requested:
		rows = [r for r in rows if (r.get("scope") or "Both") in (requested, "Both")]

	user_roles = _user_role_set()
	out: list[dict[str, Any]] = []
	for r in rows:
		parent_name = r.get("name") or r.get("action_id")
		if not parent_name:
			continue
		allowed = frappe.get_all(
			"Panel Action Role",
			filters={"parent": parent_name, "parenttype": "Panel Action"},
			pluck="role",
		)
		allowed_roles = {a for a in allowed if a}
		if allowed_roles and not (allowed_roles & user_roles):
			continue
		out.append(r)

	return out


@frappe.whitelist()
def resolve_panel_action_doc_name(
	doctype: str,
	record_mode: str,
	record_name: str | None = None,
) -> dict[str, Any]:
	"""Resolve doc ``name`` for opening a Form Dialog (handles Frappe Single / ``issingle`` DocTypes)."""
	dt = cstr(doctype).strip()
	if not dt:
		frappe.throw(_("DocType is required."))
	if not frappe.db.exists("DocType", dt):
		frappe.throw(_("DocType {0} is not installed on this site.").format(dt))

	mode = cstr(record_mode).strip() or "New"
	if mode == "New":
		return {"doc_name": None}
	if mode == "Specific Name":
		rn = cstr(record_name).strip()
		if not rn:
			frappe.throw(_("Record Name is required for Specific Name mode."))
		return {"doc_name": rn}
	if mode == "Singleton":
		meta = frappe.get_meta(dt)
		if meta.issingle:
			return {"doc_name": dt}
		rows = frappe.get_all(dt, fields=["name"], limit_start=0, limit_page_length=1)
		if not rows:
			return {"doc_name": None}
		return {"doc_name": cstr(rows[0].name)}

	frappe.throw(_("Unknown record mode: {0}").format(mode))


def _desk_route_key(name: str) -> str:
	return cstr(name or "").strip().lower().replace(" ", "-").replace("_", "-")


@frappe.whitelist()
def resolve_doctype_for_list_route(fragment: str) -> dict[str, str]:
	"""Map slug (e.g. error-log) or exact DocType name to canonical DocType name for Desk list URLs."""
	frag = cstr(fragment).strip()
	if not frag:
		frappe.throw(_("DocType is required."))
	if frappe.db.exists("DocType", frag):
		return {"doctype": frag}
	target = _desk_route_key(frag)
	for dt in frappe.get_all("DocType", pluck="name"):
		if _desk_route_key(dt) == target:
			return {"doctype": cstr(dt)}
	frappe.throw(_("No DocType matches {0!r}.").format(frag))


@frappe.whitelist()
def capture_panel_action_dialog(action_id: str) -> dict[str, Any]:
	"""Capture target DocType meta into ``frozen_meta_json`` on the Panel Action row."""
	_require_system_manager()

	aid = cstr(action_id).strip()
	if not aid:
		frappe.throw(_("Missing action_id"))

	doc = frappe.get_doc("Panel Action", aid)
	if cstr(doc.action_type) != "Form Dialog":
		frappe.throw(_("Action {0} is not a Form Dialog action.").format(aid))

	target = cstr(doc.target_doctype).strip()
	if not target:
		frappe.throw(_("Set Target DocType before capturing."))

	_assert_doctype_in_wp_tables(target)

	meta = frappe.get_meta(target)
	fields_list = [f.as_dict() for f in meta.fields]
	fields_list = _enrich_fetch_from_fields(fields_list, meta)

	doc.frozen_meta_json = json.dumps({"fields": fields_list}, default=str, indent=None)
	doc.captured_at = frappe.utils.now_datetime()
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {
		"action_id": doc.name,
		"target_doctype": target,
		"field_count": len(fields_list),
		"captured_at": str(doc.captured_at),
	}


@frappe.whitelist()
def get_panel_action_dialog_definition(action_id: str) -> dict[str, Any]:
	"""Return the Panel Action's captured Form Dialog definition for the V2 renderer.

	Same shape as ``nce_events.api.form_dialog.capture.get_form_dialog_definition`` so
	the existing PanelFormDialog loader can consume it without branching.
	"""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)

	aid = cstr(action_id).strip()
	if not aid:
		frappe.throw(_("Missing action_id"))

	prev = frappe.flags.ignore_permissions
	frappe.flags.ignore_permissions = True
	try:
		doc = frappe.get_doc("Panel Action", aid)
	finally:
		frappe.flags.ignore_permissions = prev

	if cstr(doc.action_type) != "Form Dialog":
		frappe.throw(_("Action {0} is not a Form Dialog action.").format(aid))
	if not cint(doc.enabled):
		frappe.throw(_("This Panel Action is disabled."), frappe.PermissionError)

	frozen: dict[str, Any] = {}
	raw = doc.frozen_meta_json
	if raw and str(raw).strip():
		try:
			frozen = json.loads(raw)
		except json.JSONDecodeError as err:
			frappe.log_error(
				message=f"Panel Action {aid!r}: {err}\n{str(raw)[:2000]!r}",
				title="panel_action_invalid_json",
			)
			frappe.throw(
				_("Panel Action schema is invalid. Use 'Capture from Desk' on the Panel Action row.")
			)

	buttons = sorted(
		[b.as_dict() for b in (doc.buttons or [])],
		key=lambda b: (cint(b.get("sort_order")), cint(b.get("idx")), cstr(b.get("name") or "")),
	)
	related_doctypes = [r.as_dict() for r in (doc.related_doctypes or [])]

	return {
		"name": doc.name,
		"title": cstr(doc.label) or doc.name,
		"target_doctype": cstr(doc.target_doctype),
		"dialog_size": cstr(doc.dialog_size) or "xl",
		"frozen_meta": frozen,
		"writeback_on_submit": cint(doc.writeback_on_submit) or 0,
		"submit_hide_if": (cstr(doc.submit_hide_if) or "").strip() or "Never",
		"submit_hide_if_sql": (cstr(doc.submit_hide_if_sql) or "").strip(),
		"custom_presubmit_script": (cstr(doc.custom_presubmit_script) or "").strip(),
		"submit_label": cstr(getattr(doc, "submit_label", None) or "").strip(),
		"on_submit_method": cstr(getattr(doc, "on_submit_method", None) or "").strip(),
		"buttons": buttons,
		"related_doctypes": related_doctypes,
		"tab_notes": [],
	}
