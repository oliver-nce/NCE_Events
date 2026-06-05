from __future__ import annotations

import json
import re

import frappe
from frappe import _


_TOKEN_RE = re.compile(r"\b([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?\b")


def _build_resolution_maps(root_doctype: str) -> tuple[dict, dict, set]:
	"""Returns (root_fields, related_lookup, sql_keywords) for resolving references.

	- root_fields: { fieldname_lower: actual_fieldname } from root meta
	- related_lookup: { related_dt_lower: (link_fieldname, related_dt_name) }
	  Only populated when exactly one link points to that DocType.
	"""
	meta = frappe.get_meta(root_doctype)
	root_fields = {f.fieldname.lower(): f.fieldname for f in meta.fields if f.fieldname}
	root_fields["name"] = "name"

	by_target: dict[str, list[str]] = {}
	for f in meta.fields:
		if f.fieldtype == "Link" and f.options:
			by_target.setdefault(f.options, []).append(f.fieldname)

	related_lookup: dict = {}
	for target_dt, link_fields in by_target.items():
		if len(link_fields) == 1:
			related_lookup[target_dt.lower()] = (link_fields[0], target_dt)

	sql_keywords = {
		"and",
		"or",
		"not",
		"null",
		"is",
		"in",
		"between",
		"like",
		"true",
		"false",
		"case",
		"when",
		"then",
		"else",
		"end",
		"if",
		"exists",
		"any",
		"all",
	}
	return root_fields, related_lookup, sql_keywords


def _rewrite_condition(condition_sql: str, root_doctype: str) -> str:
	"""Rewrite friendly references to match the derived ``( panel_sql ) AS rows`` columns.

	The wrapped ``panel_sql`` already exposes every shown/search column with its
	display alias, so we never qualify with ``tabRoot`` or inject joins — we only
	point dotted references at the matching alias:

	- bare ``fieldname``      → left untouched (root columns are bare in panel_sql)
	- ``RelatedDT.field``     → `` `linkfield.field` `` (mapped via the single Link)
	- ``linkfield.field``     → `` `linkfield.field` `` (just backticked)

	Keywords, literals and function calls are left alone. Anything that doesn't
	resolve to a real column simply fails validation with "Unknown column", which
	is exactly the shown/search-only guarantee.
	"""
	root_fields, related_lookup, keywords = _build_resolution_maps(root_doctype)

	def repl(m: re.Match) -> str:
		left = m.group(1)
		right = m.group(2)
		left_l = left.lower()

		if right is None:
			# Bare token: root columns are bare in panel_sql, so leave as-is.
			return m.group(0)

		if left_l in related_lookup:
			link_fn, _target_dt = related_lookup[left_l]
			return f"`{link_fn}.{right}`"

		if left_l in root_fields:
			return f"`{root_fields[left_l]}.{right}`"

		return m.group(0)

	return _TOKEN_RE.sub(repl, condition_sql)


def _referenced_field_keys(condition_sql: str, root_doctype: str) -> set[str]:
	"""Display keys referenced by an expression (lowercased).

	- bare root field            → ``fieldname``
	- ``RelatedDT.field``        → ``<linkfield>.field`` (mapped via the single Link)
	- ``linkfield.child``        → ``linkfield.child``

	Quoted string literals are stripped first so values aren't mistaken for
	field references. Used to enforce the shown/search-only restriction; the keys
	line up with how columns are stored in ``column_order`` / ``search_fields``.
	"""
	root_fields, related_lookup, keywords = _build_resolution_maps(root_doctype)
	expr = re.sub(r"'[^']*'", "", condition_sql or "")
	expr = re.sub(r'"[^"]*"', "", expr)

	keys: set[str] = set()
	for m in _TOKEN_RE.finditer(expr):
		left = m.group(1)
		right = m.group(2)
		ll = left.lower()
		if right is None:
			if ll in keywords:
				continue
			if ll in root_fields:
				keys.add(ll)
		else:
			if ll in related_lookup:
				link_fn, _dt = related_lookup[ll]
				keys.add(f"{link_fn}.{right}".lower())
			elif ll in root_fields:
				keys.add(f"{ll}.{right}".lower())
	return keys


