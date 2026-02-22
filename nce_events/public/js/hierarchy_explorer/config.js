frappe.provide("nce_events.hierarchy");

nce_events.hierarchy.PANE_CONFIG = [
	{
		key: "events",
		label: "Events",
		api_pane: "events",
		columns: [
			{ field: "first_session_date", label: "First Session", type: "date", width: "110px" },
			{ field: "event_name", label: "Event Name", type: "data", width: "1fr" },
			{ field: "female_count", label: "# Females", type: "int", width: "52px", align: "right", color: "#c700e6", bold: true },
			{ field: "male_count", label: "# Males", type: "int", width: "52px", align: "right", color: "#0000FF", bold: true },
			{ field: "player_count", label: "Total", type: "int", width: "52px", align: "right", bold: true },
		],
		row_id_field: "name",
		parent_link_field: null,
		header_buttons: [],
		style_rules: [],
	},
	{
		key: "players",
		label: "Players",
		api_pane: "players",
		columns: [
			{
				field: "_full_name",
				label: "Name",
				type: "computed",
				width: "1fr",
				compute: function (row) {
					return row.last_name + ", " + row.first_name;
				},
				style_rule: {
					field: "gender",
					map: { Male: "#0000FF", Female: "#c700e6", male: "#0000FF", female: "#c700e6" },
				},
			},
			{ field: "yob", label: "YOB", type: "int", width: "60px", align: "right" },
			{ field: "rating", label: "Rating", type: "int", width: "60px", align: "right" },
			{ field: "preferred_position", label: "Position", type: "data", width: "80px" },
			{ field: "player_number", label: "#", type: "int", width: "40px", align: "right" },
			{ field: "family_email", label: "Email", type: "data", width: "1fr" },
		],
		row_id_field: "name",
		parent_link_field: "product_id",
		header_buttons: [
			{ label: "Send Email", icon: "mail", action: null },
			{ label: "Send SMS", icon: "message-square", action: null },
			{ label: "Sheets Link", icon: "link-url", action: "sheets_link" },
		],
		style_rules: [],
	},
];
