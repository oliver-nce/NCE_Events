import frappe
from frappe.model.document import Document

from nce_events.api.panel_api import build_panel_sql


class PagePanel(Document):
	def before_save(self):
		if not self.header_text:
			self.header_text = self.root_doctype

	def after_save(self):
		if self.root_doctype:
			build_panel_sql(self.root_doctype)
