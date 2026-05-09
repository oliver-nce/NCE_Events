from __future__ import annotations

from typing import Any

import frappe

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
