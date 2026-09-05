"""Fetch related-tab rows via Query Based Table Link joins."""

from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import cstr

from ._fd_related import _hop_walk_final_identifiers, _normalize_hop_chain_value


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


def _qbtl_bind_identifiers(
	root_doctype: str,
	root_name: str,
	bind_doctype: str,
	hop_chain: list[dict[str, str]],
) -> list[str] | None:
	"""Primary keys on ``bind_doctype`` to anchor the QBTL join."""
	root = cstr(root_doctype or "").strip()
	bind = cstr(bind_doctype or "").strip()
	if not root or not bind:
		return None
	if root == bind and not hop_chain:
		name = cstr(root_name or "").strip()
		return [name] if name else None
	if not hop_chain:
		return None
	ids = _hop_walk_final_identifiers(root_name, hop_chain)
	if ids is None:
		return None
	return [cstr(x).strip() for x in ids if cstr(x).strip()]


def fetch_qbtl_related_row_names(
	qbtl_name: str,
	root_doctype: str,
	root_name: str,
	*,
	bind_doctype: str,
	bind_side: str,
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
	bind_ids = _qbtl_bind_identifiers(root_doctype, root_name, bind_dt, hc)
	if bind_ids is None:
		return ([], True)
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
		"query_based_table_link": cstr(
			getattr(row, "query_based_table_link", None) or info.get("query_based_table_link") or ""
		).strip(),
	}
