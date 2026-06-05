from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import cint, cstr

from nce_events.api.panel_api_pkg._helpers import (
	_find_link_field,
	_title_case,
)

_SKIP_FIELDTYPES: frozenset[str] = frozenset(
	{
		"Section Break",
		"Column Break",
		"Tab Break",
		"HTML",
		"Fold",
		"Heading",
		"Button",
		"Table",
		"Table MultiSelect",
	}
)

_SKIP_FIELDNAMES: frozenset[str] = frozenset(
	{
		"owner",
		"creation",
		"modified",
		"modified_by",
		"docstatus",
		"idx",
		"parent",
		"parentfield",
		"parenttype",
	}
)


def _via_path_key(doctype: str, hop_chain: list[dict[str, str]]) -> str:
	return f"{doctype}::{json.dumps(hop_chain, sort_keys=True)}"


def _discover_via_link_paths(
	root_doctype: str,
	one_hop: list[dict[str, object]],
	wp_doctypes: set[str],
	label_map: dict[str, str],
) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
	"""Discover related tabs through a bridge DocType's outbound Link (reverse of inbound-only scan).

	Frappe places Link fields on the many side (e.g. Enrollments → People / Events). Inbound
	1-hop finds rows pointing at the root; this helper walks outbound links on the root **or**
	on each inbound 1-hop bridge, then finds other DocTypes that share the same via target.

	Examples:
	- Enrollments (root) --player_id--> People <--person_id-- Eligibility
	- Events (root) ← Enrollments --player_id--> People <--person_id-- Eligibility

	Returns ``(one_hop_linked_parents, two_hop_co_linked)`` to merge into picker buckets.
	"""
	root_doctype = cstr(root_doctype or "").strip()
	if not root_doctype:
		return [], []

	bridges: list[tuple[str, str]] = [(root_doctype, "name")]
	seen_bridge: set[tuple[str, str]] = {(root_doctype, "name")}
	for m1 in one_hop:
		if m1.get("hop_chain"):
			continue
		b1 = cstr(m1.get("doctype") or "").strip()
		l1r = cstr(m1.get("link_field") or "").strip()
		if not b1 or not l1r:
			continue
		key = (b1, l1r)
		if key in seen_bridge:
			continue
		seen_bridge.add(key)
		bridges.append(key)

	one_extra: list[dict[str, object]] = []
	two_extra: list[dict[str, object]] = []
	seen1: set[str] = set()
	seen2: set[str] = set()

	for bridge_dt, parent_link in bridges:
		try:
			meta_b = frappe.get_meta(bridge_dt)
		except Exception:
			continue
		for out_field in meta_b.fields:
			if out_field.fieldtype != "Link" or not out_field.options:
				continue
			via_dt = cstr(out_field.options).strip()
			out_fn = cstr(out_field.fieldname or "").strip()
			if not via_dt or not out_fn or via_dt not in wp_doctypes or via_dt == bridge_dt:
				continue

			hop_chain: list[dict[str, str]] = [
				{"bridge": bridge_dt, "parent_link": parent_link, "child_link": out_fn},
			]
			via_label = label_map.get(via_dt, via_dt)

			# Junction root → linked parent (People, Events on an Enrollment row).
			if bridge_dt == root_doctype:
				sig = _via_path_key(via_dt, hop_chain)
				if sig not in seen1:
					seen1.add(sig)
					one_extra.append(
						{
							"doctype": via_dt,
							"link_field": "name",
							"label": via_label,
							"hop_chain": hop_chain,
						}
					)

			# Rows on another DocType that link to the same via target (Eligibility → People).
			for dt in sorted(wp_doctypes):
				if dt in (bridge_dt, via_dt, root_doctype):
					continue
				try:
					meta = frappe.get_meta(dt)
				except Exception:
					continue
				for in_field in meta.fields:
					if in_field.fieldtype != "Link" or cstr(in_field.options).strip() != via_dt:
						continue
					in_fn = cstr(in_field.fieldname or "").strip()
					if not in_fn:
						continue
					sig = _via_path_key(dt, hop_chain)
					if sig in seen2:
						break
					seen2.add(sig)
					bridge_label = label_map.get(bridge_dt, bridge_dt)
					if bridge_dt == root_doctype:
						via_phrase = via_label
					else:
						via_phrase = _("{0} → {1}").format(bridge_label, via_label)
					two_extra.append(
						{
							"doctype": dt,
							"link_field": in_fn,
							"label": _("{0} (via {1})").format(label_map.get(dt, dt), via_phrase),
							"hop_chain": hop_chain,
						}
					)
					break

	one_extra.sort(key=lambda r: cstr(r.get("label") or r.get("doctype")))
	two_extra.sort(key=lambda r: cstr(r.get("label") or r.get("doctype")))
	return one_extra, two_extra


def _skip_as_panel_child_table(meta: Any) -> bool:
	"""Singles and virtual DocTypes have no ``tab{Doctype}`` table for row COUNT queries."""
	return bool(getattr(meta, "issingle", 0)) or bool(getattr(meta, "is_virtual", 0))


