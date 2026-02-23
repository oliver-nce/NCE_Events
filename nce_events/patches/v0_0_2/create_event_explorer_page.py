import frappe


def execute():
	"""Create the Event Explorer as a Panel Page record (proof of concept)."""
	if frappe.db.exists("Panel Page", "event-explorer"):
		return

	events_sql = """SELECT
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
ORDER BY e.first_session_date ASC"""

	players_sql = """SELECT
	fm.name,
	fm.last_name,
	fm.first_name,
	fm.gender,
	fm.yob,
	fm.rating,
	fm.preferred_position AS position,
	fm.player_number,
	f.email AS family_email
FROM `tabRegistrations` r
INNER JOIN `tabFamily Members` fm ON r.player_id = fm.name
LEFT JOIN `tabFamilies` f ON fm.wp_parent_user_id = f.name
WHERE r.product_id = p1.name
ORDER BY fm.gender ASC, fm.last_name ASC"""

	doc = frappe.get_doc({
		"doctype": "Panel Page",
		"page_name": "event-explorer",
		"page_title": "Event Explorer",
		"active": 1,
		"male_hex": "#0000FF",
		"female_hex": "#c700e6",
		"panels": [
			{
				"panel_number": 1,
				"header_text": "Events",
				"sql_query": events_sql,
				"hidden_fields": "name",
				"bold_fields": "female_count, male_count, player_count",
				"filter_fields": "",
				"card_fields": "",
			},
			{
				"panel_number": 2,
				"header_text": "Players",
				"sql_query": players_sql,
				"hidden_fields": "name, gender",
				"bold_fields": "",
				"filter_fields": "",
				"card_fields": "",
			},
		],
	})
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
