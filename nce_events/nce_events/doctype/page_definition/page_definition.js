// Column cache: report_name -> [col, col, ...]
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

function _open_field_picker(report_name, cdt, cdn, fieldname, label, frm) {
	_get_report_columns(report_name, function (columns) {
		if (!columns.length) {
			frappe.show_alert({ message: __("No columns found for report: {0}", [report_name]), indicator: "orange" });
			return;
		}
		var row = locals[cdt][cdn];
		var current = ((row[fieldname] || "").split(",")).map(function (s) { return s.trim(); }).filter(Boolean);
		var prompt_fields = columns.map(function (col) {
			return {
				fieldname: "col__" + col,
				fieldtype: "Check",
				label: col,
				default: current.indexOf(col) !== -1 ? 1 : 0,
			};
		});
		frappe.prompt(
			prompt_fields,
			function (values) {
				var selected = columns.filter(function (col) { return values["col__" + col]; });
				frappe.model.set_value(cdt, cdn, fieldname, selected.join(", "));
				frm.refresh_field("panels");
			},
			__("Select columns — {0}", [label]),
			__("Apply")
		);
	});
}

function _add_pick_buttons(frm, cdt, cdn) {
	var row = locals[cdt][cdn];
	if (!row || !row.report_name) return;

	var grid_form = frm.cur_grid && frm.cur_grid.grid_form;
	if (!grid_form) return;

	var pick_cfg = [
		{ fieldname: "hidden_fields", label: "Hidden Fields" },
		{ fieldname: "bold_fields",   label: "Bold Fields"   },
		{ fieldname: "card_fields",   label: "Card Fields"   },
	];

	pick_cfg.forEach(function (cfg) {
		var fd = grid_form.fields_dict[cfg.fieldname];
		if (!fd) return;
		var $wrap = fd.$wrapper;
		if ($wrap.find(".pick-col-btn").length) return;   // already added

		var $btn = $('<button class="btn btn-xs btn-default pick-col-btn" style="margin-top:4px;">'
			+ '<i class="fa fa-list-ul" style="margin-right:4px;"></i>' + __("Pick Columns") + '</button>');
		$btn.on("click", function () {
			_open_field_picker(row.report_name, cdt, cdn, cfg.fieldname, cfg.label, frm);
		});
		$wrap.append($btn);
	});
}

// ── Page Definition form events ──────────────────────────────────────────────
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

// ── Page Panel child-table events ────────────────────────────────────────────
frappe.ui.form.on("Page Panel", {
	report_name: function (frm, cdt, cdn) {
		var row = locals[cdt][cdn];
		if (row.report_name) {
			// Pre-warm the cache so pick buttons are instant
			_get_report_columns(row.report_name, function () {});
		}
	},

	form_render: function (frm, cdt, cdn) {
		_add_pick_buttons(frm, cdt, cdn);
	},
});
