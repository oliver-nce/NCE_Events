// ── DocType field cache ───────────────────────────────────────────────────────
var _dt_field_cache = {};

function _get_doctype_fields(doctype, callback) {
	if (_dt_field_cache[doctype]) { callback(_dt_field_cache[doctype]); return; }
	frappe.call({
		method: "nce_events.api.panel_api.get_doctype_fields",
		args: { root_doctype: doctype },
		callback: function (r) {
			var fields = (r && r.message) || [];
			_dt_field_cache[doctype] = fields;
			callback(fields);
		},
	});
}

// ── Tab definitions ───────────────────────────────────────────────────────────
var TAB_GROUPS = {
	config: [
		"root_doctype", "header_text",
		"section_break_widgets", "show_filter", "show_sheets",
		"column_break_widgets", "show_email", "show_sms",
		"email_field", "sms_field",
		"section_break_tile_actions", "show_card_email", "show_card_sms",
	],
	display: [],
};
var TAB_ORDER  = ["config", "display"];
var TAB_LABELS = { config: "Config", display: "Display" };

var MATRIX_FIELDS = ["column_order", "bold_fields", "gender_column", "gender_color_fields"];
var BREAK_FIELDS = ["section_break_widgets", "column_break_widgets", "section_break_tile_actions"];

// ── Tab show/hide ─────────────────────────────────────────────────────────────
function _show_tab(frm, tab_id) {
	var all_fields = TAB_GROUPS.config.concat(MATRIX_FIELDS);
	all_fields.forEach(function (fn) {
		var fd = frm.fields_dict[fn];
		if (fd && fd.$wrapper) $(fd.$wrapper).hide();
	});

	(TAB_GROUPS[tab_id] || []).forEach(function (fn) {
		if (BREAK_FIELDS.indexOf(fn) !== -1) return;
		var fd = frm.fields_dict[fn];
		if (fd && fd.$wrapper) $(fd.$wrapper).show();
	});

	var $wrap = $(frm.fields_dict["root_doctype"].$wrapper).parent();
	$wrap.find(".pp-matrix-wrap").toggle(tab_id === "display");

	$(frm.layout.wrapper).find(".pp-tab-btn").css({ background: "", color: "", fontWeight: "" });
	$(frm.layout.wrapper).find('.pp-tab-btn[data-tab="' + tab_id + '"]').css({
		background: "#171717", color: "#fff", fontWeight: "600",
	});
	$(frm.layout.wrapper).data("pp-active-tab", tab_id);
}

function _ensure_tab_bar(frm) {
	var $layout = $(frm.layout.wrapper);
	if ($layout.find(".pp-tab-bar").length) return;

	var first_fd = frm.fields_dict["root_doctype"];
	if (!first_fd || !first_fd.$wrapper) return;

	var tab_html = '<div class="pp-tab-bar" style="display:flex;gap:4px;padding:6px 0 10px;margin-bottom:6px;border-bottom:1px solid #d1d8dd;">';
	TAB_ORDER.forEach(function (tab_id) {
		tab_html += '<button class="btn btn-xs btn-default pp-tab-btn" data-tab="' + tab_id + '" '
			+ 'style="padding:3px 14px;border-radius:4px;">'
			+ TAB_LABELS[tab_id] + '</button>';
	});
	tab_html += '</div>';

	var $tab_bar = $(tab_html);
	var $matrix_wrap = $('<div class="pp-matrix-wrap" style="display:none;padding-bottom:8px;"></div>');

	$(first_fd.$wrapper).before($tab_bar).before($matrix_wrap);

	$tab_bar.on("click", ".pp-tab-btn", function () {
		var tab_id = $(this).data("tab");
		_show_tab(frm, tab_id);
		if (tab_id === "display") _render_matrix(frm);
	});

	$layout.find(".section-head").hide();
	_show_tab(frm, "config");
}

