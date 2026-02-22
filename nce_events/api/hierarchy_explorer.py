import csv
import io
import json
import os

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
	if pane == "players" and rows:
		# A1=first_session_date (mm/dd/yyyy), B1=event_name, table begins at A3
		event_doc = frappe.db.get_value(
			"Events", parent_name, ["first_session_date", "event_name"], as_dict=True
		)
		first_session = event_doc.get("first_session_date") or ""
		event_name_val = event_doc.get("event_name") or ""
		if first_session:
			if hasattr(first_session, "strftime"):
				first_session = first_session.strftime("%m/%d/%Y")
			else:
				from datetime import datetime
				first_session = datetime.strptime(str(first_session), "%Y-%m-%d").strftime("%m/%d/%Y")
		fieldnames = list(rows[0].keys())
		meta = frappe.get_meta("Family Members")
		label_overrides = {"family_email": "Email"}
		labels = []
		for f in fieldnames:
			if f in label_overrides:
				labels.append(label_overrides[f])
			else:
				df = meta.get_field(f)
				labels.append(df.label if df else f.replace("_", " ").title())
		writer = csv.writer(output)
		# Row 1: A1=date, B1=event_name
		writer.writerow([first_session, event_name_val])
		# Row 2: empty
		writer.writerow([])
		# Row 3: table headers using DocType labels
		writer.writerow(labels)
		# Row 4+: data
		for row in rows:
			writer.writerow([row.get(f) for f in fieldnames])
	elif rows:
		writer = csv.DictWriter(output, fieldnames=rows[0].keys())
		writer.writeheader()
		writer.writerows(rows)

	csv_content = output.getvalue()

	# Save Players CSV to server path when exporting roster
	if pane == "players" and parent_name:
		sku = frappe.db.get_value("Events", parent_name, "sku") or parent_name
		# Sanitize filename: replace chars unsafe for filesystem
		safe_sku = "".join(c if c.isalnum() or c in "-_" else "_" for c in str(sku))
		roster_dir = frappe.get_site_path("public", "files", "rosters", "wwe78f6q87ey97f86q9e8fqw98ef")
		os.makedirs(roster_dir, exist_ok=True)
		filepath = os.path.join(roster_dir, f"{safe_sku}.csv")
		with open(filepath, "w", encoding="utf-8") as f:
			f.write(csv_content)

	return {
		"data": csv_content,
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
			fm.preferred_position,
			fm.player_number,
			f.email AS family_email
		FROM `tabRegistrations` r
		INNER JOIN `tabFamily Members` fm ON r.player_id = fm.name
		LEFT JOIN `tabFamilies` f ON fm.wp_parent_user_id = f.name
		WHERE r.product_id = %s
		ORDER BY fm.gender ASC, fm.last_name ASC
		{limit_clause}
	"""
	rows = frappe.db.sql(rows_query, (event_name,), as_dict=True)

	parent_sku = frappe.db.get_value("Events", event_name, "sku") or event_name

	return {
		"rows": rows,
		"total": total,
		"start": start,
		"limit": limit,
		"parent_sku": parent_sku,
	}
