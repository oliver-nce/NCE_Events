frappe.ui.form.on("Messaging Configuration", {
	refresh: function (frm) {
		frm.add_custom_button(__("Load Fields"), function () {
			_load_fields(frm);
		});
		frm.add_custom_button(__("Add Synthetic Row"), function () {
			_add_synthetic_row(frm);
		});
		frm.add_custom_button(__("Build Tag List"), function () {
			_build_tag_list(frm);
		});
		_render_table(frm);
	},

	root_doctype: function (frm) {
		if (frm.doc.root_doctype) {
			frm.set_value("report_name", "");
		}
	},
	report_name: function (frm) {
		if (frm.doc.report_name) {
			frm.set_value("root_doctype", "");
		}
	},
});

function _get_fields(frm) {
	try {
		return JSON.parse(frm.doc.fields_json || "[]");
	} catch (e) {
		return [];
	}
}

function _save_fields(frm, fields) {
	frm.set_value("fields_json", JSON.stringify(fields, null, 2));
	frm.dirty();
}

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

function _render_table(frm) {
	var wrapper = frm.fields_dict.fields_html.$wrapper;
	wrapper.empty();

	var fields = _get_fields(frm);
	if (!fields.length) {
		wrapper.html('<p class="text-muted">No fields loaded. Set a Root DocType or Report Name, then click <b>Load Fields</b>.</p>');
		return;
	}

	var gender_field = frm.doc.gender_field || "gender";

	var html = '<table class="table table-bordered msg-fields-table">';
	html += "<thead><tr>";
	html += '<th style="width:30px">#</th>';
	html += '<th style="min-width:140px">Label</th>';
	html += '<th style="min-width:100px">Male</th>';
	html += '<th style="min-width:100px">Female</th>';
	html += '<th style="min-width:200px">Jinja2 Tag</th>';
	html += '<th style="width:40px"></th>';
	html += "</tr></thead><tbody>";

	fields.forEach(function (f, idx) {
		var jinja = _compute_jinja(f.field_name, f.male_value, f.female_value, gender_field);
		var is_synthetic = f.synthetic ? " style=\"background:#FFF8E1;\"" : "";

		html += "<tr data-idx=\"" + idx + "\"" + is_synthetic + ">";
		html += "<td>" + (idx + 1) + "</td>";
		var display_label = f.label || f.field_name.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
		html += "<td>" + frappe.utils.escape_html(display_label) + "</td>";
		html += '<td><input type="text" class="form-control input-sm msg-male" value="' +
			frappe.utils.escape_html(f.male_value || "") + '"></td>';
		html += '<td><input type="text" class="form-control input-sm msg-female" value="' +
			frappe.utils.escape_html(f.female_value || "") + '"></td>';
		html += '<td><code class="msg-jinja">' + frappe.utils.escape_html(jinja) + "</code></td>";
		html += '<td><button class="btn btn-xs btn-danger msg-remove" title="Remove">&times;</button></td>';
		html += "</tr>";
	});

	html += "</tbody></table>";
	wrapper.html(html);

	var gender_field_val = gender_field;

	wrapper.find(".msg-male, .msg-female").on("blur", function () {
		var $tr = $(this).closest("tr");
		var idx = parseInt($tr.data("idx"), 10);
		var flds = _get_fields(frm);
		if (!flds[idx]) return;

		flds[idx].male_value = $tr.find(".msg-male").val().trim();
		flds[idx].female_value = $tr.find(".msg-female").val().trim();

		var jinja = _compute_jinja(flds[idx].field_name, flds[idx].male_value, flds[idx].female_value, gender_field_val);
		$tr.find(".msg-jinja").text(jinja);

		_save_fields(frm, flds);
	});

	wrapper.find("input").on("mousedown", function (e) {
		e.stopPropagation();
	});

	wrapper.find(".msg-remove").on("click", function () {
		var idx = parseInt($(this).closest("tr").data("idx"), 10);
		var flds = _get_fields(frm);
		flds.splice(idx, 1);
		_save_fields(frm, flds);
		_render_table(frm);
	});
}

