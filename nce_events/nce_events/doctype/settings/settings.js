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
