// ── DocType field cache ───────────────────────────────────────────────────────
const _dt_field_cache = {};

/** API returns { fields, doctype_title_field } (or legacy list). */
function _unpack_doctype_fields_message(msg) {
	if (msg && Array.isArray(msg.fields)) {
		return {
			fields: msg.fields,
			doctype_title_field: (msg.doctype_title_field || "").trim(),
		};
	}
	return {
		fields: Array.isArray(msg) ? msg : [],
		doctype_title_field: "",
	};
}

/** @param {(fields: object[], pack: {fields: object[], doctype_title_field: string}) => void} callback */
function _get_doctype_fields(doctype, callback) {
	if (_dt_field_cache[doctype]) {
		const c = _dt_field_cache[doctype];
		callback(c.fields, c);
		return;
	}
	frappe.call({
		method: "nce_events.api.panel_api.get_doctype_fields",
		args: { root_doctype: doctype },
		callback: function (r) {
			const unpacked = _unpack_doctype_fields_message(r && r.message);
			_dt_field_cache[doctype] = unpacked;
			callback(unpacked.fields, unpacked);
		},
	});
}

// ── Top-level tab definitions ─────────────────────────────────────────────────
const TAB_GROUPS = {
	config: [
		"root_doctype",
		"header_text",
		"default_filters",
		"order_by",
		"section_break_computed",
		"unstored_calculation_fields",
		"section_break_widgets",
		"show_filter",
		"show_sheets",
		"column_break_widgets",
		"show_email",
		"show_sms",
		"email_field",
		"sms_field",
		"section_break_tile_actions",
		"show_card_email",
		"show_card_sms",
		"open_card_on_click",
	],
	display: [],
	query: ["panel_sql"],
	dialogs: [],
};
const TAB_ORDER = ["config", "display", "query", "dialogs"];
const TAB_LABELS = { config: "Config", display: "Display", query: "Query", dialogs: "Dialogs" };

const MATRIX_FIELDS = [
	"column_order",
	"bold_fields",
	"gender_column",
	"gender_color_fields",
	"title_field",
];
const BREAK_FIELDS = [
	"section_break_widgets",
	"column_break_widgets",
	"section_break_tile_actions",
];

