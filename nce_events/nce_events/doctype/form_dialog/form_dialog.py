import frappe
from frappe.model.document import Document


class FormDialog(Document):
    def validate(self):
        if self.target_doctype:
            _assert_doctype_in_wp_tables(self.target_doctype)


def _assert_doctype_in_wp_tables(doctype: str) -> None:
    """Raise if the DocType is not listed in WP Tables (nce_sync)."""
    if not frappe.get_all("WP Tables", filters={"frappe_doctype": doctype}, limit=1):
        frappe.throw(
            f"DocType '{doctype}' is not listed in WP Tables and cannot be used for Form Dialogs."
        )