// ── Column ordering helper ────────────────────────────────────────────────────
function _apply_column_order(fields, saved_order) {
	if (!saved_order || !saved_order.length) return fields.slice();
	var set = {};
	fields.forEach(function (f) { set[f.fieldname] = f; });
	var ordered = [];
	saved_order.forEach(function (fn) {
		if (set[fn]) { ordered.push(set[fn]); delete set[fn]; }
	});
	fields.forEach(function (f) {
		if (set[f.fieldname]) ordered.push(f);
	});
	return ordered;
}

// ── Matrix renderer ───────────────────────────────────────────────────────────
function _render_matrix(frm) {
	var $container = $(frm.layout.wrapper).find(".pp-matrix-wrap");
	if (!$container.length) return;

	if (!frm.doc.root_doctype) {
		$container.html('<p style="color:#8d949a;font-size:12px;padding:8px 0;">Select a DocType in the Config tab first.</p>');
		return;
	}

	_get_doctype_fields(frm.doc.root_doctype, function (dt_fields) {
		$container.empty();

		function parse_csv(val) {
			return ((val || "").split(",")).map(function (s) { return s.trim(); }).filter(Boolean);
		}

		var saved_order = parse_csv(frm.doc.column_order);
		var bold = parse_csv(frm.doc.bold_fields);
		var gender_col = (frm.doc.gender_column || "").trim();
		var gender_tint = parse_csv(frm.doc.gender_color_fields);

		var fields = _apply_column_order(dt_fields, saved_order);

		var shown_set = {};
		if (saved_order.length) {
			saved_order.forEach(function (fn) { shown_set[fn] = true; });
		}

		var $toolbar = $('<div style="display:flex;gap:6px;padding:0 0 8px;">'
			+ '<button class="btn btn-xs btn-default pp-select-all">Select All</button>'
			+ '<button class="btn btn-xs btn-default pp-select-none">Select None</button>'
			+ '</div>');
		$container.append($toolbar);

		var th_style = 'style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
		var th_left = 'style="text-align:left;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
		var th_grip = 'style="width:24px;padding:4px;border-bottom:2px solid #d1d8dd;"';
		var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
			+ '<thead><tr>'
			+ '<th ' + th_grip + '></th>'
			+ '<th ' + th_left + '>Field</th>'
			+ '<th ' + th_left + '>Label</th>'
			+ '<th ' + th_style + '>Show</th>'
			+ '<th ' + th_style + '>Bold</th>'
			+ '<th ' + th_style + '>Gender</th>'
			+ '<th ' + th_style + '>Tint</th>'
			+ '</tr></thead><tbody>';

		var uid = frm.doc.name || "new";
		fields.forEach(function (f, i) {
			var fn = f.fieldname;
			var label = f.label || fn.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
			var bg = i % 2 !== 0 ? ' style="background:#f8f9fa;"' : '';
			var esc = frappe.utils.escape_html(fn);
			var td = 'style="text-align:center;padding:4px 8px;"';
			html += '<tr draggable="true" data-col="' + esc + '"' + bg + '>'
				+ '<td style="padding:4px;text-align:center;cursor:grab;">'
				+ '<span class="matrix-drag-handle" style="color:#b7babe;font-size:14px;">&#x2630;</span></td>'
				+ '<td style="padding:4px 8px;color:#8d949a;font-size:11px;">' + esc + '</td>'
				+ '<td style="padding:4px 8px;color:#4c5a67;">' + frappe.utils.escape_html(label) + '</td>'
				+ '<td ' + td + '><input type="checkbox" data-col="' + esc + '" data-role="show"' + (shown_set[fn] ? " checked" : "") + '></td>'
				+ '<td ' + td + '><input type="checkbox" data-col="' + esc + '" data-role="bold"' + (bold.indexOf(fn) !== -1 ? " checked" : "") + '></td>'
				+ '<td ' + td + '><input type="radio"    data-col="' + esc + '" name="gender_col_' + uid + '"' + (gender_col === fn ? " checked" : "") + '></td>'
				+ '<td ' + td + '><input type="checkbox" data-col="' + esc + '" data-role="tint"' + (gender_tint.indexOf(fn) !== -1 ? " checked" : "") + '></td>'
				+ '</tr>';
		});
		html += '</tbody></table>';

		var $matrix = $(html);

		// ── Drag-and-drop reordering ──
		var drag_src = null;
		$matrix.find("tbody tr").on("dragstart", function (e) {
			drag_src = this;
			$(this).css("opacity", "0.4");
			e.originalEvent.dataTransfer.effectAllowed = "move";
			e.originalEvent.dataTransfer.setData("text/plain", "");
		}).on("dragend", function () {
			$(this).css("opacity", "");
			$matrix.find("tbody tr").removeClass("matrix-drag-over");
		}).on("dragover", function (e) {
			e.preventDefault();
			e.originalEvent.dataTransfer.dropEffect = "move";
			$matrix.find("tbody tr").removeClass("matrix-drag-over");
			$(this).addClass("matrix-drag-over");
		}).on("drop", function (e) {
			e.preventDefault();
			if (drag_src === this) return;
			var $target = $(this);
			var $src = $(drag_src);
			if ($src.index() < $target.index()) {
				$target.after($src);
			} else {
				$target.before($src);
			}
			$matrix.find("tbody tr").removeClass("matrix-drag-over");
			_restripe();
			_sync();
		});

		function _restripe() {
			$matrix.find("tbody tr").each(function (i) {
				$(this).css("background", i % 2 !== 0 ? "#f8f9fa" : "");
			});
		}

		function _sync() {
			var col_order = [], nb = [], nt = [], ngc = "";
			$matrix.find("tbody tr").each(function () {
				var col = $(this).data("col");
				var esc = frappe.utils.escape_html(col);
				var $r = $matrix.find('input[data-col="' + esc + '"]');
				if ($r.filter('[data-role="show"]').prop("checked")) col_order.push(col);
				if ($r.filter('[data-role="bold"]').prop("checked")) nb.push(col);
				if ($r.filter('[data-role="tint"]').prop("checked")) nt.push(col);
			});
			var $gc = $matrix.find('input[name="gender_col_' + uid + '"]:checked');
			if ($gc.length) ngc = $gc.data("col");
			frm.set_value("column_order", col_order.join(", "));
			frm.set_value("bold_fields", nb.join(", "));
			frm.set_value("gender_column", ngc);
			frm.set_value("gender_color_fields", nt.join(", "));
		}

		$matrix.on("change", "input[type=checkbox], input[type=radio]", _sync);

		$toolbar.find(".pp-select-all").on("click", function () {
			$matrix.find('input[data-role="show"]').prop("checked", true);
			_sync();
		});
		$toolbar.find(".pp-select-none").on("click", function () {
			$matrix.find('input[data-role="show"]').prop("checked", false);
			_sync();
		});

		if (!document.getElementById("pp-matrix-drag-css")) {
			$("head").append(
				'<style id="pp-matrix-drag-css">'
				+ '.matrix-drag-over { border-top: 2px solid #4198F0 !important; }'
				+ '.matrix-drag-handle:hover { color: #464D53 !important; cursor: grab; }'
				+ 'tr[draggable="true"]:active .matrix-drag-handle { cursor: grabbing; }'
				+ '</style>'
			);
		}

		$container.append($matrix);
	});
}

// ── Page Panel form events ────────────────────────────────────────────────────
frappe.ui.form.on("Page Panel", {
	refresh: function (frm) {
		_ensure_tab_bar(frm);
	},

	root_doctype: function (frm) {
		if (frm.doc.root_doctype) {
			delete _dt_field_cache[frm.doc.root_doctype];
		}
		frm.set_value("column_order", "");
		frm.set_value("bold_fields", "");
		frm.set_value("gender_column", "");
		frm.set_value("gender_color_fields", "");
		var $layout = $(frm.layout.wrapper);
		if ($layout.data("pp-active-tab") === "display") {
			_render_matrix(frm);
		}
	},
});
