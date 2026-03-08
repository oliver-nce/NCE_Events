import json
import re

import frappe


@frappe.whitelist()
def translate_wp_query(wp_query):
	"""Translate a WordPress SQL query to its Frappe equivalent using WP Tables mappings."""
	if not wp_query:
		return {"translated": "", "warnings": []}

	wp_tables = frappe.get_all(
		"WP Tables",
		fields=["table_name", "frappe_doctype", "column_mapping"],
	)

	translated = wp_query
	warnings = []

	table_col_maps = {}
	for wt in wp_tables:
		tname = wt.get("table_name")
		if not tname or not wt.get("frappe_doctype"):
			continue
		col_map_raw = wt.get("column_mapping")
		if not col_map_raw:
			continue
		try:
			col_map = json.loads(col_map_raw) if isinstance(col_map_raw, str) else col_map_raw
			resolved = {}
			for wp_col, col_info in col_map.items():
				if isinstance(col_info, dict):
					if col_info.get("is_name"):
						resolved[str(wp_col)] = "name"
					else:
						frappe_col = col_info.get("fieldname", "")
						if frappe_col:
							resolved[str(wp_col)] = str(frappe_col)
				elif col_info:
					resolved[str(wp_col)] = str(col_info)
			table_col_maps[tname] = resolved
		except Exception as exc:
			warnings.append("Could not parse column_mapping for {0}: {1}".format(tname, str(exc)))

	# Pass 1: qualified table.column
	qualified_map = {}
	for wt in wp_tables:
		tname = wt.get("table_name")
		frappe_doctype = wt.get("frappe_doctype")
		if not tname or not frappe_doctype:
			continue
		frappe_table = "`tab" + frappe_doctype + "`"
		for wp_col, frappe_col in table_col_maps.get(tname, {}).items():
			key = tname + "." + wp_col
			qualified_map[key] = frappe_table + "." + frappe_col

	if qualified_map:
		sorted_q = sorted(qualified_map.keys(), key=len, reverse=True)
		q_pattern = '|'.join(re.escape(k) for k in sorted_q)
		translated = re.sub(q_pattern, lambda m: qualified_map.get(m.group(0), m.group(0)), translated, flags=re.IGNORECASE)

	# Pass 2: bare WP table names
	for wt in wp_tables:
		tname = wt.get("table_name")
		frappe_doctype = wt.get("frappe_doctype")
		if not tname or not frappe_doctype:
			continue
		frappe_table = "`tab" + frappe_doctype + "`"
		translated = re.sub(r'\b' + re.escape(tname) + r'\b', frappe_table, translated, flags=re.IGNORECASE)

	# Pass 3: remaining bare column names
	all_col_map = {}
	for col_map in table_col_maps.values():
		for wp_col, frappe_col in col_map.items():
			if wp_col not in all_col_map:
				all_col_map[wp_col] = frappe_col

	if all_col_map:
		sorted_keys = sorted(all_col_map.keys(), key=len, reverse=True)
		combined = r'(?<!\.)\b(' + '|'.join(re.escape(k) for k in sorted_keys) + r')\b'
		translated = re.sub(combined, lambda m: all_col_map.get(m.group(1), m.group(1)), translated)

	return {"translated": translated, "warnings": warnings}
