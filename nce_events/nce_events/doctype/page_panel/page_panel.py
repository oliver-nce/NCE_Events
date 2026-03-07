import frappe
from frappe.model.document import Document


class PagePanel(Document):
	def before_save(self):
		if not self.header_text:
			self.header_text = self.root_doctype
