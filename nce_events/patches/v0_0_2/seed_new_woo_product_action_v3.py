"""Apply on_submit_method + submit_label and remove legacy Publish custom button.

Runs once per site. Idempotent: safe on empty or already-upgraded rows.

code-index:begin
{
 "purpose": "Applies on_submit_method and submit_label and removes legacy Publish custom button.",
 "read_when": "Fixing missing submit handler on new-woo-product Panel Action after upgrade.",
 "gotchas": [
  "Idempotent: safe on empty or already-upgraded rows."
 ],
 "keywords": ["new-woo-product", "on_submit_method", "submit_label", "Publish", "Panel Action"],
 "format": 1
}
code-index:end
"""

from __future__ import annotations

import frappe
from frappe.utils import cstr

ACTION_ID = "new-woo-product"
METHOD = "nce_events.api.events_publish.submit_new_woo_commerce_product"
SUBMIT_LABEL = "Publish to WooCommerce"


def execute() -> None:
	if not frappe.db.exists("Panel Action", ACTION_ID):
		from nce_events.patches.v0_0_2 import seed_new_woo_product_action

		seed_new_woo_product_action.execute()
		return

	pa = frappe.get_doc("Panel Action", ACTION_ID)
	changed = False
	if not cstr(getattr(pa, "on_submit_method", None) or "").strip():
		pa.on_submit_method = METHOD
		changed = True
	if not cstr(getattr(pa, "submit_label", None) or "").strip():
		pa.submit_label = SUBMIT_LABEL
		changed = True

	for row in list(pa.get("buttons") or []):
		bs = cstr(getattr(row, "button_script", None) or "")
		first = (bs.split() or [""])[0]
		if first == "publish_new_woo_commerce_product":
			pa.remove(row)
			changed = True

	if changed:
		pa.save(ignore_permissions=True)
	frappe.db.commit()