@frappe.whitelist()
def get_child_doctypes(root_doctype: str) -> list[dict[str, str]]:
	"""Return DocTypes that have a Link field pointing to root_doctype.

	Scans all WP Tables DocTypes for Link fields targeting root_doctype.
	Excludes Singles and virtual DocTypes (no physical child table to query).
	Returns [{doctype, link_field, label}].
	"""
	wp_rows = frappe.get_all(
		"WP Tables",
		filters={"frappe_doctype": ["is", "set"]},
		fields=["frappe_doctype", "nce_name", "table_name"],
	)

	label_map: dict[str, str] = {}
	wp_doctypes: set[str] = set()
	for row in wp_rows:
		dt = row.get("frappe_doctype")
		if dt:
			wp_doctypes.add(dt)
			label_map[dt] = row.get("nce_name") or row.get("table_name") or dt

	result: list[dict[str, str]] = []
	for dt in wp_doctypes:
		if dt == root_doctype:
			continue
		try:
			meta = frappe.get_meta(dt)
		except Exception:
			continue
		if _skip_as_panel_child_table(meta):
			continue
		for field in meta.fields:
			if field.fieldtype == "Link" and field.options == root_doctype:
				result.append(
					{
						"doctype": dt,
						"link_field": field.fieldname,
						"label": label_map.get(dt, dt),
					}
				)
				break

	result.sort(key=lambda r: r["label"])
	return result


@frappe.whitelist()
def get_multi_hop_children(root_doctype: str) -> dict[str, list[dict[str, object]]]:
	"""Related tables for Form Dialog picker: 1-hop, 2-hop, 3-hop (WP Tables only).

	Each item: doctype, link_field (use ``name`` for multi-hop), label, hop_chain (list or []).

	1-hop: inbound children (Link → root) plus linked parents when root is a junction table.
	2-hop: standard bridge paths (e.g. People via Enrollments) plus co-linked rows
	(e.g. Eligibility via People, including through a 1-hop bridge when People has no Link back).
	3-hop: inbound three-step paths where each bridge links back to the prior step.

	hop_chain step: ``{bridge, parent_link, child_link}`` — on ``bridge`` DocType,
	``parent_link`` points toward the root side, ``child_link`` toward the next level.
	"""
	root_doctype = cstr(root_doctype or "").strip()
	if not root_doctype:
		return {"1_hop": [], "2_hop": [], "3_hop": []}

	wp_rows = frappe.get_all(
		"WP Tables",
		filters={"frappe_doctype": ["is", "set"]},
		fields=["frappe_doctype", "nce_name", "table_name"],
	)
	label_map: dict[str, str] = {}
	wp_doctypes: set[str] = set()
	for row in wp_rows:
		dt = row.get("frappe_doctype")
		if dt:
			wp_doctypes.add(dt)
			label_map[dt] = row.get("nce_name") or row.get("table_name") or dt

	one_hop: list[dict[str, object]] = []
	for dt in sorted(wp_doctypes):
		if dt == root_doctype:
			continue
		try:
			meta = frappe.get_meta(dt)
		except Exception:
			continue
		for field in meta.fields:
			if field.fieldtype == "Link" and field.options == root_doctype:
				one_hop.append(
					{
						"doctype": dt,
						"link_field": field.fieldname,
						"label": label_map.get(dt, dt),
						"hop_chain": [],
					}
				)
				break

	one_hop_extra, via_two_hop = _discover_via_link_paths(
		root_doctype, one_hop, wp_doctypes, label_map
	)
	seen_one: set[str] = set()
	for row in one_hop:
		hc = row.get("hop_chain") or []
		seen_one.add(_via_path_key(cstr(row.get("doctype") or ""), hc))
	for row in one_hop_extra:
		dt = cstr(row.get("doctype") or "").strip()
		hc = row.get("hop_chain") or []
		key = _via_path_key(dt, hc)
		if key not in seen_one:
			seen_one.add(key)
			one_hop.append(row)
	one_hop.sort(key=lambda r: cstr(r.get("label") or r.get("doctype")))

	two_hop: list[dict[str, object]] = []
	seen2: set[str] = set()
	for m1 in one_hop:
		if m1.get("hop_chain"):
			continue
		b1 = cstr(m1.get("doctype") or "").strip()
		l1r = cstr(m1.get("link_field") or "").strip()
		if not b1 or not l1r:
			continue
		try:
			meta_b1 = frappe.get_meta(b1)
		except Exception:
			continue
		for f_down in meta_b1.fields:
			if f_down.fieldtype != "Link" or not f_down.options:
				continue
			if f_down.options == root_doctype:
				continue
			t_fin = cstr(f_down.options).strip()
			if t_fin not in wp_doctypes or t_fin == b1:
				continue
			hop_chain = [
				{"bridge": b1, "parent_link": l1r, "child_link": f_down.fieldname},
			]
			key = _via_path_key(t_fin, hop_chain)
			if key in seen2:
				continue
			seen2.add(key)
			two_hop.append(
				{
					"doctype": t_fin,
					"link_field": "name",
					"label": _("{0} (via {1})").format(label_map.get(t_fin, t_fin), label_map.get(b1, b1)),
					"hop_chain": hop_chain,
				}
			)
	for row in via_two_hop:
		dt_fin = cstr(row.get("doctype") or "").strip()
		hc = row.get("hop_chain") or []
		key = _via_path_key(dt_fin, hc)
		if key in seen2:
			continue
		seen2.add(key)
		two_hop.append(row)
	two_hop.sort(key=lambda r: cstr(r.get("label") or r.get("doctype")))

	three_hop: list[dict[str, object]] = []
	seen3: set[str] = set()
	for m1 in one_hop:
		if m1.get("hop_chain"):
			continue
		b1 = cstr(m1.get("doctype") or "").strip()
		l1r = cstr(m1.get("link_field") or "").strip()
		if not b1:
			continue
		try:
			meta_b1 = frappe.get_meta(b1)
		except Exception:
			continue
		for f_b1_m2 in meta_b1.fields:
			if f_b1_m2.fieldtype != "Link" or not f_b1_m2.options:
				continue
			if f_b1_m2.options == root_doctype:
				continue
			m2 = cstr(f_b1_m2.options).strip()
			if m2 not in wp_doctypes or m2 == b1:
				continue
			f_m2_b1 = _find_link_field(m2, b1)
			if not f_m2_b1:
				continue
			try:
				meta_m2 = frappe.get_meta(m2)
			except Exception:
				continue
			for f_t in meta_m2.fields:
				if f_t.fieldtype != "Link" or not f_t.options:
					continue
				if f_t.options in (root_doctype, b1, m2):
					continue
				t_fin = cstr(f_t.options).strip()
				if t_fin not in wp_doctypes:
					continue
				hop_chain = [
					{"bridge": b1, "parent_link": l1r, "child_link": f_b1_m2.fieldname},
					{"bridge": m2, "parent_link": f_m2_b1, "child_link": f_t.fieldname},
				]
				key = f"{t_fin}::{json.dumps(hop_chain, sort_keys=True)}"
				if key in seen3 or key in seen2:
					continue
				seen3.add(key)
				three_hop.append(
					{
						"doctype": t_fin,
						"link_field": "name",
						"label": _("{0} (via {1} → {2})").format(
							label_map.get(t_fin, t_fin),
							label_map.get(b1, b1),
							label_map.get(m2, m2),
						),
						"hop_chain": hop_chain,
					}
				)
	three_hop.sort(key=lambda r: cstr(r.get("label") or r.get("doctype")))

	return {"1_hop": one_hop, "2_hop": two_hop, "3_hop": three_hop}


