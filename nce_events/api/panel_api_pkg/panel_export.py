"""Panel CSV export helpers and implementation."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import os
from typing import Any

import frappe
from frappe import _

from nce_events.api.panel_api_pkg._helpers import _safe_filename

_EXPORT_NAME_CAP = 50000
_ROSTER_HASH: str = "wwe78f6q87ey97f86q9e8fqw98ef"


def _names_for_filtered_export(filtered_row_names: str | list | None) -> list[str] | None:
	"""If None, caller exports full row set from get_panel_data. If a list (possibly empty), export only those `name`s in order."""
	if filtered_row_names is None:
		return None
	if isinstance(filtered_row_names, list):
		raw = filtered_row_names
	elif isinstance(filtered_row_names, str):
		s = filtered_row_names.strip()
		if not s:
			return None
		try:
			raw = json.loads(s)
		except json.JSONDecodeError:
			frappe.throw(_("filtered_row_names must be a JSON array"))
	else:
		return None

	if not isinstance(raw, list):
		frappe.throw(_("filtered_row_names must be a JSON array"))

	out = [str(n).strip() for n in raw if n is not None and str(n).strip() != ""]
	if len(out) > _EXPORT_NAME_CAP:
		frappe.throw(_("filtered_row_names exceeds maximum ({0})").format(_EXPORT_NAME_CAP))

	return out


def _cell_str(val: Any) -> str:
	if val is None:
		return ""
	if isinstance(val, dict | list):
		return json.dumps(val)
	return str(val)


def export_panel_data_impl(
	root_doctype: str,
	filters: str | dict | None = None,
	user_filters: str | list | None = None,
	filtered_row_names: str | list | None = None,
) -> dict[str, Any]:
	"""Export a panel's current data as CSV to a public path and return its URL."""
	from nce_events.api.panel_api_pkg.panel_data import get_panel_data

	result = get_panel_data(root_doctype, filters, user_filters=user_filters)
	columns = result["columns"]
	rows = result["rows"]

	names_subset = _names_for_filtered_export(filtered_row_names)
	if names_subset is not None:
		row_by_name = {str(r.get("name")).strip(): r for r in rows if r.get("name") not in (None, "")}
		rows = [row_by_name[n] for n in names_subset if n in row_by_name]

	col_fieldnames = [c["fieldname"] for c in columns]
	labels = [c["label"] for c in columns]

	output = io.StringIO()
	writer = csv.writer(output)
	writer.writerow(labels)
	for row in rows:
		writer.writerow([_cell_str(row.get(fn)) for fn in col_fieldnames])
	csv_content = output.getvalue()

	safe_dt = _safe_filename(root_doctype)
	ts = frappe.utils.now_datetime().strftime("%Y%m%d_%H%M%S")
	context_key = json.dumps(
		{
			"f": filters,
			"uf": user_filters,
			"frn": names_subset,
			"t": ts,
		},
		sort_keys=True,
		default=str,
	)
	suffix = hashlib.md5(context_key.encode()).hexdigest()[:10]
	filename = f"{safe_dt}_{ts}_{suffix}.csv"

	roster_dir = frappe.get_site_path("public", "files", "panels", _ROSTER_HASH)
	os.makedirs(roster_dir, exist_ok=True)
	filepath = os.path.join(roster_dir, filename)
	with open(filepath, "w", encoding="utf-8") as f:
		f.write(csv_content)

	public_url = f"/files/panels/{_ROSTER_HASH}/{filename}"

	return {
		"filename": filename,
		"url": public_url,
		"rows_exported": len(rows),
	}
