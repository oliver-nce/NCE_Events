// ── DocType field cache ───────────────────────────────────────────────────────
const _dt_field_cache = {};

function _get_doctype_fields(doctype, callback) {
	if (_dt_field_cache[doctype]) { callback(_dt_field_cache[doctype]); return; }
	frappe.call({
		method: "nce_events.api.panel_api.get_doctype_fields",
		args: { root_doctype: doctype },
		callback: function (r) {
			const fields = (r && r.message) || [];
			_dt_field_cache[doctype] = fields;
			callback(fields);
		},
	});
}

// ── Top-level tab definitions ─────────────────────────────────────────────────
const TAB_GROUPS = {
	config: [
		"root_doctype", "header_text",
		"section_break_computed", "unstored_calculation_fields",
		"section_break_widgets", "show_filter", "show_sheets",
		"column_break_widgets", "show_email", "show_sms",
		"email_field", "sms_field",
		"section_break_tile_actions", "show_card_email", "show_card_sms", "open_card_on_click",
	],
	display: [],
};
const TAB_ORDER  = ["config", "display"];
const TAB_LABELS = { config: "Config", display: "Display" };

const MATRIX_FIELDS = ["column_order", "bold_fields", "gender_column", "gender_color_fields"];
const BREAK_FIELDS = ["section_break_widgets", "column_break_widgets", "section_break_tile_actions"];

// ── Top-level tab show/hide ───────────────────────────────────────────────────
function _show_tab(frm, tab_id) {
	const all_fields = TAB_GROUPS.config.concat(MATRIX_FIELDS);
	all_fields.forEach(function (fn) {
		const fd = frm.fields_dict[fn];
		if (fd && fd.$wrapper) $(fd.$wrapper).hide();
	});

	(TAB_GROUPS[tab_id] || []).forEach(function (fn) {
		if (BREAK_FIELDS.indexOf(fn) !== -1) return;
		const fd = frm.fields_dict[fn];
		if (fd && fd.$wrapper) $(fd.$wrapper).show();
	});

	const $wrap = $(frm.fields_dict["root_doctype"].$wrapper).parent();
	$wrap.find(".pp-matrix-wrap").toggle(tab_id === "display");

	$(frm.layout.wrapper).find(".pp-tab-btn").css({ background: "", color: "", fontWeight: "" });
	$(frm.layout.wrapper).find(`.pp-tab-btn[data-tab="${tab_id}"]`).css({
		background: "#171717", color: "#fff", fontWeight: "600",
	});
	$(frm.layout.wrapper).data("pp-active-tab", tab_id);
}

