frappe.provide("nce_events.panel_page");

nce_events.panel_page.Explorer = class Explorer {
	constructor(page, page_name) {
		this.page = page;
		this.page_name = page_name;
		this.store = new nce_events.panel_page.Store(page_name);
		this.pane_elements = [];
		this.divider_elements = [];
		// filters[panel_number] = [{field, op, value}, ...]
		this.filters = {};
		this._click_timer = null;
		this._card_el = null;
		this._resize = null;
		this._col_resize = null;
		this._col_widths = {};
		this._col_width_save_timers = {};
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

	_apply_column_order(cols, order) {
		if (!order || !order.length) return cols;
		var map = {};
		cols.forEach(function (c) { map[c.fieldname] = c; });
		var ordered = [];
		order.forEach(function (fn) {
			if (map[fn]) { ordered.push(map[fn]); delete map[fn]; }
		});
		cols.forEach(function (c) {
			if (map[c.fieldname]) ordered.push(c);
		});
		return ordered;
	}

	_col_width_storage_key(panel_number) {
		return "nce_panel_col_widths:" + this.page_name + ":" + panel_number;
	}

	_get_col_widths(panel_number) {
		if (this._col_widths[panel_number]) return this._col_widths[panel_number];
		var widths = {};
		try {
			var raw = window.localStorage.getItem(this._col_width_storage_key(panel_number));
			if (raw) {
				var parsed = JSON.parse(raw);
				if (parsed && typeof parsed === "object") {
					Object.keys(parsed).forEach(function (k) {
						var v = Number(parsed[k]);
						if (isFinite(v) && v > 0 && v <= 1) widths[k] = v;
					});
				}
			}
		} catch (e) {
			// Ignore storage/parse failures; fall back to defaults.
		}
		this._col_widths[panel_number] = widths;
		return widths;
	}

	_persist_col_widths_async(panel_number) {
		var me = this;
		if (me._col_width_save_timers[panel_number]) {
			clearTimeout(me._col_width_save_timers[panel_number]);
		}
		me._col_width_save_timers[panel_number] = setTimeout(function () {
			try {
				window.localStorage.setItem(
					me._col_width_storage_key(panel_number),
					JSON.stringify(me._col_widths[panel_number] || {})
				);
			} catch (e) {
				// Ignore storage failures (e.g. privacy mode/quota).
			}
		}, 0);
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
			me.render_pane(panel_number);
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
				me._render_filter_widget(panel_number, header_el);
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
				if (me._filter_debounce) clearTimeout(me._filter_debounce);
				me._filter_debounce = setTimeout(function () {
					me.render_pane(panel_number, { skip_header: true });
				}, 500);
			});

			row.append(col_sel, op_sel, val_inp, rm_btn);
			widget.append(row);
		});

		var add_btn = $('<button class="btn btn-xs btn-default filter-add-btn">+ Add Filter</button>');
		add_btn.on("click", function () {
			conditions.push({ field: "", op: "=", value: "" });
			me._render_filter_widget(panel_number, header_el);
		});
		widget.append(add_btn);

		header_el.find(".pane-filter-widget").remove();
		header_el.append(widget);
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

	render_pane(panel_number, opts) {
		var me = this;
		var idx = me._pane_index(panel_number);
		if (idx < 0) return;

		var config = me.store.get_panel_config(panel_number);
		var state = me.store.get_pane_state(panel_number);
		if (!config || !state) return;

		var skip_header = opts && opts.skip_header;

		me._hide_card();
		if (!skip_header) me._render_header(panel_number);

		var el = me.pane_elements[idx].el;
		var rows = me._get_filtered_rows(panel_number);
		var visible_cols = me._visible_columns(state.columns, config.hidden_fields);
		visible_cols = me._apply_column_order(visible_cols, config.column_order);
		var bold_set = me._field_set(config.bold_fields);

		var male_hex = (me.store.config.male_hex || "").trim();
		var female_hex = (me.store.config.female_hex || "").trim();
		if (male_hex && male_hex[0] !== "#") male_hex = "#" + male_hex;
		if (female_hex && female_hex[0] !== "#") female_hex = "#" + female_hex;
		var male_field  = (config.male_field  || "").trim().toLowerCase();
		var female_field = (config.female_field || "").trim().toLowerCase();

		var id_col = state.columns.length ? state.columns[0].fieldname : null;
		var selected_row = me.store.get_selected(panel_number);

		var col_widths = me._get_col_widths(panel_number);

		var html = '<table class="panel-table"><colgroup>';
		visible_cols.forEach(function (col) {
			var w = col_widths[col.fieldname];
			html += w ? '<col style="width:' + (w * 100).toFixed(4) + '%;">' : "<col>";
		});
		html += "</colgroup><thead><tr>";
		visible_cols.forEach(function (col) {
			var fn = col.fieldname.toLowerCase();
			var extra = bold_set[fn] ? ' style="font-weight:700;"' : "";
			html += "<th" + extra + ">" + frappe.utils.escape_html(col.label)
				+ '<div class="col-resize-handle" data-field="' + frappe.utils.escape_html(col.fieldname) + '"></div>'
				+ "</th>";
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

		if (!skip_header) {
			if (config.show_filter && (me.filters[panel_number] || []).length > 0) {
				var header_el = me.pane_elements[idx].el.find(".panel-pane-header");
				me._render_filter_widget(panel_number, header_el);
			}
		} else {
			// Update record count without rebuilding header
			var filtered_rows = me._get_filtered_rows(panel_number);
			var count_text = filtered_rows.length !== state.total
				? filtered_rows.length + " / " + state.total
				: String(state.total);
			el.find(".pane-count").text(count_text + " records");
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

		el.find(".col-resize-handle").on("mousedown", function (e) {
			e.preventDefault();
			e.stopPropagation();
			var $handle = $(this);
			var fieldname = $handle.data("field");
			var $th = $handle.closest("th");
			var start_x = e.pageX;
			var start_w = $th.outerWidth();
			var $table = $th.closest("table");
			var col_index = $th.index();
			var $col = $table.find("colgroup col").eq(col_index);

			$("body").addClass("col-resizing");

			function on_move(ev) {
				var new_w = Math.max(40, start_w + (ev.pageX - start_x));
				$col.css("width", new_w + "px");
			}

			function on_up() {
				$("body").removeClass("col-resizing");
				$(document).off("mousemove.col_resize mouseup.col_resize");
				var ratio_map = {};
				var widths = [];
				var total_w = 0;
				$table.find("thead th").each(function () {
					var $header = $(this);
					var field = $header.find(".col-resize-handle").data("field");
					var w = $header.outerWidth();
					if (!field || !w) return;
					widths.push({ field: field, width: w });
					total_w += w;
				});
				if (total_w > 0) {
					widths.forEach(function (item) {
						ratio_map[item.field] = item.width / total_w;
					});
					me._col_widths[panel_number] = ratio_map;
				}
				me._persist_col_widths_async(panel_number);
			}

			$(document).on("mousemove.col_resize", on_move);
			$(document).on("mouseup.col_resize", on_up);
		});
	}

	// ── Drag-resize ──

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
