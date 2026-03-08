frappe.ui.form.on("Page Panel Computed Column", {
	field_name: function (frm, cdt, cdn) {
		const row = frappe.get_doc(cdt, cdn);
		if (!row.label && row.field_name) {
			frappe.model.set_value(cdt, cdn, "label", _title_case(row.field_name));
		}
	},
});

function _title_case(name) {
	return (name || "").replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}
