// Email Template form script adding an Insert Tag button that opens Tag Finder.
//
// code-index:begin
// {
//  "purpose": "Email Template form script adding an Insert Tag button that opens Tag Finder.",
//  "read_when": "Wiring Tag Finder into Email Template or fixing Insert Tag availability.",
//  "gotchas": [],
//  "keywords": ["Email Template", "Insert Tag", "schema_explorer", "Tag Finder", "form script"],
//  "format": 1
// }
// code-index:end

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
