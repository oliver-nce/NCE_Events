// ── DocType field cache ───────────────────────────────────────────────────────
const _dt_field_cache = {};
let _pp_rebuild_pending = false;

/** Coerce to int like Frappe ``cint``. Desk exposes ``cint`` globally — it is not ``frappe.utils.cint``. */
function _cint(val) {
	if (typeof window !== "undefined" && typeof window.cint === "function") {
		return window.cint(val);
	}
	if (frappe.utils && typeof frappe.utils.cint === "function") {
		return frappe.utils.cint(val);
	}
	const n = parseInt(String(val ?? ""), 10);
	return Number.isNaN(n) ? 0 : n;
}

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
		method: "nce_events.api.panel_api_pkg.discovery.get_doctype_fields",
		args: { root_doctype: doctype },
		callback: function (r) {
			const unpacked = _unpack_doctype_fields_message(r && r.message);
			_dt_field_cache[doctype] = unpacked;
			callback(unpacked.fields, unpacked);
		},
	});
}

// ── PURE UTILS ────────────────────────────────────────────────────────────────
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
		"allow_new_record_creation",
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
	colours: [],
	query: ["panel_sql"],
	dialogs: [],
};
const TAB_ORDER = ["config", "display", "colours", "query", "dialogs"];
const TAB_LABELS = {
	config: "Config",
	display: "Display",
	colours: "Colours",
	query: "Query",
	dialogs: "Dialogs",
};

const COLOUR_FIELDS = [
	"section_break_colours",
	"theme",
	"frame_bg_class",
	"frame_fg_type",
	"header_bg_class",
	"header_fg_type",
	"header_toolbar_bg_class",
	"header_toolbar_fg_type",
	"footer_bg_class",
	"footer_fg_type",
	"col_header_bg_class",
	"col_header_fg_type",
	"filter_bar_bg_class",
	"filter_bar_fg_type",
	"row_bg_class",
	"row_fg_type",
	"row_alt_bg_class",
	"row_alt_fg_type",
	"dialog_header_bg_class",
	"dialog_header_fg_type",
	"frame_border_class",
	"frame_border_color_class",
	"filter_divider_class",
	"filter_divider_color_class",
	"col_header_line_class",
	"col_header_line_color_class",
	"row_divider_class",
	"row_divider_color_class",
	"col_divider_class",
	"col_divider_color_class",
];

/** Chrome override fields cleared by Revert to Theme Defaults (keeps ``theme`` link). */
const COLOUR_OVERRIDE_FIELDS = COLOUR_FIELDS.filter(function (fn) {
	return fn !== "section_break_colours" && fn !== "theme";
});

/** Lines & borders — width (theme-border*) + optional color (theme-border-{role}-{shade}). */
const BORDER_LINE_SLOTS = [
	{
		widthField: "frame_border_class",
		colorField: "frame_border_color_class",
		label: __("Float frame border"),
		widthFallback: "theme-border",
	},
	{
		widthField: "filter_divider_class",
		colorField: "filter_divider_color_class",
		label: __("Filter bar divider"),
		widthFallback: "theme-border-thin",
	},
	{
		widthField: "col_header_line_class",
		colorField: "col_header_line_color_class",
		label: __("Column header underline"),
		widthFallback: "theme-border-strong",
	},
	{
		widthField: "row_divider_class",
		colorField: "row_divider_color_class",
		label: __("Table row dividers"),
		widthFallback: "theme-border-thin",
	},
	{
		widthField: "col_divider_class",
		colorField: "col_divider_color_class",
		label: __("Column dividers"),
		widthFallback: "theme-border-thin",
	},
];

const BORDER_WIDTH_OPTIONS = [
	{ value: "theme-border-thin", label: __("Thin") },
	{ value: "theme-border", label: __("Normal") },
	{ value: "theme-border-strong", label: __("Strong") },
];

/** Per-panel chrome slots — valueField for ThemeSwatchPicker; default when empty. */
const COLOUR_SLOTS = [
	{
		field: "frame_bg_class",
		fgTypeField: "frame_fg_type",
		label: __("Float frame"),
		fallback: "theme-bg-surface",
	},
	{
		field: "header_bg_class",
		fgTypeField: "header_fg_type",
		label: __("Header title"),
		fallback: "theme-bg-primary-600",
	},
	{
		field: "header_toolbar_bg_class",
		fgTypeField: "header_toolbar_fg_type",
		label: __("Header toolbar (actions)"),
		fallback: "theme-bg-primary-600",
	},
	{
		field: "footer_bg_class",
		fgTypeField: "footer_fg_type",
		label: __("Footer bar"),
		fallback: "theme-bg-primary",
	},
	{
		field: "col_header_bg_class",
		fgTypeField: "col_header_fg_type",
		label: __("Column headers"),
		fallback: "theme-bg-secondary-600",
	},
	{
		field: "filter_bar_bg_class",
		fgTypeField: "filter_bar_fg_type",
		label: __("Filter bar"),
		fallback: "theme-bg-primary-100",
	},
	{
		field: "row_bg_class",
		fgTypeField: "row_fg_type",
		label: __("Table rows (even)"),
		fallback: "theme-bg-surface",
	},
	{
		field: "row_alt_bg_class",
		fgTypeField: "row_alt_fg_type",
		label: __("Table rows (odd)"),
		fallback: "theme-bg-row-alt",
	},
	{
		field: "dialog_header_bg_class",
		fgTypeField: "dialog_header_fg_type",
		label: __("Viewer dialog header"),
		fallback: "theme-bg-primary",
	},
];

function _colour_fg_type_field(bgField) {
	return String(bgField || "").replace(/_bg_class$/, "_fg_type");
}

function _colour_fg_type_value(frm, bgField) {
	const raw = (frm.doc[_colour_fg_type_field(bgField)] || "").trim().toLowerCase();
	return raw === "tonal" ? "tonal" : "mono";
}

const MATRIX_FIELDS = [
	"column_order",
	"bold_fields",
	"gender_column",
	"gender_color_fields",
	"title_field",
	"required_fields",
	"read_only_fields",
	"search_fields",
];
const BREAK_FIELDS = [
	"section_break_widgets",
	"column_break_widgets",
	"section_break_tile_actions",
];

// ── Top-level tab show/hide ───────────────────────────────────────────────────
function _show_tab(frm, tab_id) {
	const all_fields = TAB_GROUPS.config
		.concat(MATRIX_FIELDS)
		.concat(COLOUR_FIELDS)
		.concat(TAB_GROUPS.query || []);
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
	$wrap.find(".pp-colours-wrap").toggle(tab_id === "colours");
	$wrap.find(".pp-dialogs-wrap").toggle(tab_id === "dialogs");

	$(frm.layout.wrapper).find(".pp-tab-btn").css({ background: "", color: "", fontWeight: "" });
	$(frm.layout.wrapper).find(`.pp-tab-btn[data-tab="${tab_id}"]`).css({
		background: "#171717",
		color: "#fff",
		fontWeight: "600",
	});
	$(frm.layout.wrapper).data("pp-active-tab", tab_id);
	if (tab_id === "query") {
		_ensure_query_refresh_button(frm);
	}
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
		'<div class="pp-matrix-wrap" style="display:none;padding-bottom:8px;"></div>'
	);
	const $colours_wrap = $(
		'<div class="pp-colours-wrap" style="display:none;padding-bottom:8px;"></div>'
	);
	const $dialogs_wrap = $(
		'<div class="pp-dialogs-wrap" style="display:none;padding-bottom:8px;"></div>'
	);

	$(first_fd.$wrapper)
		.before($tab_bar)
		.before($matrix_wrap)
		.before($colours_wrap)
		.before($dialogs_wrap);

	$tab_bar.on("click", ".pp-tab-btn", function () {
		const tab_id = $(this).data("tab");
		_show_tab(frm, tab_id);
		if (tab_id === "display") _render_display(frm);
		if (tab_id === "colours") _render_colours_tab(frm);
		if (tab_id === "dialogs") _render_dialogs_tab(frm);
	});

	$layout.find(".section-head").hide();
	_show_tab(frm, "config");
}

/** Visible Panel ID editor (prompt autoname is easy to miss in the header). */
function _ensure_panel_id_controls(frm) {
	const $layout = $(frm.layout.wrapper);
	if ($layout.find(".pp-panel-id-bar").length) {
		return;
	}
	if (frm.fields_dict.__newname && frm.fields_dict.__newname.$wrapper) {
		$(frm.fields_dict.__newname.$wrapper).hide();
	}
	const $bar = $(
		'<div class="pp-panel-id-bar" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 0 10px;margin-bottom:4px;border-bottom:1px solid #d1d8dd;"></div>',
	);
	const label = __("Panel ID");
	const $anchor = $layout.find(".pp-tab-bar").first();
	if (frm.is_new()) {
		const $lbl = $(
			'<label class="control-label" style="margin:0;min-width:72px;">' +
				frappe.utils.escape_html(label) +
				"</label>",
		);
		const $inp = $(
			'<input type="text" class="input-with-feedback form-control pp-newname-input" style="max-width:420px;">',
		);
		$inp.attr("placeholder", __("e.g. Event, or page-panel-registry"));
		const pre = (frm.doc.__newname || "").trim();
		if (pre) {
			$inp.val(pre);
		}
		$inp.on("input change blur", function () {
			const v = ($inp.val() || "").trim();
			frm.doc.__newname = v;
		});
		$bar.append($lbl).append($inp);
	} else if (frm.meta && _cint(frm.meta.allow_rename)) {
		const $lbl = $('<span class="text-muted">' + frappe.utils.escape_html(label) + ": </span>");
		const $val = $('<strong style="margin-right:8px;"></strong>').text(frm.doc.name || "");
		const $btn = $('<button type="button" class="btn btn-xs btn-default">' + __("Change…") + "</button>");
		$btn.on("click", function () {
			frappe.prompt(
				[
					{
						fieldname: "new_name",
						fieldtype: "Data",
						label: __("New Panel ID"),
						default: frm.doc.name,
						reqd: 1,
					},
				],
				function (values) {
					const nn = (values.new_name || "").trim();
					if (!nn) {
						return;
					}
					frappe.call({
						method: "frappe.client.rename_doc",
						args: {
							doctype: frm.doctype,
							old_name: frm.doc.name,
							new_name: nn,
						},
						freeze: true,
						callback: function (r) {
							if (!r.exc) {
								const finalName = r.message || nn;
								frappe.show_alert({ message: __("Updated"), indicator: "green" });
								frappe.set_route("Form", frm.doctype, finalName);
							}
						},
					});
				},
				__("Rename Page Panel"),
				__("Rename"),
			);
		});
		$bar.append($lbl).append($val).append($btn);
	} else {
		const $lbl = $('<span class="text-muted">' + frappe.utils.escape_html(label) + ": </span>");
		const $val = $("<strong></strong>").text(frm.doc.name || "");
		$bar.append($lbl).append($val);
	}
	if ($anchor.length) {
		$anchor.before($bar);
	} else {
		$layout.prepend($bar);
	}
}

// ── Query tab ─────────────────────────────────────────────────────────────────
function _refresh_query_tab(frm) {
	if (!frm.doc.root_doctype) return;
	if (typeof frm._pp_sync_display === "function") {
		frm._pp_sync_display();
	}
	const fd = frm.fields_dict["panel_sql"];
	const $btn = fd && fd.$wrapper ? fd.$wrapper.find(".pp-query-refresh-btn") : $();
	if (fd && fd.$wrapper) {
		fd.$wrapper.find(".control-value, .like-disabled-input").text("Generating…");
	}
	$btn.prop("disabled", true);
	frappe.call({
		method: "nce_events.api.panel_api_pkg.sql.build_panel_sql",
		args: {
			root_doctype: frm.doc.root_doctype,
			column_order: frm.doc.column_order || "",
			search_fields: frm.doc.search_fields || "",
			gender_column: frm.doc.gender_column || "",
		},
		callback: function (r) {
			$btn.prop("disabled", false);
			if (r.message) {
				frm.set_value("panel_sql", r.message);
				frm.refresh_field("panel_sql");
			}
		},
		error: function () {
			$btn.prop("disabled", false);
		},
	});
}

function _ensure_query_refresh_button(frm) {
	const fd = frm.fields_dict["panel_sql"];
	if (!fd || !fd.$wrapper) return;
	if (fd.$wrapper.find(".pp-query-refresh-btn").length) return;
	const $row = $(
		'<div class="pp-query-refresh-row" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"></div>'
	);
	const $btn = $(
		'<button type="button" class="btn btn-xs btn-primary pp-query-refresh-btn">' +
			frappe.utils.escape_html(__("Refresh SQL")) +
			"</button>"
	);
	const $hint = $(
		'<span class="text-muted" style="font-size:11px;">' +
			frappe.utils.escape_html(
				__("Rebuild from saved Display settings. Also runs automatically on Save.")
			) +
			"</span>"
	);
	$btn.on("click", function () {
		_refresh_query_tab(frm);
	});
	$row.append($btn).append($hint);
	fd.$wrapper.prepend($row);
}

// ── Display helpers ───────────────────────────────────────────────────────────
/** Clear cached get_doctype_fields results so the next fetch sees current DocType meta. */
function _clear_doctype_field_cache() {
	Object.keys(_dt_field_cache).forEach(function (k) {
		delete _dt_field_cache[k];
	});
}

const PP_DISPLAY_COL_DEFAULTS = { field: 110, label: 150 };

function _pp_display_col_storage_key(panelName) {
	return "pp-display-col-widths:" + (panelName || "new");
}

function _load_display_col_widths(panelName) {
	try {
		const raw = localStorage.getItem(_pp_display_col_storage_key(panelName));
		if (raw) {
			const parsed = JSON.parse(raw);
			return {
				field: Math.max(60, parseInt(parsed.field, 10) || PP_DISPLAY_COL_DEFAULTS.field),
				label: Math.max(60, parseInt(parsed.label, 10) || PP_DISPLAY_COL_DEFAULTS.label),
			};
		}
	} catch (e) {
		/* ignore */
	}
	return Object.assign({}, PP_DISPLAY_COL_DEFAULTS);
}

function _save_display_col_widths(panelName, widths) {
	try {
		localStorage.setItem(_pp_display_col_storage_key(panelName), JSON.stringify(widths));
	} catch (e) {
		/* ignore */
	}
}

