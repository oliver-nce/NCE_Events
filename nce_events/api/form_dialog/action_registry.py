"""
Allow-listed server methods for Form Dialog portal row buttons.

Portal actions may only call methods registered here. The runner resolves
``dotted_path`` via ``frappe.get_attr`` at call time (no import of target modules).
"""

from __future__ import annotations

from typing import Any

import frappe

from ._helpers import _require_system_manager

PORTAL_ACTION_METHODS: dict[str, dict[str, Any]] = {
	"execute_product_exchange": {
		"key": "execute_product_exchange",
		"label": "Switch Event (WooCommerce Exchange)",
		"dotted_path": "nce_events.api.exchange.execute_product_exchange",
		"applies_to_doctypes": ["Enrollments"],
		"applies_to_root_doctypes": ["Enrollments"],
		"args": [
			{
				"arg": "enrollment_name",
				"label": "Enrollment (Order Item)",
				"fieldtype": "Data",
				"default_source": "row",
				"default_field": "name",
				"reqd": 1,
			},
			{
				"arg": "new_product_id",
				"label": "New Event",
				"fieldtype": "Link",
				"options": "Events",
				"default_source": "prompt",
				"reqd": 1,
			},
		],
	},
}


def get_action_method_spec(key: str) -> dict[str, Any] | None:
	k = (key or "").strip()
	if not k:
		return None
	spec = PORTAL_ACTION_METHODS.get(k)
	if not spec:
		return None
	return dict(spec)


def list_action_method_specs() -> list[dict[str, Any]]:
	return [dict(v) for v in PORTAL_ACTION_METHODS.values()]


@frappe.whitelist()
def list_portal_action_methods() -> list[dict[str, Any]]:
	_require_system_manager()
	return list_action_method_specs()
