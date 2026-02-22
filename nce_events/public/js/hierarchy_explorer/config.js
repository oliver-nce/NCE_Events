frappe.provide("nce_events.hierarchy");

nce_events.hierarchy.PANE_CONFIG = [
	{
		key: "events",
		label: "Events",
		api_pane: "events",
		columns: [
			{ field: "first_session_date", label: "First Session", type: "date", width: "110px" },
			{ field: "event_name", label: "Event Name", type: "data", width: "1fr" },
			{ field: "player_count", label: "# Players", type: "int", width: "80px", align: "right" },
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
					map: { Male: "#0000FF", Female: "#DC143C" },
				},
			},
			{ field: "yob", label: "YOB", type: "int", width: "60px", align: "right" },
			{ field: "rating", label: "Rating", type: "int", width: "60px", align: "right" },
			{ field: "family_email", label: "Email", type: "data", width: "1fr" },
		],
		row_id_field: "name",
		parent_link_field: "product_id",
		header_buttons: [
			{ label: "Send Email", icon: "mail", action: null },
			{ label: "Send SMS", icon: "message-circle", action: null },
		],
		style_rules: [],
	},
];
