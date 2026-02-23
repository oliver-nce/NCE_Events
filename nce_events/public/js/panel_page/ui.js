frappe.provide("nce_events.panel_page");

nce_events.panel_page.Explorer = class Explorer {
	constructor(page, page_name) {
		this.page = page;
		this.page_name = page_name;
		this.store = new nce_events.panel_page.Store(page_name);
		this.pane_elements = [];
		this.divider_elements = [];
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
		if (this.container) this.container.remove();
	}

	// ── Panel loading ──

	load_panel(panel_number) {
		var me = this;
		me.ensure_pane_element(panel_number);
		me.show_pane_loading(panel_number);

		me.store.fetch_panel(panel_number, false).then(function () {
			if (me._destroyed) return;
			me.render_pane(panel_number);
		});
	}

	// ── Pane DOM management ──

	ensure_pane_element(panel_number) {
		var idx = this._pane_index(panel_number);
		if (idx >= 0) return;

		if (this.pane_elements.length > 0) {
			var divider = this._create_divider(this.pane_elements.length - 1);
			this.container.append(divider);
			this.divider_elements.push(divider);
		}

		var el = this._create_pane_element(panel_number);
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

	_create_pane_element(panel_number) {
		var config = this.store.get_panel_config(panel_number);
		var label = (config && config.header_text) || "Panel " + panel_number;

		return $(
			'<div class="panel-pane" data-panel="' + panel_number + '">' +
				'<div class="panel-pane-header">' +
					'<div class="pane-title-row">' +
						'<span class="pane-label">' + frappe.utils.escape_html(label) + "</span>" +
						'<span class="pane-title-right"><span class="pane-count"></span></span>' +
					"</div>" +
				"</div>" +
				'<div class="panel-pane-body"></div>' +
			"</div>"
		);
	}

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

	// ── Loading indicator ──

	show_pane_loading(panel_number) {
		var idx = this._pane_index(panel_number);
		if (idx < 0) return;
		this.pane_elements[idx].el.find(".panel-pane-body").html(
			'<div class="panel-loading">' + __("Loading…") + "</div>"
		);
	}

	// ── Rendering ──

	render_pane(panel_number) {
		var me = this;
		var idx = me._pane_index(panel_number);
		if (idx < 0) return;

		var config = me.store.get_panel_config(panel_number);
		var state = me.store.get_pane_state(panel_number);
		if (!config || !state) return;

		var el = me.pane_elements[idx].el;

		el.find(".pane-count").text(state.total + " records");

		var visible_cols = me._visible_columns(state.columns, config.hidden_fields);
		var table_html = me._build_table(panel_number, visible_cols, state, config);
		el.find(".panel-pane-body").html(table_html);

		me._bind_pane_events(panel_number, el);
		me._distribute_widths();
	}

	_visible_columns(all_columns, hidden_fields) {
		if (!hidden_fields || !hidden_fields.length) return all_columns.slice();
		var hidden_set = {};
		hidden_fields.forEach(function (f) { hidden_set[f.toLowerCase()] = true; });
		return all_columns.filter(function (c) { return !hidden_set[c.toLowerCase()]; });
	}

	_build_table(panel_number, visible_cols, state, config) {
		var me = this;
		var html = '<table class="panel-table"><thead><tr>';

		visible_cols.forEach(function (col) {
			html += "<th>" + frappe.utils.escape_html(me._format_header(col)) + "</th>";
		});
		html += "</tr></thead><tbody>";

		var selected = me.store.get_selected(panel_number);
		var id_col = state.columns[0];

		state.rows.forEach(function (row, row_idx) {
			var is_selected = selected && row[id_col] === selected[id_col];
			html +=
				'<tr class="panel-row' +
				(is_selected ? " selected" : "") +
				(row_idx % 2 === 1 ? " alt" : "") +
				'" data-row-idx="' + row_idx + '">';

			visible_cols.forEach(function (col) {
				var value = row[col];
				if (value === null || value === undefined) value = "";

				if (me._looks_like_date(value)) {
					value = frappe.datetime.str_to_user(value);
				}

				html += "<td>" + frappe.utils.escape_html(String(value)) + "</td>";
			});
			html += "</tr>";
		});

		html += "</tbody></table>";

		if (me.store.has_more(panel_number)) {
			html +=
				'<div class="panel-load-more">' +
				'<button class="btn btn-xs btn-default load-more-btn">' +
				__("Load More") + "</button></div>";
		}

		return html;
	}

	_format_header(col_name) {
		return col_name.replace(/_/g, " ").replace(/\b\w/g, function (c) {
			return c.toUpperCase();
		});
	}

	_looks_like_date(value) {
		if (typeof value !== "string") return false;
		return /^\d{4}-\d{2}-\d{2}$/.test(value);
	}

	// ── Event binding ──

	_bind_pane_events(panel_number, el) {
		var me = this;

		el.find(".panel-row").off("dblclick").on("dblclick", function () {
			var row_idx = parseInt($(this).data("row-idx"), 10);
			me._on_row_dblclick(panel_number, row_idx);
		});

		el.find(".load-more-btn").off("click").on("click", function () {
			me._on_load_more(panel_number);
		});
	}

	_on_row_dblclick(panel_number, row_idx) {
		var me = this;
		var state = me.store.get_pane_state(panel_number);
		if (!state || !state.rows[row_idx]) return;

		var row_data = state.rows[row_idx];
		me.store.select_row(panel_number, row_data);

		// Highlight selected row
		var idx = me._pane_index(panel_number);
		if (idx >= 0) {
			var el = me.pane_elements[idx].el;
			el.find(".panel-row").removeClass("selected");
			el.find('.panel-row[data-row-idx="' + row_idx + '"]').addClass("selected");
		}

		// Find next panel
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

	// ── Drag-resize logic ──

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
