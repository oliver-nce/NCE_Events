from __future__ import annotations

import re

import frappe
from frappe.model.document import Document
from frappe.utils import cstr

from nce_events.api.panel_api_pkg.page_panel_lookup import generate_auto_page_panel_name
from nce_events.api.panel_api_pkg.sql import build_panel_sql

# Desk route for unsaved Page Panel forms (see browser URL ``…/new-page-panel-…``).
_DESK_NEW_ROUTE = re.compile(r"^new-page-panel[\w-]*$", re.I)


class PagePanel(Document):
	def before_validate(self):
		"""Apply prompt id before Frappe validate_naming.

		Unsaved rows keep ``name`` as the temporary route ``new-page-panel-…``; the
		chosen id is in ``__newname``. Reading only ``name`` skips assignment and can
		yield ``Page Panel`` when ``root_doctype`` is Page Panel (singleton naming rule).
		"""
		if (self.meta.autoname or "").strip() != "prompt":
			return
		if not self.is_new():
			return

		rt = (self.root_doctype or "").strip()
		newnm = cstr(self.get("__newname") or "").strip()
		cur = cstr(self.name or "").strip()
		if cur and _DESK_NEW_ROUTE.match(cur):
			cur = ""

		final = (newnm or cur).strip()
		if final == self.doctype:
			final = ""

		if not final:
			if rt:
				self.name = generate_auto_page_panel_name(rt) if rt == self.doctype else rt
			return

		self.name = final

	def before_save(self):
		if not self.header_text:
			self.header_text = self.root_doctype

	def after_save(self):
		if self.root_doctype:
			build_panel_sql(self.root_doctype)
