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
var TAB_ORDER  = ["basic", "display", "widgets", "buttons"];
var TAB_LABELS = { basic: "Basic", display: "Display", widgets: "Widgets", buttons: "Buttons" };
var ALL_PANEL_FIELDS = [].concat(
	TAB_GROUPS.basic, TAB_GROUPS.display, TAB_GROUPS.widgets, TAB_GROUPS.buttons
);
// Native inputs replaced by the matrix — never shown directly
var MATRIX_FIELDS = ["hidden_fields", "bold_fields", "card_fields", "male_field", "female_field"];
// Section-break / column-break fields Frappe still renders — always hide
var BREAK_FIELDS = [
	"section_break_display", "column_break_display",
	"section_break_header_widgets", "column_break_header_widgets",
	"section_break_card_actions",
	"section_break_buttons", "column_break_buttons",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function _get_grid_form(frm) {
	if (frm.cur_grid && frm.cur_grid.grid_form) return frm.cur_grid.grid_form;
	var f = frm.fields_dict && frm.fields_dict["panels"];
	return (f && f.grid && f.grid.grid_form) ? f.grid.grid_form : null;
}

function _hide_all_fields(grid_form) {
	ALL_PANEL_FIELDS.forEach(function (fn) {
		var fd = grid_form.fields_dict[fn];
		if (fd && fd.$wrapper) $(fd.$wrapper).hide();
	});
}

function _show_tab(grid_form, tab_id) {
	_hide_all_fields(grid_form);

	// Always hide break fields (section/column breaks clutter the UI)
	BREAK_FIELDS.forEach(function (fn) {
		var fd = grid_form.fields_dict[fn];
		if (fd && fd.$wrapper) $(fd.$wrapper).hide();
	});

	// Show fields for this tab, skipping matrix-backed and break fields
	(TAB_GROUPS[tab_id] || []).forEach(function (fn) {
		if (MATRIX_FIELDS.indexOf(fn) !== -1) return;
		if (BREAK_FIELDS.indexOf(fn) !== -1) return;
		var fd = grid_form.fields_dict[fn];
		if (fd && fd.$wrapper) $(fd.$wrapper).show();
	});

	// Show/hide matrix container
	var $wrap = $(grid_form.wrapper);
	$wrap.find(".pp-matrix-wrap").toggle(tab_id === "display");

	// Update active tab button style
	$wrap.find(".pp-tab-btn").css({ background: "", color: "", fontWeight: "" });
	$wrap.find('.pp-tab-btn[data-tab="' + tab_id + '"]').css({
		background: "#171717", color: "#fff", fontWeight: "600",
	});
	$wrap.data("pp-active-tab", tab_id);
}

function _ensure_tab_bar(frm, cdt, cdn, grid_form) {
	var $wrap = $(grid_form.wrapper);
	if ($wrap.find(".pp-tab-bar").length) return;

	// Anchor: insert tab bar right before the first field (panel_number)
	var first_fd = grid_form.fields_dict["panel_number"];
	if (!first_fd || !first_fd.$wrapper) return;

	// Tab bar
	var tab_html = '<div class="pp-tab-bar" style="display:flex;gap:4px;padding:6px 0 10px;margin-bottom:6px;border-bottom:1px solid #d1d8dd;">';
	TAB_ORDER.forEach(function (tab_id) {
		tab_html += '<button class="btn btn-xs btn-default pp-tab-btn" data-tab="' + tab_id + '" '
			+ 'style="padding:3px 14px;border-radius:4px;">'
			+ TAB_LABELS[tab_id] + '</button>';
	});
	tab_html += '</div>';

	// Matrix placeholder container (empty until Display tab clicked)
	var $tab_bar    = $(tab_html);
	var $matrix_wrap = $('<div class="pp-matrix-wrap" style="display:none;padding-bottom:8px;"></div>');

	$(first_fd.$wrapper).before($tab_bar).before($matrix_wrap);

	// Wire tab clicks
	$tab_bar.on("click", ".pp-tab-btn", function () {
		var tab_id = $(this).data("tab");
		_show_tab(grid_form, tab_id);
		if (tab_id === "display") _render_matrix(frm, cdt, cdn);
	});

	// Start on Basic
	_show_tab(grid_form, "basic");
}

// ── Matrix renderer ───────────────────────────────────────────────────────────
function _render_matrix(frm, cdt, cdn) {
	var row = locals[cdt][cdn];
	if (!row || !row.report_name) return;
	var grid_form = _get_grid_form(frm);
	if (!grid_form) return;
	var $container = $(grid_form.wrapper).find(".pp-matrix-wrap");
	if (!$container.length) return;

	_get_report_columns(row.report_name, function (columns) {
		$container.empty();

		function parse_csv(val) {
			return ((val || "").split(",")).map(function (s) { return s.trim(); }).filter(Boolean);
		}
		var hidden = parse_csv(row.hidden_fields);
		var bold   = parse_csv(row.bold_fields);
		var card   = parse_csv(row.card_fields);
		var male   = (row.male_field   || "").trim();
		var female = (row.female_field || "").trim();

		var th_style = 'style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
		var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
			+ '<thead><tr>'
			+ '<th style="text-align:left;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;">Field</th>'
			+ '<th ' + th_style + '>List</th>'
			+ '<th ' + th_style + '>Card</th>'
			+ '<th ' + th_style + '>Bold</th>'
			+ '<th ' + th_style + '>Male</th>'
			+ '<th ' + th_style + '>Female</th>'
			+ '</tr></thead><tbody>';

		columns.forEach(function (col, i) {
			var bg  = i % 2 !== 0 ? ' style="background:#f8f9fa;"' : '';
			var c   = frappe.utils.escape_html(col);
			var td  = 'style="text-align:center;padding:4px 8px;"';
			html += '<tr' + bg + '>'
				+ '<td style="padding:4px 8px;">' + c + '</td>'
				+ '<td ' + td + '><input type="checkbox" data-col="' + c + '" data-role="list"'   + (hidden.indexOf(col) === -1 ? " checked" : "") + '></td>'
				+ '<td ' + td + '><input type="checkbox" data-col="' + c + '" data-role="card"'   + (card.indexOf(col)   !== -1 ? " checked" : "") + '></td>'
				+ '<td ' + td + '><input type="checkbox" data-col="' + c + '" data-role="bold"'   + (bold.indexOf(col)   !== -1 ? " checked" : "") + '></td>'
				+ '<td ' + td + '><input type="radio"    data-col="' + c + '" name="male_'   + cdn + '"' + (male   === col ? " checked" : "") + '></td>'
				+ '<td ' + td + '><input type="radio"    data-col="' + c + '" name="female_' + cdn + '"' + (female === col ? " checked" : "") + '></td>'
				+ '</tr>';
		});
		html += '</tbody></table>';

		var $matrix = $(html);

		function _sync() {
			var nh = [], nc = [], nb = [], nm = "", nf = "";
			columns.forEach(function (col) {
				var esc = frappe.utils.escape_html(col);
				var $r = $matrix.find('input[data-col="' + esc + '"]');
				if (!$r.filter('[data-role="list"]').prop("checked")) nh.push(col);
				if ($r.filter('[data-role="card"]').prop("checked"))  nc.push(col);
				if ($r.filter('[data-role="bold"]').prop("checked"))  nb.push(col);
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
		$container.append($matrix);
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
		if ($(grid_form.wrapper).data("pp-active-tab") === "display") {
			_render_matrix(frm, cdt, cdn);
		}
	},
});
