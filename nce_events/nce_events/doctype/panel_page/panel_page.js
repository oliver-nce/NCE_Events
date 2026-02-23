frappe.ui.form.on("Panel Page", {
	refresh(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__("Copy JSON Spec"), function () {
				const spec = {
					page_name: frm.doc.page_name,
					page_title: frm.doc.page_title,
					active: frm.doc.active,
					male_hex: frm.doc.male_hex || "",
					female_hex: frm.doc.female_hex || "",
					panels: (frm.doc.panels || [])
						.sort((a, b) => a.panel_number - b.panel_number)
						.map((p) => {
							const panel = {
								panel_number: p.panel_number,
								header_text: p.header_text || "",
								sql_query: p.sql_query || "",
								hidden_fields: p.hidden_fields || "",
								bold_fields: p.bold_fields || "",
								filter_fields: p.filter_fields || "",
								card_fields: p.card_fields || "",
							};
							if (p.button_1_name) {
								panel.button_1_name = p.button_1_name;
								panel.button_1_code = p.button_1_code || "";
							}
							if (p.button_2_name) {
								panel.button_2_name = p.button_2_name;
								panel.button_2_code = p.button_2_code || "";
							}
							return panel;
						}),
				};

				const json_str = JSON.stringify(spec, null, 2);

				navigator.clipboard.writeText(json_str).then(
					() => frappe.show_alert({ message: __("JSON copied to clipboard"), indicator: "green" }),
					() => {
						frappe.msgprint({ title: __("JSON Spec"), message: `<pre>${frappe.utils.escape_html(json_str)}</pre>` });
					}
				);
			});
		}
	},
});
