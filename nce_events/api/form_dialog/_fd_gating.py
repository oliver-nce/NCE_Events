"""Form Dialog gating helpers — WP Tables validation and permission guards."""

from __future__ import annotations

import frappe
from frappe import _


def _panel_required_value_empty(val: object) -> bool:
	"""Match client validatePanelRequiredFields / isMandatoryValueEmpty for root fields."""
	if val is None:
		return True
	if val == "":
		return True
	return False


def _assert_doctype_in_wp_tables(doctype: str) -> None:
	"""Raise if the DocType is not listed in WP Tables (nce_sync)."""
	if not frappe.get_all("WP Tables", filters={"frappe_doctype": doctype}, limit=1):
		frappe.throw(
			_("DocType '{0}' is not listed in WP Tables and cannot be used for Form Dialogs.").format(doctype)
		)


def _require_form_dialog_capture_schema_ready() -> None:
	"""Bench ``migrate`` must have applied Form Dialog child-table fields before capture/rebuild."""
	meta = frappe.get_meta("Form Dialog")
	for fn in ("inline_child_tables", "script_tool_groups"):
		if meta.get_field(fn) is None:
			frappe.throw(
				_(
					"Missing Form Dialog field '{0}' in site metadata — deploy the latest nce_events app "
					"then run '{1}'."
				).format(fn, "bench migrate"),
				title=_("Database update required"),
			)


def _require_system_manager() -> None:
	"""Raise if the current user is not System Manager."""
	if "System Manager" not in frappe.get_roles(frappe.session.user):
		frappe.throw(_("Only System Manager can manage Form Dialogs."), frappe.PermissionError)
