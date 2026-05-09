from __future__ import annotations

from typing import Any

import frappe
from frappe import _
from frappe.utils import cstr

_PUBLIC_FIELDS: tuple[str, ...] = (
	"name",
	"action_id",
	"label",
	"sort_order",
	"action_type",
	"target_doctype",
	"form_dialog",
	"record_mode",
	"record_name",
	"client_handler",
)


def _user_role_set() -> frozenset[str]:
	return frozenset(frappe.get_roles(frappe.session.user))


@frappe.whitelist()
def get_panel_actions() -> list[dict[str, Any]]:
	"""Return enabled Panel Actions visible to the current user, sorted."""
	if not frappe.has_permission("Panel Action", "read"):
		return []

	rows = frappe.get_all(
		"Panel Action",
		filters={"enabled": 1},
		fields=list(_PUBLIC_FIELDS),
		order_by="sort_order asc, modified desc",
	)

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
