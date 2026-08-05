"""Desk permission helpers: read-only access for WP Tables DocTypes."""

from __future__ import annotations

import frappe
from frappe import _

READ_ONLY_ROLE_DEFAULT = "Read Only"


def _require_system_manager() -> None:
	if "System Manager" not in frappe.get_roles():
		frappe.throw(_("System Manager role required."), frappe.PermissionError)


def _has_read_perm(doctype: str, role: str) -> bool:
	if frappe.db.exists(
		"Custom DocPerm",
		{"parent": doctype, "role": role, "permlevel": 0, "read": 1},
	):
		return True
	return bool(
		frappe.get_all(
			"DocPerm",
			filters={"parent": doctype, "role": role, "permlevel": 0, "read": 1},
			limit=1,
		)
	)


def _grant_read(doctype: str, role: str) -> str:
	dt = (doctype or "").strip()
	if not dt:
		return "skip:empty"
	if not frappe.db.exists("DocType", dt):
		return f"skip:missing_doctype:{dt}"
	if _has_read_perm(dt, role):
		return f"already:{dt}"
	frappe.permissions.add_permission(dt, role, 0, "read")
	return f"added:{dt}"


def _doctype_from_wp_tables_row(row: dict) -> str:
	"""Resolve Frappe DocType name from a WP Tables row (link / NCE Name / doc name / table)."""
	return (
		(
			row.get("frappe_doctype")
			or row.get("nce_name")
			or row.get("name")
			or row.get("table_name")
			or ""
		)
		.strip()
	)


def doctypes_from_wp_tables(*, include_page_panel: bool = True) -> tuple[list[str], int]:
	"""Distinct DocType names for all WP Tables rows; returns (names, wp_tables_row_count)."""
	if not frappe.db.table_exists("WP Tables"):
		names = ["Page Panel"] if include_page_panel else []
		return names, 0

	rows = frappe.get_all(
		"WP Tables",
		fields=["name", "frappe_doctype", "nce_name", "table_name"],
		limit_page_length=0,
	)
	names = {_doctype_from_wp_tables_row(row) for row in rows}
	names.discard("")
	if include_page_panel:
		names.add("Page Panel")
	return sorted(names), len(rows)


def sync_wp_tables_read_permissions(
	role: str,
	*,
	commit: bool = True,
) -> dict:
	"""Grant Read on every WP Tables DocType (+ Page Panel) to ``role``. Idempotent."""
	role = (role or "").strip()
	if not role:
		frappe.throw(_("Role name is required."))
	if not frappe.db.exists("Role", role):
		frappe.throw(_("Role not found: {0}").format(role))

	doctypes, wp_tables_rows = doctypes_from_wp_tables()
	added: list[str] = []
	already: list[str] = []
	skipped: list[str] = []

	for dt in doctypes:
		result = _grant_read(dt, role)
		if result.startswith("added:"):
			added.append(dt)
		elif result.startswith("already:"):
			already.append(dt)
		else:
			skipped.append(result)

	if commit:
		frappe.db.commit()
		frappe.clear_cache(doctype="DocType")

	return {
		"role": role,
		"wp_tables_rows": wp_tables_rows,
		"doctypes_processed": len(doctypes),
		"added": added,
		"already_had_read": already,
		"skipped": skipped,
	}


@frappe.whitelist()
def grant_read_only_wp_tables(role: str = READ_ONLY_ROLE_DEFAULT) -> dict:
	"""Whitelisted: System Manager syncs WP Tables read perms for ``role``."""
	_require_system_manager()
	return sync_wp_tables_read_permissions(role, commit=True)
