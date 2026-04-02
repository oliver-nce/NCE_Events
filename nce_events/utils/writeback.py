from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cstr


@frappe.whitelist()
def writeback_fetched_fields(doctype: str, name: str) -> dict:
	"""
	Write back values of editable fetched fields to their source documents.

	Note: The panel Form Dialog uses nce_events.api.form_dialog_api.
	save_form_dialog_document(writeback_fetches=1) so linked records are
	updated server-side before the main Document.save(). This standalone
	method remains for batch/server callers that already hold a consistent
	doc from the database.

	When a document is saved, scan all fields for `fetch_from` patterns.
	For each editable fetched field (read_only == 0), read the current value
	from the source field on the linked document and write it back.

	Args:
	    doctype: The DocType of the document that was saved
	    name: The name of the document that was saved

	Returns:
	    dict with 'updated_count' key indicating number of fields written back
	"""
	try:
		doc = frappe.get_doc(doctype, name)
	except frappe.DoesNotExistError:
		frappe.log_error(
			_("writeback_fetched_fields: Document {doctype}/{name} not found").format(
				doctype=doctype, name=name
			),
			"writeback_error",
		)
		return {"updated_count": 0}

	meta = frappe.get_meta(doctype)
	updated_count = 0

	# Process root document fields
	updated_count += _writeback_root_fields(doc, meta)

	# Process child table fields
	for child_field in meta.get_table_fields():
		child_doctype = child_field.options
		child_table_field = child_field.fieldname

		if not doc.get(child_table_field):
			continue

		for row in doc.get(child_table_field):
			try:
				child_meta = frappe.get_meta(child_doctype)
				updated_count += _writeback_root_fields(row, child_meta)
			except Exception as e:
				frappe.log_error(
					_("writeback_fetched_fields: Error processing child table {table}: {error}").format(
						table=child_doctype, error=cstr(e)
					),
					"writeback_error",
				)
				continue

	return {"updated_count": updated_count}


def _writeback_root_fields(doc, meta) -> int:
	"""Process fetched fields on a single document/row (root or child table row)."""
	updated_count = 0

	for field in meta.fields:
		# Only process fields with fetch_from and that are editable
		if not field.fetch_from or field.read_only:
			continue

		try:
			# fetch_from format: "link_field.source_field"
			link_field_name, source_field_name = field.fetch_from.split(".", 1)

			# Get the Link field's meta to find the target DocType
			link_field_meta = meta.get_field(link_field_name)
			if not link_field_meta or link_field_meta.fieldtype != "Link":
				continue

			target_doctype = link_field_meta.options
			if not target_doctype:
				continue

			# Get the linked document name
			target_docname = doc.get(link_field_name)
			if not target_docname:
				# No linked document, nothing to write back to
				continue

			# Check write permission on target document
			if not frappe.has_permission(target_doctype, "write", target_docname):
				frappe.log_error(
					_("writeback_fetched_fields: No write permission on {doctype}/{name}").format(
						doctype=target_doctype, name=target_docname
					),
					"writeback_error",
				)
				continue

			# Get the current value of the fetched field on the current doc
			current_value = doc.get(field.fieldname)
			if current_value is None:
				current_value = ""

			# Read the current value on the target document for that field
			target_doc = frappe.get_doc(target_doctype, target_docname)
			source_value = target_doc.get(source_field_name)
			if source_value is None:
				source_value = ""

			# Only write back if values differ
			if cstr(current_value) != cstr(source_value):
				frappe.db.set_value(
					target_doctype, target_docname, source_field_name, current_value, update_modified=True
				)
				updated_count += 1

		except Exception as e:
			frappe.log_error(
				_(
					"writeback_fetched_fields: Error processing field {field} on {doctype}/{name}: {error}"
				).format(field=field.fieldname, doctype=doc.doctype, name=doc.name, error=cstr(e)),
				"writeback_error",
			)
			continue

	return updated_count
