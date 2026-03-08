frappe.ui.form.on("Email Template", {
	refresh: function (frm) {
		frm.add_custom_button(__("Insert Tag"), function () {
			if (nce_events.schema_explorer && nce_events.schema_explorer.open) {
				nce_events.schema_explorer.open();
			} else {
				frappe.msgprint(__("Tag Finder not available."));
			}
		});
	},
});
