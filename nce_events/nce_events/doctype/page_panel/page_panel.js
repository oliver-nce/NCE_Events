// ── DocType field cache ───────────────────────────────────────────────────────
const _dt_field_cache = {};
let _pp_rebuild_pending = false;

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

/** Clear cached get_doctype_fields results so the next fetch sees current DocType meta. */
function _clear_doctype_field_cache() {
	Object.keys(_dt_field_cache).forEach(function (k) {
		delete _dt_field_cache[k];
	});
}

/** Keys that exist as rows on the Display matrices after a fresh meta fetch. */
function _collect_valid_display_keys(root_fields, link_fields, linked_data, frm) {
	const valid = {};
	root_fields.forEach(function (f) {
		valid[f.fieldname] = true;
	});
	_get_computed_fields(frm).forEach(function (f) {
		if (f.fieldname) valid[f.fieldname] = true;
	});
	_get_related_fields(frm).forEach(function (f) {
		if (f.fieldname) valid[f.fieldname] = true;
	});
	link_fields.forEach(function (lf) {
		const ld = linked_data[lf.fieldname];
		if (!ld || !ld.fields) return;
		const p = lf.fieldname + ".";
		ld.fields.forEach(function (f) {
			valid[p + f.fieldname] = true;
		});
	});
	return valid;
}

/** Drop column_order / bold / gender / title entries that no longer match any field row. */
function _prune_stale_display_keys(frm, valid) {
	function keep(csv) {
		return _parse_csv(csv).filter(function (k) {
			return valid[k];
		});
	}
	const col = keep(frm.doc.column_order);
	const bold = keep(frm.doc.bold_fields);
	const tint = keep(frm.doc.gender_color_fields);
	const gcRaw = (frm.doc.gender_column || "").trim();
	const gc = gcRaw && valid[gcRaw] ? gcRaw : "";
	const tfRaw = (frm.doc.title_field || "").trim();
	const tf = tfRaw && valid[tfRaw] ? tfRaw : "";

	const nextCol = col.join(", ");
	const nextBold = bold.join(", ");
	const nextTint = tint.join(", ");
	if (nextCol !== (frm.doc.column_order || "").trim()) frm.set_value("column_order", nextCol);
	if (nextBold !== (frm.doc.bold_fields || "").trim()) frm.set_value("bold_fields", nextBold);
	if (nextTint !== (frm.doc.gender_color_fields || "").trim()) frm.set_value("gender_color_fields", nextTint);
	if (gc !== gcRaw) frm.set_value("gender_column", gc);
	if (tf !== tfRaw) frm.set_value("title_field", tf);
}

/**
 * True if any saved Display / Order key references a field row that no longer exists
 * (e.g. root Link removed, or linked DocType field removed). Used implicitly via prune
 * whenever Display is built from current meta.
 */
