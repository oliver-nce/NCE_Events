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

// ── Top-level tab definitions ─────────────────────────────────────────────────
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

// ── Top-level tab show/hide ───────────────────────────────────────────────────
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
		if (tab_id === "display") _render_display(frm);
	});

	$layout.find(".section-head").hide();
	_show_tab(frm, "config");
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _parse_csv(val) {
	return ((val || "").split(",")).map(function (s) { return s.trim(); }).filter(Boolean);
}

function _title_case(name) {
	return name.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

// ── Display tab — sub-tab architecture ────────────────────────────────────────
//
// column_order stores: "fieldname, fieldname, link_field.fieldname, ..."
// Root fields: bare fieldname.  Linked fields: link_field.fieldname.
// bold_fields, gender_column, gender_color_fields use the same dot notation.

function _render_display(frm) {
	var $container = $(frm.layout.wrapper).find(".pp-matrix-wrap");
	if (!$container.length) return;

	if (!frm.doc.root_doctype) {
		$container.html('<p style="color:#8d949a;font-size:12px;padding:8px 0;">Select a DocType in the Config tab first.</p>');
		return;
	}

	_get_doctype_fields(frm.doc.root_doctype, function (root_fields) {
		var link_fields = root_fields.filter(function (f) { return f.fieldtype === "Link" && f.options; });

		var pending = link_fields.length;
		var linked_data = {};

		function _build_once_ready() {
			$container.empty();
			_build_display_tabs(frm, $container, root_fields, link_fields, linked_data);
		}

		if (!pending) {
			_build_once_ready();
			return;
		}

		link_fields.forEach(function (lf) {
			_get_doctype_fields(lf.options, function (fields) {
				linked_data[lf.fieldname] = { doctype: lf.options, label: lf.label, fields: fields };
				pending--;
				if (pending === 0) _build_once_ready();
			});
		});
	});
}

function _build_display_tabs(frm, $container, root_fields, link_fields, linked_data) {
	var saved = {
		column_order: _parse_csv(frm.doc.column_order),
		bold: _parse_csv(frm.doc.bold_fields),
		gender_col: (frm.doc.gender_column || "").trim(),
		gender_tint: _parse_csv(frm.doc.gender_color_fields),
	};

	var shown_set = {};
	saved.column_order.forEach(function (k) { shown_set[k] = true; });

	// Build sub-tab list: root + each link + optional Order tab
	var sub_tabs = [{ id: "_root", label: frm.doc.root_doctype, prefix: "" }];
	link_fields.forEach(function (lf) {
		if (linked_data[lf.fieldname]) {
			sub_tabs.push({
				id: lf.fieldname,
				label: linked_data[lf.fieldname].doctype,
				prefix: lf.fieldname + ".",
			});
		}
	});
	var has_links = link_fields.length > 0;
	if (has_links) {
		sub_tabs.push({ id: "_order", label: "Order", prefix: "" });
	}

	// Sub-tab bar
	var $sub_bar = $('<div style="display:flex;gap:4px;padding:0 0 8px;flex-wrap:wrap;"></div>');
	sub_tabs.forEach(function (st) {
		$sub_bar.append(
			'<button class="btn btn-xs btn-default pp-sub-btn" data-sub="' + st.id + '" '
			+ 'style="padding:2px 12px;border-radius:4px;font-size:11px;">'
			+ frappe.utils.escape_html(st.label) + '</button>'
		);
	});
	$container.append($sub_bar);

	// Sub-tab content area
	var $sub_content = $('<div class="pp-sub-content"></div>');
	$container.append($sub_content);

	var uid = frm.doc.name || "new";
	var matrices = {};

	// Build a field matrix for each sub-tab (except Order)
	sub_tabs.forEach(function (st) {
		if (st.id === "_order") return;
		var fields = (st.id === "_root") ? root_fields : linked_data[st.id].fields;
		var prefix = st.prefix;
		matrices[st.id] = _build_field_matrix(fields, prefix, uid, saved, shown_set);
	});

	// Sync function — collects from ALL matrices
	function _sync_all() {
		var col_order = [], nb = [], nt = [], ngc = "";
		sub_tabs.forEach(function (st) {
			if (st.id === "_order") return;
			var m = matrices[st.id];
			if (!m || !m.$matrix) return;
			m.$matrix.find("tbody tr").each(function () {
				var key = $(this).data("key");
				var $r = m.$matrix.find('input[data-key="' + key + '"]');
				if ($r.filter('[data-role="show"]').prop("checked")) col_order.push(key);
				if ($r.filter('[data-role="bold"]').prop("checked")) nb.push(key);
				if ($r.filter('[data-role="tint"]').prop("checked")) nt.push(key);
			});
		});
		var $all_gc = $container.find('input[name="gender_col_' + uid + '"]:checked');
		if ($all_gc.length) ngc = $all_gc.data("key") || "";

		// Reorder col_order by Order tab if it exists
		if (has_links) {
			var $order_body = $sub_content.find(".pp-order-matrix tbody");
			if ($order_body.length) {
				var order_keys = [];
				$order_body.find("tr").each(function () { order_keys.push($(this).data("key")); });
				var in_order = {};
				col_order.forEach(function (k) { in_order[k] = true; });
				var reordered = [];
				order_keys.forEach(function (k) { if (in_order[k]) { reordered.push(k); delete in_order[k]; } });
				col_order.forEach(function (k) { if (in_order[k]) reordered.push(k); });
				col_order = reordered;
			}
		}

		frm.set_value("column_order", col_order.join(", "));
		frm.set_value("bold_fields", nb.join(", "));
		frm.set_value("gender_column", ngc);
		frm.set_value("gender_color_fields", nt.join(", "));
	}

	// Wire change events on all matrices
	sub_tabs.forEach(function (st) {
		if (st.id === "_order") return;
		var m = matrices[st.id];
		if (!m || !m.$matrix) return;
		m.$matrix.on("change", "input[type=checkbox], input[type=radio]", _sync_all);
	});

	// Show sub-tab handler
	function _show_sub(sub_id) {
		$sub_content.children().detach();
		$sub_bar.find(".pp-sub-btn").css({ background: "", color: "", fontWeight: "" });
		$sub_bar.find('.pp-sub-btn[data-sub="' + sub_id + '"]').css({
			background: "#4198F0", color: "#fff", fontWeight: "600",
		});

		if (sub_id === "_order") {
			_render_order_tab($sub_content, uid, sub_tabs, matrices, saved, _sync_all);
			return;
		}

		var m = matrices[sub_id];
		if (!m) return;

		var $panel = $('<div></div>');

		// Select all/none links
		var $toolbar = $('<div style="display:flex;gap:6px;padding:4px 0 8px;">'
			+ '<a class="pp-select-all" href="#" style="font-size:12px;color:#4198F0;">Select All</a>'
			+ '<span style="color:#d1d8dd;">|</span>'
			+ '<a class="pp-select-none" href="#" style="font-size:12px;color:#4198F0;">Select None</a>'
			+ '</div>');
		$toolbar.find(".pp-select-all").on("click", function (e) {
			e.preventDefault();
			m.$matrix.find('input[data-role="show"]').prop("checked", true);
			_sync_all();
		});
		$toolbar.find(".pp-select-none").on("click", function (e) {
			e.preventDefault();
			m.$matrix.find('input[data-role="show"]').prop("checked", false);
			_sync_all();
		});

		$panel.append($toolbar);
		$panel.append(m.$matrix);
		$sub_content.append($panel);
	}

	$sub_bar.on("click", ".pp-sub-btn", function () {
		_show_sub($(this).data("sub"));
	});

	// Inject CSS once
	if (!document.getElementById("pp-matrix-drag-css")) {
		$("head").append(
			'<style id="pp-matrix-drag-css">'
			+ '.matrix-drag-over { border-top: 2px solid #4198F0 !important; }'
			+ '.matrix-drag-handle:hover { color: #464D53 !important; cursor: grab; }'
			+ 'tr[draggable="true"]:active .matrix-drag-handle { cursor: grabbing; }'
			+ '</style>'
		);
	}

	// Start on root sub-tab
	_show_sub("_root");
}

// ── Build a single field-selection matrix ─────────────────────────────────────
function _build_field_matrix(fields, prefix, uid, saved, shown_set) {
	var th_style = 'style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
	var th_left = 'style="text-align:left;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
	var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
		+ '<thead><tr>'
		+ '<th ' + th_left + '>Field</th>'
		+ '<th ' + th_left + '>Label</th>'
		+ '<th ' + th_style + '>Show</th>'
		+ '<th ' + th_style + '>Bold</th>'
		+ '<th ' + th_style + '>Gender</th>'
		+ '<th ' + th_style + '>Tint</th>'
		+ '</tr></thead><tbody>';

	fields.forEach(function (f, i) {
		var key = prefix + f.fieldname;
		var label = f.label || _title_case(f.fieldname);
		var bg = i % 2 !== 0 ? ' style="background:#f8f9fa;"' : '';
		var esc_key = frappe.utils.escape_html(key);
		var td = 'style="text-align:center;padding:4px 8px;"';
		html += '<tr data-key="' + esc_key + '"' + bg + '>'
			+ '<td style="padding:4px 8px;color:#8d949a;font-size:11px;">' + frappe.utils.escape_html(f.fieldname) + '</td>'
			+ '<td style="padding:4px 8px;color:#4c5a67;">' + frappe.utils.escape_html(label) + '</td>'
			+ '<td ' + td + '><input type="checkbox" data-key="' + esc_key + '" data-role="show"' + (shown_set[key] ? " checked" : "") + '></td>'
			+ '<td ' + td + '><input type="checkbox" data-key="' + esc_key + '" data-role="bold"' + (saved.bold.indexOf(key) !== -1 ? " checked" : "") + '></td>'
			+ '<td ' + td + '><input type="radio"    data-key="' + esc_key + '" name="gender_col_' + uid + '"' + (saved.gender_col === key ? " checked" : "") + '></td>'
			+ '<td ' + td + '><input type="checkbox" data-key="' + esc_key + '" data-role="tint"' + (saved.gender_tint.indexOf(key) !== -1 ? " checked" : "") + '></td>'
			+ '</tr>';
	});
	html += '</tbody></table>';

	return { $matrix: $(html) };
}

// ── Order tab — drag-reorder union of all selected fields ─────────────────────
function _render_order_tab($sub_content, uid, sub_tabs, matrices, saved, _sync_all) {
	// Gather all currently selected fields across all matrices
	var selected = [];
	sub_tabs.forEach(function (st) {
		if (st.id === "_order") return;
		var m = matrices[st.id];
		if (!m || !m.$matrix) return;
		m.$matrix.find('input[data-role="show"]:checked').each(function () {
			var key = $(this).data("key");
			var $row = $(this).closest("tr");
			var label = $row.find("td:eq(1)").text();
			selected.push({ key: key, label: label, source: st.label });
		});
	});

	// Apply saved column_order for initial ordering
	if (saved.column_order.length) {
		var key_map = {};
		selected.forEach(function (s) { key_map[s.key] = s; });
		var ordered = [];
		saved.column_order.forEach(function (k) {
			if (key_map[k]) { ordered.push(key_map[k]); delete key_map[k]; }
		});
		selected.forEach(function (s) { if (key_map[s.key]) ordered.push(s); });
		selected = ordered;
	}

	if (!selected.length) {
		$sub_content.html('<p style="color:#8d949a;font-size:12px;padding:8px 0;">No fields selected. Use the other tabs to select fields first.</p>');
		return;
	}

	var th_left = 'style="text-align:left;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
	var th_grip = 'style="width:24px;padding:4px;border-bottom:2px solid #d1d8dd;"';
	var html = '<table class="pp-order-matrix" style="width:100%;border-collapse:collapse;font-size:12px;">'
		+ '<thead><tr>'
		+ '<th ' + th_grip + '></th>'
		+ '<th ' + th_left + '>Field</th>'
		+ '<th ' + th_left + '>Label</th>'
		+ '<th ' + th_left + '>Source</th>'
		+ '</tr></thead><tbody>';

	selected.forEach(function (s, i) {
		var bg = i % 2 !== 0 ? ' style="background:#f8f9fa;"' : '';
		var esc = frappe.utils.escape_html(s.key);
		html += '<tr draggable="true" data-key="' + esc + '"' + bg + '>'
			+ '<td style="padding:4px;text-align:center;cursor:grab;">'
			+ '<span class="matrix-drag-handle" style="color:#b7babe;font-size:14px;">&#x2630;</span></td>'
			+ '<td style="padding:4px 8px;color:#8d949a;font-size:11px;">' + esc + '</td>'
			+ '<td style="padding:4px 8px;color:#4c5a67;">' + frappe.utils.escape_html(s.label) + '</td>'
			+ '<td style="padding:4px 8px;color:#8d949a;font-size:11px;">' + frappe.utils.escape_html(s.source) + '</td>'
			+ '</tr>';
	});
	html += '</tbody></table>';

	var $order = $(html);

	// Drag reorder
	var drag_src = null;
	$order.find("tbody tr").on("dragstart", function (e) {
		drag_src = this;
		$(this).css("opacity", "0.4");
		e.originalEvent.dataTransfer.effectAllowed = "move";
		e.originalEvent.dataTransfer.setData("text/plain", "");
	}).on("dragend", function () {
		$(this).css("opacity", "");
		$order.find("tbody tr").removeClass("matrix-drag-over");
	}).on("dragover", function (e) {
		e.preventDefault();
		e.originalEvent.dataTransfer.dropEffect = "move";
		$order.find("tbody tr").removeClass("matrix-drag-over");
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
		$order.find("tbody tr").removeClass("matrix-drag-over");
		$order.find("tbody tr").each(function (i) {
			$(this).css("background", i % 2 !== 0 ? "#f8f9fa" : "");
		});
		_sync_all();
	});

	$sub_content.append($order);
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
			_render_display(frm);
		}
	},
});
