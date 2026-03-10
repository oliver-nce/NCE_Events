"""Add credential_config field to API Connector for storing credential mapping JSON."""
import frappe


def execute():
	if not frappe.db.table_exists("tabAPI Connector"):
		return
	if frappe.db.exists("Custom Field", {"dt": "API Connector", "fieldname": "credential_config"}):
		return

	frappe.get_doc(
		{
			"doctype": "Custom Field",
			"dt": "API Connector",
			"fieldname": "credential_config",
			"label": "Credential Config",
			"fieldtype": "Code",
			"options": "JSON",
			"description": "AI-generated JSON — describes which credential fields this connector uses and how they map to the API.",
			"insert_after": "model",
		}
	).insert(ignore_permissions=True)
	frappe.db.commit()