/** Drag-resize Field / Label columns on Display and Order matrices. */
function _wire_display_matrix_col_resize($table, panelName, opts) {
	if (!$table || !$table.length) return;
	opts = opts || {};
	const hasGripCol = !!opts.hasGripCol;
	const fieldThIdx = hasGripCol ? 1 : 0;
	const labelThIdx = hasGripCol ? 2 : 1;
	const widths = _load_display_col_widths(panelName);
	const colgroupHtml = hasGripCol
		? '<colgroup><col style="width:24px;" /><col class="pp-display-col-field" /><col class="pp-display-col-label" /><col /></colgroup>'
		: '<colgroup><col class="pp-display-col-field" /><col class="pp-display-col-label" /></colgroup>';
	const $colgroup = $(colgroupHtml);
	$table.prepend($colgroup);
	$table.css({ tableLayout: "fixed", width: "100%" });
	$colgroup.find(".pp-display-col-field").css("width", widths.field + "px");
	$colgroup.find(".pp-display-col-label").css("width", widths.label + "px");

	function _attachHandle($th, colClass) {
		const $handle = $('<span class="pp-display-col-resize" aria-hidden="true"></span>');
		$th.css({ position: "relative" }).append($handle);
		$handle.on("mousedown", function (e) {
			e.preventDefault();
			e.stopPropagation();
			const startX = e.clientX;
			const $col = $colgroup.find(colClass);
			const startW = $col.width() || PP_DISPLAY_COL_DEFAULTS.field;
			$("body").addClass("pp-display-col-resizing");
			function onMove(ev) {
				const next = Math.max(60, Math.min(480, startW + (ev.clientX - startX)));
				$col.css("width", next + "px");
			}
			function onUp() {
				$(document).off("mousemove.ppDisplayColResize mouseup.ppDisplayColResize");
				$("body").removeClass("pp-display-col-resizing");
				const key = colClass === ".pp-display-col-field" ? "field" : "label";
				widths[key] = Math.round($col.width() || startW);
				_save_display_col_widths(panelName, widths);
			}
			$(document).on("mousemove.ppDisplayColResize", onMove);
			$(document).on("mouseup.ppDisplayColResize", onUp);
		});
	}

	const $ths = $table.find("thead th");
	if ($ths.eq(fieldThIdx).length) _attachHandle($ths.eq(fieldThIdx), ".pp-display-col-field");
	if ($ths.eq(labelThIdx).length) _attachHandle($ths.eq(labelThIdx), ".pp-display-col-label");
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

/** Drop column_order / bold / gender / title / search entries that no longer match any field row. */
function _prune_stale_display_keys(frm, valid) {
	function keep(csv) {
		return _parse_csv(csv).filter(function (k) {
			return valid[k];
		});
	}
	const col = keep(frm.doc.column_order);
	const bold = keep(frm.doc.bold_fields);
	const req = keep(frm.doc.required_fields);
	const ro = keep(frm.doc.read_only_fields);
	const tint = keep(frm.doc.gender_color_fields);
	const srch = keep(frm.doc.search_fields);
	const gcRaw = (frm.doc.gender_column || "").trim();
	const gc = gcRaw && valid[gcRaw] ? gcRaw : "";
	const tfRaw = (frm.doc.title_field || "").trim();
	const tf = tfRaw && valid[tfRaw] ? tfRaw : "";

	const nextCol = col.join(", ");
	const nextBold = bold.join(", ");
	const nextReq = req.join(", ");
	const nextRo = ro.join(", ");
	const nextTint = tint.join(", ");
	const nextSrch = srch.join(", ");
	if (nextCol !== (frm.doc.column_order || "").trim()) frm.set_value("column_order", nextCol);
	if (nextBold !== (frm.doc.bold_fields || "").trim()) frm.set_value("bold_fields", nextBold);
	if (nextReq !== (frm.doc.required_fields || "").trim())
		frm.set_value("required_fields", nextReq);
	if (nextRo !== (frm.doc.read_only_fields || "").trim())
		frm.set_value("read_only_fields", nextRo);
	if (nextTint !== (frm.doc.gender_color_fields || "").trim())
		frm.set_value("gender_color_fields", nextTint);
	if (nextSrch !== (frm.doc.search_fields || "").trim())
		frm.set_value("search_fields", nextSrch);
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
	if (listHasOrphan(frm.doc.required_fields)) return true;
	if (listHasOrphan(frm.doc.read_only_fields)) return true;
	if (listHasOrphan(frm.doc.gender_color_fields)) return true;
	if (listHasOrphan(frm.doc.search_fields)) return true;
	const gc = (frm.doc.gender_column || "").trim();
	if (gc && !valid[gc]) return true;
	const tf = (frm.doc.title_field || "").trim();
	if (tf && !valid[tf]) return true;
	return false;
}

// ── Display tab — sub-tab architecture ────────────────────────────────────────
//
// column_order stores: "fieldname, fieldname, link_field.fieldname, ..."
// Root fields: bare fieldname.  Linked fields: link_field.fieldname.
// bold_fields, required_fields, read_only_fields, gender_column, gender_color_fields use the same dot notation.

function _render_display(frm) {
	const $container = $(frm.layout.wrapper).find(".pp-matrix-wrap");
	if (!$container.length) return;

	if (!frm.doc.root_doctype) {
		$container.html(
			'<p style="color:#8d949a;font-size:12px;padding:8px 0;">Select a DocType in the Config tab first.</p>'
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

/** DocType Mandatory (reqd) — tooltip on Display matrix Required column (checkbox follows panel list only). */
function _isDocfieldMetaReqd(f) {
	return !!(f && (Number(f.reqd) === 1 || f.reqd === true || f.reqd === "1"));
}

/** DocType read_only — locked on in Display matrix Read Only column. */
function _isDocfieldMetaReadOnly(f) {
	return !!(f && (Number(f.read_only) === 1 || f.read_only === true || f.read_only === "1"));
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
		required: _parse_csv(frm.doc.required_fields),
		read_only: _parse_csv(frm.doc.read_only_fields),
		gender_col: (frm.doc.gender_column || "").trim(),
		gender_tint: _parse_csv(frm.doc.gender_color_fields),
		title_field: (frm.doc.title_field || "").trim(),
		search: _parse_csv(frm.doc.search_fields),
		format_rules: {},
	};
	(frm.doc.format_rules || []).forEach(function (row) {
		const fn = (row.field_name || "").trim();
		if (!fn) return;
		saved.format_rules[fn] = {
			condition_sql: row.condition_sql || "",
			color: row.color || "",
			font_weight: row.font_weight || "",
			italic: row.italic ? 1 : 0,
			underline: row.underline ? 1 : 0,
			last_validated_sql: row.last_validated_sql || "",
		};
	});
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

	// Keys where underlying DocType marks the field Mandatory (reqd) — tooltip on Required column only
	const metaReqdKeys = {};
	function _registerMetaReqd(fields, prefix) {
		(fields || []).forEach(function (f) {
			if (f._computed || f._related) {
				return;
			}
			if (_isDocfieldMetaReqd(f)) {
				metaReqdKeys[prefix + f.fieldname] = true;
			}
		});
	}
	_registerMetaReqd(root_with_computed, "");
	link_fields.forEach(function (lf) {
		const ld = linked_data[lf.fieldname];
		if (ld && ld.fields) {
			_registerMetaReqd(ld.fields, lf.fieldname + ".");
		}
	});

	const metaReadOnlyKeys = {};
	const forcedReadOnlyKeys = {};
	function _registerMetaReadOnly(fields, prefix) {
		(fields || []).forEach(function (f) {
			if (f._related) {
				return;
			}
			const key = prefix + f.fieldname;
			if (f._computed) {
				forcedReadOnlyKeys[key] = true;
				return;
			}
			if (_isDocfieldMetaReadOnly(f)) {
				metaReadOnlyKeys[key] = true;
				forcedReadOnlyKeys[key] = true;
			}
		});
	}
	_registerMetaReadOnly(root_with_computed, "");
	link_fields.forEach(function (lf) {
		const ld = linked_data[lf.fieldname];
		if (ld && ld.fields) {
			_registerMetaReadOnly(ld.fields, lf.fieldname + ".");
		}
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
		'<div style="display:flex;gap:4px;padding:0 0 8px;flex-wrap:wrap;align-items:center;"></div>'
	);
	sub_tabs.forEach(function (st) {
		$sub_bar.append(
			`<button class="btn btn-xs btn-default pp-sub-btn" data-sub="${
				st.id
			}" style="padding:2px 12px;border-radius:4px;font-size:11px;">${frappe.utils.escape_html(
				st.label
			)}</button>`
		);
	});
	const $reloadWrap = $('<span style="margin-left:auto;"></span>');
	const $reloadFields = $(
		`<a href="#" class="pp-reload-doctype-fields" style="font-size:12px;color:#4198F0;">${frappe.utils.escape_html(
			__("Reload fields")
		)}</a>`
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
			metaReqdKeys: metaReqdKeys,
			metaReadOnlyKeys: metaReadOnlyKeys,
			forcedReadOnlyKeys: forcedReadOnlyKeys,
		});
	});

	// Sync function — collects from ALL matrices
	function _sync_all() {
		let col_order = [],
			nb = [],
			nr = [],
			nro = [],
			nt = [],
			ns = [],
			ngc = "",
			ntf = "";
		sub_tabs.forEach(function (st) {
			if (st.id === "_order") return;
			const m = matrices[st.id];
			if (!m || !m.$matrix) return;
			m.$matrix.find("tbody tr").each(function () {
				const key = $(this).data("key");
				const $r = m.$matrix.find(`input[data-key="${key}"]`);
				const showOn = $r.filter('[data-role="show"]').prop("checked");
				if (showOn) col_order.push(key);
				if ($r.filter('[data-role="bold"]').prop("checked")) nb.push(key);
				if ($r.filter('[data-role="required"]').prop("checked")) nr.push(key);
				if ($r.filter('[data-role="read-only"]').prop("checked")) nro.push(key);
				if ($r.filter('[data-role="tint"]').prop("checked")) nt.push(key);
				// Search Only: only when Show is off (mutual exclusion enforced in UI but double-checked here)
				if (!showOn && $r.filter('[data-role="search-only"]').prop("checked")) ns.push(key);
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

		Object.keys(forcedReadOnlyKeys).forEach(function (k) {
			if (nro.indexOf(k) === -1) nro.push(k);
		});

		frm.set_value("column_order", col_order.join(", "));
		frm.set_value("bold_fields", nb.join(", "));
		frm.set_value("required_fields", nr.join(", "));
		frm.set_value("read_only_fields", nro.join(", "));
		frm.set_value("gender_column", ngc);
		frm.set_value("gender_color_fields", nt.join(", "));
		frm.set_value("title_field", ntf);
		frm.set_value("search_fields", ns.join(", "));

		const formatRuleRows = [];
		Object.entries(saved.format_rules || {}).forEach(function ([fn, r]) {
			if (!(r.condition_sql || "").trim()) return;
			formatRuleRows.push({
				field_name: fn,
				condition_sql: r.condition_sql,
				color: r.color || "",
				font_weight: r.font_weight || "",
				italic: r.italic ? 1 : 0,
				underline: r.underline ? 1 : 0,
				last_validated_sql: r.last_validated_sql || "",
			});
		});
		// Rebuild the child table only on a real change. Use frm.add_child (not direct
		// assignment) so each row gets proper grid metadata (name/idx) — hand-built rows
		// crash grid_row.refresh once the grid is visible — and so Frappe marks the form
		// dirty itself. The guard keeps plain form loads (where _sync_all reruns and rows
		// already match) from rebuilding and falsely dirtying.
		if (_format_rules_signature(formatRuleRows) !== _format_rules_signature(frm.doc.format_rules)) {
			frm.clear_table("format_rules");
			formatRuleRows.forEach(function (r) {
				const child = frm.add_child("format_rules");
				child.field_name = r.field_name;
				child.condition_sql = r.condition_sql;
				child.color = r.color;
				child.font_weight = r.font_weight;
				child.italic = r.italic;
				child.underline = r.underline;
				child.last_validated_sql = r.last_validated_sql;
			});
			frm.refresh_field("format_rules");
		}
		_refresh_fmt_buttons(matrices, sub_tabs, saved);
	}

	// Show ↔ Search Only mutual exclusion: checking one clears the other on the same row
	function _enforceShowSearchExclusivity($matrix, changedRole, key) {
		if (changedRole === "show") {
			$matrix.find('input[data-role="search-only"]').filter(function () {
				return $(this).data("key") === key;
			}).prop("checked", false);
		} else if (changedRole === "search-only") {
			$matrix.find('input[data-role="show"]').filter(function () {
				return $(this).data("key") === key;
			}).prop("checked", false);
		}
	}

	sub_tabs.forEach(function (st) {
		if (st.id === "_order") return;
		const m = matrices[st.id];
		if (!m || !m.$matrix) return;
		m.$matrix.on("change", 'input[data-role="show"], input[data-role="search-only"]', function () {
			if (!$(this).prop("checked")) return; // only act when turning ON
			_enforceShowSearchExclusivity(m.$matrix, $(this).data("role"), $(this).data("key"));
			// _sync_all fires via the generic handler registered below
		});
	});

	// Wire change events on all matrices
	sub_tabs.forEach(function (st) {
		if (st.id === "_order") return;
		const m = matrices[st.id];
		if (!m || !m.$matrix) return;
		m.$matrix.on("change", "input[type=checkbox], input[type=radio]", _sync_all);
		m.$matrix.on("click", ".pp-fmt-edit", function (e) {
			e.preventDefault();
			e.stopPropagation();
			const key = $(this).attr("data-key") || $(this).data("key");
			if (!key) return;
			_open_format_rule_dialog(frm, saved, key, _sync_all);
		});
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
				frm.doc.name || "new"
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
			// Show and Search Only are mutually exclusive — clear Search Only for all rows
			m.$matrix.find('input[data-role="search-only"]').prop("checked", false);
			_sync_all();
		});
		$toolbar.find(".pp-select-none").on("click", function (e) {
			e.preventDefault();
			m.$matrix.find('input[data-role="show"]').prop("checked", false);
			_sync_all();
		});

		if (sub_id === "_root" && frm.doc.root_doctype) {
			const $related_btn = $(
				'<button class="btn btn-xs btn-default pp-add-related-btn" style="margin-left:auto;font-size:11px;padding:2px 10px;">Add Related DocTypes</button>'
			);
			$related_btn.on("click", function () {
				frappe.call({
					method: "nce_events.api.panel_api_pkg.discovery.get_child_doctypes",
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
		_wire_display_matrix_col_resize(m.$matrix, frm.doc.name || "new");
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
.pp-fmt-dot { display:inline-block; width:9px; height:9px; border-radius:50%; vertical-align:middle; margin-right:2px; box-sizing:border-box; }
.pp-fmt-dot--empty { border:1.5px solid #b7babe; background:transparent; }
.pp-fmt-dot--set { background:#4198F0; border:1.5px solid #4198F0; }
.pp-display-col-resize { position:absolute; top:0; right:-3px; width:7px; height:100%; cursor:col-resize; z-index:2; }
.pp-display-col-resize:hover { background:rgba(65,152,240,0.35); }
body.pp-display-col-resizing, body.pp-display-col-resizing * { cursor:col-resize !important; user-select:none !important; }
.pp-display-field-matrix td, .pp-order-matrix td { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
</style>`);
	}

	// Start on root sub-tab
	_show_sub("_root");
	_sync_all();
	frm._pp_sync_display = _sync_all;
	frm._pp_fmt_saved = saved;
}

function _pp_fmt_has_rule(saved, key) {
	const fmtRule = (saved.format_rules || {})[key];
	return !!(fmtRule && (fmtRule.condition_sql || "").trim());
}

/** Canonical signature of format-rule rows (meaningful fields only, order-independent) so
 *  _sync_all can detect a real change before flagging the form dirty. */
function _format_rules_signature(rows) {
	return (rows || [])
		.map(function (r) {
			return [
				(r.field_name || "").trim(),
				(r.condition_sql || "").trim(),
				(r.color || "").trim(),
				(r.font_weight || "").trim(),
				r.italic ? 1 : 0,
				r.underline ? 1 : 0,
			].join("\u0001");
		})
		.sort()
		.join("\u0002");
}

function _pp_fmt_button_html(saved, key) {
	const has = _pp_fmt_has_rule(saved, key);
	const icon = has
		? '<span class="pp-fmt-dot pp-fmt-dot--set" title="' +
			frappe.utils.escape_html(__("Rule configured")) +
			'"></span> '
		: '<span class="pp-fmt-dot pp-fmt-dot--empty" title="' +
			frappe.utils.escape_html(__("No rule")) +
			'"></span> ';
	return icon + (has ? __("Edit") : __("Add"));
}

function _refresh_fmt_buttons(matrices, sub_tabs, saved) {
	sub_tabs.forEach(function (st) {
		if (st.id === "_order") return;
		const m = matrices[st.id];
		if (!m || !m.$matrix) return;
		m.$matrix.find(".pp-fmt-edit").each(function () {
			const key = $(this).attr("data-key") || $(this).data("key");
			if (!key) return;
			$(this).html(_pp_fmt_button_html(saved, key));
		});
	});
}

// ── Build a single field-selection matrix ─────────────────────────────────────
function _build_field_matrix(fields, prefix, uid, saved, shown_set, matrix_opts) {
	matrix_opts = matrix_opts || {};
	const metaReqdKeys = matrix_opts.metaReqdKeys || {};
	const forcedReadOnlyKeys = matrix_opts.forcedReadOnlyKeys || {};
	const showTitleColumn = !!matrix_opts.showTitleColumn;
	const th_style =
		'style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
	const th_left =
		'style="text-align:left;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
	let html = `<table class="pp-display-field-matrix" style="width:100%;border-collapse:collapse;font-size:12px;">
		<thead><tr>
			<th ${th_left}>Field</th>
			<th ${th_left}>Label</th>
			<th ${th_style}>Show</th>
			<th ${th_style}>Search Only</th>
			<th ${th_style}>Bold</th>
			<th ${th_style}>Required</th>
			<th ${th_style}>Read Only</th>
			<th ${th_style}>Gender</th>
			<th ${th_style}>Tint</th>
			<th ${th_style} style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;white-space:normal;line-height:1.1;min-width:90px;">Conditional<br>Formatting</th>`;
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
		const metaReqd = !!metaReqdKeys[key];
		const reqChecked = saved.required.indexOf(key) !== -1;
		const reqTitle = metaReqd
			? ' title="' +
				frappe.utils.escape_html(
					__("Mandatory on DocType — check Required to include in panel validation")
				) +
				'"'
			: "";
		// Search Only cell: _related_ rows get a grey non-interactive cell.
		// A field already shown (shown_set) cannot also be Search Only.
		let search_only_cell;
		if (f._related) {
			search_only_cell = `<td ${td} style="background:#f0f0f0;"></td>`;
		} else {
			const soChecked = !shown_set[key] && saved.search.indexOf(key) !== -1;
			search_only_cell = `<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="search-only"${
				soChecked ? " checked" : ""
			}></td>`;
		}
		let read_only_cell;
		if (f._related) {
			read_only_cell = `<td ${td} style="background:#f0f0f0;"></td>`;
		} else if (forcedReadOnlyKeys[key]) {
			const roTitle = f._computed
				? __("Computed column — always read-only in Form Dialog")
				: __("Read Only on DocType — cannot be changed");
			read_only_cell =
				`<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="read-only" checked disabled` +
				' title="' +
				frappe.utils.escape_html(roTitle) +
				'"></td>';
		} else {
			const roChecked = saved.read_only.indexOf(key) !== -1;
			read_only_cell = `<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="read-only"${
				roChecked ? " checked" : ""
			}></td>`;
		}
		html += `<tr data-key="${esc_key}"${bg}>
			<td class="text-muted" style="padding:4px 8px;font-size:11px;">${fn_display}</td>
			<td class="text-muted" style="padding:4px 8px;">${frappe.utils.escape_html(label)}</td>
			<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="show"${
			shown_set[key] ? " checked" : ""
		}></td>
			${search_only_cell}
			<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="bold"${
			saved.bold.indexOf(key) !== -1 ? " checked" : ""
		}></td>
			<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="required"${
			reqChecked ? " checked" : ""
		}${reqTitle}></td>
			${read_only_cell}
			<td ${td}><input type="radio"    data-key="${esc_key}" name="gender_col_${uid}"${
			saved.gender_col === key ? " checked" : ""
		}></td>
			<td ${td}><input type="checkbox" data-key="${esc_key}" data-role="tint"${
			saved.gender_tint.indexOf(key) !== -1 ? " checked" : ""
		}></td>`;
		html += `<td ${td}><button type="button" class="btn btn-xs pp-fmt-edit" data-key="${esc_key}" style="padding:0 6px;font-size:11px;">${_pp_fmt_button_html(saved, key)}</button></td>
			${title_cell}
		</tr>`;
	});
	html += "</tbody></table>";

	return { $matrix: $(html) };
}

/** Drop blank child rows — the visible Table grid leaves an empty stub row that fails reqd validation. */
function _prune_empty_format_rules(frm) {
	frm.doc.format_rules = (frm.doc.format_rules || []).filter(function (row) {
		return (row.field_name || "").trim() && (row.condition_sql || "").trim();
	});
}

function _ensure_format_rule_mount(done) {
	function finish() {
		const mod = window.nceMountFormatRuleEditor;
		if (mod && typeof mod.mountFormatRuleEditor === "function") {
			done(mod);
			return;
		}
		frappe.msgprint({
			title: __("Load failed"),
			indicator: "red",
			message: __(
				"Could not load the conditional formatting editor. Rebuild panel_page_v2 assets and refresh."
			),
		});
	}
	if (window.nceMountFormatRuleEditor && window.nceMountFormatRuleEditor.mountFormatRuleEditor) {
		finish();
		return;
	}
	frappe.require(
		[
			"/assets/nce_events/js/panel_page_v2_dist/mount_format_rule_editor.css",
			"/assets/nce_events/js/panel_page_v2_dist/mount_format_rule_editor.js",
		],
		finish
	);
}

function _open_format_rule_dialog(frm, saved, fieldKey, _sync_all) {
	if (!fieldKey) {
		frappe.msgprint(__("No field selected for conditional formatting."));
		return;
	}
	const rule = Object.assign(
		{
			condition_sql: "",
			color: "",
			font_weight: "",
			italic: 0,
			underline: 0,
			last_validated_sql: "",
		},
		saved.format_rules[fieldKey] || {}
	);
	const d = new frappe.ui.Dialog({
		title: __("Conditional Formatting — {0}", [fieldKey]),
		size: "large",
		fields: [{ fieldtype: "HTML", fieldname: "host" }],
	});
	d.show();
	const host = d.fields_dict.host.$wrapper[0];
	d.fields_dict.host.$wrapper.html(
		'<p class="text-muted" style="padding:12px;">' + __("Loading editor…") + "</p>"
	);
	let app = null;

	function _teardown() {
		if (app) {
			app.unmount();
			app = null;
		}
	}

	_ensure_format_rule_mount(function (mod) {
		d.fields_dict.host.$wrapper.empty();
		app = mod.mountFormatRuleEditor(host, {
			rootDoctype: frm.doc.root_doctype,
			fieldName: fieldKey,
			rule: rule,
			allowedFields: _parse_csv(frm.doc.column_order).concat(
				_parse_csv(frm.doc.search_fields)
			),
			onUpdate: function (r) {
				Object.assign(rule, r);
			},
			onApply: function (appliedRule) {
				saved.format_rules[fieldKey] = Object.assign({}, rule, appliedRule || {});
				_sync_all();
				_teardown();
				d.hide();
			},
			onClear: function () {
				delete saved.format_rules[fieldKey];
				_sync_all();
				_teardown();
				d.hide();
			},
			onCancel: function () {
				_teardown();
				d.hide();
			},
		});
		d.$wrapper.on("hidden.bs.modal", _teardown);
	});
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
	panelName
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
			'<p style="color:#8d949a;font-size:12px;padding:8px 0;">No fields selected. Use the other tabs to select fields first.</p>'
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
			<td class="text-muted" style="padding:4px 8px;font-size:11px;">${esc}</td>
			<td class="text-muted" style="padding:4px 8px;">${frappe.utils.escape_html(s.label)}</td>
			<td class="text-muted" style="padding:4px 8px;font-size:11px;">${frappe.utils.escape_html(
				s.source
			)}</td>
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
	_wire_display_matrix_col_resize($order, panelName || "new", { hasGripCol: true });
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

function _hide_format_rules_grid(frm) {
	const fd = frm.fields_dict["format_rules"];
	if (!fd || !fd.$wrapper) return;
	fd.$wrapper.find(".frappe-control").hide();
	fd.$wrapper.find(".grid-heading-row").hide();
	fd.$wrapper.find(".grid-body").hide();
	fd.$wrapper.find(".btn.grid-add-row").hide();
	fd.$wrapper.find("[data-fieldname='format_rules']").hide();
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
						<span class="pp-df-ops" style="display:flex;gap:2px;${
							hasField ? "" : "display:none!"
						}">${ops_html}</span>
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
					'<button class="btn btn-xs btn-default pp-df-add" style="margin-top:4px;">+ Add Filter</button>'
				)
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
					}
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
	`
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
	`
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

function _pp_portal_hide_if_options_html(selected) {
	const opts = ["Never", "Record not saved", "Record saved", "SQL expression"];
	const sel = String(selected || "Never");
	return opts
		.map(function (o) {
			return (
				'<option value="' +
				frappe.utils.escape_html(o) +
				'"' +
				(o === sel ? " selected" : "") +
				">" +
				frappe.utils.escape_html(o) +
				"</option>"
			);
		})
		.join("");
}

function _pp_portal_fieldnames_from_rows(rows) {
	const out = ["name"];
	(rows || []).forEach(function (row) {
		const fn = row && row.fieldname ? String(row.fieldname).trim() : "";
		if (fn && out.indexOf(fn) < 0) {
			out.push(fn);
		}
	});
	return out;
}

function _pp_render_portal_actions_tab($pane, ctx) {
	const methodSpecs = ctx.methodSpecs || [];
	const fieldnames = ctx.fieldnames || ["name"];
	let actions = JSON.parse(JSON.stringify(ctx.actions || []));

	function methodSpecByKey(key) {
		const k = String(key || "").trim();
		return methodSpecs.find(function (m) {
			return String(m.key || "") === k;
		});
	}

	function renderList() {
		let html =
			'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
			"<strong>" +
			__("Portal buttons") +
			'</strong><button type="button" class="btn btn-default btn-xs pp-portal-action-add">' +
			__("Add button") +
			"</button></div>";
		if (!actions.length) {
			html +=
				'<p class="text-muted" style="margin:0 0 12px;">' +
				__("No buttons configured.") +
				"</p>";
		} else {
			html +=
				'<table class="table table-bordered" style="font-size:12px;margin-bottom:12px;"><thead><tr>' +
				"<th>" +
				__("Label") +
				"</th><th>" +
				__("Method") +
				'</th><th style="width:120px;"></th></tr></thead><tbody>';
			actions.forEach(function (act, idx) {
				const spec = methodSpecByKey(act.method);
				const mlabel = spec ? spec.label : act.method;
				html +=
					"<tr>" +
					"<td>" +
					frappe.utils.escape_html(act.label || "") +
					"</td><td>" +
					frappe.utils.escape_html(mlabel || "") +
					'</td><td class="text-right">' +
					'<button type="button" class="btn btn-default btn-xs pp-portal-action-edit" data-idx="' +
					idx +
					'">' +
					__("Edit") +
					'</button> <button type="button" class="btn btn-default btn-xs pp-portal-action-del" data-idx="' +
					idx +
					'">' +
					__("Delete") +
					"</button></td></tr>";
			});
			html += "</tbody></table>";
		}
		html +=
			'<div class="pp-portal-action-form" style="display:none;border:1px solid #d1d8dd;border-radius:4px;padding:12px;margin-bottom:12px;"></div>' +
			'<div style="display:flex;gap:8px;justify-content:flex-end;">' +
			'<button type="button" class="btn btn-primary btn-sm pp-portal-actions-save">' +
			__("Save buttons") +
			"</button></div>";
		$pane.html(html);
	}

	function renderParamGrid(spec, existingParams) {
		if (!spec || !spec.args || !spec.args.length) {
			return '<p class="text-muted" style="margin:8px 0 0;">' + __("No parameters.") + "</p>";
		}
		const byArg = {};
		(existingParams || []).forEach(function (p) {
			if (p && p.arg) {
				byArg[p.arg] = p;
			}
		});
		let html =
			'<table class="table table-bordered pp-portal-param-grid" style="margin:10px 0 0;font-size:12px;"><thead><tr>' +
			"<th>" +
			__("Parameter") +
			"</th><th>" +
			__("Source") +
			"</th><th>" +
			__("Field / value") +
			"</th></tr></thead><tbody>";
		spec.args.forEach(function (argSpec) {
			const arg = argSpec.arg || "";
			const cur = byArg[arg] || {};
			const src = cur.source || argSpec.default_source || "prompt";
			const fld = cur.field || argSpec.default_field || "";
			const constVal = cur.value != null ? String(cur.value) : "";
			const srcOpts = ["row", "root", "prompt", "const"]
				.map(function (s) {
					const lbl =
						s === "row"
							? __("From row")
							: s === "root"
								? __("From root")
								: s === "prompt"
									? __("Prompt")
									: __("Constant");
					return (
						'<option value="' +
						s +
						'"' +
						(s === src ? " selected" : "") +
						">" +
						lbl +
						"</option>"
					);
				})
				.join("");
			let fieldCtrl = "";
			if (src === "row") {
				fieldCtrl =
					'<select class="form-control input-xs pp-portal-param-field" data-arg="' +
					frappe.utils.escape_html(arg) +
					'">' +
					fieldnames
						.map(function (fn) {
							return (
								'<option value="' +
								frappe.utils.escape_html(fn) +
								'"' +
								(fn === fld ? " selected" : "") +
								">" +
								frappe.utils.escape_html(fn) +
								"</option>"
							);
						})
						.join("") +
					"</select>";
			} else if (src === "root" || src === "const") {
				const val = src === "const" ? constVal : fld;
				fieldCtrl =
					'<input type="text" class="form-control input-xs pp-portal-param-field" data-arg="' +
					frappe.utils.escape_html(arg) +
					'" value="' +
					frappe.utils.escape_html(val) +
					'" />';
			} else {
				fieldCtrl = '<span class="text-muted">' + __("Collected at runtime") + "</span>";
			}
			html +=
				'<tr data-arg="' +
				frappe.utils.escape_html(arg) +
				'"><td>' +
				frappe.utils.escape_html(argSpec.label || arg) +
				'</td><td><select class="form-control input-xs pp-portal-param-source" data-arg="' +
				frappe.utils.escape_html(arg) +
				'">' +
				srcOpts +
				'</select></td><td class="pp-portal-param-field-cell">' +
				fieldCtrl +
				"</td></tr>";
		});
		html += "</tbody></table>";
		return html;
	}

	function openForm(editIdx) {
		const $form = $pane.find(".pp-portal-action-form");
		const editing = editIdx != null && actions[editIdx];
		const act = editing
			? JSON.parse(JSON.stringify(actions[editIdx]))
			: { label: "", method: "", roles: [], confirm: "", hide_if: "Never", params: [] };
		if (!act.action_id) {
			act.action_id = frappe.utils.get_random(10);
		}
		let methodOpts = '<option value="">' + __("Select method…") + "</option>";
		methodSpecs.forEach(function (m) {
			const sel = act.method === m.key ? " selected" : "";
			methodOpts +=
				'<option value="' +
				frappe.utils.escape_html(m.key) +
				'"' +
				sel +
				">" +
				frappe.utils.escape_html(m.label || m.key) +
				"</option>";
		});
		const spec = methodSpecByKey(act.method);
		$form
			.show()
			.html(
				'<h6 style="margin:0 0 10px;">' +
					(editing ? __("Edit button") : __("New button")) +
					"</h6>" +
					'<div class="form-group" style="margin-bottom:8px;"><label>' +
					__("Label") +
					'</label><input type="text" class="form-control input-sm pp-portal-act-label" value="' +
					frappe.utils.escape_html(act.label || "") +
					'" /></div>' +
					'<div class="form-group" style="margin-bottom:8px;"><label>' +
					__("Method") +
					'</label><select class="form-control input-sm pp-portal-act-method">' +
					methodOpts +
					"</select></div>" +
					'<div class="form-group" style="margin-bottom:8px;"><label>' +
					__("Roles (comma-separated, optional)") +
					'</label><input type="text" class="form-control input-sm pp-portal-act-roles" value="' +
					frappe.utils.escape_html((act.roles || []).join(", ")) +
					'" /></div>' +
					'<div class="form-group" style="margin-bottom:8px;"><label>' +
					__("Confirm text (optional)") +
					'</label><input type="text" class="form-control input-sm pp-portal-act-confirm" value="' +
					frappe.utils.escape_html(act.confirm || "") +
					'" /></div>' +
					'<div class="form-group" style="margin-bottom:8px;"><label>' +
					__("Hide if") +
					'</label><select class="form-control input-sm pp-portal-act-hide">' +
					_pp_portal_hide_if_options_html(act.hide_if) +
					"</select></div>" +
					'<div class="pp-portal-act-params">' +
					renderParamGrid(spec, act.params) +
					"</div>" +
					'<div style="display:flex;gap:8px;margin-top:10px;">' +
					'<button type="button" class="btn btn-primary btn-xs pp-portal-act-save-form">' +
					__("Apply") +
					'</button><button type="button" class="btn btn-default btn-xs pp-portal-act-cancel-form">' +
					__("Cancel") +
					"</button></div>"
			)
			.data("editIdx", editing ? editIdx : null);
	}

	function collectFormAction() {
		const $form = $pane.find(".pp-portal-action-form");
		const label = $form.find(".pp-portal-act-label").val().trim();
		const method = $form.find(".pp-portal-act-method").val();
		if (!label || !method) {
			frappe.msgprint(__("Label and method are required."));
			return null;
		}
		const rolesRaw = $form.find(".pp-portal-act-roles").val().trim();
		const roles = rolesRaw
			? rolesRaw
					.split(",")
					.map(function (s) {
						return s.trim();
					})
					.filter(Boolean)
			: [];
		const confirm = $form.find(".pp-portal-act-confirm").val().trim();
		const hide_if = $form.find(".pp-portal-act-hide").val() || "Never";
		const params = [];
		$form.find(".pp-portal-param-grid tbody tr").each(function () {
			const arg = $(this).attr("data-arg");
			const source = $(this).find(".pp-portal-param-source").val();
			const rec = { arg: arg, source: source };
			if (source === "row" || source === "root") {
				const fld = $(this).find(".pp-portal-param-field").val();
				if (fld) {
					rec.field = String(fld).trim();
				}
			} else if (source === "const") {
				rec.value = $(this).find(".pp-portal-param-field").val();
			}
			params.push(rec);
		});
		const editIdx = $form.data("editIdx");
		const prev = editIdx != null && actions[editIdx] ? actions[editIdx] : {};
		return {
			action_id: prev.action_id || frappe.utils.get_random(10),
			label: label,
			method: method,
			roles: roles,
			confirm: confirm,
			hide_if: hide_if === "Never" ? "" : hide_if,
			params: params,
		};
	}

	renderList();

	$pane.off("click.ppPortalAct change.ppPortalAct");
	$pane.on("click.ppPortalAct", ".pp-portal-action-add", function () {
		openForm(null);
	});
	$pane.on("click.ppPortalAct", ".pp-portal-action-edit", function () {
		openForm(parseInt($(this).attr("data-idx"), 10));
	});
	$pane.on("click.ppPortalAct", ".pp-portal-action-del", function () {
		const idx = parseInt($(this).attr("data-idx"), 10);
		if (idx >= 0 && idx < actions.length) {
			actions.splice(idx, 1);
			renderList();
		}
	});
	$pane.on("click.ppPortalAct", ".pp-portal-act-cancel-form", function () {
		$pane.find(".pp-portal-action-form").hide().empty();
	});
	$pane.on("click.ppPortalAct", ".pp-portal-act-save-form", function () {
		const rec = collectFormAction();
		if (!rec) {
			return;
		}
		const editIdx = $pane.find(".pp-portal-action-form").data("editIdx");
		if (editIdx != null && editIdx >= 0) {
			actions[editIdx] = rec;
		} else {
			actions.push(rec);
		}
		renderList();
	});
	$pane.on("change.ppPortalAct", ".pp-portal-act-method", function () {
		const method = $(this).val();
		const spec = methodSpecByKey(method);
		$pane.find(".pp-portal-act-params").html(renderParamGrid(spec, []));
	});
	$pane.on("change.ppPortalAct", ".pp-portal-param-source", function () {
		const $tr = $(this).closest("tr");
		const arg = $tr.attr("data-arg");
		const src = $(this).val();
		const spec = methodSpecByKey($pane.find(".pp-portal-act-method").val());
		const argSpec = (spec && spec.args ? spec.args : []).find(function (a) {
			return a.arg === arg;
		});
		let fieldCtrl = "";
		if (src === "row") {
			fieldCtrl =
				'<select class="form-control input-xs pp-portal-param-field" data-arg="' +
				frappe.utils.escape_html(arg) +
				'">' +
				fieldnames
					.map(function (fn) {
						return (
							'<option value="' +
							frappe.utils.escape_html(fn) +
							'">' +
							frappe.utils.escape_html(fn) +
							"</option>"
						);
					})
					.join("") +
				"</select>";
		} else if (src === "root" || src === "const") {
			fieldCtrl =
				'<input type="text" class="form-control input-xs pp-portal-param-field" data-arg="' +
				frappe.utils.escape_html(arg) +
				'" value="' +
				frappe.utils.escape_html((argSpec && argSpec.default_field) || "") +
				'" />';
		} else {
			fieldCtrl = '<span class="text-muted">' + __("Collected at runtime") + "</span>";
		}
		$tr.find(".pp-portal-param-field-cell").html(fieldCtrl);
	});
	$pane.on("click.ppPortalAct", ".pp-portal-actions-save", function () {
		const saveActionsMethod =
			ctx.kind === "inline"
				? "nce_events.api.form_dialog.portal_fields.save_inline_child_portal_actions"
				: "nce_events.api.form_dialog.portal_fields.save_related_portal_actions";
		frappe.call({
			method: saveActionsMethod,
			args: {
				form_dialog: ctx.form_dialog,
				child_row_name: ctx.child_row_name,
				portal_actions: JSON.stringify(actions),
			},
			freeze: true,
			freeze_message: __("Saving…"),
			callback: function (sv) {
				if (sv && sv.exc) {
					return;
				}
				frappe.show_alert({
					message: __("Portal buttons saved"),
					indicator: "green",
				});
				if (ctx.onSaved) {
					ctx.onSaved();
				}
			},
		});
	});
}

function _open_related_portal_float(frm, opts) {
	const form_dialog = opts.form_dialog;
	const child_row_name = opts.child_row_name;
	const titleHint = opts.tab_label || __("Related table");
	const kind = opts.kind === "inline" ? "inline" : "related";

	if (!form_dialog || !child_row_name) {
		frappe.show_alert({ message: __("Missing dialog or row id"), indicator: "orange" });
		return;
	}

	const loadMethod =
		kind === "inline"
			? "nce_events.api.form_dialog.portal_fields.get_inline_child_portal_field_editor"
			: "nce_events.api.form_dialog.portal_fields.get_related_portal_field_editor";
	const saveMethod =
		kind === "inline"
			? "nce_events.api.form_dialog.portal_fields.save_inline_child_portal_field_config"
			: "nce_events.api.form_dialog.portal_fields.save_related_portal_field_config";

	_close_related_portal_float();

	const $backdrop = $(
		'<div class="pp-portal-float-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:2000;"></div>'
	);
	const $panel = $(
		'<div class="pp-portal-float-panel" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(880px,94vw);max-height:85vh;display:flex;flex-direction:column;background:#fff;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,0.2);z-index:2001;font-size:12px;"></div>'
	);
	const $header = $(
		'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #e8e8e8;"><strong class="pp-portal-float-title"></strong><button type="button" class="btn btn-default btn-xs pp-portal-float-close" aria-label="Close">×</button></div>'
	);
	const $body = $(
		'<div class="pp-portal-float-body" style="flex:1;overflow:hidden;display:flex;flex-direction:column;padding:10px 16px 16px;"><p class="text-muted" style="margin:0;">' +
			__("Loading…") +
			"</p></div>"
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
		method: loadMethod,
		args: { form_dialog: form_dialog, child_row_name: child_row_name },
		freeze: true,
		freeze_message: __("Loading fields…"),
		callback: function (r) {
			if (!r || r.exc || !r.message) {
				$body.html(
					'<p class="text-danger" style="margin:0;">' +
						__("Could not load editor.") +
						"</p>"
				);
				return;
			}
			const msg = r.message;
			$panel
				.find(".pp-portal-float-title")
				.text(
					titleHint +
						" — " +
						(msg.tab_label || "") +
						" (" +
						(msg.child_doctype || "") +
						")"
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
				'</th><th style="min-width:108px;">' +
				__("Sort") +
				'</th></tr></thead><tbody class="pp-portal-field-tbody">';

			rows.forEach(function (row) {
				const fn = row.fieldname || "";
				const sh = row.show ? " checked" : "";
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

			function ppMountPortalEditor(methodSpecs) {
				const shellHtml =
					'<div class="pp-portal-tab-bar" style="display:flex;gap:4px;margin-bottom:10px;border-bottom:1px solid #e8e8e8;padding-bottom:6px;">' +
					'<button type="button" class="btn btn-xs btn-primary pp-portal-tab-btn active" data-tab="columns">' +
					__("Columns") +
					'</button><button type="button" class="btn btn-xs btn-default pp-portal-tab-btn" data-tab="actions">' +
					__("Buttons/Scripts") +
					"</button></div>" +
					'<div class="pp-portal-tab-pane pp-portal-tab-columns"></div>' +
					'<div class="pp-portal-tab-pane pp-portal-tab-actions" style="display:none;overflow-y:auto;max-height:60vh;"></div>';
				$body.empty().html(shellHtml);
				$body.find(".pp-portal-tab-columns").html(tableHtml);
				_pp_render_portal_actions_tab($body.find(".pp-portal-tab-actions"), {
					kind: kind,
					form_dialog: form_dialog,
					child_row_name: child_row_name,
					methodSpecs: methodSpecs || [],
					fieldnames: _pp_portal_fieldnames_from_rows(rows),
					actions: msg.actions || [],
					onSaved: function () {
						_render_dialogs_tab(frm);
					},
				});
				$body.off("click.ppPortalTabs").on("click.ppPortalTabs", ".pp-portal-tab-btn", function () {
					const tab = $(this).attr("data-tab");
					$body.find(".pp-portal-tab-btn").removeClass("active btn-primary").addClass("btn-default");
					$(this).addClass("active btn-primary").removeClass("btn-default");
					$body.find(".pp-portal-tab-pane").hide();
					$body.find(".pp-portal-tab-" + tab).show();
				});

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
						editable: show ? 1 : 0,
					};
					if (show && sr > 0) {
						o.sort_rank = sr;
						o.sort_dir = sd;
					}
					payload.push(o);
				});
				frappe.call({
					method: saveMethod,
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
						frappe.show_alert({
							message: __("Portal field config saved"),
							indicator: "green",
						});
						_close_related_portal_float();
						_render_dialogs_tab(frm);
					},
				});
			});
			}

			frappe.call({
				method: "nce_events.api.form_dialog.action_registry.list_portal_action_methods",
				callback: function (mr) {
					ppMountPortalEditor((mr && mr.message) || []);
				},
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

/** Mirror ``useFormClientScript.activateScripts`` for Desk-side Tools-tab discovery before capture. */
function _desk_discover_script_tool_groups(doctype, scriptBodies) {
	const dt = String(doctype || "").trim();
	const bodies = Array.isArray(scriptBodies) ? scriptBodies : [];
	const toolGroups = {};
	let hasRefreshHandlers = false;

	const captureCustomButton = function (label, handler, group) {
		const groupKey = group ? String(group) : "__ungrouped__";
		const groupLabel = group || "Tools";
		if (!toolGroups[groupKey]) {
			toolGroups[groupKey] = { groupKey: groupKey, label: groupLabel, buttons: [] };
		}
		toolGroups[groupKey].buttons.push({ label: label, handler: handler });
	};

	const $hiddenHost = $(
		'<div style="display:none;position:absolute;left:-9999px;top:0;"></div>'
	).appendTo("body");
	const $anchor = $("<div></div>").appendTo($hiddenHost);
	const anchorEl = $anchor[0];

	function absorbProxy() {
		const fn = function () {
			return absorbProxy();
		};
		return new Proxy(fn, {
			get: function () {
				return absorbProxy();
			},
			apply: function () {
				return absorbProxy();
			},
		});
	}

	function makeFieldsDictProxy() {
		const $a = $(anchorEl);
		return new Proxy(
			{},
			{
				get: function (_, fn) {
					return {
						$wrapper: $a,
						wrapper: anchorEl,
						df: {},
						get_value: function () {
							return null;
						},
					};
				},
			}
		);
	}

	const formDataStub = {};

	function assembleShim() {
		return {
			doc: formDataStub,
			doctype: dt,
			get_value: function () {
				return null;
			},
			set_value: function () {},
			get_field: function () {
				return null;
			},
			set_df_property: function () {},
			refresh_field: function () {},
			set_query: function () {},
			is_new: function () {
				return false;
			},
			layout: { wrapper: $hiddenHost[0] },
			$wrapper: $hiddenHost,
			wrapper: $hiddenHost[0],
			fields_dict: makeFieldsDictProxy(),
			page: absorbProxy(),
			add_custom_button: captureCustomButton,
		};
	}

	const handlers = [];
	const origOn = frappe.ui.form.on;
	for (let si = 0; si < bodies.length; si++) {
		const src = bodies[si];
		if (!src) {
			continue;
		}
		const captured = {};
		try {
			frappe.ui.form.on = function (registeredDt, events) {
				if (registeredDt === dt) {
					Object.assign(captured, events);
				}
			};
			// eslint-disable-next-line no-new-func
			new Function("frappe", src)(frappe);
		} catch (e) {
			console.warn("[page_panel] script discovery compile error", e);
		} finally {
			frappe.ui.form.on = origOn;
		}
		handlers.push(captured);
	}

	for (let hi = 0; hi < handlers.length; hi++) {
		const h = handlers[hi];
		if (typeof h.refresh !== "function") {
			continue;
		}
		hasRefreshHandlers = true;
		try {
			h.refresh(assembleShim());
		} catch (e) {
			console.warn("[page_panel] script discovery refresh error", e);
		}
	}

	$hiddenHost.remove();

	if (hasRefreshHandlers && Object.keys(toolGroups).length === 0) {
		return [{ groupKey: "__ungrouped__", label: "Tools", buttons: [] }];
	}
	return Object.values(toolGroups);
}

/**
 * Unified capture wizard: related hops + inline Table fields + Tools script groups.
 *
 * @param {object} opts
 * @param {object} opts.buckets — get_multi_hop_children message
 * @param {object[]} opts.inlineOptions — ``inline_table_fields`` from ``get_capture_wizard_options``
 * @param {object[]} opts.discoveredTools — from ``_desk_discover_script_tool_groups``
 * @param {object[]} opts.preselectedRelated — Form Dialog definition rows (shape like picker output)
 * @param {Set<string>} opts.preselectedInlinePfns — parent fieldnames to pre-check
 * @param {object[]} opts.storedScriptGroups — ``script_tool_groups`` from definition (may be empty)
 * @param {Function} [opts.onCancel]
 * @param {Function} onSubmit — ``({ related, inline_child_tables, script_tool_groups })``
 */
function _show_capture_wizard_dialog(opts, onSubmit) {
	const buckets = opts.buckets || {};
	const one = buckets["1_hop"] || [];
	const two = buckets["2_hop"] || [];
	const three = buckets["3_hop"] || [];

	const preselectedRelated = opts.preselectedRelated || [];
	const preRelSet = new Set(preselectedRelated.map(_relatedPickerFingerprint));

	// Already-configured tabs not returned by discovery stay selectable (Rebuild).
	const discoveryFp = new Set(one.concat(two, three).map(_relatedPickerFingerprint));
	const configuredExtra = [];
	for (let pri = 0; pri < preselectedRelated.length; pri++) {
		const row = preselectedRelated[pri];
		if (!row || typeof row !== "object") {
			continue;
		}
		const dt = String(row.doctype || row.child_doctype || "").trim();
		if (!dt) {
			continue;
		}
		const normalized = {
			doctype: dt,
			link_field: String(row.link_field || "").trim(),
			label: String(row.label || row.tab_label || dt).trim() || dt,
			hop_chain: row.hop_chain || [],
		};
		const fp = _relatedPickerFingerprint(normalized);
		if (discoveryFp.has(fp)) {
			continue;
		}
		discoveryFp.add(fp);
		configuredExtra.push(normalized);
	}

	const allRowsFlat = one.concat(two, three, configuredExtra);

	const inlineOpts = Array.isArray(opts.inlineOptions) ? opts.inlineOptions : [];
	const discoveredTools = Array.isArray(opts.discoveredTools) ? opts.discoveredTools : [];

	const preInline =
		opts.preselectedInlinePfns instanceof Set
			? opts.preselectedInlinePfns
			: new Set(Array.from(opts.preselectedInlinePfns || []));

	const storedSg = Array.isArray(opts.storedScriptGroups) ? opts.storedScriptGroups : [];
	const legacyScriptMode = storedSg.length === 0;
	const sgLabelByKey = {};
	for (let si = 0; si < storedSg.length; si++) {
		const r = storedSg[si];
		const gk = String(r.group_key || "").trim() || "__ungrouped__";
		sgLabelByKey[gk] = String(r.tab_label || "").trim() || gk;
	}

	function colHtml(title, rows, idxOffset) {
		let h =
			'<div class="pp-related-picker-col" style="flex:1;min-width:0;max-height:260px;overflow-y:auto;padding:10px;border:1px solid #eef0f2;border-radius:6px;background:#fafbfc;">';
		h +=
			'<div style="font-size:11px;font-weight:600;color:#74808b;text-transform:uppercase;margin:0 0 10px;">' +
			_htmlEscAttr(title) +
			"</div>";
		if (!rows.length) {
			h +=
				'<div style="color:#b9c0c7;font-size:12px;">' +
				_htmlEscAttr(__("None")) +
				"</div>";
		} else {
			rows.forEach(function (row, j) {
				const idx = idxOffset + j;
				const id = "pp-related-sel-" + idx;
				const lab = row.label || row.doctype || "";
				const checked = preRelSet.has(_relatedPickerFingerprint(row)) ? " checked" : "";
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

	let inlineSectionHtml = "";
	if (inlineOpts.length) {
		inlineSectionHtml +=
			'<div style="margin:14px 0 10px;font-size:12px;font-weight:600;color:#36414c;">' +
			_htmlEscAttr(__("Inline child tables (root Table fields)")) +
			"</div>";
		inlineSectionHtml +=
			'<div style="max-height:220px;overflow-y:auto;padding:10px;border:1px solid #eef0f2;border-radius:6px;background:#fafbfc;">';
		inlineOpts.forEach(function (row, ji) {
			const pfn = String(row.parent_fieldname || "").trim();
			if (!pfn) {
				return;
			}
			const id = "pp-inline-sel-" + ji;
			const lab = row.label || pfn;
			const cd = row.child_doctype || "";
			const checked = preInline.has(pfn) ? " checked" : "";
			inlineSectionHtml += '<div style="margin:0 0 8px;display:flex;align-items:flex-start;gap:8px;">';
			inlineSectionHtml +=
				'<input type="checkbox" class="pp-inline-cb" id="' +
				id +
				'" data-pfn="' +
				_htmlEscAttr(pfn) +
				'" data-tab-label="' +
				_htmlEscAttr(lab) +
				'" style="margin-top:2px;"' +
				checked +
				"/>";
			inlineSectionHtml +=
				'<label for="' +
				id +
				'" style="margin:0;font-weight:400;cursor:pointer;line-height:1.35;">' +
				_htmlEscAttr(lab) +
				(cd ? ' <span style="color:#8d99a6;font-size:11px;">(' + _htmlEscAttr(cd) + ")</span>" : "") +
				"</label>";
			inlineSectionHtml += "</div>";
		});
		inlineSectionHtml += "</div>";
	}

	let toolsSectionHtml =
		'<div style="margin:14px 0 10px;font-size:12px;font-weight:600;color:#36414c;">' +
		_htmlEscAttr(__("Tools tabs (from Client Scripts / custom buttons)")) +
		"</div>";

	if (!discoveredTools.length) {
		toolsSectionHtml +=
			'<p style="color:#8d99a6;font-size:12px;margin:0;">' +
			_htmlEscAttr(__("No button groups discovered (scripts without add_custom_button stay in a single Tools tab).")) +
			"</p>";
	} else {
		toolsSectionHtml +=
			'<div style="max-height:240px;overflow-y:auto;padding:10px;border:1px solid #eef0f2;border-radius:6px;background:#fafbfc;">';
		for (let ti = 0; ti < discoveredTools.length; ti++) {
			const tg = discoveredTools[ti];
			const gk = String(tg.groupKey || "__ungrouped__");
			const defaultLab = String(tg.label || gk);
			let initiallyChecked = false;
			if (legacyScriptMode) {
				initiallyChecked = true;
			} else {
				initiallyChecked = !!sgLabelByKey[gk];
			}
			const tabLabDefault = sgLabelByKey[gk] || defaultLab;
			const id = "pp-sg-" + ti;
			const chk = initiallyChecked ? " checked" : "";
			toolsSectionHtml += '<div style="margin:0 0 10px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;">';
			toolsSectionHtml +=
				'<input type="checkbox" class="pp-sg-cb" id="' +
				id +
				'" data-gk="' +
				_htmlEscAttr(gk) +
				'" style="margin-top:2px;"' +
				chk +
				"/>";
			toolsSectionHtml +=
				'<label for="' +
				id +
				'" style="margin:0;font-weight:600;cursor:pointer;min-width:120px;">' +
				_htmlEscAttr(defaultLab) +
				"</label>";
			toolsSectionHtml +=
				'<span style="color:#8d99a6;font-size:11px;">' +
				_htmlEscAttr(__("Tab label")) +
				'</span><input type="text" class="input-xs form-control pp-sg-label" style="max-width:220px;font-size:12px;height:28px;" data-gk="' +
				_htmlEscAttr(gk) +
				'" value="' +
				_htmlEscAttr(tabLabDefault) +
				'"/>';
			toolsSectionHtml += "</div>";
		}
		toolsSectionHtml += "</div>";
		toolsSectionHtml +=
			'<p style="color:#8d99a6;font-size:11px;margin:8px 0 0;">' +
			_htmlEscAttr(
				__(
					"Edit tab labels below; they are stored on Form Dialog › Script Tool Groups. Unchecked groups stay hidden."
				)
			) +
			"</p>";
	}

	const configuredCol = configuredExtra.length
		? colHtml(__("Configured"), configuredExtra, one.length + two.length + three.length)
		: "";
	const relatedWrap =
		'<div style="margin:0 0 10px;font-size:12px;font-weight:600;color:#36414c;">' +
		_htmlEscAttr(__("Related tables (multi-hop)")) +
		'</div><div class="pp-related-picker-wrap" style="display:flex;gap:12px;align-items:stretch;">' +
		colHtml(__("1-hop"), one, 0) +
		colHtml(__("2-hop"), two, one.length) +
		colHtml(__("3-hop"), three, one.length + two.length) +
		configuredCol +
		"</div>";

	const bodyHtml =
		'<div class="pp-capture-wizard-body" style="max-height:72vh;overflow-y:auto;padding-right:6px;">' +
		relatedWrap +
		inlineSectionHtml +
		toolsSectionHtml +
		"</div>";

	const d = new frappe.ui.Dialog({
		title: __("Configure Form Dialog capture"),
		fields: [{ fieldname: "pp_capture_wizard_body", fieldtype: "HTML", options: bodyHtml }],
		size: "extra-large",
		primary_action_label: __("Continue"),
		secondary_action_label: __("Cancel"),
		primary_action: function () {
			const selectedRelated = [];
			d.$wrapper.find(".pp-related-cb:checked").each(function () {
				const idx = parseInt($(this).attr("data-idx"), 10);
				if (!Number.isNaN(idx) && allRowsFlat[idx]) {
					const src = allRowsFlat[idx];
					selectedRelated.push({
						doctype: src.doctype,
						link_field: src.link_field,
						label: src.label || src.doctype,
						hop_chain: src.hop_chain || [],
					});
				}
			});

			const inlinePayload = [];
			d.$wrapper.find(".pp-inline-cb:checked").each(function () {
				const pfn = String($(this).attr("data-pfn") || "").trim();
				const tl = String($(this).attr("data-tab-label") || "").trim() || pfn;
				if (pfn) {
					inlinePayload.push({ parent_fieldname: pfn, tab_label: tl });
				}
			});

			let scriptPayload = [];
			if (discoveredTools.length) {
				const checkedKeys = [];
				d.$wrapper.find(".pp-sg-cb:checked").each(function () {
					const gk = String($(this).attr("data-gk") || "").trim() || "__ungrouped__";
					checkedKeys.push(gk);
				});
				const uniq = {};
				for (let ci = 0; ci < checkedKeys.length; ci++) {
					const k = checkedKeys[ci];
					if (uniq[k]) {
						continue;
					}
					uniq[k] = true;
					let $inp = $();
					d.$wrapper.find(".pp-sg-label").each(function () {
						if (($(this).attr("data-gk") || "") === k) {
							$inp = $(this);
							return false;
						}
					});
					let tl = ($inp.val() || "").trim();
					if (!tl) {
						tl = k;
					}
					scriptPayload.push({ group_key: k, tab_label: tl });
				}
			}

			d.hide();
			onSubmit({
				related: selectedRelated,
				inline_child_tables: inlinePayload,
				script_tool_groups: scriptPayload,
			});
		},
		secondary_action: function () {
			d.hide();
			if (typeof opts.onCancel === "function") {
				opts.onCancel();
			}
		},
	});
	d.show();
}

/** Parallel fetch for Page Panel capture wizard (multi-hop + Table fields + script preview). */
function _load_capture_wizard_sources(doctype, onReady, onFail) {
	let buckets = {};
	let inlineOpts = [];
	let scripts = [];
	let pending = 3;
	let failed = false;

	function finishFail(message) {
		if (failed) {
			return;
		}
		failed = true;
		onFail(message);
	}

	function tick() {
		if (failed) {
			return;
		}
		pending--;
		if (pending === 0) {
			onReady(buckets, inlineOpts, scripts);
		}
	}

	frappe.call({
		method: "nce_events.api.panel_api_pkg.discovery.get_multi_hop_children",
		args: { root_doctype: doctype },
		callback: function (r) {
			buckets = (r && r.message) || {};
			tick();
		},
		error: function () {
			finishFail(__("Could not load related DocTypes."));
		},
	});

	frappe.call({
		method: "nce_events.api.form_dialog.capture.get_capture_wizard_options",
		args: { doctype: doctype },
		callback: function (r) {
			inlineOpts = (r && r.message && r.message.inline_table_fields) || [];
			tick();
		},
		error: function () {
			finishFail(__("Could not load capture wizard options."));
		},
	});

	frappe.call({
		method: "nce_events.api.form_dialog.capture.preview_capture_client_scripts",
		args: { doctype: doctype },
		callback: function (r) {
			scripts = (r && r.message && r.message.scripts) || [];
			tick();
		},
		error: function () {
			finishFail(__("Could not preview client scripts."));
		},
	});
}

// ── Dialogs tab ───────────────────────────────────────────────────────────
function _render_dialogs_tab(frm) {
	const $container = $(frm.layout.wrapper).find(".pp-dialogs-wrap");
	if (!$container.length) return;

	if (!frm.doc.root_doctype) {
		$container.html(
			'<p style="color:#8d949a;font-size:12px;padding:8px 0;">Select a DocType in the Config tab first.</p>'
		);
		return;
	}

	$container.html('<p style="color:#8d949a;font-size:12px;padding:8px 0;">Loading dialogs…</p>');
	_bind_dialogs_click_handlers(frm);

	frappe.call({
		method: "nce_events.api.form_dialog.capture.list_form_dialogs_for_doctype",
		args: { doctype: frm.doc.root_doctype },
		callback: function (r) {
			const dialogs = (r && r.message) || [];
			_build_dialogs_tab_html(frm, $container, dialogs);
		},
		error: function () {
			$container.html(
				'<p style="color:#c0392b;font-size:12px;padding:8px 0;">Failed to load dialogs.</p>'
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
						method: "nce_events.api.form_dialog.capture.get_form_dialog_definition",
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
							const msg = defn_r.message || {};
							const current_related = msg.related_doctypes || [];
							const current_inline = msg.inline_child_tables || [];
							const current_sg = msg.script_tool_groups || [];
							const preInlinePfns = new Set(
								current_inline
									.map(function (row) {
										return String(row.parent_fieldname || "").trim();
									})
									.filter(Boolean)
							);

							const discoveryDoctype =
								String(msg.target_doctype || "").trim() || doctype;

							_load_capture_wizard_sources(
								discoveryDoctype,
								function (buckets, inlineOpts, scripts) {
									const discovered = _desk_discover_script_tool_groups(
										discoveryDoctype,
										scripts
									);
									setTimeout(function () {
										_show_capture_wizard_dialog(
											{
												buckets: buckets,
												inlineOptions: inlineOpts,
												discoveredTools: discovered,
												preselectedRelated: current_related,
												preselectedInlinePfns: preInlinePfns,
												storedScriptGroups: current_sg,
												onCancel: function () {
													_pp_rebuild_pending = false;
												},
											},
											function (sel) {
												frappe.call({
													method: "nce_events.api.form_dialog.capture.rebuild_form_dialog",
													args: {
														name: current,
														related_doctypes: JSON.stringify(sel.related || []),
														inline_child_tables: JSON.stringify(sel.inline_child_tables || []),
														script_tool_groups: JSON.stringify(sel.script_tool_groups || []),
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
										);
									}, 0);
								},
								function (errMsg) {
									_pp_rebuild_pending = false;
									frappe.msgprint({
										title: __("Error"),
										message: errMsg,
										indicator: "red",
									});
								}
							);
						},
					});
				}, 200);
			},
			function () {
				_pp_rebuild_pending = false;
			}
		);
	});

	$wrapper.on("click.ppFormDialogs", ".pp-dialog-create", function () {
		const doctypeRaw = frm.doc.root_doctype;
		const doctype = (doctypeRaw && String(doctypeRaw).trim()) || "";
		if (!doctype) {
			frappe.msgprint({
				title: __("Root DocType required"),
				message: __("Set Root DocType in the Config tab before capturing a dialog."),
				indicator: "orange",
			});
			return;
		}
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
					_load_capture_wizard_sources(
						doctype,
						function (buckets, inlineOpts, scripts) {
							const discovered = _desk_discover_script_tool_groups(doctype, scripts);
							setTimeout(function () {
								_show_capture_wizard_dialog(
									{
										buckets: buckets,
										inlineOptions: inlineOpts,
										discoveredTools: discovered,
										preselectedRelated: [],
										preselectedInlinePfns: new Set(),
										storedScriptGroups: [],
									},
									function (sel) {
										frappe.call({
											method: "nce_events.api.form_dialog.capture.capture_form_dialog_from_desk",
											args: {
												doctype: doctype,
												title: values.title,
												related_doctypes: JSON.stringify(sel.related || []),
												inline_child_tables: JSON.stringify(sel.inline_child_tables || []),
												script_tool_groups: JSON.stringify(sel.script_tool_groups || []),
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
								);
							}, 0);
						},
						function (errMsg) {
							frappe.msgprint({
								title: __("Error"),
								message: errMsg,
								indicator: "red",
							});
						}
					);
				}, 200);
			},
			"Create Form Dialog",
			"Create"
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

	$wrapper.on("click.ppFormDialogs", ".pp-dialog-inline-tab", function (ev) {
		ev.preventDefault();
		const $btn = $(this);
		const dialogName = $btn.attr("data-dialog-name") || "";
		const childRow = $btn.attr("data-child-row-name") || "";
		if (!childRow) {
			frappe.show_alert({
				message: __("Reload this form after migrate: missing inline row id."),
				indicator: "orange",
			});
			return;
		}
		_open_related_portal_float(frm, {
			kind: "inline",
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
			}
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
				<td style="padding:4px 8px;">${
					d.captured_at ? frappe.datetime.str_to_user(d.captured_at) : "—"
				}</td>
				<td style="padding:4px 8px;">
					${
						is_current
							? '<span style="color:#27ae60;font-weight:600;">Active</span>'
							: '<button class="btn btn-xs btn-default pp-dialog-select" data-name="' +
							  frappe.utils.escape_html(d.name) +
							  '">Set as active</button>'
					}
					<button class="btn btn-xs btn-default pp-dialog-delete" data-name="${frappe.utils.escape_html(
						d.name
					)}" style="margin-left:4px;color:#c0392b;">Delete</button>
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
					rel_btns += `<button type="button" class="btn btn-xs btn-default pp-dialog-related-tab" style="margin:2px 4px 2px 0;" data-pp-related-idx="${idx}" data-dialog-name="${frappe.utils.escape_html(
						d.name
					)}" data-child-row-name="${frappe.utils.escape_html(
						crn
					)}" data-child-doctype="${frappe.utils.escape_html(
						dt
					)}" data-link-field="${frappe.utils.escape_html(
						lf
					)}">${frappe.utils.escape_html(lab)}</button>`;
				});
				list_html += `<tr style="border-bottom:1px solid #ededed;${row_bg}"><td colspan="4" style="padding:4px 8px 8px 20px;background:#fafbfc;font-size:11px;">
					<div style="color:#8d99a6;margin-bottom:4px;">${__("Related table tabs (preview)")}</div>
					<div style="display:flex;flex-wrap:wrap;align-items:center;gap:2px;">${rel_btns}</div>
				</td></tr>`;
			}
			const inl = Array.isArray(d.inline_child_tables) ? d.inline_child_tables : [];
			if (inl.length) {
				let inl_btns = "";
				inl.forEach(function (row, idx) {
					const lab =
						row.label ||
						row.tab_label ||
						row.parent_fieldname ||
						row.child_doctype ||
						"Inline";
					const pfn = row.parent_fieldname || "";
					const cd = row.child_doctype || "";
					const crn = row.child_row_name || "";
					inl_btns += `<button type="button" class="btn btn-xs btn-default pp-dialog-inline-tab" style="margin:2px 4px 2px 0;" data-pp-inline-idx="${idx}" data-dialog-name="${frappe.utils.escape_html(
						d.name
					)}" data-child-row-name="${frappe.utils.escape_html(
						crn
					)}" data-parent-fieldname="${frappe.utils.escape_html(
						pfn
					)}" data-child-doctype="${frappe.utils.escape_html(cd)}">${frappe.utils.escape_html(
						lab
					)}</button>`;
				});
				list_html += `<tr style="border-bottom:1px solid #ededed;${row_bg}"><td colspan="4" style="padding:4px 8px 8px 20px;background:#fafbfc;font-size:11px;">
					<div style="color:#8d99a6;margin-bottom:4px;">${__("Inline child tabs (preview)")}</div>
					<div style="display:flex;flex-wrap:wrap;align-items:center;gap:2px;">${inl_btns}</div>
				</td></tr>`;
			}
		});
		list_html += `</tbody></table>`;
	} else {
		list_html = `<p style="color:#8d949a;font-size:12px;">No Form Dialogs exist for <strong>${frappe.utils.escape_html(
			doctype
		)}</strong> yet.</p>`;
	}

	// ── Create button ──
	const create_html = `
		<div style="margin-top:12px;">
			<button class="btn btn-xs btn-primary pp-dialog-create">Create &amp; capture from Desk</button>
		</div>`;

	$container.html(current_html + list_html + create_html);
}

// ── Colours tab ───────────────────────────────────────────────────────────────
function _hide_colour_schema_fields(frm) {
	COLOUR_FIELDS.forEach(function (fn) {
		const fd = frm.fields_dict[fn];
		if (fd && fd.$wrapper) $(fd.$wrapper).hide();
	});
}

/** Matches ThemeSwatchPicker curated class strings (theme-{kind}-{role}-{shade}). */
const PP_COLOUR_CLASS_RE =
	/^theme-(bg|text|border)-(primary|secondary|accent|success|info|warning|danger)-(100|200|300|500|600|700|900)$/;

function _resolve_nce_theme_slug_for_colours(themeLink, callback) {
	const theme = (themeLink || "").trim();
	if (!theme) {
		callback("");
		return;
	}
	frappe.db.get_value("NCE Theme", theme, ["slug", "status"]).then(function (r) {
		const row = r && r.message ? r.message : r;
		const slug =
			row && row.status === "Active" && row.slug ? String(row.slug).trim() : "";
		callback(slug);
	});
}

function _colour_effective_class(raw, fallback) {
	return (raw || "").trim() || (fallback || "").trim();
}

/** Preview tile always uses a theme-bg-* class (same visual language as the picker strip). */
function _colour_preview_bg_class(className) {
	const raw = (className || "").trim();
	if (!raw) return "";
	if (raw.indexOf("theme-bg-") === 0) return raw;
	const match = PP_COLOUR_CLASS_RE.exec(raw);
	if (match) return "theme-bg-" + match[2] + "-" + match[3];
	return raw;
}

/** Palette role shades — overlay uses mono or tonal -fg class on swatch preview. */
function _colour_overlay_fg_class(bgClass, fgType) {
	const raw = (bgClass || "").trim();
	if (raw.indexOf("theme-bg-") !== 0) return "";
	const body = raw.slice("theme-bg-".length);
	const suffix = (fgType || "mono") === "tonal" ? "-fg-tonal" : "-fg";
	const m = body.match(
		/^(primary|secondary|accent|success|info|warning|danger)(?:-(\d+))?$/
	);
	if (!m) return "";
	return "theme-text-" + m[1] + (m[2] ? "-" + m[2] : "") + suffix;
}

/** Literal px for preview tiles — matches theme defaults; avoids missing --nce-border-width-* in CSS. */
const PP_BORDER_WIDTH_PX = {
	"theme-border-thin": "0.5px",
	"theme-border": "1px",
	"theme-border-strong": "2px",
};

function _border_effective_width_class(raw, fallback) {
	return (raw || "").trim() || (fallback || "").trim();
}

/** Extract CSS color var from any theme-{bg|text|border}-{role}-{shade} class. */
function _border_preview_color_css(colorClass) {
	const m = (colorClass || "").match(/^theme-(?:bg|text|border)-([a-z]+)-(\d+)$/);
	if (!m) return "#8898a4";
	return "var(--nce-color-" + m[1] + "-" + m[2] + ", #8898a4)";
}

function _border_line_preview_html(frm, slot) {
	const widthClass = _border_effective_width_class(
		frm.doc[slot.widthField],
		slot.widthFallback
	);
	const widthPx = PP_BORDER_WIDTH_PX[widthClass] || "1px";
	const colorCss = _border_preview_color_css(frm.doc[slot.colorField]);
	return (
		'<div style="width:60px;border-bottom:' +
		widthPx +
		" solid " +
		colorCss +
		';margin:11px 4px 4px;" title="' +
		frappe.utils.escape_html(widthClass + " · " + (frm.doc[slot.colorField] || __("default"))) +
		'"></div>'
	);
}

function _border_width_select_html(frm, slot) {
	const current = _border_effective_width_class(
		frm.doc[slot.widthField],
		slot.widthFallback
	);
	let opts = "";
	BORDER_WIDTH_OPTIONS.forEach(function (o) {
		const sel = o.value === current ? " selected" : "";
		opts +=
			'<option value="' +
			frappe.utils.escape_html(o.value) +
			'"' +
			sel +
			">" +
			frappe.utils.escape_html(o.label) +
			"</option>";
	});
	return (
		'<select class="form-control input-xs pp-border-width-select" data-field="' +
		frappe.utils.escape_html(slot.widthField) +
		'">' +
		opts +
		"</select>"
	);
}

function _colour_preview_swatch_html(className, fgType, isDefault) {
	const bg = _colour_preview_bg_class(className);
	if (!bg) {
		return '<span style="color:#8d99a6;font-size:11px;">—</span>';
	}
	const fg = _colour_overlay_fg_class(bg, fgType);
	const defaultCls = isDefault ? " pp-colour-swatch--default" : "";
	let inner = "";
	if (fg) {
		inner =
			'<span class="nce-theme-swatch-picker__swatch-label ' +
			frappe.utils.escape_html(fg) +
			'">Text</span>';
	}
	return (
		'<span class="nce-theme-swatch-picker__swatch' +
		defaultCls +
		" " +
		frappe.utils.escape_html(bg) +
		'" title="' +
		frappe.utils.escape_html(className) +
		'">' +
		inner +
		"</span>"
	);
}

function _bind_colours_tab_pickers(frm, $container) {
	$container
		.off("change", ".pp-border-width-select")
		.on("change", ".pp-border-width-select", function () {
			const field = $(this).data("field");
			const val = $(this).val();
			if (!field) return;
			frm.set_value(field, val || "");
			_render_colours_tab_previews(frm, null, $container);
		});

	$container
		.off("click", ".pp-border-color-pick")
		.on("click", ".pp-border-color-pick", function () {
			const valueField = $(this).data("field");
			if (!valueField) return;
			const picker = frappe.ui && frappe.ui.themeSwatchPicker;
			if (!picker || typeof picker.open !== "function") {
				frappe.msgprint({
					title: __("ThemeSwatchPicker unavailable"),
					message: __(
						"Install/build the Themes app widget (theme-swatch-picker.umd.js) and reload Desk."
					),
					indicator: "orange",
				});
				return;
			}
			picker
				.open({
					frm: frm,
					themeField: "theme",
					valueField: valueField,
					lockKind: "border",
				})
				.then(function (saved) {
					if (saved) {
						_render_colours_tab_previews(frm, null, $container);
					}
				});
		});

	$container.off("click", ".pp-colour-pick").on("click", ".pp-colour-pick", function () {
		const valueField = $(this).data("field");
		const fgTypeField = $(this).data("fg-type-field");
		if (!valueField) return;
		const picker = frappe.ui && frappe.ui.themeSwatchPicker;
		if (!picker || typeof picker.open !== "function") {
			frappe.msgprint({
				title: __("ThemeSwatchPicker unavailable"),
				message: __(
					"Install/build the Themes app widget (theme-swatch-picker.umd.js) and reload Desk."
				),
				indicator: "orange",
			});
			return;
		}
		picker
			.open({
				frm: frm,
				themeField: "theme",
				valueField: valueField,
				fgTypeField: fgTypeField || _colour_fg_type_field(valueField),
			})
			.then(function (saved) {
				if (saved) {
					_render_colours_tab_previews(frm, null, $container);
				}
			});
	});
}

function _reload_nce_theme_stylesheet(cssHash) {
	const bust = (cssHash || "").trim() || String(Date.now());
	$('link[rel="stylesheet"]').each(function () {
		const href = $(this).attr("href") || "";
		if (href.indexOf("nce_theme.css") === -1) {
			return;
		}
		const base = href.split("?")[0];
		this.href = base + "?v=" + encodeURIComponent(bust);
	});
}

function _revert_panel_colours_to_theme_defaults(frm) {
	frappe.confirm(
		__(
			"Clear all custom background, foreground, and line overrides for this panel? The assigned theme will control appearance using built-in defaults."
		),
		function () {
			COLOUR_OVERRIDE_FIELDS.forEach(function (fn) {
				frm.set_value(fn, "");
			});
			_render_colours_tab(frm);
			frappe.show_alert({
				message: __("Reverted to theme defaults"),
				indicator: "green",
			});
		}
	);
}

function _mount_colours_theme_revert_btn(frm, $row) {
	if ($row.find(".pp-colours-theme-revert").length) {
		return;
	}
	const $revertBtn = $(
		'<button type="button" class="btn btn-default btn-sm pp-colours-theme-revert">' +
			frappe.utils.escape_html(__("Revert to Theme Defaults")) +
			"</button>"
	);
	$revertBtn.on("click", function () {
		_revert_panel_colours_to_theme_defaults(frm);
	});
	$row.append($revertBtn);
}

function _refresh_colours_theme_css(frm) {
	const $container = $(frm.layout.wrapper).find(".pp-colours-wrap");
	const $btn = $container.find(".pp-colours-theme-refresh");

	function finish(cssHash) {
		_reload_nce_theme_stylesheet(cssHash);
		_render_colours_tab_previews(frm, null, $container);
		$btn.prop("disabled", false);
		frappe.show_alert({
			message: __("Theme refreshed"),
			indicator: "green",
		});
	}

	$btn.prop("disabled", true);
	frappe.call({
		method: "themes.api.regenerate_theme_css",
		freeze: true,
		freeze_message: __("Republishing theme CSS…"),
		callback: function (r) {
			const msg = (r && r.message) || {};
			finish(msg.css_hash);
		},
		error: function () {
			_reload_nce_theme_stylesheet();
			_render_colours_tab_previews(frm, null, $container);
			$btn.prop("disabled", false);
			frappe.show_alert({
				message: __("Previews redrawn (could not republish theme CSS)"),
				indicator: "orange",
			});
		},
	});
}

function _fetch_active_nce_themes_for_colours(callback) {
	frappe.db
		.get_list("NCE Theme", {
			filters: { status: "Active" },
			fields: ["name", "theme_name"],
			order_by: "theme_name asc",
			limit_page_length: 0,
		})
		.then(function (rows) {
			callback(rows || []);
		})
		.catch(function () {
			callback([]);
		});
}

function _theme_select_options_html(frm, themes) {
	const current = (frm.doc.theme || "").trim();
	let html =
		'<option value="">' +
		frappe.utils.escape_html(__("Site default (:root)")) +
		"</option>";
	const seen = {};
	(themes || []).forEach(function (t) {
		const name = (t.name || "").trim();
		if (!name || seen[name]) return;
		seen[name] = true;
		const label = (t.theme_name || name).trim();
		const sel = name === current ? " selected" : "";
		html +=
			'<option value="' +
			frappe.utils.escape_html(name) +
			'"' +
			sel +
			">" +
			frappe.utils.escape_html(label) +
			"</option>";
	});
	if (current && !seen[current]) {
		html +=
			'<option value="' +
			frappe.utils.escape_html(current) +
			'" selected>' +
			frappe.utils.escape_html(current) +
			" (" +
			frappe.utils.escape_html(__("not Active")) +
			")</option>";
	}
	return html;
}

function _bind_colours_theme_dropdown(frm, $container, $editBtn) {
	$container
		.off("change", ".pp-colours-theme-select")
		.on("change", ".pp-colours-theme-select", function () {
			const val = ($(this).val() || "").trim();
			frm.set_value("theme", val);
			_update_colours_theme_edit_btn(frm, $editBtn);
			_render_colours_tab_previews(frm, null, $container.closest(".pp-colours-wrap"));
		});
}

function _theme_editor_url(themeDoc) {
	const theme = (themeDoc || "").trim();
	if (!theme) {
		return "";
	}
	return frappe.urllib.get_full_url(
		"/themes/theme-settings?theme=" + encodeURIComponent(theme)
	);
}

function _update_colours_theme_edit_btn(frm, $btn) {
	const themeDoc = (frm.doc.theme || "").trim();
	if (!themeDoc) {
		$btn.prop("disabled", true).text(__("Edit theme"));
		return;
	}
	frappe.db.get_value("NCE Theme", themeDoc, "theme_name").then(function (r) {
		const row = r && r.message ? r.message : r;
		const label = (row && row.theme_name ? row.theme_name : themeDoc).trim();
		$btn.prop("disabled", false).text(__("Edit {0}", [label]));
	});
}

function _mount_theme_field_on_colours_tab(frm, $container) {
	const $host = $container.find(".pp-colours-theme-field");
	if (!$host.length) {
		return;
	}

	function sync_existing_row() {
		const $editBtn = $host.find(".pp-colours-theme-edit");
		const $sel = $host.find(".pp-colours-theme-select");
		if ($sel.length) {
			$sel.val((frm.doc.theme || "").trim());
		}
		_update_colours_theme_edit_btn(frm, $editBtn);
	}

	if ($host.find(".pp-colours-theme-row").length) {
		_mount_colours_theme_revert_btn(frm, $host.find(".pp-colours-theme-row"));
		sync_existing_row();
		return;
	}

	_fetch_active_nce_themes_for_colours(function (themes) {
		if ($host.find(".pp-colours-theme-row").length) {
			_mount_colours_theme_revert_btn(frm, $host.find(".pp-colours-theme-row"));
			sync_existing_row();
			return;
		}

		$host.empty();
		const $row = $('<div class="pp-colours-theme-row"></div>');
		const $fieldCol = $('<div class="pp-colours-theme-field-col"></div>');
		$fieldCol.append(
			$("<label>")
				.addClass("control-label pp-colours-theme-label")
				.text(__("Theme"))
		);
		$fieldCol.append(
			'<select class="form-control pp-colours-theme-select">' +
				_theme_select_options_html(frm, themes) +
				"</select>"
		);
		$row.append($fieldCol);

		const $refreshBtn = $(
			'<button type="button" class="btn btn-default btn-sm pp-colours-theme-refresh">' +
				frappe.utils.escape_html(__("Refresh")) +
				"</button>"
		);
		$refreshBtn.on("click", function () {
			_refresh_colours_theme_css(frm);
		});
		$row.append($refreshBtn);

		const $editBtn = $(
			'<button type="button" class="btn btn-default btn-sm pp-colours-theme-edit"></button>'
		);
		$editBtn.on("click", function () {
			const url = _theme_editor_url(frm.doc.theme);
			if (url) {
				window.open(url, "_blank", "noopener,noreferrer");
			}
		});
		$row.append($editBtn);
		_mount_colours_theme_revert_btn(frm, $row);
		$host.append($row);

		_update_colours_theme_edit_btn(frm, $editBtn);
		_bind_colours_theme_dropdown(frm, $host, $editBtn);
	});
}

function _colours_tab_styles_html() {
	return `
		<style>
			.pp-colours-wrap .pp-colour-swatch--default { opacity: 0.55; }
			.pp-colours-wrap .pp-colours-theme-scope { display: inline-block; max-width: 100%; }
			.pp-colours-wrap .pp-colours-theme-row {
				display: flex;
				align-items: flex-end;
				flex-wrap: wrap;
				gap: 8px;
				max-width: 640px;
			}
			.pp-colours-wrap .pp-colours-theme-field-col {
				flex: 1 1 220px;
				min-width: 200px;
			}
			.pp-colours-wrap .pp-colours-theme-label {
				display: block;
				font-weight: 600;
				margin-bottom: 4px;
			}
			.pp-colours-wrap .pp-colours-theme-field-col .form-group {
				margin-bottom: 0;
			}
			.pp-colours-wrap .pp-colours-theme-select {
				min-width: 220px;
				max-width: 360px;
				font-size: 13px;
			}
			.pp-colours-wrap .pp-colours-theme-edit,
			.pp-colours-wrap .pp-colours-theme-refresh,
			.pp-colours-wrap .pp-colours-theme-revert {
				flex-shrink: 0;
				margin-bottom: 2px;
				white-space: nowrap;
			}
			/* Shared chrome tables (backgrounds, borders, other panels) */
			.pp-colours-chrome-table {
				width: 100%;
				max-width: 760px;
				background: #fff;
				margin-bottom: 0;
				table-layout: fixed;
			}
			.pp-colours-chrome-table thead th {
				padding: 6px 10px;
				background: #f7f7f7;
				font-weight: 600;
				font-size: 13px;
				vertical-align: middle;
			}
			.pp-colours-chrome-table tbody td {
				padding: 8px 10px;
				vertical-align: middle;
				font-size: 12px;
			}
			.pp-colours-chrome-table .pp-colours-preview-cell {
				width: 80px;
				max-width: 80px;
			}
			.pp-colours-chrome-table .pp-colours-class-cell {
				width: 30%;
				max-width: 30%;
				font-family: monospace;
				font-size: 12px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			.pp-colours-left .pp-colours-section-title:first-of-type,
			.pp-colours-other-panels-title {
				margin-top: 0;
			}
			/* Side-by-side layout */
			.pp-colours-panels-row {
				display: flex;
				align-items: flex-start;
				gap: 0;
				margin-top: 10px;
			}
			.pp-colours-left {
				flex: 0 0 auto;
				min-width: 0;
			}
			.pp-colours-arrows {
				flex: 0 0 auto;
				display: flex;
				flex-direction: column;
				align-items: stretch;
				justify-content: flex-start;
				gap: 10px;
				padding: 28px 12px 0;
				align-self: flex-start;
			}
			.pp-colours-arrow-btn {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 6px;
				width: 118px;
				box-sizing: border-box;
				padding: 8px 10px;
				border: 1px solid #dee2e6;
				border-radius: 4px;
				background: #fff;
				color: #495057;
				font-size: 12px;
				font-weight: 600;
				cursor: pointer;
				white-space: nowrap;
				transition: border-color 0.15s, color 0.15s, background 0.15s;
				line-height: 1;
			}
			.pp-colours-arrow-btn:hover:not(:disabled) {
				border-color: #495057;
				background: #f1f3f5;
				color: #212529;
			}
			.pp-colours-arrow-btn:disabled,
			.pp-colours-arrow-btn[aria-hidden="true"] {
				opacity: 0;
				pointer-events: none;
			}
			.pp-colours-arrow-icon {
				font-size: 18px;
				line-height: 1;
			}
			/* Other panels table */
			.pp-colours-right {
				flex: 0 0 auto;
				min-width: 240px;
				max-width: 360px;
			}
			.pp-colours-other-table tbody td {
				cursor: pointer;
				user-select: none;
			}
			.pp-colours-other-table tbody tr:hover td {
				background: #f1f3f5;
			}
			.pp-colours-other-table tbody tr.pp-panel-row--selected td {
				background: #dbe4ff;
				border-color: #748ffc;
				font-weight: 600;
			}
			.pp-colours-other-theme {
				color: #868e96;
				font-size: 12px;
			}
			.pp-colours-other-table tbody tr.pp-panel-row--selected .pp-colours-other-theme {
				color: #495057;
			}
			.pp-colours-section-title {
				margin: 18px 0 8px;
				font-weight: 600;
				font-size: 13px;
			}
			.pp-border-width-select {
				width: 100%;
				max-width: 110px;
				display: block;
				font-size: 12px;
				height: 26px;
				padding: 2px 6px;
				box-sizing: border-box;
			}
			.pp-border-action-cell {
				width: 88px;
				max-width: 88px;
				overflow: hidden;
				text-align: right;
				white-space: nowrap;
			}
			.pp-border-color-muted {
				color: #8d99a6;
				font-size: 11px;
			}
		</style>`;
}

function _build_colours_preview_table_html(frm) {
	let rows = "";
	COLOUR_SLOTS.forEach(function (slot) {
		const raw = (frm.doc[slot.field] || "").trim();
		const isDefault = !raw;
		const effective = _colour_effective_class(raw, slot.fallback);
		const fgType = _colour_fg_type_value(frm, slot.field);
		const display =
			raw ||
			'<span style="color:#8d99a6;">' + frappe.utils.escape_html(slot.fallback) + "</span>";
		const fgLabel =
			fgType === "tonal"
				? '<span style="color:#8d99a6;margin-left:6px;">(' + __("tonal") + ")</span>"
				: "";
		const swatch = _colour_preview_swatch_html(effective, fgType, isDefault);
		const classTitle = raw || slot.fallback;
		rows += `<tr>
			<td>${frappe.utils.escape_html(slot.label)}</td>
			<td class="pp-colours-preview-cell">${swatch}</td>
			<td class="pp-colours-class-cell" title="${frappe.utils.escape_html(classTitle)}">${display}${fgLabel}</td>
			<td style="width:72px;text-align:right;">
				<button type="button" class="btn btn-xs btn-default pp-colour-pick" data-field="${frappe.utils.escape_html(
					slot.field
				)}" data-fg-type-field="${frappe.utils.escape_html(
					slot.fgTypeField || _colour_fg_type_field(slot.field)
				)}">${__("Pick…")}</button>
			</td>
		</tr>`;
	});

	return (
		`<div class="pp-colours-section-title">${__("Backgrounds")}</div>` +
		`<table class="table table-bordered pp-colours-chrome-table">
		<thead>
			<tr>
				<th style="width:24%;">${__("Surface")}</th>
				<th class="pp-colours-preview-cell">${__("Preview")}</th>
				<th style="width:30%;">${__("Class")}</th>
				<th style="width:72px;"></th>
			</tr>
		</thead>
		<tbody>${rows}</tbody>
	</table>`
	);
}

function _build_colours_border_table_html(frm) {
	let rows = "";
	BORDER_LINE_SLOTS.forEach(function (slot) {
		const colorRaw = (frm.doc[slot.colorField] || "").trim();
		const colorDisplay = colorRaw
			? frappe.utils.escape_html(colorRaw)
			: '<span class="pp-border-color-muted">' + __("default") + "</span>";
		const preview = _border_line_preview_html(frm, slot);
		const widthSelect = _border_width_select_html(frm, slot);
		const colorTitle = colorRaw || __("default");
		rows += `<tr>
			<td>${frappe.utils.escape_html(slot.label)}</td>
			<td class="pp-colours-preview-cell">${preview}</td>
			<td style="width:100px;">${widthSelect}</td>
			<td class="pp-colours-class-cell" title="${frappe.utils.escape_html(colorTitle)}">${colorDisplay}</td>
			<td class="pp-border-action-cell">
				<button type="button" class="btn btn-xs btn-default pp-border-color-pick" data-field="${frappe.utils.escape_html(
					slot.colorField
				)}">${__("Color…")}</button>
			</td>
		</tr>`;
	});

	return (
		`<div class="pp-colours-section-title">${__("Lines & borders")}</div>` +
		`<table class="table table-bordered pp-colours-chrome-table">
		<thead>
			<tr>
				<th style="width:24%;">${__("Line")}</th>
				<th class="pp-colours-preview-cell">${__("Preview")}</th>
				<th style="width:100px;">${__("Width")}</th>
				<th style="width:30%;">${__("Color class")}</th>
				<th style="width:88px;"></th>
			</tr>
		</thead>
		<tbody>${rows}</tbody>
	</table>`
	);
}

function _ensure_colours_tab_shell(frm, $container) {
	if ($container.find(".pp-colours-shell").length) {
		return;
	}

	const html =
		_colours_tab_styles_html() +
		`<div class="pp-colours-shell">
			<div class="pp-colours-theme-field" style="margin-bottom:14px;"></div>
			<div class="pp-colours-panels-row">
				<div class="pp-colours-left">
					<div class="pp-colours-previews"></div>
				</div>
				<div class="pp-colours-arrows">
					<button type="button" class="pp-colours-arrow-btn pp-colours-btn-from" disabled aria-hidden="true">
						<span class="pp-colours-arrow-icon">&#8592;</span>
						<span>Copy From</span>
					</button>
					<button type="button" class="pp-colours-arrow-btn pp-colours-btn-to" disabled aria-hidden="true">
						<span>Copy To</span>
						<span class="pp-colours-arrow-icon">&#8594;</span>
					</button>
				</div>
				<div class="pp-colours-right">
					<div class="pp-colours-other-panels"></div>
				</div>
			</div>
		</div>`;

	$container.html(html);
	_mount_theme_field_on_colours_tab(frm, $container);
}

function _render_colours_tab_previews(frm, themeSlug, $container) {
	if (!$container || !$container.length) {
		return;
	}

	if (themeSlug === null) {
		const themeLink = (frm.doc.theme || "").trim();
		_resolve_nce_theme_slug_for_colours(themeLink, function (slug) {
			_render_colours_tab_previews(frm, slug, $container);
		});
		return;
	}

	const scopeAttr = themeSlug
		? ' data-nce-theme="' + frappe.utils.escape_html(themeSlug) + '"'
		: "";

	const $previews = $container.find(".pp-colours-previews");
	if (!$previews.length) {
		return;
	}

	$previews.html(
		'<div class="pp-colours-theme-scope"' +
			scopeAttr +
			">" +
			_build_colours_preview_table_html(frm) +
			_build_colours_border_table_html(frm) +
			"</div>"
	);
	_bind_colours_tab_pickers(frm, $container);
}

function _colours_other_selected_names($container) {
	const names = [];
	$container.find(".pp-panel-row--selected").each(function () {
		names.push($(this).data("panel-name"));
	});
	return names;
}

function _colours_update_arrow_buttons($container) {
	const selected = _colours_other_selected_names($container);
	const count = selected.length;
	const $from = $container.find(".pp-colours-btn-from");
	const $to = $container.find(".pp-colours-btn-to");

	if (count === 0) {
		$from.prop("disabled", true).attr("aria-hidden", "true");
		$to.prop("disabled", true).attr("aria-hidden", "true");
	} else if (count === 1) {
		$from.prop("disabled", false).attr("aria-hidden", "false");
		$to.prop("disabled", false).attr("aria-hidden", "false");
	} else {
		// multiple selected: hide Copy From, show Copy To
		$from.prop("disabled", true).attr("aria-hidden", "true");
		$to.prop("disabled", false).attr("aria-hidden", "false");
	}
}

function _render_other_panels_table(frm, $container) {
	const $host = $container.find(".pp-colours-other-panels");
	if (!$host.length) return;

	const currentName = frm.doc.name;
	if (!currentName) {
		$host.html('<p class="text-muted small" style="margin:0;">Save this panel first.</p>');
		return;
	}

	frappe.call({
		method: "nce_events.api.panel_api_pkg.panel_data.get_other_page_panels",
		args: { current_panel: currentName },
		callback: function (r) {
			const panels = (r && r.message) || [];
			if (!panels.length) {
				$host.html('<p class="text-muted small" style="margin:0;">No other panels found.</p>');
				return;
			}

			let rows = "";
			panels.forEach(function (p) {
				const themeLabel = p.theme
					? frappe.utils.escape_html(p.theme)
					: '<span class="pp-colours-other-theme">Default</span>';
				rows +=
					`<tr class="pp-colours-other-row" data-panel-name="${frappe.utils.escape_html(p.name)}">` +
					`<td>${frappe.utils.escape_html(p.name)}</td>` +
					`<td>${themeLabel}</td>` +
					`</tr>`;
			});

			const tableHtml =
				`<div class="pp-colours-section-title pp-colours-other-panels-title">${__("Other panels")}</div>` +
				`<table class="table table-bordered pp-colours-chrome-table pp-colours-other-table">` +
				`<thead><tr><th>${__("Panel ID")}</th><th>${__("Theme")}</th></tr></thead>` +
				`<tbody>${rows}</tbody>` +
				`</table>`;

			$host.html(tableHtml);

			$host.off("click", ".pp-colours-other-row").on("click", ".pp-colours-other-row", function (e) {
				const $row = $(this);
				if (e.shiftKey) {
					$row.toggleClass("pp-panel-row--selected");
				} else {
					const wasOnly =
						$row.hasClass("pp-panel-row--selected") &&
						$host.find(".pp-panel-row--selected").length === 1;
					$host.find(".pp-panel-row--selected").removeClass("pp-panel-row--selected");
					if (!wasOnly) {
						$row.addClass("pp-panel-row--selected");
					}
				}
				_colours_update_arrow_buttons($container);
			});

			_bind_copy_arrows(frm, $container);
		},
	});
}

function _bind_copy_arrows(frm, $container) {
	$container.off("click", ".pp-colours-btn-from").on("click", ".pp-colours-btn-from", function () {
		const selected = _colours_other_selected_names($container);
		if (selected.length !== 1) return;
		const sourceName = selected[0];

		frappe.confirm(
			__("Copy all colour settings FROM <b>{0}</b> into this panel? This will overwrite your current settings.", [sourceName]),
			function () {
				frappe.db.get_doc("Page Panel", sourceName).then(function (sourceDoc) {
					const fields = [
						"theme",
						"frame_bg_class", "frame_fg_type",
						"header_bg_class", "header_fg_type",
						"header_toolbar_bg_class", "header_toolbar_fg_type",
						"footer_bg_class", "footer_fg_type",
						"col_header_bg_class", "col_header_fg_type",
						"filter_bar_bg_class", "filter_bar_fg_type",
						"row_bg_class", "row_fg_type",
						"row_alt_bg_class", "row_alt_fg_type",
						"dialog_header_bg_class", "dialog_header_fg_type",
					];
					fields.forEach(function (fn) {
						frm.set_value(fn, sourceDoc[fn] || "");
					});
					_render_colours_tab(frm);
					frappe.show_alert({ message: __("Colours copied from {0}", [sourceName]), indicator: "green" });
				});
			}
		);
	});

	$container.off("click", ".pp-colours-btn-to").on("click", ".pp-colours-btn-to", function () {
		const selected = _colours_other_selected_names($container);
		if (!selected.length) return;

		const label = selected.length === 1
			? __("Copy all colour settings from this panel TO <b>{0}</b>? This will overwrite that panel's settings.", [selected[0]])
			: __("Copy all colour settings from this panel TO {0} other panels? This will overwrite their settings.", [selected.length]);

		frappe.confirm(label, function () {
			frappe.call({
				method: "nce_events.api.panel_api_pkg.panel_data.copy_panel_colours",
				args: {
					source_name: frm.doc.name,
					target_names: JSON.stringify(selected),
				},
				freeze: true,
				freeze_message: __("Copying colour settings…"),
				callback: function (r) {
					const updated = (r && r.message && r.message.updated) || [];
					frappe.show_alert({
						message: updated.length === 1
							? __("Colours copied to {0}", [updated[0]])
							: __("Colours copied to {0} panels", [updated.length]),
						indicator: "green",
					});
				},
			});
		});
	});
}

function _render_colours_tab(frm) {
	const $container = $(frm.layout.wrapper).find(".pp-colours-wrap");
	if (!$container.length) return;

	_ensure_colours_tab_shell(frm, $container);
	_render_colours_tab_previews(frm, null, $container);
	_render_other_panels_table(frm, $container);
}

// ── Page Panel form events ────────────────────────────────────────────────────
frappe.ui.form.on("Page Panel", {
	refresh: function (frm) {
		_ensure_tab_bar(frm);
		_ensure_panel_id_controls(frm);
		_ensure_query_refresh_button(frm);
		_hide_colour_schema_fields(frm);
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

		frm.set_query("theme", function () {
			return { filters: { status: "Active" } };
		});

		if ($(frm.layout.wrapper).data("pp-active-tab") === "colours") {
			_render_colours_tab(frm);
		}
	},

	theme: function (frm) {
		if ($(frm.layout.wrapper).data("pp-active-tab") === "colours") {
			_render_colours_tab(frm);
		}
	},

	root_doctype: function (frm) {
		if (frm.doc.root_doctype) {
			delete _dt_field_cache[frm.doc.root_doctype];
		}
		frm.set_value("column_order", "");
		frm.set_value("bold_fields", "");
		frm.set_value("required_fields", "");
		frm.set_value("read_only_fields", "");
		frm.set_value("gender_column", "");
		frm.set_value("gender_color_fields", "");
		frm.set_value("title_field", "");
		frm.set_value("search_fields", "");
		_render_default_filters(frm);
		if (frm.doc.root_doctype) {
			frappe.call({
				method: "nce_events.api.panel_api_pkg.discovery.get_doctype_fields",
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

	validate: function (frm) {
		if (frm.is_new()) {
			const $inp = $(frm.layout.wrapper).find(".pp-panel-id-bar input.pp-newname-input");
			if ($inp.length) {
				frm.doc.__newname = ($inp.val() || "").trim();
			}
		}
		_prune_empty_format_rules(frm);
	},

	before_save: function (frm) {
		if (typeof frm._pp_sync_display === "function") {
			frm._pp_sync_display();
		}
		_prune_empty_format_rules(frm);
	},

	after_save: function (frm) {
		if (!frm.doc.root_doctype || !frm.doc.name) return;
		frappe.db.get_value("Page Panel", frm.doc.name, "panel_sql").then(function (r) {
			const sql = r && r.message && r.message.panel_sql;
			if (sql != null && sql !== "") {
				frm.set_value("panel_sql", sql);
				frm.refresh_field("panel_sql");
			}
		});
	},
});
