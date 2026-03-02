// ── Column cache ──────────────────────────────────────────────────────────────
var _rpt_col_cache = {};

function _get_report_columns(report_name, callback) {
	if (_rpt_col_cache[report_name]) { callback(_rpt_col_cache[report_name]); return; }
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

// ── Tab definitions ───────────────────────────────────────────────────────────
var TAB_GROUPS = {
	basic:   ["panel_number", "header_text", "report_name", "root_doctype", "where_clause"],
	display: ["section_break_display", "hidden_fields", "bold_fields", "male_field",
	          "column_break_display", "card_fields", "female_field"],
	widgets: ["section_break_header_widgets", "show_filter", "show_sheets",
	          "column_break_header_widgets", "show_email", "show_sms",
	          "section_break_card_actions", "show_card_email", "show_card_sms"],
	buttons: ["section_break_buttons", "button_1_name", "button_1_code",
	          "column_break_buttons", "button_2_name", "button_2_code"],
};
var TAB_LABELS = { basic: "Basic", display: "Display", widgets: "Widgets", buttons: "Buttons" };
var ALL_PANEL_FIELDS = [].concat(
	TAB_GROUPS.basic, TAB_GROUPS.display, TAB_GROUPS.widgets, TAB_GROUPS.buttons
);
// Backing fields replaced by the matrix — never show native inputs
var MATRIX_FIELDS = ["hidden_fields", "bold_fields", "card_fields", "male_field", "female_field"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function _get_grid_form(frm) {
	if (frm.cur_grid && frm.cur_grid.grid_form) return frm.cur_grid.grid_form;
	var f = frm.fields_dict && frm.fields_dict["panels"];
	return (f && f.grid && f.grid.grid_form) ? f.grid.grid_form : null;
}

function _show_tab(grid_form, tab_id) {
	// Hide all managed fields
	ALL_PANEL_FIELDS.forEach(function (fn) {
		var fd = grid_form.fields_dict[fn];
		if (fd && fd.$wrapper) $(fd.$wrapper).hide();
	});
	// Show fields for the active tab, except matrix-backed ones
	(TAB_GROUPS[tab_id] || []).forEach(function (fn) {
		if (MATRIX_FIELDS.indexOf(fn) !== -1) return;
		var fd = grid_form.fields_dict[fn];
		if (fd && fd.$wrapper) $(fd.$wrapper).show();
	});
	// Update tab bar active state
	$(grid_form.wrapper).find(".pp-tab-btn").removeClass("pp-tab-active");
	$(grid_form.wrapper).find('.pp-tab-btn[data-tab="' + tab_id + '"]').addClass("pp-tab-active");
	// Store active tab on the wrapper so matrix render knows
	$(grid_form.wrapper).data("pp-active-tab", tab_id);
}

function _ensure_tab_bar(frm, cdt, cdn, grid_form) {
	var $wrap = $(grid_form.wrapper);
	if ($wrap.find(".pp-tab-bar").length) return;

	var $bar = $('<div class="pp-tab-bar" style="display:flex;gap:4px;padding:8px 0 10px;border-bottom:1px solid #d1d8dd;margin-bottom:8px;"></div>');
	Object.keys(TAB_LABELS).forEach(function (tab_id) {
		var $btn = $('<button class="btn btn-xs btn-default pp-tab-btn" data-tab="' + tab_id + '" style="padding:3px 12px;">'
			+ TAB_LABELS[tab_id] + '</button>');
		$btn.on("click", function () {
			_show_tab(grid_form, tab_id);
			if (tab_id === "display") _render_matrix(frm, cdt, cdn);
		});
		$bar.append($btn);
	});

	$wrap.prepend($bar);
	_show_tab(grid_form, "basic");
}

// ── Matrix renderer ───────────────────────────────────────────────────────────
function _render_matrix(frm, cdt, cdn) {
	var row = locals[cdt][cdn];
	if (!row || !row.report_name) return;

	var grid_form = _get_grid_form(frm);
	if (!grid_form) return;

	var $wrap = $(grid_form.wrapper);

	_get_report_columns(row.report_name, function (columns) {
		$wrap.find(".panel-col-matrix").remove();

		function parse_csv(val) {
			return ((val || "").split(",")).map(function (s) { return s.trim(); }).filter(Boolean);
		}
		var hidden = parse_csv(row.hidden_fields);
		var bold   = parse_csv(row.bold_fields);
		var card   = parse_csv(row.card_fields);
		var male   = (row.male_field   || "").trim();
		var female = (row.female_field || "").trim();

		var html = '<div class="panel-col-matrix" style="margin-top:4px;overflow-x:auto;">'
			+ '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
			+ '<thead><tr>'
			+ '<th style="text-align:left;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;">Field</th>'
			+ '<th style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;">List</th>'
			+ '<th style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;">Card</th>'
			+ '<th style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;">Bold</th>'
			+ '<th style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;">Male</th>'
			+ '<th style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;">Female</th>'
			+ '</tr></thead><tbody>';

		columns.forEach(function (col, i) {
			var bg = i % 2 !== 0 ? ' style="background:#f8f9fa;"' : '';
			var c  = frappe.utils.escape_html(col);
			html += '<tr' + bg + '>'
				+ '<td style="padding:4px 8px;">' + c + '</td>'
				+ '<td style="text-align:center;padding:4px 8px;"><input type="checkbox" data-col="' + c + '" data-role="list"'   + (hidden.indexOf(col) === -1 ? " checked" : "") + '></td>'
				+ '<td style="text-align:center;padding:4px 8px;"><input type="checkbox" data-col="' + c + '" data-role="card"'   + (card.indexOf(col)   !== -1 ? " checked" : "") + '></td>'
				+ '<td style="text-align:center;padding:4px 8px;"><input type="checkbox" data-col="' + c + '" data-role="bold"'   + (bold.indexOf(col)   !== -1 ? " checked" : "") + '></td>'
				+ '<td style="text-align:center;padding:4px 8px;"><input type="radio"    data-col="' + c + '" name="male_'   + cdn + '"' + (male   === col ? " checked" : "") + '></td>'
				+ '<td style="text-align:center;padding:4px 8px;"><input type="radio"    data-col="' + c + '" name="female_' + cdn + '"' + (female === col ? " checked" : "") + '></td>'
				+ '</tr>';
		});
		html += '</tbody></table></div>';

		var $matrix = $(html);

		function _sync() {
			var nh = [], nc = [], nb = [], nm = "", nf = "";
			columns.forEach(function (col) {
				var $inputs = $matrix.find('input[data-col="' + frappe.utils.escape_html(col) + '"]');
				if (!$inputs.filter('[data-role="list"]').prop("checked")) nh.push(col);
				if ($inputs.filter('[data-role="card"]').prop("checked"))  nc.push(col);
				if ($inputs.filter('[data-role="bold"]').prop("checked"))  nb.push(col);
			});
			var $mr = $matrix.find('input[name="male_'   + cdn + '"]:checked');
			var $fr = $matrix.find('input[name="female_' + cdn + '"]:checked');
			if ($mr.length) nm = $mr.data("col");
			if ($fr.length) nf = $fr.data("col");
			frappe.model.set_value(cdt, cdn, "hidden_fields", nh.join(", "));
			frappe.model.set_value(cdt, cdn, "bold_fields",   nb.join(", "));
			frappe.model.set_value(cdt, cdn, "card_fields",   nc.join(", "));
			frappe.model.set_value(cdt, cdn, "male_field",    nm);
			frappe.model.set_value(cdt, cdn, "female_field",  nf);
		}
		$matrix.on("change", "input", _sync);

		// Insert after the tab bar
		var $bar = $wrap.find(".pp-tab-bar");
		if ($bar.length) $bar.after($matrix); else $wrap.append($matrix);
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
							frappe.show_alert({
								message: __("Page ready — <a href='{0}' target='_blank'>open it</a>", [r.message.page_url]),
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
		setTimeout(function () {
			var grid_form = _get_grid_form(frm);
			if (!grid_form) return;
			_ensure_tab_bar(frm, cdt, cdn, grid_form);
		}, 50);
	},

	report_name: function (frm, cdt, cdn) {
		var row = locals[cdt][cdn];
		if (!row.report_name) return;
		delete _rpt_col_cache[row.report_name];
		var grid_form = _get_grid_form(frm);
		if (!grid_form) return;
		var active = $(grid_form.wrapper).data("pp-active-tab");
		if (active === "display") _render_matrix(frm, cdt, cdn);
	},
});
