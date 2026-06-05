from __future__ import annotations

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


def _resolve_references(condition_sql: str, root_doctype: str) -> str:
	"""Translate user-friendly references into qualified SQL.

	- bare `fieldname` → `` `tabRoot`.`fieldname` `` if it's a root field
	- `related_dt.fieldname` → `` `tabRelated`.`fieldname` ``

	Anything not matching is left alone (keywords, literals, function calls).
	"""
	root_fields, related_lookup, keywords = _build_resolution_maps(root_doctype)
	root_table = f"`tab{root_doctype}`"

	def repl(m: re.Match) -> str:
		left = m.group(1)
		right = m.group(2)
		left_l = left.lower()

		if right is None:
			if left_l in keywords:
				return m.group(0)
			if left_l in root_fields:
				return f"{root_table}.`{root_fields[left_l]}`"
			return m.group(0)

		if left_l in related_lookup:
			_, target_dt = related_lookup[left_l]
			return f"`tab{target_dt}`.`{right}`"

		if left_l in root_fields:
			meta = frappe.get_meta(root_doctype)
			for f in meta.fields:
				if f.fieldname.lower() == left_l and f.fieldtype == "Link" and f.options:
					return f"`tab{f.options}`.`{right}`"

		return m.group(0)

	return _TOKEN_RE.sub(repl, condition_sql)


def _format_rules_need_related_joins(root_doctype: str, format_rules: list) -> bool:
	"""True when any active rule references a table other than the root."""
	root_table = f"`tab{root_doctype}`"
	for rule in format_rules:
		expr = (rule.get("condition_sql") or "").strip()
		if not expr:
			continue
		try:
			resolved = _resolve_references(expr, root_doctype)
		except Exception:
			continue
		for token in re.findall(r"`tab([^`]+)`", resolved):
			if token != root_doctype:
				return True
		if resolved != root_table and "`tab" in resolved and root_table not in resolved:
			return True
	return False


def _append_format_rule_sql(
	root_doctype: str,
	config: dict,
	root_table: str,
	select_parts: list[str],
	join_clauses: list[str],
	seen_joins: set[str],
	link_targets: dict[str, str],
) -> None:
	"""Append CASE WHEN columns and any required JOINs for format rules."""
	format_rules = config.get("format_rules") or []
	if not format_rules:
		return

	_, related_lookup, _ = _build_resolution_maps(root_doctype)

	for rule in format_rules:
		expr = (rule.get("condition_sql") or "").strip()
		field_name = (rule.get("field_name") or "").strip()
		if not expr or not field_name:
			continue
		try:
			resolved = _resolve_references(expr, root_doctype)
		except Exception:
			continue

		flag = f"_fmt_{field_name.replace('.', '__')}"
		select_parts.append(f"CASE WHEN ({resolved}) THEN 1 ELSE 0 END AS `{flag}`")

		for _related_lower, (link_fn, target_dt) in related_lookup.items():
			target_table = f"`tab{target_dt}`"
			if target_table in resolved:
				join_key = f"_fmt_{target_dt}"
				if join_key not in seen_joins:
					join_clauses.append(
						f"LEFT JOIN {target_table} ON {root_table}.`{link_fn}` = {target_table}.`name`"
					)
					seen_joins.add(join_key)

		for link_fn, target_dt in link_targets.items():
			target_table = f"`tab{target_dt}`"
			if target_table in resolved and link_fn not in seen_joins:
				join_clauses.append(
					f"LEFT JOIN {target_table} ON {root_table}.`{link_fn}` = {target_table}.`name`"
				)
				seen_joins.add(link_fn)


@frappe.whitelist()
def validate_format_rule(root_doctype: str, field_name: str, condition_sql: str) -> dict:
	"""Resolve references and execute the expression against the root table with LIMIT 1.

	Returns {ok: True, resolved_sql} or {ok: False, error}.
	"""
	if not frappe.has_permission("Page Panel", "write"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	condition_sql = (condition_sql or "").strip()
	if not condition_sql:
		return {"ok": False, "error": "Expression is empty."}

	try:
		resolved = _resolve_references(condition_sql, root_doctype)
	except Exception as e:
		return {"ok": False, "error": f"Reference resolution failed: {e}"}

	root_table = f"`tab{root_doctype}`"

	join_clauses: list[str] = []
	seen: set[str] = set()
	_, related_lookup, _ = _build_resolution_maps(root_doctype)
	for _related_lower, (link_fn, target_dt) in related_lookup.items():
		if f"`tab{target_dt}`" in resolved and target_dt not in seen:
			join_clauses.append(
				f"LEFT JOIN `tab{target_dt}` ON {root_table}.`{link_fn}` = `tab{target_dt}`.`name`"
			)
			seen.add(target_dt)

	probe = (
		f"SELECT CASE WHEN ({resolved}) THEN 1 ELSE 0 END AS _fmt "
		f"FROM {root_table} {' '.join(join_clauses)} LIMIT 1"
	)
	try:
		frappe.db.sql(probe)
		return {"ok": True, "resolved_sql": resolved}
	except Exception as e:
		return {"ok": False, "error": str(e)}
