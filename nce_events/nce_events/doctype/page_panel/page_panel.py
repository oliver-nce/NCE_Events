from __future__ import annotations

import re

import frappe
from frappe.model.document import Document
from frappe.utils import cstr

from nce_events.api.panel_api_pkg.page_panel_lookup import generate_auto_page_panel_name
from nce_events.api.panel_api_pkg.sql import build_panel_sql_for_doc

# Desk route for unsaved Page Panel forms (browser URL ``…/new-page-panel-…``).
_DESK_NEW_ROUTE = re.compile(r"^new-page-panel[\w-]*$", re.I)


class PagePanel(Document):
	def autoname(self):
		"""Run inside Frappe's set_new_name(), before validate_naming().

		For prompt autoname Frappe reads self.__newname and calls validate_name()
		which throws when name == doctype.  We intercept here to:
		  - strip Frappe's temp route value (new-page-panel-…)
		  - default an empty name to root_doctype (legacy behaviour)
		  - generate a safe id when root_doctype == this DocType (Page Panel)
		"""
		rt = (self.root_doctype or "").strip()
		newnm = cstr(self.get("__newname") or "").strip()

		# Frappe sometimes puts the temp URL route in __newname — treat as unset
		if newnm and _DESK_NEW_ROUTE.match(newnm):
			newnm = ""

		# Never allow name == doctype (Frappe rejects singleton-style naming)
		if newnm == self.doctype:
			newnm = ""

		# Default to root_doctype; use generated id when root is this DocType
		if not newnm:
			if rt:
				newnm = generate_auto_page_panel_name(rt) if rt == self.doctype else rt

		if newnm:
			self.__newname = newnm
			self.name = newnm

	def before_save(self):
		if not self.header_text:
			self.header_text = self.root_doctype

	def after_save(self):
		if self.root_doctype:
			sql = build_panel_sql_for_doc(self)
			if sql:
				self.panel_sql = sql
