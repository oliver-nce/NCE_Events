// Desk form script for Settings: primary Save button with green confirmation alert.
//
// code-index:begin
// {
//  "purpose": "Desk form script for Settings: primary Save button with green confirmation alert.",
//  "read_when": "Changing Settings form client behaviour or save confirmation UI.",
//  "gotchas": [],
//  "keywords": ["Settings", "refresh", "add_custom_button", "Settings saved", "frappe.ui.form"],
//  "format": 1
// }
// code-index:end

frappe.ui.form.on("Settings", {
	refresh: function (frm) {
		frm.add_custom_button(__("Save"), function () {
			frm.save().then(function () {
				frappe.show_alert({
					message: __("Settings saved"),
					indicator: "green",
				});
			});
		}).addClass("btn-primary-dark");
	},
});
