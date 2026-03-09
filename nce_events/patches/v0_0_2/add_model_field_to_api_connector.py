"""Add model field to API Connector so each provider can set its default model."""
import frappe


def execute():
	if not frappe.db.table_exists("tabAPI Connector"):
		return
	if frappe.db.exists("Custom Field", {"dt": "API Connector", "fieldname": "model"}):
		return

	frappe.get_doc(
		{
			"doctype": "Custom Field",
			"dt": "API Connector",
			"fieldname": "model",
			"label": "Model",
			"fieldtype": "Data",
			"description": "Default model for this provider (e.g. claude-sonnet-4-20250514). Leave blank to use built-in default.",
			"insert_after": "password",
		}
	).insert(ignore_permissions=True)
	frappe.db.commit()
