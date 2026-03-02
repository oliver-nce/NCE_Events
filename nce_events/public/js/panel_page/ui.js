frappe.provide("nce_events.panel_page");

nce_events.panel_page.Explorer = class Explorer {
	constructor(page, page_name) {
		this.page = page;
		this.page_name = page_name;
		this.store = new nce_events.panel_page.Store(page_name);
		this.pane_elements = [];
		this.divider_elements = [];
		this.filters = {};
		this._click_timer = null;
		this._card_el = null;
		this._resize = null;
		this._destroyed = false;

		this.setup();
	}

	setup() {
		var me = this;
		me.page.set_title(__("Loading…"));
		me.page.clear_actions();
		me.page.set_secondary_action(__("Close"), function () {
			frappe.set_route("panel-view");
		});

		me.container = $('<div class="panel-explorer"></div>');
		$(me.page.body).empty().append(me.container);

		$(document).on("mousedown.panel_card", function (e) {
			if (
				me._card_el &&
				!$(e.target).closest(".panel-card-popover").length &&
				!$(e.target).closest(".panel-row").length
			) {
				me._hide_card();
			}
		});

		me.store.fetch_config().then(function (config) {
			if (me._destroyed) return;
			me.page.set_title(config.page_title);
			var panels = me.store.get_ordered_panels();
			if (panels.length) {
				me.load_panel(panels[0].panel_number);
			}
		});
	}

	destroy() {
		this._destroyed = true;
		this._hide_card();
		if (this._click_timer) clearTimeout(this._click_timer);
		$(document).off("mousedown.panel_card");
		if (this.container) this.container.remove();
	}

	// ── Field helpers ──

	_strip_prefix(name) {
		if (!name) return "";
		var trimmed = name.trim();
		var dot = trimmed.lastIndexOf(".");
		return dot >= 0 ? trimmed.substring(dot + 1) : trimmed;
	}

	_field_set(field_list) {
		var me = this;
		var set = {};
		if (!field_list || !field_list.length) return set;
		field_list.forEach(function (f) {
			set[me._strip_prefix(f).toLowerCase()] = true;
		});
		return set;
	}

	_visible_columns(all_columns, hidden_fields) {
		var hidden = this._field_set(hidden_fields);
		return all_columns.filter(function (c) {
			return !hidden[c.toLowerCase()];
		});
	}

	_format_header(col_name) {
		if (col_name.indexOf("_") >= 0) {
			return col_name
				.replace(/_/g, " ")
				.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
		}
		if (col_name === col_name.toLowerCase()) {
			return col_name.charAt(0).toUpperCase() + col_name.slice(1);
		}
		return col_name;
	}

	_is_html_field(col_name) {
		return col_name.toLowerCase().indexOf("html") >= 0;
	}

	_is_link_field(col_name) {
		var lower = col_name.toLowerCase();
		return lower.indexOf("link") >= 0 || lower.indexOf("url") >= 0;
	}

	_looks_like_date(value) {
		return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
	}

	_has_family_tables(config) {
		if (!config || !config.sql_query) return false;
		var sql = config.sql_query.toLowerCase();
		return sql.indexOf("tabfamilies") >= 0 || sql.indexOf("tabfamily members") >= 0;
	}

	// ── Panel loading ──

	load_panel(panel_number) {
		var me = this;
		me.ensure_pane_element(panel_number);
		me.show_pane_loading(panel_number);
		me.filters[panel_number] = {};

		me.store.fetch_panel(panel_number, false).then(function () {
			if (me._destroyed) return;
			me.render_pane(panel_number);
		});
	}

	// ── Pane DOM ──

	ensure_pane_element(panel_number) {
		var idx = this._pane_index(panel_number);
		if (idx >= 0) return;

		if (this.pane_elements.length > 0) {
			var divider = this._create_divider(this.pane_elements.length - 1);
			this.container.append(divider);
			this.divider_elements.push(divider);
		}

		var el = $(
			'<div class="panel-pane" data-panel="' + panel_number + '">' +
				'<div class="panel-pane-header"></div>' +
				'<div class="panel-pane-body"></div>' +
			"</div>"
		);
		this.container.append(el);
		this.pane_elements.push({ panel_number: panel_number, el: el });
		this._distribute_widths();
	}

	remove_panes_after(panel_number) {
		var cutoff = this._pane_index(panel_number);
		if (cutoff < 0) return;

		while (this.pane_elements.length > cutoff + 1) {
			this.pane_elements.pop().el.remove();
			if (this.divider_elements.length >= this.pane_elements.length) {
				this.divider_elements.pop().remove();
			}
		}
		this._distribute_widths();
	}

	_pane_index(panel_number) {
		for (var i = 0; i < this.pane_elements.length; i++) {
			if (this.pane_elements[i].panel_number === panel_number) return i;
		}
		return -1;
	}

	show_pane_loading(panel_number) {
		var idx = this._pane_index(panel_number);
		if (idx < 0) return;
		this.pane_elements[idx].el.find(".panel-pane-body").html(
			'<div class="panel-loading">' + __("Loading…") + "</div>"
		);
	}

	// ── Filtering ──

	_get_unique_values(panel_number, col_name) {
		var state = this.store.get_pane_state(panel_number);
		if (!state) return [];
		var seen = {};
		var vals = [];
		state.rows.forEach(function (row) {
			var v = row[col_name];
			if (v !== null && v !== undefined && v !== "" && !seen[v]) {
				seen[v] = true;
				vals.push(v);
			}
		});
		vals.sort();
		return vals;
	}

	_get_filtered_rows(panel_number) {
		var me = this;
		var state = me.store.get_pane_state(panel_number);
		if (!state) return [];

		var active = me.filters[panel_number] || {};
		var keys = Object.keys(active);
		if (!keys.length) return state.rows;

		return state.rows.filter(function (row) {
			return keys.every(function (k) {
				return String(row[k]) === active[k];
			});
		});
	}

	// ── Header rendering ──

	_render_header(panel_number) {
		var me = this;
		var idx = me._pane_index(panel_number);
		if (idx < 0) return;

		var config = me.store.get_panel_config(panel_number);
		var state = me.store.get_pane_state(panel_number);
		if (!config || !state) return;

		var label = config.header_text || "Panel " + panel_number;
		var filtered_rows = me._get_filtered_rows(panel_number);

		var html = '<div class="pane-title-row">';
		html += '<span class="pane-label">' + frappe.utils.escape_html(label) + "</span>";
		html += '<span class="pane-title-right">';

		html += '<button class="btn btn-xs btn-default pane-header-btn pane-sheets-btn" title="Export to Sheets">';
		html += '<i class="fa fa-table"></i></button>';

		if (me._has_family_tables(config)) {
			html += '<button class="btn btn-xs btn-default pane-header-btn pane-sms-btn" title="Send SMS">';
			html += '<i class="fa fa-comment"></i></button>';
			html += '<button class="btn btn-xs btn-default pane-header-btn pane-email-btn" title="Send Email">';
			html += '<i class="fa fa-envelope"></i></button>';
		}

		html += '<span class="pane-count">';
		if (filtered_rows.length !== state.total) {
			html += filtered_rows.length + " / " + state.total;
		} else {
			html += state.total;
		}
		html += " records</span>";
		html += "</span></div>";

		if (config.filter_fields && config.filter_fields.length) {
			html += '<div class="pane-filter-row">';
			config.filter_fields.forEach(function (f) {
				var col = me._strip_prefix(f);
				var vals = me._get_unique_values(panel_number, col);
				var current = (me.filters[panel_number] || {})[col] || "";

				html += '<select class="pane-filter" data-field="' + frappe.utils.escape_html(col) + '">';
				html += '<option value="">' + frappe.utils.escape_html(me._format_header(col)) + ": All</option>";
				vals.forEach(function (v) {
					var sel = String(v) === current ? " selected" : "";
					html += '<option value="' + frappe.utils.escape_html(String(v)) + '"' + sel + ">";
					html += frappe.utils.escape_html(String(v)) + "</option>";
				});
				html += "</select>";
			});
			html += "</div>";
		}

		var header_el = me.pane_elements[idx].el.find(".panel-pane-header");
		header_el.html(html);

		header_el.find(".pane-filter").on("change", function () {
			var field = $(this).data("field");
			var val = $(this).val();
			if (!me.filters[panel_number]) me.filters[panel_number] = {};
			if (val) {
				me.filters[panel_number][field] = val;
			} else {
				delete me.filters[panel_number][field];
			}
			me.render_pane(panel_number);
		});

		header_el.find(".pane-sheets-btn").on("click", function () {
			frappe.show_alert({ message: __("Sheets export — coming soon"), indicator: "blue" });
		});
		header_el.find(".pane-sms-btn").on("click", function () {
			frappe.show_alert({ message: __("SMS — coming soon"), indicator: "blue" });
		});
		header_el.find(".pane-email-btn").on("click", function () {
			frappe.show_alert({ message: __("Email — coming soon"), indicator: "blue" });
		});
	}

	// ── Table rendering ──

	render_pane(panel_number) {
		var me = this;
		var idx = me._pane_index(panel_number);
		if (idx < 0) return;

		var config = me.store.get_panel_config(panel_number);
		var state = me.store.get_pane_state(panel_number);
		if (!config || !state) return;

		me._hide_card();
		me._render_header(panel_number);

		var el = me.pane_elements[idx].el;
		var rows = me._get_filtered_rows(panel_number);
		var visible_cols = me._visible_columns(state.columns, config.hidden_fields);
		var bold_set = me._field_set(config.bold_fields);

		var male_hex = me.store.config.male_hex;
		var female_hex = me.store.config.female_hex;
		var male_field = config.male_field || null;
		var female_field = config.female_field || null;
		var use_gender = !!((male_field || female_field) && (male_hex || female_hex));

		var html = me._build_table(panel_number, visible_cols, rows, state, bold_set, male_field, female_field, male_hex, female_hex, use_gender);

		if (me.store.has_more(panel_number)) {
			html +=
				'<div class="panel-load-more">' +
				'<button class="btn btn-xs btn-default load-more-btn">' +
				__("Load More") + "</button></div>";
		}

		el.find(".panel-pane-body").html(html);
		me._bind_pane_events(panel_number, el);
	}

	_build_table(panel_number, visible_cols, rows, state, bold_set, male_field, female_field, male_hex, female_hex, use_gender) {
		var me = this;
		var id_col = state.columns[0];
		var selected_row = me.store.get_selected(panel_number);

		var html = '<table class="panel-table"><thead><tr>';
		if (use_gender) {
			html += '<th class="gender-indicator-th"></th>';
		}
		visible_cols.forEach(function (col) {
			var cls = bold_set[col.toLowerCase()] ? ' class="bold-col"' : "";
			html += "<th" + cls + ">" + frappe.utils.escape_html(me._format_header(col)) + "</th>";
		});
		html += "</tr></thead><tbody>";

		rows.forEach(function (row, row_idx) {
			var is_selected = selected_row && row[id_col] === selected_row[id_col];
			var gender_color = "";
			if (use_gender) {
				if (male_field && row[male_field] && male_hex) gender_color = male_hex;
				else if (female_field && row[female_field] && female_hex) gender_color = female_hex;
			}

			html +=
				'<tr class="panel-row' +
				(is_selected ? " selected" : "") +
				(row_idx % 2 === 1 ? " alt" : "") +
				'" data-row-idx="' + row_idx + '">';

			if (use_gender) {
				html += '<td class="gender-indicator"' +
					(gender_color ? ' style="background:' + gender_color + '"' : "") +
					"></td>";
			}

			visible_cols.forEach(function (col) {
				var value = row[col];
				if (value === null || value === undefined) value = "";
				var is_bold = bold_set[col.toLowerCase()];

				if (me._looks_like_date(value)) {
					value = frappe.datetime.str_to_user(value);
				}

				html += "<td" + (is_bold ? ' class="bold-cell"' : "") + ">";
				html += frappe.utils.escape_html(String(value));
				html += "</td>";
			});

			html += "</tr>";
		});

		html += "</tbody></table>";
		return html;
	}

	// ── Card popover ──

	_show_card(panel_number, row_data, target_el) {
		var me = this;
		me._hide_card();

		var config = me.store.get_panel_config(panel_number);
		if (!config || !config.card_fields || !config.card_fields.length) return;

		var card = $('<div class="panel-card-popover"></div>');

		config.card_fields.forEach(function (f) {
			var col = me._strip_prefix(f);
			var value = row_data[col];
			if (value === null || value === undefined) value = "";

			var label = me._format_header(col);
			var field_div = $('<div class="card-field"></div>');
			field_div.append(
				'<div class="card-field-label">' + frappe.utils.escape_html(label) + "</div>"
			);

			if (me._is_html_field(col)) {
				field_div.append('<div class="card-field-value card-html">' + value + "</div>");
			} else if (me._is_link_field(col) && value) {
				var url = String(value);
				if (url.indexOf("http") !== 0) url = "https://" + url;
				field_div.append(
					'<div class="card-field-value"><a href="' +
					frappe.utils.escape_html(url) +
					'" target="_blank">' +
					frappe.utils.escape_html(String(value)) +
					"</a></div>"
				);
			} else {
				field_div.append(
					'<div class="card-field-value">' +
					frappe.utils.escape_html(String(value)) +
					"</div>"
				);
			}
			card.append(field_div);
		});

		if (config.button_1_name || config.button_2_name) {
			var btn_row = $('<div class="card-buttons"></div>');
			if (config.button_1_name) {
				var b1 = $('<button class="btn btn-xs btn-primary card-action-btn">' +
					frappe.utils.escape_html(config.button_1_name) + "</button>");
				b1.on("click", function () {
					frappe.show_alert({
						message: config.button_1_name + " — coming soon",
						indicator: "blue",
					});
				});
				btn_row.append(b1);
			}
			if (config.button_2_name) {
				var b2 = $('<button class="btn btn-xs btn-default card-action-btn">' +
					frappe.utils.escape_html(config.button_2_name) + "</button>");
				b2.on("click", function () {
					frappe.show_alert({
						message: config.button_2_name + " — coming soon",
						indicator: "blue",
					});
				});
				btn_row.append(b2);
			}
			card.append(btn_row);
		}

		var idx = me._pane_index(panel_number);
		var pane_body = me.pane_elements[idx].el.find(".panel-pane-body");
		pane_body.css("position", "relative");
		card.appendTo(pane_body);

		var row_pos = target_el.position();
		var card_top = row_pos.top + target_el.outerHeight();
		var body_height = pane_body.innerHeight();
		var card_height = card.outerHeight();

		if (card_top + card_height > body_height) {
			card_top = Math.max(0, row_pos.top - card_height);
		}

		card.css({ top: card_top + "px" });

		me._card_el = card;
		me._card_panel = panel_number;
	}

	_hide_card() {
		if (this._card_el) {
			this._card_el.remove();
			this._card_el = null;
			this._card_panel = null;
		}
	}

	// ── Event binding ──

	_bind_pane_events(panel_number, el) {
		var me = this;

		el.find(".panel-row").on("click", function () {
			var row_idx = parseInt($(this).data("row-idx"), 10);
			var row_el = $(this);

			if (me._click_timer) {
				clearTimeout(me._click_timer);
				me._click_timer = null;
				return;
			}

			me._click_timer = setTimeout(function () {
				me._click_timer = null;
				me._on_row_click(panel_number, row_idx, row_el);
			}, 250);
		});

		el.find(".panel-row").on("dblclick", function () {
			if (me._click_timer) {
				clearTimeout(me._click_timer);
				me._click_timer = null;
			}
			var row_idx = parseInt($(this).data("row-idx"), 10);
			me._on_row_dblclick(panel_number, row_idx);
		});

		el.find(".load-more-btn").on("click", function () {
			me._on_load_more(panel_number);
		});
	}

	_on_row_click(panel_number, row_idx, row_el) {
		var rows = this._get_filtered_rows(panel_number);
		var row_data = rows[row_idx];
		if (!row_data) return;
		this._show_card(panel_number, row_data, row_el);
	}

	_on_row_dblclick(panel_number, row_idx) {
		var me = this;
		me._hide_card();

		var rows = me._get_filtered_rows(panel_number);
		var row_data = rows[row_idx];
		if (!row_data) return;

		me.store.select_row(panel_number, row_data);

		var idx = me._pane_index(panel_number);
		if (idx >= 0) {
			var el = me.pane_elements[idx].el;
			el.find(".panel-row").removeClass("selected");
			el.find('.panel-row[data-row-idx="' + row_idx + '"]').addClass("selected");
		}

		var ordered = me.store.get_ordered_panels();
		var next_panel = null;
		for (var i = 0; i < ordered.length; i++) {
			if (ordered[i].panel_number === panel_number && i + 1 < ordered.length) {
				next_panel = ordered[i + 1].panel_number;
				break;
			}
		}

		me.remove_panes_after(panel_number);
		if (next_panel !== null) {
			me.load_panel(next_panel);
		}
	}

	_on_load_more(panel_number) {
		var me = this;
		me.store.fetch_panel(panel_number, true).then(function () {
			if (me._destroyed) return;
			me.render_pane(panel_number);
		});
	}

	// ── Drag-resize ──

	_create_divider(index) {
		var me = this;
		var divider = $('<div class="panel-divider" data-divider="' + index + '"></div>');

		divider.on("mousedown", function (e) {
			me._start_resize(e, index);
		});
		divider.on("touchstart", function (e) {
			e.preventDefault();
			me._start_resize(e.originalEvent.touches[0], index);
		});

		return divider;
	}

	_start_resize(e, divider_index) {
		var me = this;
		var left_el = me.pane_elements[divider_index].el;
		var right_el = me.pane_elements[divider_index + 1].el;

		me._resize = {
			divider_index: divider_index,
			start_x: e.clientX || e.pageX,
			left_el: left_el,
			right_el: right_el,
			left_start_w: left_el.outerWidth(),
			right_start_w: right_el.outerWidth(),
		};

		me.divider_elements[divider_index].addClass("active");
		$("body").addClass("panel-resizing");

		var on_move = function (evt) {
			var cx = evt.clientX || (evt.touches && evt.touches[0].clientX) || 0;
			requestAnimationFrame(function () { me._do_resize(cx); });
		};
		var on_up = function () {
			me.divider_elements[divider_index].removeClass("active");
			$("body").removeClass("panel-resizing");
			$(document).off("mousemove.presize touchmove.presize");
			$(document).off("mouseup.presize touchend.presize");
			me._resize = null;
		};

		$(document).on("mousemove.presize touchmove.presize", on_move);
		$(document).on("mouseup.presize touchend.presize", on_up);
	}

	_do_resize(client_x) {
		if (!this._resize) return;
		var r = this._resize;
		var delta = client_x - r.start_x;
		var min_w = 200;

		var new_left = Math.max(min_w, r.left_start_w + delta);
		var new_right = Math.max(min_w, r.right_start_w - delta);
		if (new_left < min_w || new_right < min_w) return;

		r.left_el.css({ "flex-basis": new_left + "px", "flex-grow": 0 });
		r.right_el.css({ "flex-basis": new_right + "px", "flex-grow": 0 });
	}

	_distribute_widths() {
		var count = this.pane_elements.length;
		this.pane_elements.forEach(function (p) {
			p.el.css({ "flex-basis": (100 / count) + "%", "flex-grow": 1 });
		});
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// ExplorerV2 — v2 renderer using Page Definition + Query Reports
// ─────────────────────────────────────────────────────────────────────────────

nce_events.panel_page.ExplorerV2 = class ExplorerV2 {
	constructor(page, page_name) {
		this.page = page;
		this.page_name = page_name;
		this.store = new nce_events.panel_page.StoreV2(page_name);
		this.pane_elements = [];
		this.divider_elements = [];
		// filters[panel_number] = [{field, op, value}, ...]
		this.filters = {};
		this._click_timer = null;
		this._card_el = null;
		this._resize = null;
		this._destroyed = false;
		this.setup();
	}

	setup() {
		var me = this;
		me.page.set_title(__("Loading\u2026"));
		me.page.clear_actions();
		me.page.set_secondary_action(__("Close"), function () {
			frappe.set_route("page-view");
		});

		me.container = $('<div class="panel-explorer"></div>');
		$(me.page.body).empty().append(me.container);

		$(document).on("mousedown.panel_card_v2", function (e) {
			if (
				me._card_el &&
				!$(e.target).closest(".panel-card-popover").length &&
				!$(e.target).closest(".panel-row").length
			) {
				me._hide_card();
			}
		});

		console.time("[v2] full page load");
		me.store.fetch_config().then(function (config) {
			if (me._destroyed) return;
			me.page.set_title(config.page_title);
			var panels = me.store.get_ordered_panels();
			if (panels.length) {
				me.load_panel(panels[0].panel_number);
			}
		});
	}

	destroy() {
		this._destroyed = true;
		this._hide_card();
		if (this._click_timer) clearTimeout(this._click_timer);
		$(document).off("mousedown.panel_card_v2");
		if (this.container) this.container.remove();
	}

	// ── Column helpers ──

	// col is {fieldname, label}
	_visible_columns(all_columns, hidden_fields) {
		if (!hidden_fields || !hidden_fields.length) return all_columns;
		var hidden = {};
		hidden_fields.forEach(function (f) {
			hidden[f.trim().toLowerCase()] = true;
		});
		return all_columns.filter(function (col) {
			return !hidden[col.fieldname.toLowerCase()];
		});
	}

	_field_set(field_list) {
		var set = {};
		if (!field_list || !field_list.length) return set;
		field_list.forEach(function (f) {
			set[f.trim().toLowerCase()] = true;
		});
		return set;
	}

	_is_html_field(fieldname) {
		return fieldname.toLowerCase().indexOf("html") >= 0;
	}

	_is_link_field(fieldname) {
		var lower = fieldname.toLowerCase();
		return lower.indexOf("link") >= 0 || lower.indexOf("url") >= 0;
	}

	_looks_like_date(value) {
		return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
	}

	// ── Panel loading ──

	load_panel(panel_number) {
		var me = this;
		me.ensure_pane_element(panel_number);
		me.show_pane_loading(panel_number);
		me.filters[panel_number] = [];

		me.store.fetch_panel(panel_number, false).then(function () {
			if (me._destroyed) return;
			console.time("[v2] render_pane " + panel_number);
			me.render_pane(panel_number);
			console.timeEnd("[v2] render_pane " + panel_number);
			console.timeEnd("[v2] full page load");
		});
	}

	// ── Pane DOM ──

	ensure_pane_element(panel_number) {
		if (this._pane_index(panel_number) >= 0) return;
		if (this.pane_elements.length > 0) {
			var divider = this._create_divider(this.pane_elements.length - 1);
			this.container.append(divider);
			this.divider_elements.push(divider);
		}
		var el = $(
			'<div class="panel-pane" data-panel="' + panel_number + '">' +
				'<div class="panel-pane-header"></div>' +
				'<div class="panel-pane-body"></div>' +
			"</div>"
		);
		this.container.append(el);
		this.pane_elements.push({ panel_number: panel_number, el: el });
		this._distribute_widths();
	}

	remove_panes_after(panel_number) {
		var cutoff = this._pane_index(panel_number);
		if (cutoff < 0) return;
		while (this.pane_elements.length > cutoff + 1) {
			this.pane_elements.pop().el.remove();
			if (this.divider_elements.length >= this.pane_elements.length) {
				this.divider_elements.pop().remove();
			}
		}
		this._distribute_widths();
	}

	_pane_index(panel_number) {
		for (var i = 0; i < this.pane_elements.length; i++) {
			if (this.pane_elements[i].panel_number === panel_number) return i;
		}
		return -1;
	}

	show_pane_loading(panel_number) {
		var idx = this._pane_index(panel_number);
		if (idx < 0) return;
		this.pane_elements[idx].el.find(".panel-pane-body").html(
			'<div class="panel-loading">' + __("Loading\u2026") + "</div>"
		);
	}

	// ── Filter (Navicat-style) ──

	_get_filtered_rows(panel_number) {
		var state = this.store.get_pane_state(panel_number);
		if (!state) return [];
		var conditions = this.filters[panel_number] || [];
		var active = conditions.filter(function (c) {
			return c.field && c.value !== "";
		});
		if (!active.length) return state.rows;
		return state.rows.filter(function (row) {
			return active.every(function (c) {
				var cell = String(row[c.field] === null || row[c.field] === undefined ? "" : row[c.field]);
				switch (c.op) {
				case "=":    return cell === c.value;
				case "!=":   return cell !== c.value;
				case ">":    return parseFloat(cell) > parseFloat(c.value);
				case "<":    return parseFloat(cell) < parseFloat(c.value);
				case "like": return cell.toLowerCase().indexOf(c.value.toLowerCase()) >= 0;
				case "in":   return c.value.split(",").map(function (v) { return v.trim(); }).indexOf(cell) >= 0;
				default:     return true;
				}
			});
		});
	}

	_render_filter_widget(panel_number, header_el) {
		var me = this;
		var state = me.store.get_pane_state(panel_number);
		if (!state) return;

		var conditions = me.filters[panel_number] || [];
		var ops = ["=", "!=", ">", "<", "like", "in"];

		var widget = $('<div class="pane-filter-widget"></div>');

		conditions.forEach(function (cond, i) {
			var row = $('<div class="filter-condition-row"></div>');

			// Column select
			var col_sel = $('<select class="filter-col-select"></select>');
			col_sel.append('<option value="">— column —</option>');
			state.columns.forEach(function (col) {
				var opt = $("<option></option>").val(col.fieldname).text(col.label);
				if (col.fieldname === cond.field) opt.prop("selected", true);
				col_sel.append(opt);
			});

			// Operator select
			var op_sel = $('<select class="filter-op-select"></select>');
			ops.forEach(function (op) {
				var opt = $("<option></option>").val(op).text(op);
				if (op === cond.op) opt.prop("selected", true);
				op_sel.append(opt);
			});

			// Value input
			var val_inp = $('<input class="filter-val-input" type="text" placeholder="value">').val(cond.value);

			// Remove button
			var rm_btn = $('<button class="btn btn-xs filter-remove-btn" title="Remove">&times;</button>');
			rm_btn.on("click", function () {
				conditions.splice(i, 1);
				me._re_render_filter(panel_number, header_el);
				me.render_pane(panel_number);
			});

			col_sel.on("change", function () {
				conditions[i].field = $(this).val();
				me.render_pane(panel_number);
			});
			op_sel.on("change", function () {
				conditions[i].op = $(this).val();
				me.render_pane(panel_number);
			});
			val_inp.on("input", function () {
				conditions[i].value = $(this).val();
				me.render_pane(panel_number);
			});

			row.append(col_sel, op_sel, val_inp, rm_btn);
			widget.append(row);
		});

		var add_btn = $('<button class="btn btn-xs btn-default filter-add-btn">+ Add Filter</button>');
		add_btn.on("click", function () {
			conditions.push({ field: "", op: "=", value: "" });
			me._re_render_filter(panel_number, header_el);
		});
		widget.append(add_btn);

		header_el.find(".pane-filter-widget").remove();
		header_el.append(widget);
	}

	_re_render_filter(panel_number, header_el) {
		this._render_filter_widget(panel_number, header_el);
	}

	// ── Header rendering ──

	_render_header(panel_number) {
		var me = this;
		var idx = me._pane_index(panel_number);
		if (idx < 0) return;

		var config = me.store.get_panel_config(panel_number);
		var state = me.store.get_pane_state(panel_number);
		if (!config || !state) return;

		var label = config.header_text || "Panel " + panel_number;
		var filtered_rows = me._get_filtered_rows(panel_number);

		var html = '<div class="pane-title-row">';
		html += '<span class="pane-label">' + frappe.utils.escape_html(label) + "</span>";
		html += '<span class="pane-title-right">';

		if (config.show_filter) {
			html += '<button class="btn btn-xs btn-default pane-header-btn pane-filter-toggle-btn" title="Filter">';
			html += '<i class="fa fa-filter"></i></button>';
		}
		if (config.show_sheets) {
			html += '<button class="btn btn-xs btn-default pane-header-btn pane-sheets-btn" title="Export to Sheets">';
			html += '<i class="fa fa-table"></i></button>';
		}
		if (config.show_email) {
			html += '<button class="btn btn-xs btn-default pane-header-btn pane-email-btn" title="Send Email">';
			html += '<i class="fa fa-envelope"></i></button>';
		}
		if (config.show_sms) {
			html += '<button class="btn btn-xs btn-default pane-header-btn pane-sms-btn" title="Send SMS">';
			html += '<i class="fa fa-comment"></i></button>';
		}

		html += '<span class="pane-count">';
		if (filtered_rows.length !== state.total) {
			html += filtered_rows.length + " / " + state.total;
		} else {
			html += state.total;
		}
		html += " records</span>";
		html += "</span></div>";

		var header_el = me.pane_elements[idx].el.find(".panel-pane-header");
		header_el.html(html);

		if (config.show_filter) {
			var filter_open = (me.filters[panel_number] || []).length > 0;
			if (filter_open) {
				me._render_filter_widget(panel_number, header_el);
			}
			header_el.find(".pane-filter-toggle-btn").on("click", function () {
				var widget = header_el.find(".pane-filter-widget");
				if (widget.length) {
					widget.remove();
				} else {
					me._render_filter_widget(panel_number, header_el);
				}
			});
		}

		header_el.find(".pane-sheets-btn").on("click", function () {
			frappe.show_alert({ message: __("Sheets export \u2014 coming soon"), indicator: "blue" });
		});
		header_el.find(".pane-email-btn").on("click", function () {
			frappe.show_alert({ message: __("Email \u2014 coming soon"), indicator: "blue" });
		});
		header_el.find(".pane-sms-btn").on("click", function () {
			frappe.show_alert({ message: __("SMS \u2014 coming soon"), indicator: "blue" });
		});
	}

	// ── Table rendering ──

	render_pane(panel_number) {
		var me = this;
		var idx = me._pane_index(panel_number);
		if (idx < 0) return;

		var config = me.store.get_panel_config(panel_number);
		var state = me.store.get_pane_state(panel_number);
		if (!config || !state) return;

		me._hide_card();
		me._render_header(panel_number);

		var el = me.pane_elements[idx].el;
		var rows = me._get_filtered_rows(panel_number);
		var visible_cols = me._visible_columns(state.columns, config.hidden_fields);
		var bold_set = me._field_set(config.bold_fields);

		var male_hex = (me.store.config.male_hex || "").trim();
		var female_hex = (me.store.config.female_hex || "").trim();
		if (male_hex && male_hex[0] !== "#") male_hex = "#" + male_hex;
		if (female_hex && female_hex[0] !== "#") female_hex = "#" + female_hex;
		var male_field  = (config.male_field  || "").trim().toLowerCase();
		var female_field = (config.female_field || "").trim().toLowerCase();

		var id_col = state.columns.length ? state.columns[0].fieldname : null;
		var selected_row = me.store.get_selected(panel_number);

		var html = '<table class="panel-table"><thead><tr>';
		visible_cols.forEach(function (col) {
			var fn = col.fieldname.toLowerCase();
			var extra = bold_set[fn] ? ' style="font-weight:700;"' : "";
			html += "<th" + extra + ">" + frappe.utils.escape_html(col.label) + "</th>";
		});
		html += "</tr></thead><tbody>";

		rows.forEach(function (row, row_idx) {
			var is_selected = selected_row && id_col && row[id_col] === selected_row[id_col];

			html += '<tr class="panel-row' +
				(is_selected ? " selected" : "") +
				(row_idx % 2 === 1 ? " alt" : "") +
				'" data-row-idx="' + row_idx + '">';

			visible_cols.forEach(function (col) {
				var fn = col.fieldname.toLowerCase();
				// Row keys may be original-case — try both
				var value = row[col.fieldname];
				if (value === null || value === undefined) value = row[fn];
				if (value === null || value === undefined) value = "";
				if (me._looks_like_date(value)) value = frappe.datetime.str_to_user(value);

				var style = "";
				if (male_field && fn === male_field && male_hex) {
					style = ' style="font-weight:700;color:' + male_hex + ';"';
				} else if (female_field && fn === female_field && female_hex) {
					style = ' style="font-weight:700;color:' + female_hex + ';"';
				} else if (bold_set[fn]) {
					style = ' style="font-weight:700;"';
				}

				html += "<td" + style + ">";
				html += frappe.utils.escape_html(String(value));
				html += "</td>";
			});

			html += "</tr>";
		});

		html += "</tbody></table>";

		if (me.store.has_more(panel_number)) {
			html += '<div class="panel-load-more">' +
				'<button class="btn btn-xs btn-default load-more-btn">' +
				__("Load More") + "</button></div>";
		}

		el.find(".panel-pane-body").html(html);
		me._bind_pane_events(panel_number, el);

		// Re-render filter widget if it was open (re-render_pane closes it)
		if (config.show_filter && (me.filters[panel_number] || []).length > 0) {
			var header_el = me.pane_elements[idx].el.find(".panel-pane-header");
			me._render_filter_widget(panel_number, header_el);
		}
	}

	// ── Card popover ──

	_show_card(panel_number, row_data, target_el) {
		var me = this;
		me._hide_card();

		var config = me.store.get_panel_config(panel_number);
		var state = me.store.get_pane_state(panel_number);
		if (!config || !config.card_fields || !config.card_fields.length) return;

		// Build label map from columns
		var label_map = {};
		(state.columns || []).forEach(function (col) {
			label_map[col.fieldname] = col.label;
		});

		var card = $('<div class="panel-card-popover"></div>');

		config.card_fields.forEach(function (fieldname) {
			var fn = fieldname.trim();
			var value = row_data[fn];
			if (value === null || value === undefined) value = "";
			var label = label_map[fn] || fn.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });

			var field_div = $('<div class="card-field"></div>');
			field_div.append('<div class="card-field-label">' + frappe.utils.escape_html(label) + "</div>");

			if (me._is_html_field(fn)) {
				field_div.append('<div class="card-field-value card-html">' + value + "</div>");
			} else if (me._is_link_field(fn) && value) {
				var url = String(value);
				if (url.indexOf("http") !== 0) url = "https://" + url;
				field_div.append(
					'<div class="card-field-value"><a href="' +
					frappe.utils.escape_html(url) +
					'" target="_blank">' +
					frappe.utils.escape_html(String(value)) +
					"</a></div>"
				);
			} else {
				field_div.append(
					'<div class="card-field-value">' +
					frappe.utils.escape_html(String(value)) +
					"</div>"
				);
			}
			card.append(field_div);
		});

		if (config.button_1_name || config.button_2_name) {
			var btn_row = $('<div class="card-buttons"></div>');
			if (config.button_1_name) {
				var b1 = $('<button class="btn btn-xs btn-primary card-action-btn">' +
					frappe.utils.escape_html(config.button_1_name) + "</button>");
				b1.on("click", function () {
					frappe.show_alert({ message: config.button_1_name + " \u2014 coming soon", indicator: "blue" });
				});
				btn_row.append(b1);
			}
			if (config.button_2_name) {
				var b2 = $('<button class="btn btn-xs btn-default card-action-btn">' +
					frappe.utils.escape_html(config.button_2_name) + "</button>");
				b2.on("click", function () {
					frappe.show_alert({ message: config.button_2_name + " \u2014 coming soon", indicator: "blue" });
				});
				btn_row.append(b2);
			}
			card.append(btn_row);
		}

		var idx = me._pane_index(panel_number);
		var pane_body = me.pane_elements[idx].el.find(".panel-pane-body");
		pane_body.css("position", "relative");
		card.appendTo(pane_body);

		var row_pos = target_el.position();
		var card_top = row_pos.top + target_el.outerHeight();
		var body_height = pane_body.innerHeight();
		if (card_top + card.outerHeight() > body_height) {
			card_top = Math.max(0, row_pos.top - card.outerHeight());
		}
		card.css({ top: card_top + "px" });

		me._card_el = card;
		me._card_panel = panel_number;
	}

	_hide_card() {
		if (this._card_el) {
			this._card_el.remove();
			this._card_el = null;
			this._card_panel = null;
		}
	}

	// ── Event binding ──

	_bind_pane_events(panel_number, el) {
		var me = this;

		el.find(".panel-row").on("click", function () {
			var row_idx = parseInt($(this).data("row-idx"), 10);
			var row_el = $(this);
			if (me._click_timer) {
				clearTimeout(me._click_timer);
				me._click_timer = null;
				return;
			}
			me._click_timer = setTimeout(function () {
				me._click_timer = null;
				var rows = me._get_filtered_rows(panel_number);
				var row_data = rows[row_idx];
				if (row_data) me._show_card(panel_number, row_data, row_el);
			}, 250);
		});

		el.find(".panel-row").on("dblclick", function () {
			if (me._click_timer) {
				clearTimeout(me._click_timer);
				me._click_timer = null;
			}
			var row_idx = parseInt($(this).data("row-idx"), 10);
			var rows = me._get_filtered_rows(panel_number);
			var row_data = rows[row_idx];
			if (!row_data) return;

			me._hide_card();
			me.store.select_row(panel_number, row_data);

			var idx = me._pane_index(panel_number);
			if (idx >= 0) {
				me.pane_elements[idx].el.find(".panel-row").removeClass("selected");
				me.pane_elements[idx].el.find('.panel-row[data-row-idx="' + row_idx + '"]').addClass("selected");
			}

			var ordered = me.store.get_ordered_panels();
			var next_panel = null;
			for (var i = 0; i < ordered.length; i++) {
				if (ordered[i].panel_number === panel_number && i + 1 < ordered.length) {
					next_panel = ordered[i + 1].panel_number;
					break;
				}
			}
			me.remove_panes_after(panel_number);
			if (next_panel !== null) me.load_panel(next_panel);
		});

		el.find(".load-more-btn").on("click", function () {
			me.store.fetch_panel(panel_number, true).then(function () {
				if (me._destroyed) return;
				me.render_pane(panel_number);
			});
		});
	}

	// ── Drag-resize (identical to v1) ──

	_create_divider(index) {
		var me = this;
		var divider = $('<div class="panel-divider" data-divider="' + index + '"></div>');
		divider.on("mousedown", function (e) { me._start_resize(e, index); });
		divider.on("touchstart", function (e) {
			e.preventDefault();
			me._start_resize(e.originalEvent.touches[0], index);
		});
		return divider;
	}

	_start_resize(e, divider_index) {
		var me = this;
		var left_el = me.pane_elements[divider_index].el;
		var right_el = me.pane_elements[divider_index + 1].el;
		me._resize = {
			divider_index: divider_index,
			start_x: e.clientX || e.pageX,
			left_el: left_el,
			right_el: right_el,
			left_start_w: left_el.outerWidth(),
			right_start_w: right_el.outerWidth(),
		};
		me.divider_elements[divider_index].addClass("active");
		$("body").addClass("panel-resizing");
		var on_move = function (evt) {
			var cx = evt.clientX || (evt.touches && evt.touches[0].clientX) || 0;
			requestAnimationFrame(function () { me._do_resize(cx); });
		};
		var on_up = function () {
			me.divider_elements[divider_index].removeClass("active");
			$("body").removeClass("panel-resizing");
			$(document).off("mousemove.presize2 touchmove.presize2");
			$(document).off("mouseup.presize2 touchend.presize2");
			me._resize = null;
		};
		$(document).on("mousemove.presize2 touchmove.presize2", on_move);
		$(document).on("mouseup.presize2 touchend.presize2", on_up);
	}

	_do_resize(client_x) {
		if (!this._resize) return;
		var r = this._resize;
		var delta = client_x - r.start_x;
		var min_w = 200;
		var new_left = Math.max(min_w, r.left_start_w + delta);
		var new_right = Math.max(min_w, r.right_start_w - delta);
		if (new_left < min_w || new_right < min_w) return;
		r.left_el.css({ "flex-basis": new_left + "px", "flex-grow": 0 });
		r.right_el.css({ "flex-basis": new_right + "px", "flex-grow": 0 });
	}

	_distribute_widths() {
		var count = this.pane_elements.length;
		this.pane_elements.forEach(function (p) {
			p.el.css({ "flex-basis": (100 / count) + "%", "flex-grow": 1 });
		});
	}
};
