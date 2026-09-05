"""Fetch related-tab rows via Query Based Table Link joins."""

from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import cstr

from ._fd_related import _filters_for_related_rows, _normalize_hop_chain_value


def _parse_qbtl_conditions(raw: object) -> list[dict[str, str]]:
	"""Parse QBTL ``conditions_json`` into join pairs (minimal, no DocType import)."""
	import json

	if raw is None or raw == "":
		return []
	if isinstance(raw, str):
		try:
			raw = json.loads(raw)
		except json.JSONDecodeError:
			return []
	if not isinstance(raw, list):
		return []
	out: list[dict[str, str]] = []
	for item in raw:
		if not isinstance(item, dict):
			continue
		lf = cstr(item.get("left_field") or "").strip()
		rf = cstr(item.get("right_field") or "").strip()
		op = cstr(item.get("op") or "=").strip()
		if lf and rf:
			out.append({"left_field": lf, "op": op, "right_field": rf})
	return out


def _qbtl_tablename(doctype: str) -> str:
	return f"`tab{doctype}`"


def _build_qbtl_join_on(
	conditions: list[dict[str, str]],
	*,
	bind_side: str,
	bind_alias: str,
	display_alias: str,
) -> str:
	"""SQL ON clause for bind/display aliases using canonical left/right field pairs."""
	parts: list[str] = []
	for cond in conditions:
		lf = cond["left_field"]
		rf = cond["right_field"]
		op = cond["op"]
		if bind_side == "left":
			parts.append(f"{bind_alias}.`{lf}` {op} {display_alias}.`{rf}`")
		else:
			parts.append(f"{display_alias}.`{lf}` {op} {bind_alias}.`{rf}`")
	return " AND ".join(parts)


def _bind_join_columns(conditions: list[dict[str, str]], bind_side: str) -> list[str]:
	"""Bind-side join columns for each condition (left_field when bind is left, else right_field)."""
	key = "left_field" if bind_side == "left" else "right_field"
	out: list[str] = []
	for cond in conditions:
		col = cstr(cond.get(key) or "").strip()
		if col and col not in out:
			out.append(col)
	return out


def _bind_nonempty_guard(conditions: list[dict[str, str]], bind_side: str, bind_alias: str) -> str:
	"""
	SQL requiring each bind-side join column to hold a real key value.

	A blank/NULL/zero key means "no relationship" (e.g. ``base_line_item_id = 0``
	for a Line Item Payment with no payment plan). Without this guard an equality
	join fans out across every other row that also has an empty key. The ``<> '0'``
	check catches integer zeros (MySQL coerces ``''`` to ``0`` for int columns).
	"""
	clauses: list[str] = []
	for col in _bind_join_columns(conditions, bind_side):
		clauses.append(
			f"{bind_alias}.`{col}` IS NOT NULL "
			f"AND {bind_alias}.`{col}` <> '' "
			f"AND {bind_alias}.`{col}` <> '0'"
		)
	return " AND ".join(clauses)


def _qbtl_bind_identifiers(
	root_doctype: str,
	root_name: str,
	bind_doctype: str,
	bind_link_field: str,
	hop_chain: list[dict[str, str]],
) -> list[str] | None:
	"""
	Primary keys on ``bind_doctype`` that anchor the QBTL join for the open root.

	Uses the same related-tab filter semantics as the Link relationship tabs:
	direct child via reverse FK (``{link_field: root_name}``) or a hop-chain walk.
	Returns ``None`` when the bind set is empty (caller returns no rows).
	"""
	root = cstr(root_doctype or "").strip()
	bind = cstr(bind_doctype or "").strip()
	if not root or not bind:
		return None
	if root == bind and not hop_chain:
		name = cstr(root_name or "").strip()
		return [name] if name else None

	filters, force_empty = _filters_for_related_rows(
		root_name, bind, cstr(bind_link_field or "").strip(), hop_chain, root
	)
	if force_empty:
		return None
	names = frappe.get_all(bind, filters=filters, pluck="name", limit_page_length=5000)
	out = [cstr(n).strip() for n in (names or []) if cstr(n).strip()]
	return out or None