function _ensure_tab_bar(frm) {
	const $layout = $(frm.layout.wrapper);
	if ($layout.find(".pp-tab-bar").length) return;

	const first_fd = frm.fields_dict["root_doctype"];
	if (!first_fd || !first_fd.$wrapper) return;

	let tab_html = `<div class="pp-tab-bar" style="display:flex;gap:4px;padding:6px 0 10px;margin-bottom:6px;border-bottom:1px solid #d1d8dd;">`;
	TAB_ORDER.forEach(function (tab_id) {
		tab_html += `<button class="btn btn-xs btn-default pp-tab-btn" data-tab="${tab_id}" style="padding:3px 14px;border-radius:4px;">${TAB_LABELS[tab_id]}</button>`;
	});
	tab_html += `</div>`;

	const $tab_bar = $(tab_html);
	const $matrix_wrap = $('<div class="pp-matrix-wrap" style="display:none;padding-bottom:8px;"></div>');

	$(first_fd.$wrapper).before($tab_bar).before($matrix_wrap);

	$tab_bar.on("click", ".pp-tab-btn", function () {
		const tab_id = $(this).data("tab");
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
	const $container = $(frm.layout.wrapper).find(".pp-matrix-wrap");
	if (!$container.length) return;

	if (!frm.doc.root_doctype) {
		$container.html('<p style="color:#8d949a;font-size:12px;padding:8px 0;">Select a DocType in the Config tab first.</p>');
		return;
	}

	_get_doctype_fields(frm.doc.root_doctype, function (root_fields) {
		const link_fields = root_fields.filter(function (f) { return f.fieldtype === "Link" && f.options; });

		let pending = link_fields.length;
		const linked_data = {};

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

function _get_computed_fields(frm) {
	const rows = frm.doc.unstored_calculation_fields || [];
	return rows.map(function (r) {
		return {
			fieldname: (r.field_name || "").trim(),
			label: (r.label || "").trim() || _title_case(r.field_name || ""),
			_computed: true,
		};
	}).filter(function (f) { return f.fieldname; });
}

function _get_related_fields(frm) {
	const col_order = _parse_csv(frm.doc.column_order);
	return col_order
		.filter(function (fn) { return fn.startsWith("_related_"); })
		.map(function (fn) {
			const dt_name = fn.substring("_related_".length);
			return { fieldname: fn, label: dt_name, _related: true };
		});
}

function _build_display_tabs(frm, $container, root_fields, link_fields, linked_data) {
	const root_names = {};
	root_fields.forEach(function (f) { root_names[f.fieldname] = true; });
	const computed_fields = _get_computed_fields(frm).filter(function (cf) {
		return !root_names[cf.fieldname];
	});
	const related_fields = _get_related_fields(frm);
	const root_with_computed = root_fields.concat(computed_fields).concat(related_fields);

	const saved = {
		column_order: _parse_csv(frm.doc.column_order),
		bold: _parse_csv(frm.doc.bold_fields),
		gender_col: (frm.doc.gender_column || "").trim(),
		gender_tint: _parse_csv(frm.doc.gender_color_fields),
	};

	// Merge computed column field_names into column_order so new ones appear in Display
	computed_fields.forEach(function (cf) {
		const fn = cf.fieldname;
		if (saved.column_order.indexOf(fn) === -1) saved.column_order.push(fn);
	});

	const shown_set = {};
	saved.column_order.forEach(function (k) { shown_set[k] = true; });

	// Build sub-tab list: root + each link + optional Order tab
	const sub_tabs = [{ id: "_root", label: frm.doc.root_doctype, prefix: "" }];
	link_fields.forEach(function (lf) {
		if (linked_data[lf.fieldname]) {
			sub_tabs.push({
				id: lf.fieldname,
				label: linked_data[lf.fieldname].doctype,
				prefix: lf.fieldname + ".",
			});
		}
	});
	const has_links = link_fields.length > 0;
	if (has_links) {
		sub_tabs.push({ id: "_order", label: "Order", prefix: "" });
	}

	// Sub-tab bar
	const $sub_bar = $('<div style="display:flex;gap:4px;padding:0 0 8px;flex-wrap:wrap;"></div>');
	sub_tabs.forEach(function (st) {
		$sub_bar.append(
			`<button class="btn btn-xs btn-default pp-sub-btn" data-sub="${st.id}" style="padding:2px 12px;border-radius:4px;font-size:11px;">${frappe.utils.escape_html(st.label)}</button>`
		);
	});
	$container.append($sub_bar);

	// Sub-tab content area
	const $sub_content = $('<div class="pp-sub-content"></div>');
	$container.append($sub_content);

	const uid = frm.doc.name || "new";
	const matrices = {};

	// Build a field matrix for each sub-tab (except Order)
	sub_tabs.forEach(function (st) {
		if (st.id === "_order") return;
		const fields = (st.id === "_root") ? root_with_computed : linked_data[st.id].fields;
		const prefix = st.prefix;
		matrices[st.id] = _build_field_matrix(fields, prefix, uid, saved, shown_set);
	});

	// Sync function — collects from ALL matrices
	function _sync_all() {
		let col_order = [], nb = [], nt = [], ngc = "";
		sub_tabs.forEach(function (st) {
			if (st.id === "_order") return;
			const m = matrices[st.id];
			if (!m || !m.$matrix) return;
			m.$matrix.find("tbody tr").each(function () {
				const key = $(this).data("key");
				const $r = m.$matrix.find(`input[data-key="${key}"]`);
				if ($r.filter('[data-role="show"]').prop("checked")) col_order.push(key);
				if ($r.filter('[data-role="bold"]').prop("checked")) nb.push(key);
				if ($r.filter('[data-role="tint"]').prop("checked")) nt.push(key);
			});
		});
		const $all_gc = $container.find(`input[name="gender_col_${uid}"]:checked`);
		if ($all_gc.length) ngc = $all_gc.data("key") || "";

		// Reorder col_order by Order tab if it exists
		if (has_links) {
			const $order_body = $sub_content.find(".pp-order-matrix tbody");
			if ($order_body.length) {
				const order_keys = [];
				$order_body.find("tr").each(function () { order_keys.push($(this).data("key")); });
				const in_order = {};
				col_order.forEach(function (k) { in_order[k] = true; });
				const reordered = [];
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
		const m = matrices[st.id];
		if (!m || !m.$matrix) return;
		m.$matrix.on("change", "input[type=checkbox], input[type=radio]", _sync_all);
	});

	// Show sub-tab handler
	function _show_sub(sub_id) {
		$sub_content.children().detach();
		$sub_bar.find(".pp-sub-btn").css({ background: "", color: "", fontWeight: "" });
		$sub_bar.find(`.pp-sub-btn[data-sub="${sub_id}"]`).css({
			background: "#4198F0", color: "#fff", fontWeight: "600",
		});

		if (sub_id === "_order") {
			_render_order_tab($sub_content, uid, sub_tabs, matrices, saved, _sync_all);
			return;
		}

		const m = matrices[sub_id];
		if (!m) return;

		const $panel = $('<div></div>');

		const $toolbar = $(`<div style="display:flex;gap:6px;align-items:center;padding:4px 0 8px;">
			<a class="pp-select-all" href="#" style="font-size:12px;color:#4198F0;">Select All</a>
			<span style="color:#d1d8dd;">|</span>
			<a class="pp-select-none" href="#" style="font-size:12px;color:#4198F0;">Select None</a>
		</div>`);
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

		if (sub_id === "_root" && frm.doc.root_doctype) {
			const $related_btn = $('<button class="btn btn-xs btn-default pp-add-related-btn" style="margin-left:auto;font-size:11px;padding:2px 10px;">Add Related DocTypes</button>');
			$related_btn.on("click", function () {
				frappe.call({
					method: "nce_events.api.panel_api.get_child_doctypes",
					args: { root_doctype: frm.doc.root_doctype },
					callback: function (r) {
						const children = (r && r.message) || [];
						if (!children.length) {
							frappe.show_alert({ message: __("No related DocTypes found"), indicator: "orange" });
							return;
						}
						const current = _parse_csv(frm.doc.column_order);
						let added = 0;
						children.forEach(function (c) {
							const key = "_related_" + c.doctype;
							if (current.indexOf(key) === -1) {
								current.push(key);
								added++;
							}
						});
						if (!added) {
							frappe.show_alert({ message: __("All related DocTypes already added"), indicator: "blue" });
							return;
						}
						frm.set_value("column_order", current.join(", "));
						frappe.show_alert({ message: __("{0} related DocType(s) added", [added]), indicator: "green" });
						_render_display(frm);
					},
				});
			});
			$toolbar.append($related_btn);
		}

		$panel.append($toolbar);
		$panel.append(m.$matrix);
		$sub_content.append($panel);
	}

	$sub_bar.on("click", ".pp-sub-btn", function () {
		_show_sub($(this).data("sub"));
	});

	// Inject CSS once
	if (!document.getElementById("pp-matrix-drag-css")) {
		$("head").append(`<style id="pp-matrix-drag-css">
.matrix-drag-over { border-top: 2px solid #4198F0 !important; }
.matrix-drag-handle:hover { color: #464D53 !important; cursor: grab; }
tr[draggable="true"]:active .matrix-drag-handle { cursor: grabbing; }
</style>`);
	}

	// Start on root sub-tab
	_show_sub("_root");
}

// ── Build a single field-selection matrix ─────────────────────────────────────
function _build_field_matrix(fields, prefix, uid, saved, shown_set) {
	const th_style = 'style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
	const th_left = 'style="text-align:left;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
	let html = `<table style="width:100%;border-collapse:collapse;font-size:12px;">
		<thead><tr>
			<th ${th_left}>Field</th>
			<th ${th_left}>Label</th>
			<th ${th_style}>Show</th>
			<th ${th_style}>Bold</th>
			<th ${th_style}>Gender</th>
			<th ${th_style}>Tint</th>
		</tr></thead><tbody>`;

	fields.forEach(function (f, i) {
		const key = prefix + f.fieldname;
		const label = f.label || _title_case(f.fieldname);
		let tag = "";
		if (f._computed) tag = " <span style='color:#8d949a;font-size:10px;'>(computed)</span>";
		if (f._related) tag = " <span style='color:royalblue;font-size:10px;'>(related)</span>";
		const fn_display = frappe.utils.escape_html(f.fieldname) + tag;
		const bg = i % 2 !== 0 ? ' style="background:#f8f9fa;"' : '';
		const esc_key = frappe.utils.escape_html(key);
		const td = 'style="text-align:center;padding:4px 8px;"';
		html += `<tr data-key="${esc_key}"${bg}>
			<td style="padding:4px 8px;color:#8d949a;font-size:11px;">${fn_display}</td>
			<td style="padding:4px 8px;color:#4c5a67;">${frappe.utils.escape_html(label)}</td>
			<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="show"${shown_set[key] ? " checked" : ""}></td>
			<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="bold"${saved.bold.indexOf(key) !== -1 ? " checked" : ""}></td>
			<td ${td}><input type="radio"    data-key="${esc_key}" name="gender_col_${uid}"${saved.gender_col === key ? " checked" : ""}></td>
			<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="tint"${saved.gender_tint.indexOf(key) !== -1 ? " checked" : ""}></td>
		</tr>`;
	});
	html += '</tbody></table>';

	return { $matrix: $(html) };
}

// ── Order tab — drag-reorder union of all selected fields ─────────────────────
function _render_order_tab($sub_content, uid, sub_tabs, matrices, saved, _sync_all) {
	// Gather all currently selected fields across all matrices
	let selected = [];
	sub_tabs.forEach(function (st) {
		if (st.id === "_order") return;
		const m = matrices[st.id];
		if (!m || !m.$matrix) return;
		m.$matrix.find('input[data-role="show"]:checked').each(function () {
			const key = $(this).data("key");
			const $row = $(this).closest("tr");
			const label = $row.find("td:eq(1)").text();
			selected.push({ key: key, label: label, source: st.label });
		});
	});

	// Apply saved column_order for initial ordering
	if (saved.column_order.length) {
		const key_map = {};
		selected.forEach(function (s) { key_map[s.key] = s; });
		const ordered = [];
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

	const th_left = 'style="text-align:left;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
	const th_grip = 'style="width:24px;padding:4px;border-bottom:2px solid #d1d8dd;"';
	let html = `<table class="pp-order-matrix" style="width:100%;border-collapse:collapse;font-size:12px;">
		<thead><tr>
			<th ${th_grip}></th>
			<th ${th_left}>Field</th>
			<th ${th_left}>Label</th>
			<th ${th_left}>Source</th>
		</tr></thead><tbody>`;

	selected.forEach(function (s, i) {
		const bg = i % 2 !== 0 ? ' style="background:#f8f9fa;"' : '';
		const esc = frappe.utils.escape_html(s.key);
		html += `<tr draggable="true" data-key="${esc}"${bg}>
			<td style="padding:4px;text-align:center;cursor:grab;">
				<span class="matrix-drag-handle" style="color:#b7babe;font-size:14px;">&#x2630;</span></td>
			<td style="padding:4px 8px;color:#8d949a;font-size:11px;">${esc}</td>
			<td style="padding:4px 8px;color:#4c5a67;">${frappe.utils.escape_html(s.label)}</td>
			<td style="padding:4px 8px;color:#8d949a;font-size:11px;">${frappe.utils.escape_html(s.source)}</td>
		</tr>`;
	});
	html += '</tbody></table>';

	const $order = $(html);

	// Drag reorder
	let drag_src = null;
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
		const $target = $(this);
		const $src = $(drag_src);
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
		const $layout = $(frm.layout.wrapper);
		if ($layout.data("pp-active-tab") === "display") {
			_render_display(frm);
		}
	},
});
