"""
Validate and evaluate Form Dialog related-tab edit conditions (implicit IF SQL).

Empty expression => editing always allowed. Truthy IF result => disable edit/add/remove.
"""

from __future__ import annotations

import re
from typing import Any

import frappe
from frappe import _
from frappe.utils import cstr

from nce_events.utils.sql_table import physical_table_name

from .button_visibility import _FORBIDDEN_SQL, _first_cell_truthy

_LABEL_TOKEN_RE = re.compile(
	r"(?:`([^`]+)`|\[([^\]]+)\])",
)


def validate_edit_condition(expr: str, root_doctype: str) -> str:
	"""Parse and dry-run an implicit IF condition against the root table."""
	raw = (expr or "").strip().rstrip(";").strip()
	if not raw:
		return ""
	low = raw.lower()
	if ";" in raw:
		frappe.throw(_("Edit condition must be a single expression (no semicolons)."))
	if "--" in raw or "/*" in raw:
		frappe.throw(_("Edit condition must not contain SQL comments."))
	for bad in _FORBIDDEN_SQL:
		if bad in (" " + low + " "):
			frappe.throw(_("Edit condition may not contain '{0}'.").format(bad.strip()))
	if low.startswith("select") or " from " in (" " + low + " "):
		frappe.throw(_("Enter only the condition (implicit IF) — no SELECT/FROM."))
	if raw.count("(") != raw.count(")"):
		frappe.throw(_("Edit condition has unbalanced parentheses."))
	table = physical_table_name(root_doctype)
	probe = f"SELECT IF({raw}, 1, 0) FROM `{table}` WHERE name = %(name)s LIMIT 1"
	try:
		frappe.db.sql(probe, {"name": "__nce_probe__"}, as_dict=False)
	except Exception as err:
		frappe.throw(_("Edit condition failed to compile: {0}").format(cstr(err)[:300]))
	return raw


def evaluate_edit_condition(expr: str, root_doctype: str, root_name: str | None) -> bool:
	"""Return True when editing is allowed for the root document."""
	raw = (expr or "").strip().rstrip(";").strip()
	if not raw:
		return True
	dn = (root_name or "").strip()
	if not dn:
		return False
	table = physical_table_name(root_doctype)
	sql = f"SELECT IF({raw}, 1, 0) FROM `{table}` WHERE name = %(name)s LIMIT 1"
	try:
		rows = frappe.db.sql(sql, {"name": dn}, as_dict=False)
	except Exception as err:
		frappe.log_error(
			title="form_dialog_edit_condition",
			message=f"{raw[:300]!r}\n{dn!r}\n{err!s}",
		)
		return False
	return not _first_cell_truthy(rows)


def _standard_edit_condition_fields() -> list[dict[str, str]]:
	return [
		{"fieldname": fn, "label": fn, "fieldtype": "Data"}
		for fn in ("name", "docstatus", "owner", "modified", "creation")
	]


def _edit_condition_fieldnames_for_root(root_dt: str) -> list[str]:
	"""Union of column_order + search_fields across Page Panels for root_dt."""
	from nce_events.api.panel_api_pkg._helpers import _parse_csv

	panels = frappe.get_all(
		"Page Panel",
		filters={"root_doctype": root_dt},
		fields=["column_order", "search_fields"],
	)
	fns: list[str] = []
	for p in panels:
		for fn in _parse_csv(p.get("column_order")) + _parse_csv(p.get("search_fields")):
			if fn and fn not in fns:
				fns.append(fn)
	return fns


def _edit_condition_label_map(root_dt: str) -> dict[str, str]:
	"""Map field label (exact) -> fieldname for eligible picker fields."""
	meta = frappe.get_meta(root_dt)
	out: dict[str, str] = {}
	for std in ("name", "docstatus", "owner", "modified", "creation"):
		out[std] = std
	for fn in _edit_condition_fieldnames_for_root(root_dt):
		df = meta.get_field(fn)
		if not df:
			continue
		label = cstr(df.label or fn).strip()
		if label and label not in out:
			out[label] = fn
	return out


def resolve_edit_condition_labels(expr: str, root_doctype: str) -> str:
	"""
	Replace delimited label tokens (`Label` or [Label]) with fieldnames.

	String literals are masked before replacement so quoted labels are untouched.
	"""
	raw = (expr or "").strip()
	if not raw:
		return ""
	label_map = _edit_condition_label_map(root_doctype)
	if not label_map:
		return raw

	literals: list[str] = []

	def mask_lit(match: re.Match[str]) -> str:
		literals.append(match.group(0))
		return f"__NCE_LIT_{len(literals) - 1}__"

	masked = re.sub(r"'(?:[^'\\]|\\.)*'", mask_lit, raw)

	def repl(match: re.Match[str]) -> str:
		label = (match.group(1) or match.group(2) or "").strip()
		if not label:
			return match.group(0)
		fn = label_map.get(label)
		if not fn:
			frappe.throw(_("Unknown field label in edit condition: {0}").format(label))
		return fn

	resolved = _LABEL_TOKEN_RE.sub(repl, masked)
	for i, lit in enumerate(literals):
		resolved = resolved.replace(f"__NCE_LIT_{i}__", lit)
	return resolved


@frappe.whitelist()
def get_edit_condition_fields(form_dialog: str) -> list[dict[str, Any]]:
	"""Root-doctype fields eligible for the edit-condition field picker."""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)

	fd_name = cstr(form_dialog or "").strip()
	if not fd_name:
		return []

	fd = frappe.get_doc("Form Dialog", fd_name)
	root_dt = cstr(fd.target_doctype or "").strip()
	if not root_dt:
		return []

	meta = frappe.get_meta(root_dt)
	out: list[dict[str, Any]] = []
	seen: set[str] = set()
	for std in _standard_edit_condition_fields():
		out.append(std)
		seen.add(std["fieldname"])
	for fn in _edit_condition_fieldnames_for_root(root_dt):
		df = meta.get_field(fn)
		if not df or fn in seen:
			continue
		seen.add(fn)
		out.append(
			{
				"fieldname": fn,
				"label": cstr(df.label or fn),
				"fieldtype": cstr(df.fieldtype or ""),
			}
		)
	return out
