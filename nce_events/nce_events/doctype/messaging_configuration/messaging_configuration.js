frappe.ui.form.on("Messaging Configuration", {
	refresh: function (frm) {
		frm.add_custom_button(__("Rebuild Tags"), function () {
			_rebuild_tags(frm);
		});
		frm.add_custom_button(__("Add Synthetic Tag"), function () {
			_add_synthetic_tag(frm);
		});
	},
});

function _compute_jinja(field_name, male, female, gender_field) {
	male = (male || "").trim();
	female = (female || "").trim();
	if (male || female) {
		return "{% if " + gender_field + " == 'Male' %}" +
			(male || field_name) +
			"{% else %}" +
			(female || field_name) +
			"{% endif %}";
	}
	return "{{ " + field_name + " }}";
}

function _rebuild_tags(frm) {
	frm.save().then(function () {
		frappe.call({
			method: "nce_events.api.panel_api.rebuild_field_tags",
			freeze: true,
			freeze_message: __("Scanning custom DocTypes\u2026"),
			callback: function (r) {
				if (r.message) {
					frappe.show_alert({
						message: __("{0} field tags rebuilt", [r.message.total]),
						indicator: "green",
					});
					frm.reload_doc();
				}
			},
		});
	});
}

function _add_synthetic_tag(frm) {
	frappe.prompt([
		{ fieldname: "field_name", label: "Field Name", fieldtype: "Data", reqd: 1 },
		{ fieldname: "label", label: "Label", fieldtype: "Data", reqd: 1 },
		{ fieldname: "male_value", label: "Male Value", fieldtype: "Data" },
		{ fieldname: "female_value", label: "Female Value", fieldtype: "Data" },
	], function (values) {
		var gender_field = frm.doc.gender_field || "gender";
		var jinja = _compute_jinja(values.field_name, values.male_value, values.female_value, gender_field);
		frm.add_child("field_tags", {
			field_name: values.field_name,
			label: values.label,
			male_value: values.male_value || "",
			female_value: values.female_value || "",
			jinja_tag: jinja,
			source_table: "",
			source_doctype: "",
			expose: 1,
			synthetic: 1,
		});
		frm.refresh_field("field_tags");
		frm.dirty();
		frappe.show_alert({
			message: __("Synthetic tag \u201c{0}\u201d added", [values.label]),
			indicator: "green",
		});
	}, __("Add Synthetic Tag"));
}
