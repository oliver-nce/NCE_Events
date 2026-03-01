frappe.provide("nce_events.panel_page");

nce_events.panel_page.page_configs = {
	"event-explorer": {
		page_name: "event-explorer",
		page_title: "Event Explorer Beta",
		male_hex: "#0000FF",
		female_hex: "#c700e6",
		panels: [
			{
				panel_number: 1,
				header_text: "Events",
				sql_query: "SELECT\n\te.`name`,\n\te.first_session_date,\n\te.event_name,\n\tIFNULL(rc.female_count, 0) AS female_count,\n\tIFNULL(rc.male_count, 0) AS male_count,\n\tIFNULL(rc.player_count, 0) AS player_count,\n\te.product_type AS Type,\n\te.sessions_html,\n\ttabVenues.map_link\nFROM\n\ttabEvents AS e\n\tLEFT JOIN (\n\t\tSELECT\n\t\t\tr.product_id,\n\t\t\tSUM(CASE WHEN fm.gender = 'Female' THEN 1 ELSE 0 END) AS female_count,\n\t\t\tSUM(CASE WHEN fm.gender = 'Male' THEN 1 ELSE 0 END) AS male_count,\n\t\t\tCOUNT(*) AS player_count\n\t\tFROM tabRegistrations AS r\n\t\tINNER JOIN `tabFamily Members` AS fm ON r.player_id = fm.`name`\n\t\tGROUP BY r.product_id\n\t) AS rc ON rc.product_id = e.`name`\n\tINNER JOIN tabVenues ON e.venue_id = tabVenues.`name`\nWHERE\n\te.first_session_date > DATE_SUB(CURDATE(), INTERVAL 30 DAY)\n\tAND e.product_type IN ('Training','Tryouts','Camp')\nORDER BY e.first_session_date ASC",
				hidden_fields: ["name", "Type", "sessions_html", "map_link"],
				bold_fields: ["female_count", "male_count", "player_count"],
				filter_fields: ["Type"],
				card_fields: ["name", "Type", "sessions_html", "map_link"],
			},
			{
				panel_number: 2,
				header_text: "Players",
				sql_query: "SELECT\n\tfm.name,\n\tconcat(fm.last_name,', ',fm.first_name) AS Player,\n\tfm.gender,\n\tfm.yob,\n\tfm.rating,\n\tfm.preferred_position AS position,\n\tfm.player_number,\n\tf.email AS Email,\n\tf.phone\nFROM `tabRegistrations` r\nINNER JOIN `tabFamily Members` fm ON r.player_id = fm.name\nINNER JOIN `tabFamilies` f ON fm.wp_parent_user_id = f.name\nWHERE r.product_id = p1.name\nORDER BY fm.gender ASC, fm.last_name ASC",
				hidden_fields: ["name", "gender", "Email", "phone"],
				bold_fields: [],
				filter_fields: ["gender", "yob"],
				card_fields: ["Player"],
				button_1_name: "Send SMS",
				button_1_code: "",
				button_2_name: "Send Email",
				button_2_code: "",
			},
		],
	},
};