function _display_has_orphan_keys(frm, valid) {
	function listHasOrphan(csv) {
		return _parse_csv(csv).some(function (k) {
			return !valid[k];
		});
	}
	if (listHasOrphan(frm.doc.column_order)) return true;
	if (listHasOrphan(frm.doc.bold_fields)) return true;
	if (listHasOrphan(frm.doc.gender_color_fields)) return true;
	const gc = (frm.doc.gender_column || "").trim();
	if (gc && !valid[gc]) return true;
	const tf = (frm.doc.title_field || "").trim();
	if (tf && !valid[tf]) return true;
	return false;
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
	// Drop keys for removed root Links / removed linked fields / removed related columns.
	// Sub-tabs follow current link_fields only; stale "link.field" tokens must leave column_order
	// so the Order tab and saved doc stay consistent (avoids dirtying when nothing is stale).
	const valid = _collect_valid_display_keys(root_fields, link_fields, linked_data, frm);
	if (_display_has_orphan_keys(frm, valid)) {
		_prune_stale_display_keys(frm, valid);
	}

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
	const $sub_bar = $(
		'<div style="display:flex;gap:4px;padding:0 0 8px;flex-wrap:wrap;align-items:center;"></div>',
	);
	sub_tabs.forEach(function (st) {
		$sub_bar.append(
			`<button class="btn btn-xs btn-default pp-sub-btn" data-sub="${st.id}" style="padding:2px 12px;border-radius:4px;font-size:11px;">${frappe.utils.escape_html(st.label)}</button>`,
		);
	});
	const $reloadWrap = $('<span style="margin-left:auto;"></span>');
	const $reloadFields = $(
		`<a href="#" class="pp-reload-doctype-fields" style="font-size:12px;color:#4198F0;">${frappe.utils.escape_html(__("Reload fields"))}</a>`,
	);
	$reloadFields.on("click", function (e) {
		e.preventDefault();
		_clear_doctype_field_cache();
		_render_display(frm);
	});
	$reloadWrap.append($reloadFields);
	$sub_bar.append($reloadWrap);
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

// ── Related portal field editor (floating panel, Desk) ───────────────────────
if (!$("head").find("#pp-portal-float-css").length) {
	$("<style>")
		.attr("id", "pp-portal-float-css")
		.text(
			`
		.pp-portal-float-backdrop { font-family: inherit; }
		.pp-portal-float-panel .table > tbody > tr > td { vertical-align: middle; }
		.pp-portal-float-panel td.pp-portal-drag:hover { background: #f0f4f8; }
		.pp-portal-float-panel tr.pp-portal-drag-over { outline: 2px solid #2490ef; outline-offset: -2px; }
		.pp-portal-float-panel .pp-sort-up.btn-primary,
		.pp-portal-float-panel .pp-sort-down.btn-primary { color: #fff; }
	`,
		)
		.appendTo("head");
}

let _pp_portal_float_cleanup = null;

function _close_related_portal_float() {
	if (typeof _pp_portal_float_cleanup === "function") {
		_pp_portal_float_cleanup();
		_pp_portal_float_cleanup = null;
	}
}

function _open_related_portal_float(frm, opts) {
	const form_dialog = opts.form_dialog;
	const child_row_name = opts.child_row_name;
	const titleHint = opts.tab_label || __("Related table");

	if (!form_dialog || !child_row_name) {
		frappe.show_alert({ message: __("Missing dialog or row id"), indicator: "orange" });
		return;
	}

	_close_related_portal_float();

	const $backdrop = $(
		'<div class="pp-portal-float-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:2000;"></div>',
	);
	const $panel = $(
		'<div class="pp-portal-float-panel" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(880px,94vw);max-height:85vh;display:flex;flex-direction:column;background:#fff;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,0.2);z-index:2001;font-size:12px;"></div>',
	);
	const $header = $(
		'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #e8e8e8;"><strong class="pp-portal-float-title"></strong><button type="button" class="btn btn-default btn-xs pp-portal-float-close" aria-label="Close">×</button></div>',
	);
	const $body = $(
		'<div class="pp-portal-float-body" style="flex:1;overflow:hidden;display:flex;flex-direction:column;padding:10px 16px 16px;"><p class="text-muted" style="margin:0;">' +
			__("Loading…") +
			"</p></div>",
	);
	$panel.append($header).append($body);
	$backdrop.append($panel);
	$("body").append($backdrop);

	function onKey(ev) {
		if (ev.key === "Escape") {
			_close_related_portal_float();
		}
	}
	$(document).on("keydown.ppPortalFloat", onKey);

	_pp_portal_float_cleanup = function () {
		$(document).off("keydown.ppPortalFloat", onKey);
		$backdrop.remove();
	};

	$backdrop.on("click", function (e) {
		if (e.target === $backdrop[0]) {
			_close_related_portal_float();
		}
	});
	$panel.on("click", function (e) {
		e.stopPropagation();
	});
	$panel.find(".pp-portal-float-close").on("click", function () {
		_close_related_portal_float();
	});

	frappe.call({
		method: "nce_events.api.form_dialog_api.get_related_portal_field_editor",
		args: { form_dialog: form_dialog, child_row_name: child_row_name },
		freeze: true,
		freeze_message: __("Loading fields…"),
		callback: function (r) {
			if (!r || r.exc || !r.message) {
				$body.html('<p class="text-danger" style="margin:0;">' + __("Could not load editor.") + "</p>");
				return;
			}
			const msg = r.message;
			$panel.find(".pp-portal-float-title").text(
				titleHint + " — " + (msg.tab_label || "") + " (" + (msg.child_doctype || "") + ")",
			);

			let warn = "";
			if (msg.capture_error) {
				const errTxt = String(msg.capture_error).substring(0, 500);
				warn =
					'<div class="alert alert-warning" style="margin-bottom:10px;padding:8px;font-size:11px;">' +
					frappe.utils.escape_html(errTxt) +
					"</div>";
			}

			const rows = msg.rows || [];
			let tableHtml =
				warn +
				'<div class="pp-portal-sort-toolbar" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">' +
				"<strong>" +
				__("Sort by") +
				'</strong><button type="button" class="btn btn-default btn-xs pp-portal-sort-clear">' +
				__("Clear sort") +
				"</button></div>" +
				'<div style="overflow-y:auto;max-height:55vh;border:1px solid #d1d8dd;border-radius:4px;">' +
				'<table class="table table-bordered" style="margin:0;font-size:12px;">' +
				'<thead style="position:sticky;top:0;background:#f7fafc;z-index:1;"><tr>' +
				'<th style="width:36px;"></th><th>' +
				__("Field") +
				'</th><th style="width:70px;">' +
				__("Show") +
				'</th><th style="width:90px;">' +
				__("Editable") +
				'</th><th style="min-width:108px;">' +
				__("Sort") +
				"</th></tr></thead><tbody class=\"pp-portal-field-tbody\">";

			rows.forEach(function (row) {
				const fn = row.fieldname || "";
				const sh = row.show ? " checked" : "";
				const ed = row.editable ? " checked" : "";
				const srRaw = parseInt(row.sort_rank, 10) || 0;
				const sdRaw = row.sort_dir === "desc" ? "desc" : "asc";
				const showOn = !!row.show && Number(row.show) !== 0;
				const effSr = showOn && srRaw > 0 ? srRaw : 0;
				const effSd = effSr > 0 ? sdRaw : "asc";
				const rankLabel = effSr > 0 ? String(effSr) : "—";
				const upPrim = effSr > 0 && effSd === "asc" ? " btn-primary" : "";
				const dnPrim = effSr > 0 && effSd === "desc" ? " btn-primary" : "";
				const btnDis = effSr <= 0 ? " disabled" : "";
				tableHtml +=
					'<tr draggable="true" data-fieldname="' +
					frappe.utils.escape_html(fn) +
					'" data-sort-rank="' +
					effSr +
					'" data-sort-dir="' +
					effSd +
					'">' +
					'<td class="text-muted pp-portal-drag" title="' +
					__("Drag row (same as Display → Order tab)") +
					'" style="cursor:grab;text-align:center;user-select:none;-webkit-user-select:none;"><span class="pp-portal-drag-handle" style="color:#b7babe;">&#x2630;</span></td>' +
					"<td>" +
					frappe.utils.escape_html(row.label || fn) +
					' <span class="text-muted">(' +
					frappe.utils.escape_html(row.fieldtype || "") +
					")</span></td>" +
					'<td class="text-center"><input type="checkbox" class="pp-portal-show" draggable="false"' +
					sh +
					" /></td>" +
					'<td class="text-center"><input type="checkbox" class="pp-portal-editable" draggable="false"' +
					ed +
					' /></td><td class="text-center pp-portal-sort-cell" style="white-space:nowrap;">' +
					'<span class="pp-portal-sort-rank" draggable="false" style="display:inline-block;min-width:18px;font-weight:600;cursor:pointer;margin-right:4px;" title="' +
					__("Click to add or remove from sort (Show must be on)") +
					'">' +
					rankLabel +
					'</span><span class="btn-group" role="group" draggable="false">' +
					'<button type="button" class="btn btn-xs btn-default pp-sort-up" draggable="false"' +
					upPrim +
					'" title="' +
					__("Ascending") +
					'"' +
					btnDis +
					">↑</button>" +
					'<button type="button" class="btn btn-xs btn-default pp-sort-down" draggable="false"' +
					dnPrim +
					'" title="' +
					__("Descending") +
					'"' +
					btnDis +
					">↓</button></span></td></tr>";
			});

			tableHtml += "</tbody></table></div>";
			tableHtml +=
				'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
				'<button type="button" class="btn btn-default btn-sm pp-portal-float-cancel">' +
				__("Close") +
				"</button>" +
				'<button type="button" class="btn btn-primary btn-sm pp-portal-float-save">' +
				__("Save") +
				"</button></div>";

			$body.empty().html(tableHtml);

			const $tbody = $body.find(".pp-portal-field-tbody");

			function ppMaxSortRank($tb) {
				let m = 0;
				$tb.find("tr").each(function () {
					const r = parseInt($(this).attr("data-sort-rank") || "0", 10) || 0;
					if (r > m) {
						m = r;
					}
				});
				return m;
			}

			function ppApplySortUI($tr) {
				const show = $tr.find(".pp-portal-show").prop("checked");
				let sr = parseInt($tr.attr("data-sort-rank") || "0", 10) || 0;
				let sd = $tr.attr("data-sort-dir") === "desc" ? "desc" : "asc";
				if (!show) {
					sr = 0;
					sd = "asc";
					$tr.attr("data-sort-rank", "0");
					$tr.attr("data-sort-dir", "asc");
				}
				const $rk = $tr.find(".pp-portal-sort-rank");
				const $up = $tr.find(".pp-sort-up");
				const $dn = $tr.find(".pp-sort-down");
				if (!show || sr <= 0) {
					$rk.text("—");
					$up.removeClass("btn-primary").prop("disabled", true);
					$dn.removeClass("btn-primary").prop("disabled", true);
					return;
				}
				$rk.text(String(sr));
				$up.prop("disabled", false);
				$dn.prop("disabled", false);
				$up.toggleClass("btn-primary", sd === "asc");
				$dn.toggleClass("btn-primary", sd === "desc");
			}

			function ppRefreshAllSortUI($tb) {
				$tb.find("tr").each(function () {
					ppApplySortUI($(this));
				});
			}

			function ppRenumberSortRanks($tb) {
				const ranked = [];
				$tb.find("tr").each(function () {
					const $tr = $(this);
					const sr = parseInt($tr.attr("data-sort-rank") || "0", 10) || 0;
					if ($tr.find(".pp-portal-show").prop("checked") && sr > 0) {
						ranked.push({ $tr: $tr, sr: sr });
					}
				});
				ranked.sort(function (a, b) {
					return a.sr - b.sr;
				});
				ranked.forEach(function (item, idx) {
					item.$tr.attr("data-sort-rank", String(idx + 1));
				});
				$tb.find("tr").each(function () {
					const $tr = $(this);
					if (!$tr.find(".pp-portal-show").prop("checked")) {
						$tr.attr("data-sort-rank", "0");
						$tr.attr("data-sort-dir", "asc");
					}
				});
				ppRefreshAllSortUI($tb);
			}

			// Row reorder: same native HTML5 pattern as Display → Order tab (_render_order_tab).
			let ppPortalDnD_src = null;
			$tbody
				.find("tr")
				.on("dragstart", function (e) {
					ppPortalDnD_src = this;
					$(this).css("opacity", "0.4");
					e.originalEvent.dataTransfer.effectAllowed = "move";
					e.originalEvent.dataTransfer.setData("text/plain", "");
				})
				.on("dragend", function () {
					$(this).css("opacity", "");
					$tbody.find("tr").removeClass("pp-portal-drag-over");
				})
				.on("dragover", function (e) {
					e.preventDefault();
					e.originalEvent.dataTransfer.dropEffect = "move";
					$tbody.find("tr").removeClass("pp-portal-drag-over");
					$(this).addClass("pp-portal-drag-over");
				})
				.on("drop", function (e) {
					e.preventDefault();
					if (!ppPortalDnD_src || ppPortalDnD_src === this) {
						return;
					}
					const $target = $(this);
					const $src = $(ppPortalDnD_src);
					if ($src.index() < $target.index()) {
						$target.after($src);
					} else {
						$target.before($src);
					}
					$tbody.find("tr").removeClass("pp-portal-drag-over");
				});

			$body.on("change", ".pp-portal-show", function () {
				const $tr = $(this).closest("tr");
				if (!$(this).prop("checked")) {
					$tr.attr("data-sort-rank", "0");
					$tr.attr("data-sort-dir", "asc");
				}
				ppRenumberSortRanks($tbody);
			});

			$body.on("click", ".pp-portal-sort-rank", function (e) {
				e.preventDefault();
				const $tr = $(this).closest("tr");
				if (!$tr.find(".pp-portal-show").prop("checked")) {
					return;
				}
				const cur = parseInt($tr.attr("data-sort-rank") || "0", 10) || 0;
				if (cur > 0) {
					$tr.attr("data-sort-rank", "0");
					$tr.attr("data-sort-dir", "asc");
				} else {
					const mx = ppMaxSortRank($tbody);
					$tr.attr("data-sort-rank", String(mx + 1));
					$tr.attr("data-sort-dir", "asc");
				}
				ppRenumberSortRanks($tbody);
			});

			$body.on("click", ".pp-sort-up", function (e) {
				e.preventDefault();
				e.stopPropagation();
				const $tr = $(this).closest("tr");
				const sr = parseInt($tr.attr("data-sort-rank") || "0", 10) || 0;
				if (sr <= 0 || !$tr.find(".pp-portal-show").prop("checked")) {
					return;
				}
				$tr.attr("data-sort-dir", "asc");
				ppApplySortUI($tr);
			});

			$body.on("click", ".pp-sort-down", function (e) {
				e.preventDefault();
				e.stopPropagation();
				const $tr = $(this).closest("tr");
				const sr = parseInt($tr.attr("data-sort-rank") || "0", 10) || 0;
				if (sr <= 0 || !$tr.find(".pp-portal-show").prop("checked")) {
					return;
				}
				$tr.attr("data-sort-dir", "desc");
				ppApplySortUI($tr);
			});

			$body.on("click", ".pp-portal-sort-clear", function (e) {
				e.preventDefault();
				$tbody.find("tr").each(function () {
					$(this).attr("data-sort-rank", "0");
					$(this).attr("data-sort-dir", "asc");
				});
				ppRefreshAllSortUI($tbody);
			});

			$body.find(".pp-portal-float-cancel").on("click", function () {
				_close_related_portal_float();
			});

			$body.find(".pp-portal-float-save").on("click", function () {
				const payload = [];
				$tbody.find("tr").each(function () {
					const fn = $(this).attr("data-fieldname");
					if (!fn) {
						return;
					}
					const show = $(this).find(".pp-portal-show").prop("checked") ? 1 : 0;
					const sr = parseInt($(this).attr("data-sort-rank") || "0", 10) || 0;
					const sd = $(this).attr("data-sort-dir") === "desc" ? "desc" : "asc";
					const o = {
						fieldname: fn,
						show: show,
						editable: $(this).find(".pp-portal-editable").prop("checked") ? 1 : 0,
					};
					if (show && sr > 0) {
						o.sort_rank = sr;
						o.sort_dir = sd;
					}
					payload.push(o);
				});
				frappe.call({
					method: "nce_events.api.form_dialog_api.save_related_portal_field_config",
					args: {
						form_dialog: form_dialog,
						child_row_name: child_row_name,
						portal_field_config: JSON.stringify(payload),
					},
					freeze: true,
					freeze_message: __("Saving…"),
					callback: function (sv) {
						if (sv && sv.exc) {
							return;
						}
						frappe.show_alert({ message: __("Portal field config saved"), indicator: "green" });
						_close_related_portal_float();
						_render_dialogs_tab(frm);
					},
				});
			});
		},
	});
}

// ── Related DocTypes picker ───────────────────────────────────────────────────
function _normalizeHopChainForPickerKey(hc) {
	if (!Array.isArray(hc)) {
		return [];
	}
	return hc.map(function (s) {
		return {
			bridge: (s && s.bridge) || "",
			parent_link: (s && s.parent_link) || "",
			child_link: (s && s.child_link) || "",
		};
	});
}

function _relatedPickerFingerprint(row) {
	const dt = row && row.doctype ? String(row.doctype).trim() : "";
	let hc = row && row.hop_chain;
	if (typeof hc === "string") {
		try {
			hc = JSON.parse(hc || "[]");
		} catch (e) {
			hc = [];
		}
	}
	return dt + "\0" + JSON.stringify(_normalizeHopChainForPickerKey(hc));
}

function _htmlEscAttr(s) {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/"/g, "&quot;");
}

/** @param buckets {{ "1_hop": object[], "2_hop": object[], "3_hop": object[] }} from get_multi_hop_children */
function _show_related_picker(buckets, preselected, callback) {
	const b = buckets || {};
	const one = b["1_hop"] || [];
	const two = b["2_hop"] || [];
	const three = b["3_hop"] || [];
	const allRowsFlat = one.concat(two, three);
	if (!allRowsFlat.length) {
		callback([]);
		return;
	}

	const preselected_set = new Set((preselected || []).map(_relatedPickerFingerprint));

	function colHtml(title, rows, idxOffset) {
		let h =
			'<div class="pp-related-picker-col" style="flex:1;min-width:0;max-height:360px;overflow-y:auto;padding:10px;border:1px solid #eef0f2;border-radius:6px;background:#fafbfc;">';
		h +=
			'<div style="font-size:11px;font-weight:600;color:#74808b;text-transform:uppercase;margin:0 0 10px;">' +
			_htmlEscAttr(title) +
			"</div>";
		if (!rows.length) {
			h += '<div style="color:#b9c0c7;font-size:12px;">' + _htmlEscAttr(__("None")) + "</div>";
		} else {
			rows.forEach(function (row, j) {
				const idx = idxOffset + j;
				const id = "pp-related-sel-" + idx;
				const lab = row.label || row.doctype || "";
				const checked = preselected_set.has(_relatedPickerFingerprint(row)) ? " checked" : "";
				h += '<div style="margin:0 0 8px;display:flex;align-items:flex-start;gap:8px;">';
				h +=
					'<input type="checkbox" class="pp-related-cb" id="' +
					id +
					'" data-idx="' +
					idx +
					'" style="margin-top:2px;"' +
					checked +
					"/>";
				h +=
					'<label for="' +
					id +
					'" style="margin:0;font-weight:400;cursor:pointer;line-height:1.35;">' +
					_htmlEscAttr(lab) +
					"</label>";
				h += "</div>";
			});
		}
		h += "</div>";
		return h;
	}

	const bodyHtml =
		'<div class="pp-related-picker-wrap" style="display:flex;gap:12px;align-items:stretch;">' +
		colHtml(__("1-hop"), one, 0) +
		colHtml(__("2-hop"), two, one.length) +
		colHtml(__("3-hop"), three, one.length + two.length) +
		"</div>";

	const d = new frappe.ui.Dialog({
		title: __("Add tabs to display related tables?"),
		fields: [{ fieldname: "pp_related_picker_body", fieldtype: "HTML", options: bodyHtml }],
		size: "large",
		primary_action_label: __("OK"),
		secondary_action_label: __("Skip"),
		primary_action: function () {
			const selected = [];
			d.$wrapper.find(".pp-related-cb:checked").each(function () {
				const idx = parseInt($(this).attr("data-idx"), 10);
				if (!Number.isNaN(idx) && allRowsFlat[idx]) {
					const src = allRowsFlat[idx];
					selected.push({
						doctype: src.doctype,
						link_field: src.link_field,
						label: src.label || src.doctype,
						hop_chain: src.hop_chain || [],
					});
				}
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

// ── Dialogs tab ───────────────────────────────────────────────────────────
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
	_bind_dialogs_click_handlers(frm);

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

// ── Dialogs tab click handlers (event delegation) ────────────────────────
// Rebind on every Dialogs-tab render: a global "bind once" flag would freeze
// the first Page Panel's `frm` and mutate the wrong document on other panels.
function _bind_dialogs_click_handlers(frm) {
	const $wrapper = $(frm.layout.wrapper);
	$wrapper.off("click.ppFormDialogs");
	$wrapper.on("click.ppFormDialogs", ".pp-dialog-rebuild", function () {
		if (_pp_rebuild_pending) return;
		_pp_rebuild_pending = true;

		const current = frm.doc.form_dialog || "";
		const doctype = frm.doc.root_doctype;
		if (!current) {
			_pp_rebuild_pending = false;
			return;
		}

		frappe.confirm(
			"This will overwrite the frozen schema with the current Desk definition. Continue?",
			function () {
				// Defer follow-up modals: opening frappe.ui.Dialog in the same turn as
				// frappe.confirm closes fails in many Desk builds (related picker never appears).
				setTimeout(function () {
					frappe.call({
						method: "nce_events.api.form_dialog_api.get_form_dialog_definition",
						args: { name: current },
						error: function () {
							_pp_rebuild_pending = false;
							frappe.msgprint({
								title: __("Error"),
								message: __("Could not load the Form Dialog definition."),
								indicator: "red",
							});
						},
						callback: function (defn_r) {
							if (!defn_r || defn_r.exc) {
								_pp_rebuild_pending = false;
								if (defn_r && defn_r.exc) {
									frappe.msgprint({
										title: __("Error"),
										message: __("Could not load the Form Dialog definition."),
										indicator: "red",
									});
								}
								return;
							}
							const current_related =
								(defn_r.message && defn_r.message.related_doctypes) || [];

							frappe.call({
								method: "nce_events.api.panel_api.get_multi_hop_children",
								args: { root_doctype: doctype },
								error: function () {
									_pp_rebuild_pending = false;
									frappe.msgprint({
										title: __("Error"),
										message: __("Could not load related DocTypes."),
										indicator: "red",
									});
								},
								callback: function (r) {
									const buckets = (r && r.message) || {};
									const c1 = buckets["1_hop"] || [];
									const c2 = buckets["2_hop"] || [];
									const c3 = buckets["3_hop"] || [];
									const total = c1.length + c2.length + c3.length;

									function _run_rebuild_with_related(selected) {
										frappe.call({
											method: "nce_events.api.form_dialog_api.rebuild_form_dialog",
											args: {
												name: current,
												related_doctypes: JSON.stringify(selected || []),
											},
											freeze: true,
											freeze_message: "Rebuilding schema…",
											error: function () {
												_pp_rebuild_pending = false;
												frappe.msgprint({
													title: __("Error"),
													message: __("Rebuild failed."),
													indicator: "red",
												});
											},
											callback: function () {
												_pp_rebuild_pending = false;
												frappe.show_alert({
													message: "Schema rebuilt.",
													indicator: "green",
												});
												_render_dialogs_tab(frm);
											},
										});
									}

									if (!total) {
										frappe.confirm(
											__(
												"No related DocTypes link to {0}. Rebuild will clear extra tabs. Continue?",
												[doctype],
											),
											function () {
												_run_rebuild_with_related([]);
											},
											function () {
												_pp_rebuild_pending = false;
											},
										);
										return;
									}

									setTimeout(function () {
										_show_related_picker(
											buckets,
											current_related,
											function (selected) {
												_run_rebuild_with_related(selected);
											},
										);
									}, 0);
								},
							});
						},
					});
				}, 200);
			},
			function () {
				_pp_rebuild_pending = false;
			},
		);
	});

	$wrapper.on("click.ppFormDialogs", ".pp-dialog-create", function () {
		const doctype = frm.doc.root_doctype;
		frappe.prompt(
			{
				label: "Dialog title",
				fieldname: "title",
				fieldtype: "Data",
				reqd: 1,
				default: doctype + " — dialog",
			},
			function (values) {
				setTimeout(function () {
					frappe.call({
						method: "nce_events.api.panel_api.get_multi_hop_children",
						args: { root_doctype: frm.doc.root_doctype },
						error: function () {
							frappe.msgprint({
								title: __("Error"),
								message: __("Could not load related DocTypes."),
								indicator: "red",
							});
						},
						callback: function (r) {
							const buckets = (r && r.message) || {};
							const c1 = buckets["1_hop"] || [];
							const c2 = buckets["2_hop"] || [];
							const c3 = buckets["3_hop"] || [];
							const total = c1.length + c2.length + c3.length;

							function _run_capture_with_related(selected) {
								frappe.call({
									method: "nce_events.api.form_dialog_api.capture_form_dialog_from_desk",
									args: {
										doctype: doctype,
										title: values.title,
										related_doctypes: JSON.stringify(selected || []),
									},
									freeze: true,
									freeze_message: "Capturing schema from Desk…",
									error: function () {
										frappe.msgprint({
											title: __("Error"),
											message: __("Capture failed."),
											indicator: "red",
										});
									},
									callback: function (cap_r) {
										if (cap_r && cap_r.message) {
											frm.set_value("form_dialog", cap_r.message);
											frm.dirty();
											frm.save().then(function () {
												_render_dialogs_tab(frm);
											});
											frappe.show_alert({
												message: "Dialog captured: " + cap_r.message,
												indicator: "green",
											});
										}
									},
								});
							}

							if (!total) {
								frappe.confirm(
									__(
										"No related DocTypes link to {0}. Create dialog without extra tabs?",
										[doctype],
									),
									function () {
										_run_capture_with_related([]);
									},
									function () {
										// cancelled
									},
								);
								return;
							}

							setTimeout(function () {
								_show_related_picker(buckets, [], function (selected) {
									_run_capture_with_related(selected);
								});
							}, 0);
						},
					});
				}, 200);
			},
			"Create Form Dialog",
			"Create",
		);
	});

	$wrapper.on("click.ppFormDialogs", ".pp-dialog-open", function () {
		const current = frm.doc.form_dialog || "";
		if (!current) return;
		window.open(frappe.utils.get_form_link("Form Dialog", current), "_blank");
	});

	$wrapper.on("click.ppFormDialogs", ".pp-dialog-select", function () {
		const name = $(this).data("name");
		frm.set_value("form_dialog", name);
		frm.dirty();
		frm.save().then(function () {
			_render_dialogs_tab(frm);
		});
	});

	$wrapper.on("click.ppFormDialogs", ".pp-dialog-related-tab", function (ev) {
		ev.preventDefault();
		const $btn = $(this);
		const dialogName = $btn.attr("data-dialog-name") || "";
		const childRow = $btn.attr("data-child-row-name") || "";
		if (!childRow) {
			frappe.show_alert({
				message: __("Reload this form after migrate: missing related row id."),
				indicator: "orange",
			});
			return;
		}
		_open_related_portal_float(frm, {
			form_dialog: dialogName,
			child_row_name: childRow,
			tab_label: ($btn.text() || "").trim(),
		});
	});

	$wrapper.on("click.ppFormDialogs", ".pp-dialog-delete", function () {
		const name = $(this).data("name");
		const current = frm.doc.form_dialog || "";
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
			const rel = Array.isArray(d.related_doctypes) ? d.related_doctypes : [];
			if (rel.length) {
				let rel_btns = "";
				rel.forEach(function (row, idx) {
					const lab = row.label || row.doctype || "Tab";
					const dt = row.doctype || "";
					const lf = row.link_field || "";
					const crn = row.child_row_name || "";
					rel_btns += `<button type="button" class="btn btn-xs btn-default pp-dialog-related-tab" style="margin:2px 4px 2px 0;" data-pp-related-idx="${idx}" data-dialog-name="${frappe.utils.escape_html(d.name)}" data-child-row-name="${frappe.utils.escape_html(crn)}" data-child-doctype="${frappe.utils.escape_html(dt)}" data-link-field="${frappe.utils.escape_html(lf)}">${frappe.utils.escape_html(lab)}</button>`;
				});
				list_html += `<tr style="border-bottom:1px solid #ededed;${row_bg}"><td colspan="4" style="padding:4px 8px 8px 20px;background:#fafbfc;font-size:11px;">
					<div style="color:#8d99a6;margin-bottom:4px;">${__("Related table tabs (preview)")}</div>
					<div style="display:flex;flex-wrap:wrap;align-items:center;gap:2px;">${rel_btns}</div>
				</td></tr>`;
			}
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