def fetch_qbtl_related_row_names(
	qbtl_name: str,
	root_doctype: str,
	root_name: str,
	*,
	bind_doctype: str,
	bind_side: str,
	bind_link_field: str,
	display_doctype: str,
	hop_chain_raw: object,
) -> tuple[list[str], bool]:
	"""
	Return display-doctype ``name`` values linked to the open root via a QBTL.

	Returns ``(names, force_empty)``. When ``force_empty`` is True, return no rows.
	"""
	qbtl_name = cstr(qbtl_name or "").strip()
	if not qbtl_name:
		return ([], True)

	try:
		qbtl = frappe.get_doc("Query Based Table Link", qbtl_name)
	except Exception:
		return ([], True)

	conditions = _parse_qbtl_conditions(getattr(qbtl, "conditions_json", None))
	if not conditions:
		return ([], True)

	bind_side = cstr(bind_side or "").strip().lower()
	if bind_side not in ("left", "right"):
		return ([], True)

	bind_dt = cstr(bind_doctype or "").strip()
	display_dt = cstr(display_doctype or "").strip()
	if not bind_dt or not display_dt:
		return ([], True)

	hc = _normalize_hop_chain_value(hop_chain_raw)
	bind_ids = _qbtl_bind_identifiers(root_doctype, root_name, bind_dt, bind_link_field, hc)
	if not bind_ids:
		return ([], True)

	join_on = _build_qbtl_join_on(
		conditions,
		bind_side=bind_side,
		bind_alias="bind",
		display_alias="display",
	)
	bind_tab = _qbtl_tablename(bind_dt)
	display_tab = _qbtl_tablename(display_dt)

	if len(bind_ids) == 1:
		where_bind = "bind.name = %s"
		params: list[Any] = [bind_ids[0]]
	else:
		placeholders = ", ".join(["%s"] * len(bind_ids))
		where_bind = f"bind.name IN ({placeholders})"
		params = list(bind_ids)

	nonempty_guard = _bind_nonempty_guard(conditions, bind_side, bind_alias="bind")
	if nonempty_guard:
		where_bind = f"{where_bind} AND {nonempty_guard}"

	sql = (
		f"SELECT display.name AS name FROM {display_tab} AS display "
		f"INNER JOIN {bind_tab} AS bind ON {join_on} "
		f"WHERE {where_bind}"
	)
	try:
		rows = frappe.db.sql(sql, params, as_dict=True)
	except Exception:
		frappe.log_error(title="QBTL related tab fetch failed", message=frappe.get_traceback())
		return ([], True)

	names: list[str] = []
	seen: set[str] = set()
	for row in rows or []:
		nm = cstr(row.get("name") or "").strip()
		if nm and nm not in seen:
			seen.add(nm)
			names.append(nm)
	return (names, False)


def qbtl_info_from_row(row: Any) -> dict[str, Any]:
	"""Parse QBTL metadata stored in ``info`` JSON on a related child row."""
	import json

	info: dict[str, Any] = {}
	raw = getattr(row, "info", None)
	if raw:
		try:
			parsed = json.loads(raw)
			if isinstance(parsed, dict):
				info = parsed
		except json.JSONDecodeError:
			info = {}
	bind_side = cstr(info.get("bind_side") or "").strip().lower()
	return {
		"bind_doctype": cstr(info.get("bind_doctype") or "").strip(),
		"bind_side": bind_side if bind_side in ("left", "right") else "",
		"bind_link_field": cstr(info.get("bind_link_field") or "").strip(),
		"query_based_table_link": cstr(
			getattr(row, "query_based_table_link", None) or info.get("query_based_table_link") or ""
		).strip(),
	}