def build_format_case_columns(
	root_doctype: str,
	format_rules: list[dict],
	allowed_fields: set[str] | None = None,
) -> list[str]:
	"""Build ``CASE WHEN (...) THEN 1 ELSE 0 END AS `_fmt_<field>``` columns.

	These are folded into the single data fetch by wrapping ``panel_sql`` as a
	derived table (see ``get_panel_data``), so the flag value rides along in the
	cached row data — no separate query, no render-time SQL. Flags are computed
	fresh on every fetch, so they can never go stale relative to the rules.

	Rules whose expression references fields outside ``allowed_fields`` (when
	provided) are skipped defensively, mirroring the Validate-time restriction.
	"""
	cols: list[str] = []
	for rule in format_rules:
		expr = (rule.get("condition_sql") or "").strip()
		field_name = (rule.get("field_name") or "").strip()
		if not expr or not field_name:
			continue
		if allowed_fields is not None and (
			_referenced_field_keys(expr, root_doctype) - allowed_fields
		):
			continue
		rewritten = _rewrite_condition(expr, root_doctype)
		flag = f"_fmt_{field_name.replace('.', '__')}"
		cols.append(f"CASE WHEN ({rewritten}) THEN 1 ELSE 0 END AS `{flag}`")
	return cols


@frappe.whitelist()
def validate_format_rule(
	root_doctype: str,
	field_name: str,
	condition_sql: str,
	allowed_fields: str | list | None = None,
) -> dict:
	"""Validate an expression by testing it against the panel's own query.

	The condition is rewritten to the derived-table column names and probed via
	``SELECT 1 FROM ( panel_sql ) AS rows WHERE (cond) LIMIT 1``. Because this is
	the exact construct used at render time, a passing validation guarantees the
	rule will evaluate at render. Referencing a column that isn't shown/search-only
	fails here with "Unknown column".

	When ``allowed_fields`` is supplied (shown ∪ search-only columns), a friendlier
	pre-check is run first so the user sees a clear message instead of a raw SQL
	error.

	Returns {ok: True, resolved_sql} or {ok: False, error}.
	"""
	if not frappe.has_permission("Page Panel", "write"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	condition_sql = (condition_sql or "").strip()
	if not condition_sql:
		return {"ok": False, "error": "Expression is empty."}

	if allowed_fields is not None:
		if isinstance(allowed_fields, str):
			try:
				allowed_list = json.loads(allowed_fields) if allowed_fields.strip() else []
			except (ValueError, TypeError):
				allowed_list = []
		else:
			allowed_list = allowed_fields
		allowed_set = {str(f).strip().lower() for f in (allowed_list or []) if str(f).strip()}
		missing = sorted(_referenced_field_keys(condition_sql, root_doctype) - allowed_set)
		if missing:
			return {
				"ok": False,
				"error": "Only shown or search-only columns may be referenced. Not allowed: "
				+ ", ".join(missing),
			}

	rewritten = _rewrite_condition(condition_sql, root_doctype)

	try:
		from nce_events.api.panel_api_pkg.panel_data import get_panel_config
		from nce_events.api.panel_api_pkg.sql import _build_panel_sql

		panel_sql, params = _build_panel_sql(
			root_doctype, config=get_panel_config(root_doctype)
		)
	except Exception as e:
		return {"ok": False, "error": f"Could not build panel query: {e}"}

	probe = f"SELECT 1 FROM ({panel_sql}) AS rows WHERE ({rewritten}) LIMIT 1"
	try:
		frappe.db.sql(probe, params)
		return {"ok": True, "resolved_sql": rewritten}
	except Exception as e:
		return {"ok": False, "error": str(e)}
