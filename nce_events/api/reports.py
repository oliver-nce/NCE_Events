import frappe
from frappe import _


def _title_case(fieldname):
	return fieldname.replace("_", " ").title()


@frappe.whitelist()
def create_or_update_report(header_text, frappe_query, existing_report_name=None, ref_doctype=None):
	"""Create or update a Query Report from a translated Frappe SQL query."""
	if not frappe_query:
		frappe.throw(_("Frappe Query is empty — translate or enter SQL first."))

	report_name = (existing_report_name or "").strip() or (header_text.strip() + " Panel")

	if frappe.db.exists("Report", report_name):
		doc = frappe.get_doc("Report", report_name)
		doc.query = frappe_query
		doc.save(ignore_permissions=True)
		return {"report_name": report_name, "action": "updated"}
	else:
		doc = frappe.new_doc("Report")
		doc.report_name = report_name
		doc.report_type = "Query Report"
		doc.is_standard = "No"
		doc.ref_doctype = ref_doctype or "DocType"
		doc.query = frappe_query
		doc.insert(ignore_permissions=True)
		return {"report_name": report_name, "action": "created"}


@frappe.whitelist()
def get_report_columns(report_name):
	"""Return column definitions from a Query Report with proper labels."""
	report = frappe.get_doc("Report", report_name)
	if report.report_type != "Query Report":
		frappe.throw(_("{0} is not a Query Report").format(report_name))

	result = frappe.desk.query_report.run(report_name, filters={})
	raw_columns = result.get("columns", [])

	out = []
	for c in raw_columns:
		if isinstance(c, dict):
			fn = c.get("fieldname") or c.get("field") or ""
			label = c.get("label") or _title_case(fn)
		elif isinstance(c, str):
			parts = c.split(":")
			label = parts[0].strip()
			fn = label.lower().replace(" ", "_")
		else:
			fn = str(c)
			label = _title_case(fn)
		out.append({"fieldname": fn, "label": label})
	return out
