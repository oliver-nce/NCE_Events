from __future__ import annotations

import frappe

ACTION_ID = "new-woo-product"
FORM_DIALOG_TITLE = "New Woo Commerce Product"
TARGET_DOCTYPE = "New Woo Commerce Product"


def execute() -> None:
	if frappe.db.exists("Panel Action", ACTION_ID):
		return
	fd_name = frappe.db.get_value("Form Dialog", {"title": FORM_DIALOG_TITLE}, "name")
	if not fd_name:
		frappe.log_error(
			title="seed_new_woo_product_action skipped",
			message=(
				f"Form Dialog with title '{FORM_DIALOG_TITLE}' not found. Capture it from Desk and re-run."
			),
		)
		return
	doc = frappe.get_doc(
		{
			"doctype": "Panel Action",
			"action_id": ACTION_ID,
			"label": "New Woo Commerce Product",
			"sort_order": 10,
			"enabled": 1,
			"action_type": "Form Dialog",
			"target_doctype": TARGET_DOCTYPE,
			"form_dialog": fd_name,
			"record_mode": "Singleton",
			"description": "V2 Actions: Form Dialog for New Woo Commerce Product singleton.",
		}
	)
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
