"""Generic server-side evaluation of MariaDB scalar SQL against a row dict.

Used by client scripts (e.g. Form Dialog button code) via whitelisted methods.
Expressions must come from **trusted** configuration (e.g. WP Tables), not end-user text.

This module does not reference any specific DocType or WooCommerce — callers supply
``expressions``, ``row``, and ``token_allowlist``.
"""

from __future__ import annotations

import re
from typing import Any

import frappe


def split_sql_code_and_string_literals(expression: str) -> list[tuple[str, str]]:
	"""
	Split ``expression`` into alternating (``"code"``, text) and (``"str"``, text) segments.
	String literals use single quotes; ``''`` is an escaped quote inside a string.
	"""
	out: list[tuple[str, str]] = []
	i = 0
	n = len(expression)
	buf: list[str] = []
	in_str = False

	while i < n:
		ch = expression[i]
		if in_str:
			if ch == "'" and i + 1 < n and expression[i + 1] == "'":
				buf.append("''")
				i += 2
				continue
			if ch == "'":
				in_str = False
				out.append(("str", "".join(buf)))
				buf = []
				i += 1
				continue
			buf.append(ch)
			i += 1
			continue
		if ch == "'":
			if buf:
				out.append(("code", "".join(buf)))
				buf = []
			in_str = True
			i += 1
			continue
		buf.append(ch)
		i += 1

	if buf:
		out.append(("code" if not in_str else "str", "".join(buf)))
	return out


def substitution_token_allowlist_for_doctype(doctype: str) -> frozenset[str]:
	"""Fieldnames (plus ``name``) allowed as bindable row tokens for SQL substitution."""
	meta = frappe.get_meta(doctype)
	names: set[str] = set()
	for df in meta.fields:
		fn = getattr(df, "fieldname", None) or ""
		if fn:
			names.add(fn)
	names.add("name")
	return frozenset(names)


def _substitute_row_tokens_in_code(
	code: str,
	row: dict[str, Any],
	token_allowlist: frozenset[str],
	params: dict[str, Any],
) -> str:
	"""Replace ``\\b<token>\\b`` with ``%(token)s`` only for tokens in ``token_allowlist`` (case-sensitive)."""
	out = code
	for fn in sorted(token_allowlist, key=len, reverse=True):
		pat = r"\b" + re.escape(fn) + r"\b"
		repl = "%(" + fn + ")s"
		out_new = re.sub(pat, repl, out)
		if out_new != out:
			if fn not in params:
				params[fn] = row.get(fn)
		out = out_new
	return out


def evaluate_sql_expressions(
	expressions: dict[str, str],
	row: dict[str, Any],
	token_allowlist: frozenset[str],
) -> dict[str, Any]:
	"""
	Evaluate ``expressions`` as a single ``SELECT … FROM DUAL``.

	:param expressions: Map **result column alias** → **scalar SQL** using bare identifiers
		for row keys; only identifiers in ``token_allowlist`` are bound from ``row``.
	:param row: Values bound into the SQL (typically a draft document dict).
	:param token_allowlist: Allowed identifier names for substitution (e.g. from
		:func:`substitution_token_allowlist_for_doctype`).

	Expressions are concatenated into one ``SELECT``; string literals in each expression
	are not subject to token substitution.
	"""
	if not expressions:
		return {}

	select_parts: list[str] = []
	merged_params: dict[str, Any] = {}

	for alias, expr in expressions.items():
		expr = (expr or "").strip()
		if not expr:
			continue
		pieces: list[str] = []
		for kind, text in split_sql_code_and_string_literals(expr):
			if kind == "str":
				pieces.append("'" + text.replace("'", "''") + "'")
			else:
				pieces.append(_substitute_row_tokens_in_code(text, row, token_allowlist, merged_params))
		sub_expr = "".join(pieces)
		safe_alias = str(alias).replace("`", "")
		select_parts.append(f"({sub_expr}) AS `{safe_alias}`")

	if not select_parts:
		return {}

	sql = "SELECT " + ", ".join(select_parts) + " FROM DUAL"
	try:
		res = frappe.db.sql(sql, merged_params, as_dict=True)
	except Exception as e:
		frappe.throw(frappe._("SQL evaluation failed: {0}").format(str(e)))
	if not res:
		return {}
	return {k: v for k, v in res[0].items()}


@frappe.whitelist()
def evaluate_sql_expressions_api(
	expressions: dict[str, str] | str,
	row: dict[str, Any] | str,
	token_allowlist: list[str] | str | None = None,
	reference_doctype: str | None = None,
) -> dict[str, Any]:
	"""
	Whitelisted API: same as :func:`evaluate_sql_expressions`.

	Pass either ``token_allowlist`` (list of allowed bindable names) **or**
	``reference_doctype`` (DocType name) to derive the allowlist from meta.

	``expressions`` and ``row`` may be JSON strings from ``frappe.call``.
	"""
	expressions = frappe.parse_json(expressions) if isinstance(expressions, str) else dict(expressions)
	row = frappe.parse_json(row) if isinstance(row, str) else dict(row)

	allow: frozenset[str]
	if token_allowlist is not None:
		tl = frappe.parse_json(token_allowlist) if isinstance(token_allowlist, str) else token_allowlist
		if not isinstance(tl, (list, tuple)):
			frappe.throw(frappe._("token_allowlist must be a list of strings."))
		allow = frozenset(str(x) for x in tl if str(x).strip())
	elif reference_doctype:
		allow = substitution_token_allowlist_for_doctype(str(reference_doctype).strip())
	else:
		frappe.throw(frappe._("Provide token_allowlist or reference_doctype."))

	return evaluate_sql_expressions(expressions, row, allow)


@frappe.whitelist()
def get_substitution_token_allowlist(doctype: str) -> list[str]:
	"""Return sorted list of fieldnames (plus ``name``) safe to bind for ``doctype``."""
	dt = (doctype or "").strip()
	if not dt:
		frappe.throw(frappe._("doctype is required."))
	return sorted(substitution_token_allowlist_for_doctype(dt))
