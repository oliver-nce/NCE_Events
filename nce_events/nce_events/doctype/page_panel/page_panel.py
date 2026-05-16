import frappe
from frappe.model.document import Document

from nce_events.api.panel_api_pkg.page_panel_lookup import generate_auto_page_panel_name
from nce_events.api.panel_api_pkg.sql import build_panel_sql


class PagePanel(Document):
	def validate(self):
		# Prompt naming: default id to root DocType (legacy behaviour). When root is this DocType,
		# name cannot equal "Page Panel" — use generated id instead.
		if self.is_new():
			rt = (self.root_doctype or "").strip()
			if rt and not (self.name or "").strip():
				self.name = (
					generate_auto_page_panel_name(rt)
					if rt == self.doctype
					else rt
				)

	def before_save(self):
		if not self.header_text:
			self.header_text = self.root_doctype

	def after_save(self):
		if self.root_doctype:
			build_panel_sql(self.root_doctype)
