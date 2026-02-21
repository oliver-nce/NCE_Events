frappe.provide("nce_events.hierarchy");

nce_events.hierarchy.Explorer = class Explorer {
	constructor(page) {
		this.page = page;
		this.store = new nce_events.hierarchy.Store();
		this.pane_elements = [];
		this.divider_elements = [];
		this.pane_widths = [];
		this.setup();
	}

	setup() {
		this.container = $('<div class="hierarchy-explorer"></div>');
		$(this.page.body).empty().append(this.container);
		this.load_pane(0, null);
	}

	load_pane(index, parent_name) {
		var me = this;
		var config = nce_events.hierarchy.PANE_CONFIG[index];
		if (!config) return;

		me.show_pane_loading(index);

		me.store.fetch_pane(index, parent_name, false).then(function () {
			me.render_pane(index);
		});
	}

	show_pane_loading(index) {
		this.ensure_pane_element(index);
		var el = this.pane_elements[index];
		el.find(".hierarchy-pane-body").html(
			'<div class="hierarchy-loading">' + __("Loading…") + "</div>"
		);
	}

	ensure_pane_element(index) {
		while (this.pane_elements.length <= index) {
			var pane_idx = this.pane_elements.length;

			if (pane_idx > 0) {
				var divider = this.create_divider(pane_idx - 1);
				this.container.append(divider);
				this.divider_elements.push(divider);
			}

			var pane_el = this.create_pane_element(pane_idx);
			this.container.append(pane_el);
			this.pane_elements.push(pane_el);
			this.pane_widths.push(null);
		}
	}

	remove_panes_after(index) {
		while (this.pane_elements.length > index + 1) {
			this.pane_elements.pop().remove();
			this.pane_widths.pop();
			if (this.divider_elements.length >= this.pane_elements.length) {
				this.divider_elements.pop().remove();
			}
		}
		this.distribute_widths();
	}

	create_pane_element(index) {
		var config = nce_events.hierarchy.PANE_CONFIG[index] || {};
		return $(
			'<div class="hierarchy-pane" data-pane="' + index + '">' +
				'<div class="hierarchy-pane-header">' +
					'<div class="pane-title-row">' +
						'<span class="pane-label">' + (config.label || "Pane " + (index + 1)) + "</span>" +
						'<span class="pane-count"></span>' +
					"</div>" +
					'<div class="pane-actions"></div>' +
				"</div>" +
				'<div class="hierarchy-pane-body"></div>' +
			"</div>"
		);
	}

	create_divider(index) {
		var me = this;
		var divider = $('<div class="hierarchy-divider" data-divider="' + index + '"></div>');

		divider.on("mousedown", function (e) {
			me.start_resize(e, index);
		});

		divider.on("touchstart", function (e) {
			e.preventDefault();
			var touch = e.originalEvent.touches[0];
			me.start_resize(touch, index);
		});

		return divider;
	}

	// ── Drag-resize logic ──

	start_resize(e, divider_index) {
		var me = this;
		me._resize = {
			divider_index: divider_index,
			start_x: e.clientX || e.pageX,
			left_pane: me.pane_elements[divider_index],
			right_pane: me.pane_elements[divider_index + 1],
			left_start_w: me.pane_elements[divider_index].outerWidth(),
			right_start_w: me.pane_elements[divider_index + 1].outerWidth(),
		};

		me.divider_elements[divider_index].addClass("active");
		$("body").addClass("hierarchy-resizing");

		var on_move = function (evt) {
			var client_x = evt.clientX || (evt.touches && evt.touches[0].clientX) || 0;
			requestAnimationFrame(function () {
				me.do_resize(client_x);
			});
		};
		var on_up = function () {
			me.divider_elements[divider_index].removeClass("active");
			$("body").removeClass("hierarchy-resizing");
			$(document).off("mousemove.hresize touchmove.hresize");
			$(document).off("mouseup.hresize touchend.hresize");
			me._resize = null;
		};

		$(document).on("mousemove.hresize touchmove.hresize", on_move);
		$(document).on("mouseup.hresize touchend.hresize", on_up);
	}

	do_resize(client_x) {
		if (!this._resize) return;
		var r = this._resize;
		var delta = client_x - r.start_x;
		var min_w = 200;

		var new_left = Math.max(min_w, r.left_start_w + delta);
		var new_right = Math.max(min_w, r.right_start_w - delta);

		if (new_left < min_w || new_right < min_w) return;

		r.left_pane.css("flex-basis", new_left + "px");
		r.right_pane.css("flex-basis", new_right + "px");
		r.left_pane.css("flex-grow", 0);
		r.right_pane.css("flex-grow", 0);
	}

	distribute_widths() {
		var count = this.pane_elements.length;
		this.pane_elements.forEach(function (el) {
			el.css({ "flex-basis": 100 / count + "%", "flex-grow": 1 });
		});
	}

	// ── Pane rendering ──

	render_pane(index) {
		var me = this;
		var config = nce_events.hierarchy.PANE_CONFIG[index];
		var state = me.store.get_pane_state(index);
		if (!config || !state) return;

		var el = me.pane_elements[index];

		el.find(".pane-count").text(state.total + " records");

		var actions_html = me.build_actions_html(index, config);
		el.find(".pane-actions").html(actions_html);

		var table_html = me.build_table_html(index, config, state);
		el.find(".hierarchy-pane-body").html(table_html);

		me.bind_pane_events(index, config);
		me.distribute_widths();
	}

	build_actions_html(index, config) {
		var html = "";

		(config.header_buttons || []).forEach(function (btn) {
			html +=
				'<button class="btn btn-xs btn-default pane-header-btn" data-action="' +
				(btn.label || "") + '" disabled>' +
				frappe.utils.icon(btn.icon || "file", "xs") + " " +
				btn.label +
				"</button> ";
		});

		html +=
			'<button class="btn btn-xs btn-default pane-export-btn" data-format="csv">' +
			frappe.utils.icon("file", "xs") + " CSV</button> ";
		html +=
			'<button class="btn btn-xs btn-default pane-export-btn" data-format="json">' +
			frappe.utils.icon("file", "xs") + " JSON</button> ";
		html +=
			'<button class="btn btn-xs btn-default pane-open-btn">' +
			frappe.utils.icon("link-url", "xs") + " Open</button>";

		return html;
	}

	build_table_html(index, config, state) {
		var html = '<table class="hierarchy-table"><thead><tr>';

		config.columns.forEach(function (col) {
			var style = 'style="width:' + col.width + ";";
			if (col.align) style += "text-align:" + col.align + ";";
			style += '"';
			html += "<th " + style + ">" + col.label + "</th>";
		});
		html += "</tr></thead><tbody>";

		state.rows.forEach(function (row, row_idx) {
			var selected = me_is_selected(row, index);
			html +=
				'<tr class="hierarchy-row' +
				(selected ? " selected" : "") +
				(row_idx % 2 === 1 ? " alt" : "") +
				'" data-name="' + row[config.row_id_field] + '">';

			config.columns.forEach(function (col) {
				var value;
				if (col.type === "computed" && col.compute) {
					value = col.compute(row);
				} else {
					value = row[col.field];
				}
				if (value === null || value === undefined) value = "";

				if (col.type === "date" && value) {
					value = frappe.datetime.str_to_user(value);
				}

				var td_style = "";
				if (col.align) td_style += "text-align:" + col.align + ";";

				if (col.style_rule) {
					var color = col.style_rule.map[row[col.style_rule.field]];
					if (color) td_style += "color:" + color + ";font-weight:600;";
				}

				html +=
					"<td" + (td_style ? ' style="' + td_style + '"' : "") + ">" +
					frappe.utils.escape_html(String(value)) +
					"</td>";
			});
			html += "</tr>";
		});

		html += "</tbody></table>";

		if (me_store_has_more(index)) {
			html +=
				'<div class="hierarchy-load-more">' +
				'<button class="btn btn-xs btn-default load-more-btn">' +
				__("Load More") +
				"</button></div>";
		}

		return html;

		function me_is_selected(row, idx) {
			var sel = nce_events.hierarchy._current_explorer &&
				nce_events.hierarchy._current_explorer.store.get_selected(idx);
			return sel === row[config.row_id_field];
		}

		function me_store_has_more(idx) {
			var explorer = nce_events.hierarchy._current_explorer;
			return explorer && explorer.store.has_more(idx);
		}
	}

	bind_pane_events(index, config) {
		var me = this;
		nce_events.hierarchy._current_explorer = me;
		var el = me.pane_elements[index];

		el.find(".hierarchy-row").off("click").on("click", function () {
			var row_name = $(this).data("name");
			me.on_row_click(index, row_name);
		});

		el.find(".load-more-btn").off("click").on("click", function () {
			me.on_load_more(index);
		});

		el.find(".pane-export-btn").off("click").on("click", function () {
			var fmt = $(this).data("format");
			me.on_export(index, fmt);
		});

		el.find(".pane-open-btn").off("click").on("click", function () {
			me.on_open_record(index);
		});
	}

	on_row_click(pane_index, row_name) {
		var me = this;
		me.store.select_row(pane_index, row_name);

		me.pane_elements[pane_index].find(".hierarchy-row").removeClass("selected");
		me.pane_elements[pane_index]
			.find('.hierarchy-row[data-name="' + row_name + '"]')
			.addClass("selected");

		var next_index = pane_index + 1;
		var next_config = nce_events.hierarchy.PANE_CONFIG[next_index];
		if (!next_config) {
			me.remove_panes_after(pane_index);
			return;
		}

		me.remove_panes_after(pane_index);
		me.load_pane(next_index, row_name);
	}

	on_load_more(pane_index) {
		var me = this;
		var parent = pane_index > 0 ? me.store.get_selected(pane_index - 1) : null;

		me.store.fetch_pane(pane_index, parent, true).then(function () {
			me.render_pane(pane_index);
		});
	}

	on_export(pane_index, format) {
		var me = this;
		var config = nce_events.hierarchy.PANE_CONFIG[pane_index];
		var parent = pane_index > 0 ? me.store.get_selected(pane_index - 1) : null;

		frappe.call({
			method: "nce_events.api.hierarchy_explorer.export_pane_data",
			args: {
				pane: config.api_pane,
				parent_name: parent || null,
				format: format,
			},
			callback: function (r) {
				if (r.message) {
					var blob = new Blob([r.message.data], { type: r.message.mimetype });
					var url = URL.createObjectURL(blob);
					var a = document.createElement("a");
					a.href = url;
					a.download = r.message.filename;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
				}
			},
		});
	}

	on_open_record(pane_index) {
		var selected = this.store.get_selected(pane_index);
		if (!selected) {
			frappe.show_alert({ message: __("Select a row first"), indicator: "orange" });
			return;
		}

		var config = nce_events.hierarchy.PANE_CONFIG[pane_index];
		var doctype_map = { events: "Events", players: "Family Members" };
		var dt = doctype_map[config.api_pane];

		if (dt) {
			window.open(
				frappe.utils.get_form_link(dt, selected),
				"_blank"
			);
		}
	}
};
