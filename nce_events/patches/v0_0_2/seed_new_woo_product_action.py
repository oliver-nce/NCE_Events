"""Seed the 'new-woo-product' Panel Action with an inline captured Form Dialog.

Idempotent. Re-runs are safe: if the row already exists, the patch leaves it
alone so admins can edit fields by hand.
"""

from __future__ import annotations

import json

import frappe

from nce_events.api.form_dialog._helpers import _enrich_fetch_from_fields

ACTION_ID = "new-woo-product"
TARGET_DOCTYPE = "New Woo Commerce Product"
_ON_SUBMIT = "nce_events.api.events_publish.submit_new_woo_commerce_product"
_SUBMIT_LABEL = "Publish to WooCommerce"


def execute() -> None:
	if frappe.db.exists("Panel Action", ACTION_ID):
		return

	if not frappe.db.exists("DocType", TARGET_DOCTYPE):
		frappe.log_error(
			title="seed_new_woo_product_action skipped",
			message=f"DocType '{TARGET_DOCTYPE}' not installed; skipping seed.",
		)
		return

	meta = frappe.get_meta(TARGET_DOCTYPE)
	fields_list = [f.as_dict() for f in meta.fields]
	fields_list = _enrich_fetch_from_fields(fields_list, meta)
	frozen_meta_json = json.dumps({"fields": fields_list}, default=str, indent=None)

	doc = frappe.get_doc(
		{
			"doctype": "Panel Action",
			"action_id": ACTION_ID,
			"label": "New Woo Commerce Product",
			"sort_order": 10,
			"enabled": 1,
			"action_type": "Form Dialog",
			"target_doctype": TARGET_DOCTYPE,
			"record_mode": "Singleton",
			"frozen_meta_json": frozen_meta_json,
			"captured_at": frappe.utils.now_datetime(),
			"dialog_size": "xl",
			"submit_hide_if": "Never",
			"writeback_on_submit": 0,
			"submit_label": _SUBMIT_LABEL,
			"on_submit_method": _ON_SUBMIT,
			"description": "V2 Actions: WooCommerce publish flow for the New Woo Commerce Product singleton.",
		}
	)
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
