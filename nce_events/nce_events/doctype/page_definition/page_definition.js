var _rpt_col_cache = {};

function _get_report_columns(report_name, callback) {
	if (_rpt_col_cache[report_name]) {
		callback(_rpt_col_cache[report_name]);
		return;
	}
	frappe.call({
		method: "nce_events.api.panel_api.get_report_columns",
		args: { report_name: report_name },
		callback: function (r) {
			var cols = (r && r.message) ? r.message : [];
			_rpt_col_cache[report_name] = cols;
			callback(cols);
		},
	});
}

// Fields to hide from the native Frappe form — replaced by the matrix table
var MATRIX_BACKED_FIELDS = [
	"hidden_fields", "bold_fields", "card_fields", "male_field", "female_field",
];

function _hide_backed_fields(grid_form) {
	MATRIX_BACKED_FIELDS.forEach(function (fn) {
		var fd = grid_form.fields_dict[fn];
		if (fd && fd.$wrapper) $(fd.$wrapper).hide();
	});
}

function _get_grid_form(frm) {
	// frm.cur_grid is reliable in most cases; fall back to the panels grid
	if (frm.cur_grid && frm.cur_grid.grid_form) return frm.cur_grid.grid_form;
	var panels_field = frm.fields_dict && frm.fields_dict["panels"];
	if (panels_field && panels_field.grid && panels_field.grid.grid_form) {
		return panels_field.grid.grid_form;
	}
	return null;
}

function _render_matrix(frm, cdt, cdn) {
	var row = locals[cdt][cdn];
	if (!row || !row.report_name) return;

	// Defer slightly so Frappe finishes painting the child form
	setTimeout(function () {
		var grid_form = _get_grid_form(frm);
		if (!grid_form) return;

		_hide_backed_fields(grid_form);

		_get_report_columns(row.report_name, function (columns) {
			// Anchor: the section break wrapper's inner .section-body, or the form wrapper
			var anchor_fd = grid_form.fields_dict["section_break_display"];
			var $anchor = anchor_fd
				? (anchor_fd.$wrapper.find(".section-body").first().length
					? anchor_fd.$wrapper.find(".section-body").first()
					: anchor_fd.$wrapper)
				: $(grid_form.wrapper);

			// Remove existing matrix
			$anchor.find(".panel-col-matrix").remove();

		// Parse current values
		function parse_csv(val) {
			return ((val || "").split(",")).map(function (s) { return s.trim(); }).filter(Boolean);
		}
		var hidden  = parse_csv(row.hidden_fields);
		var bold    = parse_csv(row.bold_fields);
		var card    = parse_csv(row.card_fields);
		var male    = (row.male_field   || "").trim();
		var female  = (row.female_field || "").trim();

		// Build table
		var th = ["List", "Card", "Bold", "Male", "Female"];
		var html = '<div class="panel-col-matrix" style="margin-top:10px;overflow-x:auto;">'
			+ '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
			+ '<thead><tr>'
			+ '<th style="text-align:left;padding:4px 8px;border-bottom:1px solid #d1d8dd;color:#6c7680;">Field</th>';
		th.forEach(function (h) {
			html += '<th style="text-align:center;padding:4px 8px;border-bottom:1px solid #d1d8dd;color:#6c7680;white-space:nowrap;">' + h + '</th>';
		});
		html += '</tr></thead><tbody>';

		columns.forEach(function (col, i) {
			var bg = i % 2 === 0 ? "" : 'style="background:#f8f9fa;"';
			var list_checked  = hidden.indexOf(col) === -1 ? "checked" : "";
			var card_checked  = card.indexOf(col)   !== -1 ? "checked" : "";
			var bold_checked  = bold.indexOf(col)   !== -1 ? "checked" : "";
			var male_checked  = male   === col ? "checked" : "";
			var female_checked= female === col ? "checked" : "";

			var td = 'style="text-align:center;padding:4px 8px;"';
			html += '<tr ' + bg + '>'
				+ '<td style="padding:4px 8px;">' + frappe.utils.escape_html(col) + '</td>'
				+ '<td ' + td + '><input type="checkbox" data-col="' + frappe.utils.escape_html(col) + '" data-role="list" ' + list_checked + '></td>'
				+ '<td ' + td + '><input type="checkbox" data-col="' + frappe.utils.escape_html(col) + '" data-role="card" ' + card_checked + '></td>'
				+ '<td ' + td + '><input type="checkbox" data-col="' + frappe.utils.escape_html(col) + '" data-role="bold" ' + bold_checked + '></td>'
				+ '<td ' + td + '><input type="radio"    data-col="' + frappe.utils.escape_html(col) + '" name="male_field_' + cdn + '"   ' + male_checked + '></td>'
				+ '<td ' + td + '><input type="radio"    data-col="' + frappe.utils.escape_html(col) + '" name="female_field_' + cdn + '" ' + female_checked + '></td>'
				+ '</tr>';
		});
		html += '</tbody></table></div>';

		var $matrix = $(html);

		// Wire up events
		function _sync() {
			var new_hidden = [], new_card = [], new_bold = [], new_male = "", new_female = "";
			columns.forEach(function (col) {
				var $row = $matrix.find('input[data-col="' + col + '"]');
				if (!$row.filter('[data-role="list"]').prop("checked")) new_hidden.push(col);
				if ($row.filter('[data-role="card"]').prop("checked"))  new_card.push(col);
				if ($row.filter('[data-role="bold"]').prop("checked"))  new_bold.push(col);
			});
			var $male_radio = $matrix.find('input[name="male_field_' + cdn + '"]:checked');
			if ($male_radio.length) new_male = $male_radio.data("col");
			var $female_radio = $matrix.find('input[name="female_field_' + cdn + '"]:checked');
			if ($female_radio.length) new_female = $female_radio.data("col");

			frappe.model.set_value(cdt, cdn, "hidden_fields", new_hidden.join(", "));
			frappe.model.set_value(cdt, cdn, "bold_fields",   new_bold.join(", "));
			frappe.model.set_value(cdt, cdn, "card_fields",   new_card.join(", "));
			frappe.model.set_value(cdt, cdn, "male_field",    new_male);
			frappe.model.set_value(cdt, cdn, "female_field",  new_female);
		}

		$matrix.on("change", "input[type=checkbox], input[type=radio]", _sync);

		$anchor.append($matrix);
	});
	}, 50);
}

// ── Page Definition form ──────────────────────────────────────────────────────
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

// ── Page Panel child-table events ─────────────────────────────────────────────
frappe.ui.form.on("Page Panel", {
	form_render: function (frm, cdt, cdn) {
		_render_matrix(frm, cdt, cdn);
	},

	report_name: function (frm, cdt, cdn) {
		var row = locals[cdt][cdn];
		if (row.report_name) {
			delete _rpt_col_cache[row.report_name];
			_render_matrix(frm, cdt, cdn);
		}
	},
});
