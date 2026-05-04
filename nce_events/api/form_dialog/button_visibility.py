"""
Evaluate Form Dialog custom button visibility (hide rules) for the V2 footer.

Hide-if modes (mutually exclusive on each Form Dialog Button row):

- ``never``: button always shown
- ``not_saved``: hide when the root document has no saved name (new / not in DB)
- ``saved``: hide when the root document has a name (saved)
- ``sql_expression``: hide when the SQL expression returns a truthy first column
  in the first row. Uses ``%(name)s`` for the root document name. Table tokens
  ``{{t:DocType Name}}`` expand to Frappe physical table names (``tab...``).
"""

from __future__ import annotations

import re
from typing import Any

import frappe
from frappe import _

# Stored Form Dialog Button.hide_if values (see form_dialog_button.json Select options)
HIDE_IF_NEVER = "Never"
HIDE_IF_NOT_SAVED = "Record not saved"
HIDE_IF_SAVED = "Record saved"
HIDE_IF_SQL = "SQL expression"

_FORBIDDEN_SQL = (
	"insert ",
	"update ",
	"delete ",
	"drop ",
	"alter ",
	"truncate ",
	"create ",
	"grant ",
	"revoke ",
	"exec ",
	"call ",
	"pragma ",
)

_TABLE_TOKEN_RE = re.compile(
	r"\{\{\s*t:([^}]+)\}\}",
	flags=re.IGNORECASE,
)


def validate_hide_if_sql(sql: str) -> str:
	"""
	Parse and validate a read-only SELECT for the Hide If SQL rule.

	Raises frappe.ValidationError on failure. Returns stripped SQL for storage.
	"""
	raw = (sql or "").strip()
	if not raw:
		frappe.throw(_("Hide SQL is empty."))

	lower = raw.lower()
	if not lower.startswith("select"):
		frappe.throw(_("Hide SQL must be a single SELECT statement."))

	if ";" in raw.rstrip(";"):
		frappe.throw(_("Hide SQL must not contain multiple statements (no semicolons)."))

	for bad in _FORBIDDEN_SQL:
		if bad in lower:
			frappe.throw(_("Hide SQL may only SELECT — disallowed keyword near {0}").format(bad.strip()))

	if "--" in raw or "/*" in raw:
		frappe.throw(_("Hide SQL must not contain SQL comments (-- or /*)."))

	# Light check: balanced parens
	if raw.count("(") != raw.count(")"):
		frappe.throw(_("Hide SQL has unbalanced parentheses."))

	expand_hide_if_sql_table_tokens(raw)  # validates {{t:...}} DocTypes exist
	return raw


def expand_hide_if_sql_table_tokens(sql: str) -> str:
	"""Replace ``{{t:DocType Name}}`` with `` `tab...` `` escaped table names."""

	def repl(match: re.Match[str]) -> str:
		dt = (match.group(1) or "").strip()
		if not dt:
			frappe.throw(_("Empty DocType in {{t:...}} token."))
		if not frappe.db.exists("DocType", dt):
			frappe.throw(_("Unknown DocType in {{t:...}}: {0}").format(dt))
		tn = frappe.db.get_table_name(dt)
		return f"`{tn}`"

	return _TABLE_TOKEN_RE.sub(repl, sql)


def _first_cell_truthy(rows: list[Any]) -> bool:
	if not rows:
		return False
	row = rows[0]
	if row is None:
		return False
	if isinstance(row, dict):
		if not row:
			return False
		v = next(iter(row.values()))
		return _truthy_scalar(v)
	if isinstance(row, (list, tuple)):
		if not len(row):
			return False
		return _truthy_scalar(row[0])
	return _truthy_scalar(row)


def _truthy_scalar(v: Any) -> bool:
	if v is None:
		return False
	if isinstance(v, (int, float)):
		return v != 0
	if isinstance(v, bool):
		return v
	if isinstance(v, bytes):
		return bool(v)
	s = str(v).strip().lower()
	if s in ("0", "false", "", "no", "none"):
		return False
	return True


def evaluate_sql_hide(sql: str, docname: str | None) -> bool:
	"""
	Return True if the button should be **hidden** (SQL says hide).

	On execution error, logs and returns True (fail closed).
	"""
	stripped = (sql or "").strip()
	if not stripped:
		return True

	try:
		expanded = expand_hide_if_sql_table_tokens(stripped)
		rows = frappe.db.sql(expanded, {"name": docname or ""}, as_dict=False)
	except Exception as err:
		frappe.log_error(
			title="form_dialog_button_hide_sql",
			message=f"{stripped[:500]!r}\n{docname!r}\n{err!s}",
		)
		return True

	return _first_cell_truthy(rows)


def _normalize_hide_if(raw: str | None) -> str:
	"""Accept historic short keys and Desk Select labels."""
	s = (raw or "").strip()
	if not s:
		return HIDE_IF_NEVER
	m = {
		"never": HIDE_IF_NEVER,
		"not_saved": HIDE_IF_NOT_SAVED,
		"saved": HIDE_IF_SAVED,
		"sql_expression": HIDE_IF_SQL,
	}
	key = s.lower()
	if key in m:
		return m[key]
	return s


def button_should_hide(
	hide_if: str | None,
	docname: str | None,
	hide_if_sql: str | None,
) -> bool:
	"""Return True if the custom button must be hidden."""
	raw = _normalize_hide_if(hide_if)
	if raw == HIDE_IF_NEVER:
		return False
	dn = (docname or "").strip()
	if raw == HIDE_IF_NOT_SAVED:
		return not bool(dn)
	if raw == HIDE_IF_SAVED:
		return bool(dn)
	if raw == HIDE_IF_SQL:
		return evaluate_sql_hide(hide_if_sql or "", docname)
	return False


@frappe.whitelist()
def get_form_dialog_button_hidden_map(form_dialog: str, docname: str | None = None) -> dict[str, bool]:
	"""
	For each Form Dialog Button child row, return whether the button is hidden.

	:param form_dialog: Form Dialog document name (same as ``get_form_dialog_definition``).
	:param docname: Root document name, or empty/None for a new unsaved record.

	:returns: Mapping of child row ``name`` -> ``True`` if the button should be hidden.
	"""
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)

	name = (form_dialog or "").strip()
	if not name:
		frappe.throw(_("Missing form_dialog"))

	prev = frappe.flags.ignore_permissions
	frappe.flags.ignore_permissions = True
	try:
		doc = frappe.get_doc("Form Dialog", name)
	finally:
		frappe.flags.ignore_permissions = prev

	if not frappe.utils.cint(doc.is_active):
		frappe.throw(_("This Form Dialog is not active."), frappe.PermissionError)

	out: dict[str, bool] = {}
	for row in doc.buttons or []:
		rn = getattr(row, "name", None)
		if not rn:
			continue
		out[str(rn)] = button_should_hide(
			getattr(row, "hide_if", None),
			docname,
			getattr(row, "hide_if_sql", None),
		)
	return out
