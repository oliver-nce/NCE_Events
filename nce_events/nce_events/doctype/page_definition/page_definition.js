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

var PICKER_FIELDS = [
	{ fieldname: "hidden_fields", label: "Hidden Fields" },
	{ fieldname: "bold_fields",   label: "Bold Fields"   },
	{ fieldname: "card_fields",   label: "Card Fields"   },
];

function _render_checkboxes(frm, cdt, cdn) {
	var row = locals[cdt][cdn];
	if (!row || !row.report_name) return;

	var grid_form = frm.cur_grid && frm.cur_grid.grid_form;
	if (!grid_form) return;

	_get_report_columns(row.report_name, function (columns) {
		PICKER_FIELDS.forEach(function (cfg) {
			var fd = grid_form.fields_dict[cfg.fieldname];
			if (!fd) return;

			var $wrap = fd.$wrapper;

			// Hide the native textarea
			$wrap.find(".control-input-wrapper, .control-value").hide();

			// Remove any previously rendered checkbox group
			$wrap.find(".col-checkbox-group").remove();

			var current = ((row[cfg.fieldname] || "").split(","))
				.map(function (s) { return s.trim(); })
				.filter(Boolean);

			var $group = $('<div class="col-checkbox-group" style="display:flex;flex-direction:column;gap:5px;padding:6px 0;"></div>');

			columns.forEach(function (col) {
				var checked = current.indexOf(col) !== -1 ? "checked" : "";
				var $lbl = $('<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">'
					+ '<input type="checkbox" ' + checked + ' style="cursor:pointer;"> '
					+ frappe.utils.escape_html(col)
					+ '</label>');

				$lbl.find("input").on("change", function () {
					// Re-read all checked boxes in this group
					var selected = [];
					$group.find("input[type=checkbox]").each(function () {
						if (this.checked) selected.push($(this).closest("label").text().trim());
					});
					frappe.model.set_value(cdt, cdn, cfg.fieldname, selected.join(", "));
				});

				$group.append($lbl);
			});

			$wrap.append($group);
		});
	});
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
		_render_checkboxes(frm, cdt, cdn);
	},

	report_name: function (frm, cdt, cdn) {
		var row = locals[cdt][cdn];
		if (row.report_name) {
			// Invalidate cache so fresh columns are fetched, then re-render
			delete _rpt_col_cache[row.report_name];
			_render_checkboxes(frm, cdt, cdn);
		}
	},
});
