frappe.ui.form.on("Page Definition", {
	refresh(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__("Build Page"), function () {
				frappe.call({
					method: "nce_events.api.panel_api.build_page",
					args: { page_name: frm.doc.page_name },
					freeze: true,
					freeze_message: __("Building page…"),
					callback(r) {
						if (r.message) {
							const url = r.message.page_url;
							frappe.show_alert({
								message: __("Page ready — <a href='{0}' target='_blank'>open it</a>", [url]),
								indicator: "green",
							}, 8);
						}
					},
				});
			}, __("Actions"));
		}
	},
});
