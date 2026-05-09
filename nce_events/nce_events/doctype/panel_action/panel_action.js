frappe.ui.form.on("Panel Action", {
	refresh(frm) {
		if (frm.doc.action_type !== "Form Dialog") {
			return;
		}
		frm.add_custom_button(__("Capture from Desk"), () => {
			if (!frm.doc.target_doctype) {
				frappe.msgprint({
					title: __("Capture from Desk"),
					message: __("Set Target DocType first."),
					indicator: "orange",
				});
				return;
			}
			if (frm.is_dirty()) {
				frappe.msgprint({
					title: __("Capture from Desk"),
					message: __("Save the row before capturing."),
					indicator: "orange",
				});
				return;
			}
			const proceed = () => {
				frappe.call({
					method: "nce_events.api.panel_actions.capture_panel_action_dialog",
					args: { action_id: frm.doc.name },
					freeze: true,
					freeze_message: __("Capturing from Desk\u2026"),
					callback(r) {
						if (!r.message) return;
						frappe.show_alert({
							message: __("Captured {0} fields", [r.message.field_count]),
							indicator: "green",
						});
						frm.reload_doc();
					},
				});
			};
			if (frm.doc.frozen_meta_json) {
				frappe.confirm(
					__("Overwrite the existing captured schema?"),
					proceed,
				);
			} else {
				proceed();
			}
		});
	},
});
