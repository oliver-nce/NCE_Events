// Desk list/form helpers for Page Panel Computed Column child rows.
//
// code-index:begin
// {
//  "purpose": "Desk list/form helpers for Page Panel Computed Column child rows.",
//  "read_when": "Changing client behaviour for computed column fields on Page Panel.",
//  "gotchas": [],
//  "keywords": ["page_panel_computed_column", "frappe", "computed", "column"],
//  "format": 1
// }
// code-index:end

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