// ── Top-level tab show/hide ───────────────────────────────────────────────────
function _show_tab(frm, tab_id) {
	const all_fields = TAB_GROUPS.config.concat(MATRIX_FIELDS).concat(TAB_GROUPS.query || []);
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
	$wrap.find(".pp-dialogs-wrap").toggle(tab_id === "dialogs");

	$(frm.layout.wrapper).find(".pp-tab-btn").css({ background: "", color: "", fontWeight: "" });
	$(frm.layout.wrapper).find(`.pp-tab-btn[data-tab="${tab_id}"]`).css({
		background: "#171717",
		color: "#fff",
		fontWeight: "600",
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
	const $matrix_wrap = $(
		'<div class="pp-matrix-wrap" style="display:none;padding-bottom:8px;"></div>',
	);
	const $dialogs_wrap = $(
		'<div class="pp-dialogs-wrap" style="display:none;padding-bottom:8px;"></div>',
	);

	$(first_fd.$wrapper).before($tab_bar).before($matrix_wrap).before($dialogs_wrap);

	$tab_bar.on("click", ".pp-tab-btn", function () {
		const tab_id = $(this).data("tab");
		_show_tab(frm, tab_id);
		if (tab_id === "display") _render_display(frm);
		if (tab_id === "query") _refresh_query_tab(frm);
		if (tab_id === "dialogs") _render_dialogs_tab(frm);
	});

	$layout.find(".section-head").hide();
	_show_tab(frm, "config");
}

function _refresh_query_tab(frm) {
	if (!frm.doc.root_doctype) return;
	const fd = frm.fields_dict["panel_sql"];
	if (fd && fd.$wrapper) {
		fd.$wrapper.find(".control-value, .like-disabled-input").text("Generating…");
	}
	frappe.call({
		method: "nce_events.api.panel_api.build_panel_sql",
		args: { root_doctype: frm.doc.root_doctype },
		callback: function (r) {
			if (r.message) {
				frm.set_value("panel_sql", r.message);
				frm.refresh_field("panel_sql");
			}
		},
	});
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _parse_csv(val) {
	return (val || "")
		.split(",")
		.map(function (s) {
			return s.trim();
		})
		.filter(Boolean);
}

function _title_case(name) {
	return name.replace(/_/g, " ").replace(/\b\w/g, function (c) {
		return c.toUpperCase();
	});
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
		$container.html(
			'<p style="color:#8d949a;font-size:12px;padding:8px 0;">Select a DocType in the Config tab first.</p>',
		);
		return;
	}

	_get_doctype_fields(frm.doc.root_doctype, function (root_fields, rootPack) {
		const link_fields = root_fields.filter(function (f) {
			return f.fieldtype === "Link" && f.options;
		});

		let pending = link_fields.length;
		const linked_data = {};

		function _build_once_ready() {
			$container.empty();
			_build_display_tabs(frm, $container, root_fields, link_fields, linked_data, rootPack);
		}

		if (!pending) {
			_build_once_ready();
			return;
		}

		link_fields.forEach(function (lf) {
			_get_doctype_fields(lf.options, function (fields) {
				linked_data[lf.fieldname] = {
					doctype: lf.options,
					label: lf.label,
					fields: fields,
				};
				pending--;
				if (pending === 0) _build_once_ready();
			});
		});
	});
}

function _get_computed_fields(frm) {
	const rows = frm.doc.unstored_calculation_fields || [];
	return rows
		.map(function (r) {
			return {
				fieldname: (r.field_name || "").trim(),
				label: (r.label || "").trim() || _title_case(r.field_name || ""),
				_computed: true,
			};
		})
		.filter(function (f) {
			return f.fieldname;
		});
}

function _get_related_fields(frm) {
	const col_order = _parse_csv(frm.doc.column_order);
	return col_order
		.filter(function (fn) {
			return fn.startsWith("_related_");
		})
		.map(function (fn) {
			const dt_name = fn.substring("_related_".length);
			return { fieldname: fn, label: dt_name, _related: true };
		});
}

/** Move one root field row to the top of the list (Display matrix / col_order sync order). */
function _move_root_field_first(fields, fieldname) {
	const idx = fields.findIndex(function (f) {
		return f.fieldname === fieldname && !f._computed && !f._related;
	});
	if (idx <= 0) return fields;
	const copy = fields.slice();
	const row = copy.splice(idx, 1)[0];
	copy.unshift(row);
	return copy;
}

function _build_display_tabs(frm, $container, root_fields, link_fields, linked_data, rootPack) {
	rootPack = rootPack || { doctype_title_field: "" };
	const dtTitle = (rootPack.doctype_title_field || "").trim();

	const root_names = {};
	root_fields.forEach(function (f) {
		root_names[f.fieldname] = true;
	});
	const computed_fields = _get_computed_fields(frm).filter(function (cf) {
		return !root_names[cf.fieldname];
	});
	const related_fields = _get_related_fields(frm);
	let root_with_computed = root_fields.concat(computed_fields).concat(related_fields);
	if (dtTitle && root_names[dtTitle]) {
		root_with_computed = _move_root_field_first(root_with_computed, dtTitle);
	}

	const saved = {
		column_order: _parse_csv(frm.doc.column_order),
		bold: _parse_csv(frm.doc.bold_fields),
		gender_col: (frm.doc.gender_column || "").trim(),
		gender_tint: _parse_csv(frm.doc.gender_color_fields),
		title_field: (frm.doc.title_field || "").trim(),
	};
	if (!saved.title_field && dtTitle && root_names[dtTitle]) {
		saved.title_field = dtTitle;
	}

	// Merge computed column field_names into column_order so new ones appear in Display
	computed_fields.forEach(function (cf) {
		const fn = cf.fieldname;
		if (saved.column_order.indexOf(fn) === -1) saved.column_order.push(fn);
	});

	const shown_set = {};
	saved.column_order.forEach(function (k) {
		shown_set[k] = true;
	});

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
	sub_tabs.push({ id: "_order", label: "Order", prefix: "" });

	// Sub-tab bar
	const $sub_bar = $('<div style="display:flex;gap:4px;padding:0 0 8px;flex-wrap:wrap;"></div>');
	sub_tabs.forEach(function (st) {
		$sub_bar.append(
			`<button class="btn btn-xs btn-default pp-sub-btn" data-sub="${st.id}" style="padding:2px 12px;border-radius:4px;font-size:11px;">${frappe.utils.escape_html(st.label)}</button>`,
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
		const fields = st.id === "_root" ? root_with_computed : linked_data[st.id].fields;
		const prefix = st.prefix;
		matrices[st.id] = _build_field_matrix(fields, prefix, uid, saved, shown_set, {
			showTitleColumn: st.id === "_root",
		});
	});

	// Sync function — collects from ALL matrices
	function _sync_all() {
		let col_order = [],
			nb = [],
			nt = [],
			ngc = "",
			ntf = "";
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

		const mroot = matrices["_root"];
		if (mroot && mroot.$matrix) {
			const $tf = mroot.$matrix.find(`input[name="title_field_${uid}"]:checked`);
			if ($tf.length) ntf = $tf.data("key") || "";
		}

		// Reorder col_order by Order tab if it exists
		const $order_body = $sub_content.find(".pp-order-matrix tbody");
		if ($order_body.length) {
			const order_keys = [];
			$order_body.find("tr").each(function () {
				order_keys.push($(this).data("key"));
			});
			const in_order = {};
			col_order.forEach(function (k) {
				in_order[k] = true;
			});
			const reordered = [];
			order_keys.forEach(function (k) {
				if (in_order[k]) {
					reordered.push(k);
					delete in_order[k];
				}
			});
			col_order.forEach(function (k) {
				if (in_order[k]) reordered.push(k);
			});
			col_order = reordered;
		}

		frm.set_value("column_order", col_order.join(", "));
		frm.set_value("bold_fields", nb.join(", "));
		frm.set_value("gender_column", ngc);
		frm.set_value("gender_color_fields", nt.join(", "));
		frm.set_value("title_field", ntf);
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
			background: "#4198F0",
			color: "#fff",
			fontWeight: "600",
		});

		if (sub_id === "_order") {
			const orderTitleKey = (saved.title_field || dtTitle || "").trim();
			_render_order_tab(
				$sub_content,
				uid,
				sub_tabs,
				matrices,
				saved,
				_sync_all,
				orderTitleKey,
			);
			return;
		}

		const m = matrices[sub_id];
		if (!m) return;

		const $panel = $("<div></div>");

		const $toolbar =
			$(`<div style="display:flex;gap:6px;align-items:center;padding:4px 0 8px;">
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
			const $related_btn = $(
				'<button class="btn btn-xs btn-default pp-add-related-btn" style="margin-left:auto;font-size:11px;padding:2px 10px;">Add Related DocTypes</button>',
			);
			$related_btn.on("click", function () {
				frappe.call({
					method: "nce_events.api.panel_api.get_child_doctypes",
					args: { root_doctype: frm.doc.root_doctype },
					callback: function (r) {
						const children = (r && r.message) || [];
						if (!children.length) {
							frappe.show_alert({
								message: __("No related DocTypes found"),
								indicator: "orange",
							});
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
							frappe.show_alert({
								message: __("All related DocTypes already added"),
								indicator: "blue",
							});
							return;
						}
						frm.set_value("column_order", current.join(", "));
						frappe.show_alert({
							message: __("{0} related DocType(s) added", [added]),
							indicator: "green",
						});
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
function _build_field_matrix(fields, prefix, uid, saved, shown_set, matrix_opts) {
	matrix_opts = matrix_opts || {};
	const showTitleColumn = !!matrix_opts.showTitleColumn;
	const th_style =
		'style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
	const th_left =
		'style="text-align:left;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
	let html = `<table style="width:100%;border-collapse:collapse;font-size:12px;">
		<thead><tr>
			<th ${th_left}>Field</th>
			<th ${th_left}>Label</th>
			<th ${th_style}>Show</th>
			<th ${th_style}>Bold</th>
			<th ${th_style}>Gender</th>
			<th ${th_style}>Tint</th>`;
	if (showTitleColumn) {
		html += `<th ${th_style}>Title</th>`;
	}
	html += `</tr></thead><tbody>`;

	fields.forEach(function (f, i) {
		const key = prefix + f.fieldname;
		const label = f.label || _title_case(f.fieldname);
		let tag = "";
		if (f._computed) tag = " <span style='color:#8d949a;font-size:10px;'>(computed)</span>";
		if (f._related) tag = " <span style='color:royalblue;font-size:10px;'>(related)</span>";
		const fn_display = frappe.utils.escape_html(f.fieldname) + tag;
		const bg = i % 2 !== 0 ? ' style="background:#f8f9fa;"' : "";
		const esc_key = frappe.utils.escape_html(key);
		const td = 'style="text-align:center;padding:4px 8px;"';
		const titleEligible = showTitleColumn && !f._computed && !f._related;
		let title_cell = "";
		if (showTitleColumn) {
			if (titleEligible) {
				title_cell = `<td ${td}><input type="radio" data-key="${esc_key}" name="title_field_${uid}" data-role="title"${
					saved.title_field === key ? " checked" : ""
				}></td>`;
			} else {
				title_cell = `<td ${td} style="background:#f0f0f0;"></td>`;
			}
		}
		html += `<tr data-key="${esc_key}"${bg}>
			<td style="padding:4px 8px;color:#8d949a;font-size:11px;">${fn_display}</td>
			<td style="padding:4px 8px;color:#4c5a67;">${frappe.utils.escape_html(label)}</td>
			<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="show"${shown_set[key] ? " checked" : ""}></td>
			<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="bold"${saved.bold.indexOf(key) !== -1 ? " checked" : ""}></td>
			<td ${td}><input type="radio"    data-key="${esc_key}" name="gender_col_${uid}"${saved.gender_col === key ? " checked" : ""}></td>
			<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="tint"${saved.gender_tint.indexOf(key) !== -1 ? " checked" : ""}></td>
			${title_cell}
		</tr>`;
	});
	html += "</tbody></table>";

	return { $matrix: $(html) };
}

// ── Order tab — drag-reorder union of all selected fields ─────────────────────
function _render_order_tab(
	$sub_content,
	uid,
	sub_tabs,
	matrices,
	saved,
	_sync_all,
	orderTitleKey,
) {
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

	// No saved order yet: put DocType title field first (matches Display matrix row order)
	if (!saved.column_order.length && orderTitleKey) {
		selected.sort(function (a, b) {
			if (a.key === orderTitleKey) return -1;
			if (b.key === orderTitleKey) return 1;
			return 0;
		});
	}

	// Apply saved column_order for initial ordering
	if (saved.column_order.length) {
		const key_map = {};
		selected.forEach(function (s) {
			key_map[s.key] = s;
		});
		const ordered = [];
		saved.column_order.forEach(function (k) {
			if (key_map[k]) {
				ordered.push(key_map[k]);
				delete key_map[k];
			}
		});
		selected.forEach(function (s) {
			if (key_map[s.key]) ordered.push(s);
		});
		selected = ordered;
	}

	if (!selected.length) {
		$sub_content.html(
			'<p style="color:#8d949a;font-size:12px;padding:8px 0;">No fields selected. Use the other tabs to select fields first.</p>',
		);
		return;
	}

	const th_left =
		'style="text-align:left;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
	const th_grip = 'style="width:24px;padding:4px;border-bottom:2px solid #d1d8dd;"';
	let html = `<table class="pp-order-matrix" style="width:100%;border-collapse:collapse;font-size:12px;">
		<thead><tr>
			<th ${th_grip}></th>
			<th ${th_left}>Field</th>
			<th ${th_left}>Label</th>
			<th ${th_left}>Source</th>
		</tr></thead><tbody>`;

	selected.forEach(function (s, i) {
		const bg = i % 2 !== 0 ? ' style="background:#f8f9fa;"' : "";
		const esc = frappe.utils.escape_html(s.key);
		html += `<tr draggable="true" data-key="${esc}"${bg}>
			<td style="padding:4px;text-align:center;cursor:grab;">
				<span class="matrix-drag-handle" style="color:#b7babe;font-size:14px;">&#x2630;</span></td>
			<td style="padding:4px 8px;color:#8d949a;font-size:11px;">${esc}</td>
			<td style="padding:4px 8px;color:#4c5a67;">${frappe.utils.escape_html(s.label)}</td>
			<td style="padding:4px 8px;color:#8d949a;font-size:11px;">${frappe.utils.escape_html(s.source)}</td>
		</tr>`;
	});
	html += "</tbody></table>";

	const $order = $(html);

	// Drag reorder
	let drag_src = null;
	$order
		.find("tbody tr")
		.on("dragstart", function (e) {
			drag_src = this;
			$(this).css("opacity", "0.4");
			e.originalEvent.dataTransfer.effectAllowed = "move";
			e.originalEvent.dataTransfer.setData("text/plain", "");
		})
		.on("dragend", function () {
			$(this).css("opacity", "");
			$order.find("tbody tr").removeClass("matrix-drag-over");
		})
		.on("dragover", function (e) {
			e.preventDefault();
			e.originalEvent.dataTransfer.dropEffect = "move";
			$order.find("tbody tr").removeClass("matrix-drag-over");
			$(this).addClass("matrix-drag-over");
		})
		.on("drop", function (e) {
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

// ── Default Filters widget ────────────────────────────────────────────────────
// Renders a custom filter widget for default_filters.
// Field list comes from the visible column_order (same as the Order tab),
// with fieldtype looked up from the cached get_doctype_fields result.

const DATE_FIELDTYPES = new Set(["Date", "Datetime"]);
const OPS_DEFAULT = ["=", "!=", ">", "<", ">=", "<=", "like", "in"];
const OPS_DATE = ["=", ">", "<"];

// Build the field list for the filter widget from column_order + fieldtype cache.
// Falls back to all doctype fields if column_order is empty.
function _filter_fields_from_columns(frm, allFields) {
	const col_order = _parse_csv(frm.doc.column_order);

	// Map of real fields from meta
	const by_name = {};
	allFields.forEach(function (f) {
		by_name[f.fieldname] = f;
	});

	// Synthetic _related_ fields from column_order (e.g. "_related_Event Sessions")
	// These are count columns present on every row object — fully filterable client-side.
	const related_fields = col_order
		.filter(function (fn) {
			return fn.indexOf("_related_") === 0;
		})
		.map(function (fn) {
			const label = fn.substring("_related_".length).replace(/_/g, " ");
			return { fieldname: fn, label: label, fieldtype: "Int" };
		});

	// Computed columns from unstored_calculation_fields
	const computed_fields = _get_computed_fields(frm).map(function (f) {
		return { fieldname: f.fieldname, label: f.label, fieldtype: "Data" };
	});

	// Real fields visible in column_order (skip dot-notation — not directly on row)
	const real_fields = col_order
		.filter(function (fn) {
			return by_name[fn] && fn.indexOf(".") === -1;
		})
		.map(function (fn) {
			return by_name[fn];
		});

	const visible = [...real_fields, ...related_fields, ...computed_fields];
	return visible.length ? visible : allFields;
}

function _render_default_filters(frm) {
	// Defer until Frappe has finished rendering the form layout
	setTimeout(function () {
		_render_default_filters_now(frm);
	}, 50);
}

function _render_default_filters_now(frm) {
	const fd = frm.fields_dict["default_filters"];
	if (!fd || !fd.$wrapper) return;

	// Hide the default Frappe child table grid entirely
	fd.$wrapper.find(".frappe-control").hide();
	fd.$wrapper.find(".grid-heading-row").hide();
	fd.$wrapper.find(".grid-body").hide();
	fd.$wrapper.find(".btn.grid-add-row").hide();
	fd.$wrapper.find("[data-fieldname='default_filters']").hide();
	fd.$wrapper.children().not(".pp-df-widget").hide();

	// Remove any previously rendered custom widget
	fd.$wrapper.find(".pp-df-widget").remove();

	const doctype = frm.doc.root_doctype;

	function _build(allFields) {
		const fields = _filter_fields_from_columns(frm, allFields);

		const $widget = $('<div class="pp-df-widget" style="margin: 8px 0;"></div>');

		function _field_options_html(selected) {
			let html = '<option value="">— field —</option>';
			fields.forEach(function (f) {
				const sel = f.fieldname === selected ? " selected" : "";
				html += `<option value="${f.fieldname}"${sel}>${f.label} (${f.fieldname})</option>`;
			});
			return html;
		}

		function _ops_for_field(fieldname) {
			const f = fields.find(function (x) {
				return x.fieldname === fieldname;
			});
			if (f && DATE_FIELDTYPES.has(f.fieldtype)) return OPS_DATE;
			if (fieldname && /date|_at$/.test(fieldname.toLowerCase())) return OPS_DATE;
			return OPS_DEFAULT;
		}

		function _is_date_field(fieldname) {
			const f = fields.find(function (x) {
				return x.fieldname === fieldname;
			});
			if (f && DATE_FIELDTYPES.has(f.fieldtype)) return true;
			if (fieldname && /date|_at$/.test(fieldname.toLowerCase())) return true;
			return false;
		}

		function _render_rows() {
			$widget.empty();

			const currentRows = frm.doc.default_filters || [];

			currentRows.forEach(function (row, i) {
				const ops = _ops_for_field(row.field);
				const isDate = _is_date_field(row.field);

				let ops_html = ops
					.map(function (op) {
						const active = (row.op || "=") === op ? " pp-df-op-active" : "";
						return `<button class="pp-df-op-btn${active}" data-op="${op}" data-idx="${i}">${op}</button>`;
					})
					.join("");

				// Determine SQL date vs days-ago split for date fields
				let sqlDateVal = "";
				let daysAgoVal = "";
				if (isDate && row.value) {
					if (/days ago|month|today/i.test(row.value)) {
						daysAgoVal = row.value.replace(/\s*days ago$/i, "").trim();
					} else {
						sqlDateVal = row.value;
					}
				}

				let value_html;
				if (isDate) {
					value_html = `
						<input class="pp-df-sql-date" type="text"
							placeholder="Enter a SQL date e.g. 1950-06-08"
							value="${_esc(sqlDateVal)}" data-idx="${i}"
							style="flex:1;min-width:60px;">
						<input class="pp-df-days-ago" type="text"
							placeholder="OR enter days ago e.g. 30"
							value="${_esc(daysAgoVal)}" data-idx="${i}"
							style="flex:1;min-width:60px;">`;
				} else {
					value_html = `<input class="pp-df-val" type="text"
						placeholder="value" value="${_esc(row.value || "")}" data-idx="${i}"
						style="flex:1;min-width:60px;">`;
				}

				const hasField = !!row.field;
				const $row = $(`
					<div class="pp-df-row" data-idx="${i}" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
						<select class="pp-df-field form-control form-control-sm" data-idx="${i}"
							style="min-width:160px;max-width:200px;">
							${_field_options_html(row.field)}
						</select>
						<span class="pp-df-ops" style="display:flex;gap:2px;${hasField ? "" : "display:none!"}">${ops_html}</span>
						${hasField ? value_html : ""}
						${
							hasField
								? `<button class="pp-df-rm btn btn-xs btn-danger" data-idx="${i}"
							style="padding:2px 8px;line-height:1;">&times;</button>`
								: ""
						}
					</div>`);
				$widget.append($row);
			});

			// Add filter button
			$widget.append(
				$(
					'<button class="btn btn-xs btn-default pp-df-add" style="margin-top:4px;">+ Add Filter</button>',
				),
			);

			_bind_events();
		}

		function _esc(s) {
			return String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		}

		function _save_rows() {
			// Rebuild frm.doc.default_filters from widget state
			const newRows = [];
			$widget.find(".pp-df-row").each(function () {
				const idx = $(this).data("idx");
				const field = $(this).find(".pp-df-field").val();
				const op = $(this).find(".pp-df-op-btn.pp-df-op-active").data("op") || "=";
				// Date rows have two inputs; non-date rows have one
				const sqlDate = $(this).find(".pp-df-sql-date").val();
				const daysAgo = $(this).find(".pp-df-days-ago").val();
				let value;
				if (sqlDate) {
					value = sqlDate;
				} else if (daysAgo) {
					value = daysAgo + " days ago";
				} else {
					value = $(this).find(".pp-df-val").val() || "";
				}
				newRows.push({ field: field || "", op: op, value: value });
			});

			// Sync back to the child table
			frm.doc.default_filters = newRows.map(function (r, i) {
				return $.extend(
					{},
					(frm.doc.default_filters && frm.doc.default_filters[i]) || {},
					{
						field: r.field,
						op: r.op,
						value: r.value,
						doctype: "Page Panel Default Filter",
						parenttype: "Page Panel",
						parentfield: "default_filters",
					},
				);
			});
			frm.dirty();
		}

		function _bind_events() {
			// Field change
			$widget
				.find(".pp-df-field")
				.off("change")
				.on("change", function () {
					const idx = parseInt($(this).data("idx"), 10);
					const fieldname = $(this).val();
					const ops = _ops_for_field(fieldname);
					const currentOp = (frm.doc.default_filters[idx] || {}).op || "=";
					const newOp = ops.includes(currentOp) ? currentOp : ops[0];
					if (!frm.doc.default_filters[idx]) frm.doc.default_filters[idx] = {};
					frm.doc.default_filters[idx].field = fieldname;
					frm.doc.default_filters[idx].op = newOp;
					frm.doc.default_filters[idx].value = "";
					frm.dirty();
					_render_rows();
				});

			// Op button
			$widget
				.find(".pp-df-op-btn")
				.off("click")
				.on("click", function () {
					const idx = parseInt($(this).data("idx"), 10);
					const op = $(this).data("op");
					if (!frm.doc.default_filters[idx]) frm.doc.default_filters[idx] = {};
					frm.doc.default_filters[idx].op = op;
					$(this)
						.closest(".pp-df-ops")
						.find(".pp-df-op-btn")
						.removeClass("pp-df-op-active");
					$(this).addClass("pp-df-op-active");
					frm.dirty();
				});

			// Value input (non-date)
			$widget
				.find(".pp-df-val")
				.off("input")
				.on("input", function () {
					const idx = parseInt($(this).data("idx"), 10);
					if (!frm.doc.default_filters[idx]) frm.doc.default_filters[idx] = {};
					frm.doc.default_filters[idx].value = $(this).val();
					frm.dirty();
				});

			// SQL date input — clears days-ago sibling
			$widget
				.find(".pp-df-sql-date")
				.off("input")
				.on("input", function () {
					const idx = parseInt($(this).data("idx"), 10);
					const val = $(this).val();
					$(this).closest(".pp-df-row").find(".pp-df-days-ago").val("");
					if (!frm.doc.default_filters[idx]) frm.doc.default_filters[idx] = {};
					frm.doc.default_filters[idx].value = val;
					frm.dirty();
				});

			// Days ago input — clears SQL date sibling
			$widget
				.find(".pp-df-days-ago")
				.off("input")
				.on("input", function () {
					const idx = parseInt($(this).data("idx"), 10);
					const val = $(this).val();
					$(this).closest(".pp-df-row").find(".pp-df-sql-date").val("");
					if (!frm.doc.default_filters[idx]) frm.doc.default_filters[idx] = {};
					frm.doc.default_filters[idx].value = val ? val + " days ago" : "";
					frm.dirty();
				});

			// Remove row
			$widget
				.find(".pp-df-rm")
				.off("click")
				.on("click", function () {
					const idx = parseInt($(this).data("idx"), 10);
					frm.doc.default_filters.splice(idx, 1);
					frm.dirty();
					_render_rows();
				});

			// Add row
			$widget
				.find(".pp-df-add")
				.off("click")
				.on("click", function () {
					if (!frm.doc.default_filters) frm.doc.default_filters = [];
					frm.doc.default_filters.push({
						doctype: "Page Panel Default Filter",
						parenttype: "Page Panel",
						parentfield: "default_filters",
						field: "",
						op: "=",
						value: "",
					});
					frm.dirty();
					_render_rows();
				});
		}

		_render_rows();
		fd.$wrapper.append($widget);
	}

	if (doctype) {
		_get_doctype_fields(doctype, function (fields) {
			_build(fields);
		});
	} else {
		_build([]);
	}
}

// ── Default filter widget CSS ─────────────────────────────────────────────────
$("<style>")
	.text(
		`
		.pp-df-op-btn {
			padding: 2px 7px;
			font-size: 11px;
			border: 1px solid #d1d8dd;
			background: #fff;
			border-radius: 3px;
			cursor: pointer;
			line-height: 1.4;
		}
		.pp-df-op-btn.pp-df-op-active {
			background: #171717;
			color: #fff;
			border-color: #171717;
		}
		.pp-df-val {
			flex: 1;
			min-width: 80px;
			max-width: 220px;
			font-size: 12px;
			padding: 3px 7px;
			border: 1px solid #d1d8dd;
			border-radius: 3px;
			height: 28px;
		}
	`,
	)
	.appendTo("head");

// ── Related DocTypes picker ───────────────────────────────────────────────────
function _show_related_picker(available, preselected, callback) {
	if (!available || !available.length) {
		callback([]);
		return;
	}

	const preselected_set = new Set(
		(preselected || []).map(function (r) {
			return r.doctype;
		}),
	);

	const fields = available.map(function (c) {
		return {
			label: c.label || c.doctype,
			fieldname: "sel__" + c.doctype.replace(/ /g, "_"),
			fieldtype: "Check",
			default: preselected_set.has(c.doctype) ? 1 : 0,
		};
	});

	const d = new frappe.ui.Dialog({
		title: __("Add tabs to display related tables?"),
		fields: fields,
		size: "small",
		primary_action_label: __("OK"),
		secondary_action_label: __("Skip"),
		primary_action: function (values) {
			const selected = available.filter(function (c) {
				const key = "sel__" + c.doctype.replace(/ /g, "_");
				return values[key];
			});
			d.hide();
			callback(selected);
		},
		secondary_action: function () {
			d.hide();
			callback([]);
		},
	});
	d.show();
}

// ── Dialogs tab ──────────────────────────────────────────────────────────────
function _render_dialogs_tab(frm) {
	const $container = $(frm.layout.wrapper).find(".pp-dialogs-wrap");
	if (!$container.length) return;

	if (!frm.doc.root_doctype) {
		$container.html(
			'<p style="color:#8d949a;font-size:12px;padding:8px 0;">Select a DocType in the Config tab first.</p>',
		);
		return;
	}

	$container.html('<p style="color:#8d949a;font-size:12px;padding:8px 0;">Loading dialogs…</p>');

	frappe.call({
		method: "nce_events.api.form_dialog_api.list_form_dialogs_for_doctype",
		args: { doctype: frm.doc.root_doctype },
		callback: function (r) {
			const dialogs = (r && r.message) || [];
			_build_dialogs_tab_html(frm, $container, dialogs);
		},
		error: function () {
			$container.html(
				'<p style="color:#c0392b;font-size:12px;padding:8px 0;">Failed to load dialogs.</p>',
			);
		},
	});
}

function _build_dialogs_tab_html(frm, $container, dialogs) {
	$container.empty();

	const current = frm.doc.form_dialog || "";
	const doctype = frm.doc.root_doctype;

	// ── Current selection ──
	let current_html = "";
	if (current) {
		current_html = `
			<div style="margin-bottom:12px;padding:8px 12px;background:#f4f5f6;border-radius:4px;font-size:12px;">
				<strong>Active dialog:</strong> ${frappe.utils.escape_html(current)}
				<button class="btn btn-xs btn-default pp-dialog-rebuild" style="margin-left:8px;">Rebuild</button>
				<button class="btn btn-xs btn-default pp-dialog-open" style="margin-left:4px;">Open in full form</button>
			</div>`;
	} else {
		current_html = `
			<div style="margin-bottom:12px;padding:8px 12px;background:#fef9e7;border-radius:4px;font-size:12px;">
				No dialog linked to this panel. Create or select one below.
			</div>`;
	}

	// ── List of existing dialogs ──
	let list_html = "";
	if (dialogs.length) {
		list_html = `<table style="width:100%;font-size:12px;border-collapse:collapse;">
			<thead>
				<tr style="border-bottom:1px solid #d1d8dd;text-align:left;">
					<th style="padding:4px 8px;">Title</th>
					<th style="padding:4px 8px;">Size</th>
					<th style="padding:4px 8px;">Captured</th>
					<th style="padding:4px 8px;"></th>
				</tr>
			</thead>
			<tbody>`;
		dialogs.forEach(function (d) {
			const is_current = d.name === current;
			const row_bg = is_current ? "background:#e8f5e9;" : "";
			list_html += `<tr style="border-bottom:1px solid #ededed;${row_bg}">
				<td style="padding:4px 8px;">${frappe.utils.escape_html(d.title)}</td>
				<td style="padding:4px 8px;">${frappe.utils.escape_html(d.dialog_size || "xl")}</td>
				<td style="padding:4px 8px;">${d.captured_at ? frappe.datetime.str_to_user(d.captured_at) : "—"}</td>
				<td style="padding:4px 8px;">
					${is_current ? '<span style="color:#27ae60;font-weight:600;">Active</span>' : '<button class="btn btn-xs btn-default pp-dialog-select" data-name="' + frappe.utils.escape_html(d.name) + '">Set as active</button>'}
					<button class="btn btn-xs btn-default pp-dialog-delete" data-name="${frappe.utils.escape_html(d.name)}" style="margin-left:4px;color:#c0392b;">Delete</button>
				</td>
			</tr>`;
		});
		list_html += `</tbody></table>`;
	} else {
		list_html = `<p style="color:#8d949a;font-size:12px;">No Form Dialogs exist for <strong>${frappe.utils.escape_html(doctype)}</strong> yet.</p>`;
	}

	// ── Create button ──
	const create_html = `
		<div style="margin-top:12px;">
			<button class="btn btn-xs btn-primary pp-dialog-create">Create &amp; capture from Desk</button>
		</div>`;

	$container.html(current_html + list_html + create_html);

	// ── Event handlers ──

	$container.on("click", ".pp-dialog-create", function () {
		frappe.prompt(
			{
				label: "Dialog title",
				fieldname: "title",
				fieldtype: "Data",
				reqd: 1,
				default: doctype + " — dialog",
			},
			function (values) {
				// Fetch related DocTypes, then show picker, then capture
				frappe.call({
					method: "nce_events.api.panel_api.get_child_doctypes",
					args: { root_doctype: frm.doc.root_doctype },
					callback: function (r) {
						const children = (r && r.message) || [];
						_show_related_picker(children, [], function (selected) {
							frappe.call({
								method: "nce_events.api.form_dialog_api.capture_form_dialog_from_desk",
								args: {
									doctype: doctype,
									title: values.title,
									related_doctypes: JSON.stringify(selected),
								},
								freeze: true,
								freeze_message: "Capturing schema from Desk…",
								callback: function (r) {
									if (r && r.message) {
										frm.set_value("form_dialog", r.message);
										frm.dirty();
										frm.save().then(function () {
											_render_dialogs_tab(frm);
										});
										frappe.show_alert({
											message: "Dialog captured: " + r.message,
											indicator: "green",
										});
									}
								},
							});
						});
					},
				});
			},
			"Create Form Dialog",
			"Create",
		);
	});

	$container.on("click", ".pp-dialog-rebuild", function () {
		if (!current) return;
		frappe.confirm(
			"This will overwrite the frozen schema with the current Desk definition. Continue?",
			function () {
				// 1. Get current definition (for pre-populated selection)
				frappe.call({
					method: "nce_events.api.form_dialog_api.get_form_dialog_definition",
					args: { name: current },
					callback: function (defn_r) {
						const current_related =
							(defn_r && defn_r.message && defn_r.message.related_doctypes) || [];

						// 2. Get available child doctypes
						frappe.call({
							method: "nce_events.api.panel_api.get_child_doctypes",
							args: { root_doctype: frm.doc.root_doctype },
							callback: function (r) {
								const children = (r && r.message) || [];

								// 3. Show picker with pre-selection
								_show_related_picker(
									children,
									current_related,
									function (selected) {
										// 4. Rebuild with selection
										frappe.call({
											method: "nce_events.api.form_dialog_api.rebuild_form_dialog",
											args: {
												name: current,
												related_doctypes: JSON.stringify(selected),
											},
											freeze: true,
											freeze_message: "Rebuilding schema…",
											callback: function () {
												frappe.show_alert({
													message: "Schema rebuilt.",
													indicator: "green",
												});
												_render_dialogs_tab(frm);
											},
										});
									},
								);
							},
						});
					},
				});
			},
		);
	});

	$container.on("click", ".pp-dialog-open", function () {
		if (!current) return;
		window.open(frappe.utils.get_form_link("Form Dialog", current), "_blank");
	});

	$container.on("click", ".pp-dialog-select", function () {
		const name = $(this).data("name");
		frm.set_value("form_dialog", name);
		frm.dirty();
		frm.save().then(function () {
			_render_dialogs_tab(frm);
		});
	});

	$container.on("click", ".pp-dialog-delete", function () {
		const name = $(this).data("name");
		frappe.confirm(
			"Delete Form Dialog <strong>" +
				frappe.utils.escape_html(name) +
				"</strong>? This cannot be undone.",
			function () {
				function doDelete() {
					frappe.call({
						method: "frappe.client.delete",
						args: { doctype: "Form Dialog", name: name },
						freeze: true,
						freeze_message: "Deleting…",
						callback: function () {
							frappe.show_alert({
								message: "Deleted: " + name,
								indicator: "orange",
							});
							_render_dialogs_tab(frm);
						},
					});
				}

				// If deleting the active dialog, unlink and save first
				// so Frappe doesn't block the delete due to the link.
				if (name === current) {
					frm.set_value("form_dialog", "");
					frm.dirty();
					frm.save().then(doDelete);
				} else {
					doDelete();
				}
			},
		);
	});
}

// ── Page Panel form events ────────────────────────────────────────────────────
frappe.ui.form.on("Page Panel", {
	refresh: function (frm) {
		_ensure_tab_bar(frm);
		_render_default_filters(frm);
		// Hide Frappe's native tab bar (rendered when Tab Break fields exist in the DocType)
		$(frm.layout.wrapper).find(".form-tabs-list, .nav-tabs").hide();

		// Filter form_dialog Link to only show dialogs for the current root_doctype
		if (frm.doc.root_doctype) {
			frm.set_query("form_dialog", function () {
				return {
					filters: {
						target_doctype: frm.doc.root_doctype,
						is_active: 1,
					},
				};
			});
		}
	},

	root_doctype: function (frm) {
		if (frm.doc.root_doctype) {
			delete _dt_field_cache[frm.doc.root_doctype];
		}
		frm.set_value("column_order", "");
		frm.set_value("bold_fields", "");
		frm.set_value("gender_column", "");
		frm.set_value("gender_color_fields", "");
		frm.set_value("title_field", "");
		_render_default_filters(frm);
		if (frm.doc.root_doctype) {
			frappe.call({
				method: "nce_events.api.panel_api.get_doctype_fields",
				args: { root_doctype: frm.doc.root_doctype },
				callback: function (r) {
					const u = _unpack_doctype_fields_message(r && r.message);
					const tf = u.doctype_title_field;
					if (
						tf &&
						u.fields.some(function (f) {
							return f.fieldname === tf;
						})
					) {
						frm.set_value("title_field", tf);
					}
				},
			});
		}
		const $layout = $(frm.layout.wrapper);
		if ($layout.data("pp-active-tab") === "display") {
			_render_display(frm);
		}
	},

	column_order: function (frm) {
		// Re-render filter widget so field list reflects updated visible columns
		_render_default_filters(frm);
	},
});