function _load_fields(frm) {
	if (frm.doc.report_name) {
		_load_fields_from_report(frm);
	} else if (frm.doc.root_doctype) {
		_load_fields_from_doctype(frm);
	} else {
		frappe.msgprint(__("Please set a Root DocType or Report Name first."));
	}
}

function _load_fields_from_report(frm) {
	frappe.call({
		method: "nce_events.api.panel_api.get_report_columns",
		args: { report_name: frm.doc.report_name },
		callback: function (r) {
			if (!r.message || !r.message.length) {
				frappe.msgprint(__("No columns found in report {0}", [frm.doc.report_name]));
				return;
			}
			_merge_fields(frm, r.message.map(function (c) {
				return { fieldname: c.fieldname, label: c.label };
			}));
		},
	});
}

function _load_fields_from_doctype(frm) {
	var dt = frm.doc.root_doctype;
	var skip_types = {
		"Section Break": 1, "Column Break": 1, "Tab Break": 1,
		"HTML": 1, "Fold": 1, "Heading": 1,
	};

	frappe.model.with_doctype(dt, function () {
		var meta = frappe.get_meta(dt);
		if (!meta || !meta.fields || !meta.fields.length) {
			frappe.msgprint(__("No fields found for {0}", [dt]));
			return;
		}

		var data_fields = meta.fields.filter(function (f) {
			return !skip_types[f.fieldtype];
		}).map(function (f) {
			return { fieldname: f.fieldname, label: f.label || "" };
		});

		if (!data_fields.length) {
			frappe.msgprint(__("No data fields found for {0}", [dt]));
			return;
		}
		_merge_fields(frm, data_fields);
	});
}

function _title_case(s) {
	return s.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

function _merge_fields(frm, new_fields) {
	var existing = _get_fields(frm);
	var old_map = {};
	existing.forEach(function (f) { old_map[f.field_name] = f; });

	var result = [];
	new_fields.forEach(function (f) {
		var friendly = f.label || _title_case(f.fieldname);
		var prev = old_map[f.fieldname];
		if (prev) {
			prev.label = friendly;
			result.push(prev);
		} else {
			result.push({
				field_name: f.fieldname,
				label: friendly,
				male_value: "",
				female_value: "",
				synthetic: false,
			});
		}
	});

	existing.forEach(function (f) {
		if (f.synthetic) result.push(f);
	});

	_save_fields(frm, result);
	_render_table(frm);

	frappe.show_alert({
		message: __("{0} fields loaded, synthetic rows preserved", [new_fields.length]),
		indicator: "green",
	});
}

function _add_synthetic_row(frm) {
	frappe.prompt([
		{
			fieldname: "field_name",
			label: "Expression (e.g. he/she)",
			fieldtype: "Data",
			reqd: 1,
		},
		{
			fieldname: "male_value",
			label: "Male Value",
			fieldtype: "Data",
		},
		{
			fieldname: "female_value",
			label: "Female Value",
			fieldtype: "Data",
		},
	], function (values) {
		var fields = _get_fields(frm);
		fields.push({
			field_name: values.field_name,
			male_value: values.male_value || "",
			female_value: values.female_value || "",
			synthetic: true,
		});
		_save_fields(frm, fields);
		_render_table(frm);
	}, __("Add Synthetic Row"));
}

function _build_tag_list(frm) {
	var fields = _get_fields(frm);
	if (!fields.length) {
		frappe.msgprint(__("No fields in the table. Load fields first."));
		return;
	}

	var gender_field = frm.doc.gender_field || "gender";
	var tags = [];

	fields.forEach(function (f) {
		var jinja = _compute_jinja(f.field_name, f.male_value, f.female_value, gender_field);
		tags.push({ field: f.field_name, label: f.label || "", tag: jinja });
	});

	frm.set_value("tag_list", JSON.stringify(tags, null, 2));
	frm.dirty();
	frappe.show_alert({
		message: __("{0} tags generated", [tags.length]),
		indicator: "green",
	});
}
