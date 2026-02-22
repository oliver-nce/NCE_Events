import csv
import io
import json

import frappe
from frappe import _


@frappe.whitelist()
def get_pane_data(pane, parent_name=None, limit=50, start=0):
	"""Fetch data for a hierarchy explorer pane.

	Args:
		pane: Pane identifier — "events" or "players"
		parent_name: Parent record name (required for child panes)
		limit: Max rows to return
		start: Offset for pagination
	"""
	limit = int(limit)
	start = int(start)

	if pane == "events":
		return _get_events(limit, start)
	elif pane == "players":
		if not parent_name:
			frappe.throw(_("Event selection is required for the Players pane"))
		return _get_players(parent_name, limit, start)
	else:
		frappe.throw(_("Unknown pane: {0}").format(pane))


@frappe.whitelist()
def export_pane_data(pane, parent_name=None, format="csv"):
	"""Export full dataset for a pane (no pagination).

	Args:
		pane: Pane identifier — "events" or "players"
		parent_name: Parent record name (required for child panes)
		format: "csv" or "json"
	"""
	if pane == "events":
		data = _get_events(limit=0, start=0)
	elif pane == "players":
		if not parent_name:
			frappe.throw(_("Event selection is required for export"))
		data = _get_players(parent_name, limit=0, start=0)
	else:
		frappe.throw(_("Unknown pane: {0}").format(pane))

	rows = data["rows"]

	if format == "json":
		return {
			"data": json.dumps(rows, default=str, indent=2),
			"filename": f"{pane}_export.json",
			"mimetype": "application/json",
		}

	output = io.StringIO()
	if rows:
		writer = csv.DictWriter(output, fieldnames=rows[0].keys())
		writer.writeheader()
		writer.writerows(rows)

	return {
		"data": output.getvalue(),
		"filename": f"{pane}_export.csv",
		"mimetype": "text/csv",
	}


def _get_events(limit, start):
	"""Pane 1: Events with baked-in filters and player count."""
	frappe.has_permission("Events", throw=True)

	count_query = """
		SELECT COUNT(DISTINCT e.name)
		FROM `tabEvents` e
		WHERE e.first_session_date > DATE_SUB(CURDATE(), INTERVAL 30 DAY)
		AND e.product_type IN ('Training', 'Tryouts', 'Camp')
	"""
	total = frappe.db.sql(count_query)[0][0]

	limit_clause = f"LIMIT {limit} OFFSET {start}" if limit else ""

	rows_query = f"""
		SELECT
			e.name,
			e.first_session_date,
			e.event_name,
			IFNULL(rc.female_count, 0) AS female_count,
			IFNULL(rc.male_count, 0) AS male_count,
			IFNULL(rc.player_count, 0) AS player_count
		FROM `tabEvents` e
		LEFT JOIN (
			SELECT
				r.product_id,
				SUM(CASE WHEN fm.gender = 'Female' THEN 1 ELSE 0 END) AS female_count,
				SUM(CASE WHEN fm.gender = 'Male' THEN 1 ELSE 0 END) AS male_count,
				COUNT(*) AS player_count
			FROM `tabRegistrations` r
			INNER JOIN `tabFamily Members` fm ON r.player_id = fm.name
			GROUP BY r.product_id
		) rc ON rc.product_id = e.name
		WHERE e.first_session_date > DATE_SUB(CURDATE(), INTERVAL 30 DAY)
		AND e.product_type IN ('Training', 'Tryouts', 'Camp')
		ORDER BY e.first_session_date ASC
		{limit_clause}
	"""
	rows = frappe.db.sql(rows_query, as_dict=True)

	return {
		"rows": rows,
		"total": total,
		"start": start,
		"limit": limit,
	}


def _get_players(event_name, limit, start):
	"""Pane 2: Family Members registered for a given Event, with family email."""
	frappe.has_permission("Family Members", throw=True)

	count_query = """
		SELECT COUNT(*)
		FROM `tabRegistrations` r
		INNER JOIN `tabFamily Members` fm ON r.player_id = fm.name
		WHERE r.product_id = %s
	"""
	total = frappe.db.sql(count_query, (event_name,))[0][0]

	limit_clause = f"LIMIT {limit} OFFSET {start}" if limit else ""

	rows_query = f"""
		SELECT
			fm.name,
			fm.last_name,
			fm.first_name,
			fm.gender,
			fm.yob,
			fm.rating,
			f.email AS family_email
		FROM `tabRegistrations` r
		INNER JOIN `tabFamily Members` fm ON r.player_id = fm.name
		LEFT JOIN `tabFamilies` f ON fm.wp_parent_user_id = f.name
		WHERE r.product_id = %s
		ORDER BY fm.gender ASC, fm.last_name ASC
		{limit_clause}
	"""
	rows = frappe.db.sql(rows_query, (event_name,), as_dict=True)

	return {
		"rows": rows,
		"total": total,
		"start": start,
		"limit": limit,
	}
