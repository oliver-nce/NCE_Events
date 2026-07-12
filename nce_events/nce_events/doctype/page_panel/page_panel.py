from __future__ import annotations

import re
from typing import Any

import frappe
from frappe.model.document import Document
from frappe.utils import cstr

from nce_events.api.panel_api_pkg.page_panel_lookup import generate_auto_page_panel_name
from nce_events.api.panel_api_pkg.sql import build_panel_sql_for_doc

# Desk route for unsaved Page Panel forms (browser URL ``…/new-page-panel-…``).
_DESK_NEW_ROUTE = re.compile(r"^new-page-panel[\w-]*$", re.I)


def _compute_panel_sql(doc: Any) -> str:
	"""Compute panel SQL from doc without writing to the database.

	Used in before_save so the correct SQL is part of the main DB write
	and included in the save response (generating in after_save means the
	response reflects the pre-hook value, leaving the form showing blank SQL).
	"""
	from nce_events.api.panel_api_pkg.panel_config import _panel_config_from_doc
	from nce_events.api.panel_api_pkg.sql import _build_panel_sql

	root_doctype = (getattr(doc, "root_doctype", None) or "").strip()
	if not root_doctype:
		return ""
	config = _panel_config_from_doc(doc)
	sql, _ = _build_panel_sql(root_doctype, config=config)
	return sql


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
		self.format_rules = [
			row
			for row in (self.format_rules or [])
			if (row.field_name or "").strip() and (row.condition_sql or "").strip()
		]
		# Regenerate panel_sql before the DB write so the save response always
		# carries the correct SQL. Generating only in after_save causes the
		# response to carry the pre-hook value, leaving the form showing blank SQL.
		if self.root_doctype:
			try:
				sql = _compute_panel_sql(self)
				if sql:
					self.panel_sql = sql
			except Exception:
				pass  # never block saves on SQL generation errors

	def after_save(self):
		if self.root_doctype:
			# Belt-and-suspenders: keep DB in sync for programmatic saves that
			# bypass the Desk form (no JS before_save clearing panel_sql).
			sql = build_panel_sql_for_doc(self)
			if sql:
				self.panel_sql = sql