@frappe.whitelist()
def debug_child_lookup(root_doctype: str) -> dict[str, Any]:
	"""Diagnostic: show what get_child_doctypes sees."""
	wp_rows = frappe.get_all(
		"WP Tables",
		filters={"frappe_doctype": ["is", "set"]},
		fields=["name", "frappe_doctype", "nce_name", "table_name", "mirror_status"],
	)
	info: dict[str, Any] = {"root_doctype": root_doctype, "wp_tables": wp_rows, "link_fields_found": []}

	for row in wp_rows:
		dt = row.get("frappe_doctype")
		if not dt or dt == root_doctype:
			continue
		try:
			meta = frappe.get_meta(dt)
			for field in meta.fields:
				if field.fieldtype == "Link" and field.options == root_doctype:
					info["link_fields_found"].append(
						{
							"doctype": dt,
							"fieldname": field.fieldname,
							"options": field.options,
						}
					)
		except Exception as e:
			info["link_fields_found"].append({"doctype": dt, "error": str(e)})

	return info


@frappe.whitelist()
def get_doctype_fields(root_doctype: str) -> dict[str, Any]:
	"""Return data-bearing fields for a DocType (excludes layout and system fields).

	Link fields include an 'options' key with the target DocType name.

	Response shape: ``{ "fields": [...], "doctype_title_field": "<fieldname or ''>" }``
	``doctype_title_field`` is the root DocType's ``title_field`` when it names a field
	we expose (same list as ``fields``), else empty string.
	"""
	meta = frappe.get_meta(root_doctype)
	result: list[dict[str, Any]] = [
		{"fieldname": "name", "label": "ID", "fieldtype": "Data", "reqd": 0},
	]
	for f in meta.fields:
		if f.fieldtype in _SKIP_FIELDTYPES or f.fieldname in _SKIP_FIELDNAMES:
			continue
		entry: dict[str, Any] = {
			"fieldname": f.fieldname,
			"label": f.label or _title_case(f.fieldname),
			"fieldtype": f.fieldtype,
			"reqd": cint(f.reqd),
		}
		if f.fieldtype == "Link" and f.options:
			entry["options"] = f.options
		result.append(entry)

	exposed = {row["fieldname"] for row in result}
	raw_title = (getattr(meta, "title_field", None) or "").strip()
	doctype_title_field = raw_title if raw_title in exposed else ""

	return {"fields": result, "doctype_title_field": doctype_title_field}
