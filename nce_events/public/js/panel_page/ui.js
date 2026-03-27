frappe.provide("nce_events.panel_page");

nce_events.panel_page.Explorer = class Explorer {
	constructor(page) {
		this.page = page;
		this.store = new nce_events.panel_page.Store();
		this.floats = {};
		this._float_z = 100;
		this._float_offset = 0;
		this._filter_debounce = null;
		this._click_timer = null;
		this._destroyed = false;

		this.WP_DOCTYPE = "WP Tables";
		this._PAGE_SIZE = 50;
		this.setup();
	}

	/* ── Setup ── */

	setup() {
		const me = this;
		me.page.set_title(__("NCE Events"));
		me.page.clear_actions();
		me.container = $('<div class="panel-explorer"></div>');
		$(me.page.body).empty().append(me.container);

		$(document).on("mousedown.panel_explorer", function (e) {
			if (!$(e.target).closest(".panel-float, .panel-card-popover").length) {
				me._hide_card();
			}
		});

		me._inject_display_settings();
		me._open_wp_tables();
	}

	_inject_display_settings() {
		const FONT_MAP = {
			Inter: "'Inter', sans-serif",
			"Source Sans 3": "'Source Sans 3', sans-serif",
			Arial: "Arial, sans-serif",
			Helvetica: "Helvetica, Arial, sans-serif",
			Georgia: "Georgia, serif",
			Verdana: "Verdana, sans-serif",
			Tahoma: "Tahoma, sans-serif",
			"System Default":
				"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
		};

		const me = this;
		frappe.call({
			method: "frappe.client.get",
			args: { doctype: "Settings", name: "Settings" },
			async: false,
			callback: function (r) {
				if (!r || !r.message) return;
				const doc = r.message;
				const font = FONT_MAP[doc.font_family] || "'Inter', sans-serif";
				const weight = parseInt(doc.font_weight) || 400;
				const size = doc.font_size || "13px";
				me._display_font_size = parseFloat(size) || 13;
				const color = doc.text_color || "#333333";
				const muted = doc.muted_text_color || "#555555";

				const sel =
					".panel-float, .panel-float .panel-table td, .panel-float .panel-table th, " +
					".panel-float .pane-filter-widget, " +
					".panel-float .filter-col-select, " +
					".panel-float .filter-op-select, .panel-float .filter-val-input";

				const send_sel =
					".send-panel, .send-panel .send-field, .send-panel .send-field-label, " +
					".send-panel .send-panel-title, .send-panel .send-check-label, " +
					".send-panel .send-panel-actions .btn, " +
					".send-preview-body, .send-preview-subject, .send-preview-recipient";

				const tag_sel =
					".se-tag-panel-body, .se-tag-val, .se-tag-lbl, .se-tag-pre, " +
					".se-fallback-input, .se-html-check-label, " +
					".se-tag-panel .btn";

				const css = `${sel}, ${send_sel}, ${tag_sel} {
  font-family: ${font} !important;
  font-weight: ${weight} !important;
  font-size: ${size} !important;
}
.panel-float .panel-table td, .send-panel .send-field, .send-preview-body, .send-preview-subject, .se-tag-val, .se-tag-pre {
  color: ${color} !important;
}
.panel-float .panel-table th,
.send-panel .send-field-label, .send-preview-recipient,
.se-tag-lbl {
  color: ${muted} !important;
}
`;

				$("#display-settings-runtime").remove();
				$("<style>").attr("id", "display-settings-runtime").text(css).appendTo("head");
			},
		});
	}

	destroy() {
		this._destroyed = true;
		this._hide_card();
		if (this._click_timer) clearTimeout(this._click_timer);
		$(document).off("mousedown.panel_explorer");
		const me = this;
		Object.keys(me.floats).forEach(function (dt) {
			if (me.floats[dt]) me.floats[dt].remove();
		});
		if (me.container) me.container.remove();
	}

	/* ── WP Tables (root panel) ── */

	_open_wp_tables() {
		const me = this;
		const PAGE = me._PAGE_SIZE;
		me.store.open_panel(me.WP_DOCTYPE, null, {});
		me._create_float(me.WP_DOCTYPE, true, null);
		me._show_loading(me.WP_DOCTYPE);

		me.store
			.fetch_config(me.WP_DOCTYPE)
			.then(function () {
				return me.store.fetch_data(me.WP_DOCTYPE, PAGE);
			})
			.then(function () {
				if (me._destroyed) return;
				me._render_panel(me.WP_DOCTYPE);
				me._fetch_remaining(me.WP_DOCTYPE);
			});
	}

	/* ── Open a DocType panel (from WP Tables row click or drill-down) ── */

	_open_doctype_panel(doctype, parent_doctype, parent_filter) {
		const me = this;
		const PAGE = me._PAGE_SIZE;
		me.store.open_panel(doctype, parent_doctype, parent_filter);
		me._create_float(doctype, false, parent_doctype);
		me._show_loading(doctype);

		// Fetch config and first page in parallel — they are independent
		Promise.all([me.store.fetch_config(doctype), me.store.fetch_data(doctype, PAGE)])
			.then(function () {
				if (me._destroyed) return;
				me._render_panel(doctype);
				me._fetch_remaining(doctype);
			})
			.catch(function (err) {
				console.error(`Error loading panel ${doctype}:`, err);
				if (!me._destroyed) me._render_panel(doctype);
			});
	}

	/* ── Float management ── */

	_create_float(doctype, is_root, parent_doctype) {
		if (this.floats[doctype]) {
			this._bring_to_front(doctype);
			return;
		}
		this._float_z += 1;

		let top = 60,
			left = 40;
		if (!is_root && parent_doctype && this.floats[parent_doctype]) {
			const parent_el = this.floats[parent_doctype];
			top = (parseInt(parent_el.css("top"), 10) || 60) + 100;
			left = (parseInt(parent_el.css("left"), 10) || 40) + 100;
		} else if (!is_root) {
			top = 160;
			left = 140;
		}

		const float_width = is_root ? 900 : 1400;

		const float_el = $(
			`<div class="panel-float" data-doctype="${frappe.utils.escape_html(doctype)}"></div>`,
		);
		float_el.css({
			top: `${top}px`,
			left: `${left}px`,
			width: `${float_width}px`,
			height: "600px",
			zIndex: this._float_z,
		});

		const pane_el = $(
			`<div class="panel-pane" data-doctype="${frappe.utils.escape_html(doctype)}"><div class="panel-pane-header"></div><div class="panel-pane-body"></div></div>`,
		);
		const footer_el = $(
			`<div class="panel-float-footer">${frappe.utils.escape_html(doctype)}</div>`,
		);
		float_el.append(pane_el, footer_el);
		$(document.body).append(float_el);
		this.floats[doctype] = float_el;

		const me = this;
		let focus_start = null;
		float_el.on("mousedown.float_focus", function (e) {
			focus_start = { x: e.clientX, y: e.clientY };
		});
		float_el.on("mouseup.float_focus", function (e) {
			if (focus_start) {
				const dx = Math.abs(e.clientX - focus_start.x);
				const dy = Math.abs(e.clientY - focus_start.y);
				if (dx < 10 && dy < 10) {
					me._bring_to_front(doctype);
				}
				focus_start = null;
			}
		});
		this._make_draggable(float_el);
	}

	_bring_to_front(doctype) {
		this._float_z += 1;
		if (this.floats[doctype]) {
			this.floats[doctype].css("zIndex", this._float_z);
		}
	}

	_close_float(doctype) {
		const me = this;
		const descendants = me.store._get_descendants(doctype);
		descendants.forEach(function (dt) {
			if (me.floats[dt]) {
				me.floats[dt].remove();
				delete me.floats[dt];
			}
		});
		if (me.floats[doctype]) {
			me.floats[doctype].remove();
			delete me.floats[doctype];
		}
		me.store.close_panel(doctype);
	}

	_show_loading(doctype) {
		const float_el = this.floats[doctype];
		if (!float_el) return;
		float_el
			.find(".panel-pane-body")
			.html(`<div class="panel-loading">${__("Loading\u2026")}</div>`);
	}

	_make_draggable(float_el) {
		this._make_float_draggable(
			float_el,
			[".panel-pane-header", ".panel-float-footer"],
			".pane-header-btn, .panel-float-close, .pane-filter-widget",
			"float_drag",
		);
	}

	/* ── Panel rendering ── */

	_render_panel(doctype, opts) {
		const me = this;
		const float_el = me.floats[doctype];
		if (!float_el || me._destroyed) return;

		const panel = me.store.get_panel(doctype);
		if (!panel || !panel.config || !panel.data) return;

		const skip_header = opts && opts.skip_header;
		if (!skip_header) me._render_header(doctype);

		const config = panel.config;
		const data = panel.data;
		const rows = me._get_filtered_rows(doctype);
		const columns = me._get_display_columns(config, data.columns || []);

		const is_wp = doctype === me.WP_DOCTYPE;

		const float_w = float_el.width() || (is_wp ? 900 : 1400);
		const col_widths = me._calc_col_widths(columns, rows, float_w);

		const row_ctx = me._build_row_ctx(
			doctype,
			config,
			data,
			col_widths,
			is_wp,
			panel.selected_row,
			columns,
		);

		let html = '<table class="panel-table"><thead><tr>';
		columns.forEach(function (col, ci) {
			const fn = col.fieldname.toLowerCase();
			const w = col_widths[ci] || 100;
			let style = `width:${w}px;min-width:30px;`;
			if (col.is_link || col.is_related_link)
				style += "color:royalblue !important;text-decoration:underline;";
			if (row_ctx.bold_set[fn]) style += "font-weight:700 !important;";
			html += `<th style="${style}">${frappe.utils.escape_html(col.label)}<div class="col-resize-handle" data-col="${ci}"></div></th>`;
		});
		html += "</tr></thead><tbody>";

		rows.forEach(function (row, ri) {
			html += me._build_row_html(row, ri, row_ctx);
		});

		html += "</tbody></table>";

		float_el.find(".panel-pane-body").html(html);
		me._bind_events(doctype);
		me._bind_col_resize(doctype);

		if (!skip_header && config.show_filter) {
			const uf = me.store.get_user_filters(doctype);
			if (uf.length > 0) {
				me._render_filter_widget(doctype);
			}
		}
	}

	/* ── Header ── */

	_render_header(doctype) {
		const me = this;
		const float_el = me.floats[doctype];
		if (!float_el) return;

		const panel = me.store.get_panel(doctype);
		if (!panel || !panel.config || !panel.data) return;

		const config = panel.config;
		const label = config.header_text || doctype;
		const filtered_rows = me._get_filtered_rows(doctype);
		const total = panel.data.total || 0;
		const is_wp = doctype === me.WP_DOCTYPE;

		let html = '<div class="pane-title-row">';
		html += `<span class="pane-label">${frappe.utils.escape_html(label)}</span>`;
		html += '<span class="pane-title-right">';

		if (config.show_filter) {
			html += `<button class="btn btn-xs btn-default pane-header-btn pane-filter-toggle-btn" title="Filter"><i class="fa fa-filter"></i></button>`;
		}
		if (config.show_sheets) {
			html += `<button class="btn btn-xs btn-default pane-header-btn pane-sheets-btn" title="Export"><i class="fa fa-table"></i></button>`;
		}
		if (config.show_email) {
			html += `<button class="btn btn-xs btn-default pane-header-btn pane-email-btn" title="Email"><i class="fa fa-envelope"></i></button>`;
		}
		if (config.show_sms) {
			html += `<button class="btn btn-xs btn-default pane-header-btn pane-sms-btn" title="SMS"><i class="fa fa-comment"></i></button>`;
		}

		html += '<span class="pane-count">';
		html +=
			filtered_rows.length !== total ? `${filtered_rows.length} / ${total}` : String(total);
		html += " records</span>";

		html += '<button class="panel-float-close" title="Close">&times;</button>';
		html += "</span></div>";

		const header_el = float_el.find(".panel-pane-header");
		header_el.html(html);

		if (config.show_filter) {
			header_el.find(".pane-filter-toggle-btn").on("click", function () {
				const widget = float_el.find(".pane-filter-widget");
				if (widget.length) {
					widget.remove();
				} else {
					me._render_filter_widget(doctype);
				}
			});
		}
		header_el.find(".pane-sheets-btn").on("click", function () {
			me._on_sheets(doctype);
		});
		header_el.find(".pane-email-btn").on("click", function () {
			me._open_send_dialog(doctype, "email");
		});
		header_el.find(".pane-sms-btn").on("click", function () {
			me._open_send_dialog(doctype, "sms");
		});
		header_el.find(".panel-float-close").on("click", function () {
			me._close_float(doctype);
		});

		float_el.find(".panel-float-footer").text(label);
	}

	/* ── Event binding ── */

	_bind_events(doctype) {
		const me = this;
		const float_el = me.floats[doctype];
		if (!float_el) return;
		const is_wp = doctype === me.WP_DOCTYPE;
		const body = float_el.find(".panel-pane-body");

		body.on("click", ".panel-row", function (e) {
			if (
				$(e.target).closest(
					".panel-link-val, .panel-related-val, .panel-tel-link, .panel-sms-one-btn, .panel-email-one-btn",
				).length
			)
				return;

			const ri = parseInt($(this).data("row-idx"), 10);
			const rows = me._get_filtered_rows(doctype);
			const row = rows[ri];
			if (!row) return;

			me.store.select_row(doctype, row);
			float_el.find(".panel-row").removeClass("selected");
			$(this).addClass("selected");

			if (is_wp) {
				const target_dt = row.frappe_doctype;
				if (target_dt) {
					me._wp_open_target(target_dt);
				} else {
					frappe.db
						.get_value("WP Tables", row.name, "frappe_doctype")
						.then(function (r) {
							const dt = r && r.message && r.message.frappe_doctype;
							if (!dt) {
								frappe.show_alert({
									message: __("No frappe_doctype on this WP Tables row"),
									indicator: "orange",
								});
								return;
							}
							me._wp_open_target(dt);
						});
				}
			}
		});

		/* ── Drill button click handler (disabled — drill buttons removed) ──
		body.on("click", ".drill-btn", function () {
			if ($(this).hasClass("disabled")) return;
			const child_dt = $(this).data("child-dt");
			const link_field = $(this).data("link-field");
			const row_name = $(this).data("row-name");
			if (!child_dt || !row_name) return;

			const parent_filter = {};
			parent_filter[link_field] = row_name;
			me._open_doctype_panel(child_dt, doctype, parent_filter);
		});
		*/

		body.on("click", ".panel-related-val", function (e) {
			e.preventDefault();
			e.stopPropagation();
			const child_dt = $(this).data("related-dt");
			const link_field = $(this).data("link-field");
			const row_name = $(this).data("row-name");
			if (!child_dt || !row_name) return;

			const parent_filter = {};
			parent_filter[link_field] = row_name;
			me._open_doctype_panel(child_dt, doctype, parent_filter);
		});

		body.on("click", ".panel-sms-one-btn", function (e) {
			e.preventDefault();
			e.stopPropagation();
			const target_dt = $(this).data("doctype");
			const row_name = $(this).data("row-name");
			if (!target_dt || !row_name) return;
			me._open_send_dialog(target_dt, "sms", { name: row_name });
		});

		body.on("click", ".panel-email-one-btn", function (e) {
			e.preventDefault();
			e.stopPropagation();
			const target_dt = $(this).data("doctype");
			const row_name = $(this).data("row-name");
			if (!target_dt || !row_name) return;
			me._open_send_dialog(target_dt, "email", { name: row_name });
		});

		body.on("click", ".panel-tel-link", function (e) {
			e.preventDefault();
			e.stopPropagation();
			const tel = $(this).data("tel");
			if (!tel) return;
			frappe.confirm(__("Call {0} with your phone?", [tel]), function () {
				window.location.href = "tel:" + tel;
			});
		});
	}

	_wp_open_target(target_dt) {
		const me = this;
		me.store.close_all_except(me.WP_DOCTYPE);
		Object.keys(me.floats).forEach(function (dt) {
			if (dt !== me.WP_DOCTYPE) {
				me.floats[dt].remove();
				delete me.floats[dt];
			}
		});
		me._open_doctype_panel(target_dt, me.WP_DOCTYPE, {});
	}

	/* ── Client-side user filter ── */

	_get_filtered_rows(doctype) {
		const panel = this.store.get_panel(doctype);
		if (!panel || !panel.data) return [];
		const all_rows = panel.data.rows || [];
		const conditions = panel.user_filters || [];
		const active = conditions.filter(function (c) {
			return c.field && c.value !== "";
		});
		if (!active.length) return all_rows;
		const me = this;
		return all_rows.filter(function (row) {
			return active.every(function (c) {
				const val = me._get_row_value(row, c.field);
				const cell = String(val == null ? "" : val).toLowerCase();
				const cval = c.value.toLowerCase();
				switch (c.op) {
					case "=":
						return cell === cval;
					case "!=":
						return cell !== cval;
					case ">":
						return parseFloat(cell) > parseFloat(cval);
					case "<":
						return parseFloat(cell) < parseFloat(cval);
					case "like":
						return cell.indexOf(cval) >= 0;
					case "in":
						return (
							cval
								.split(",")
								.map(function (v) {
									return v.trim();
								})
								.indexOf(cell) >= 0
						);
					default:
						return true;
				}
			});
		});
	}

	_render_filter_widget(doctype) {
		const me = this;
		const float_el = me.floats[doctype];
		if (!float_el) return;
		const panel = me.store.get_panel(doctype);
		if (!panel || !panel.data) return;

		let conditions = me.store.get_user_filters(doctype);
		const was_empty = !conditions.length;
		if (was_empty) {
			conditions = [{ field: "", op: "=", value: "" }];
			me.store.set_user_filters(doctype, conditions);
		}
		const ops = ["=", "!=", ">", "<", "like", "in"];
		const columns = panel.data.columns || [];

		const widget = $('<div class="pane-filter-widget"></div>');

		const refetch_and_render = function (preserve_filter_focus, after_render) {
			me.store
				.fetch_data(doctype, me._PAGE_SIZE)
				.then(function () {
					if (!me._destroyed) {
						me._render_panel(doctype, { skip_header: !!preserve_filter_focus });
						me._fetch_remaining(doctype);
						if (preserve_filter_focus) {
							const p = me.store.get_panel(doctype);
							const total = p && p.data ? p.data.total || 0 : 0;
							const rows = me._get_filtered_rows(doctype);
							const txt =
								rows.length !== total
									? rows.length + " / " + total
									: String(total);
							float_el.find(".pane-count").text(txt + " records");
						}
						if (after_render) after_render();
					}
				})
				.catch(function () {
					if (!me._destroyed) me._render_panel(doctype);
				});
		};

		conditions.forEach(function (cond, i) {
			const row = $('<div class="filter-condition-row"></div>');
			const col_sel = $('<select class="filter-col-select"></select>');
			col_sel.append('<option value="">— column —</option>');
			columns.forEach(function (col) {
				const opt = $("<option></option>").val(col.fieldname).text(col.label);
				if (col.fieldname === cond.field) opt.prop("selected", true);
				col_sel.append(opt);
			});
			const op_btns = $('<span class="filter-op-btns"></span>');
			ops.forEach(function (op) {
				const btn = $('<button type="button" class="filter-op-btn"></button>').text(op);
				if (op === (cond.op || "=")) btn.addClass("active");
				btn.on("click", function () {
					conditions[i].op = op;
					me.store.set_user_filters(doctype, conditions);
					op_btns.find(".filter-op-btn").removeClass("active");
					btn.addClass("active");
					refetch_and_render(false, function () {
						float_el.find(".filter-val-input[data-filter-row='" + i + "']").focus();
					});
				});
				op_btns.append(btn);
			});
			const val_inp = $(
				'<input class="filter-val-input" type="text" placeholder="value">',
			).val(cond.value);
			const rm_btn = $(
				'<button class="btn btn-xs filter-remove-btn" title="Remove">&times;</button>',
			);

			rm_btn.on("click", function () {
				conditions.splice(i, 1);
				me.store.set_user_filters(doctype, conditions);
				me._render_filter_widget(doctype);
				refetch_and_render();
			});
			col_sel.on("change", function () {
				conditions[i].field = $(this).val();
				refetch_and_render();
			});
			val_inp.on("input", function () {
				conditions[i].value = $(this).val();
				if (me._filter_debounce) clearTimeout(me._filter_debounce);
				me._filter_debounce = setTimeout(function () {
					refetch_and_render(true);
				}, 1500);
			});
			val_inp.attr("data-filter-row", i);
			val_inp.on("keydown", function (e) {
				if (e.keyCode === 40) {
					e.preventDefault();
					const next = widget.find(
						".filter-val-input[data-filter-row='" + (i + 1) + "']",
					);
					if (next.length) next.focus();
					else {
						conditions.push({ field: "", op: "=", value: "" });
						me.store.set_user_filters(doctype, conditions);
						me._render_filter_widget(doctype);
						const new_widget = float_el.find(".pane-filter-widget");
						new_widget
							.find(
								".filter-val-input[data-filter-row='" +
									(conditions.length - 1) +
									"']",
							)
							.focus();
					}
				} else if (e.keyCode === 38) {
					e.preventDefault();
					const prev = widget.find(
						".filter-val-input[data-filter-row='" + (i - 1) + "']",
					);
					if (prev.length) prev.focus();
				}
			});

			rm_btn.attr("tabindex", "-1");
			row.append(col_sel, op_btns, val_inp, rm_btn);
			widget.append(row);
		});

		const add_btn = $(
			'<button class="btn btn-xs btn-default filter-add-btn">Add Filter &#9660;</button>',
		);
		add_btn.on("click", function () {
			conditions.push({ field: "", op: "=", value: "" });
			me.store.set_user_filters(doctype, conditions);
			me._render_filter_widget(doctype);
		});
		widget.append(add_btn);

		float_el.find(".pane-filter-widget").remove();
		float_el.find(".panel-pane-header").append(widget);
		if (was_empty) {
			widget.find(".filter-val-input[data-filter-row='0']").focus();
		}
	}

	/* ── Export ── */

	_on_sheets(doctype) {
		const panel = this.store.get_panel(doctype);
		const filters = panel ? panel.parent_filter : {};
		const user_filters = panel ? panel.user_filters || [] : [];
		frappe.call({
			method: "nce_events.api.panel_api.export_panel_data",
			args: {
				root_doctype: doctype,
				filters: JSON.stringify(filters),
				user_filters: JSON.stringify(user_filters),
			},
			callback: function (r) {
				if (!r.message) return;
				const url = window.location.origin + r.message.url;
				const formula = `=IMPORTDATA("${url}")`;
				if (navigator.clipboard && navigator.clipboard.writeText) {
					navigator.clipboard.writeText(formula).then(function () {
						frappe.show_alert({
							message: __("Link copied — paste in Google Sheets"),
							indicator: "green",
						});
					});
				} else {
					frappe.show_alert({
						message: __("Exported {0} rows", [r.message.rows_exported]),
						indicator: "green",
					});
				}
			},
		});
	}

	/* ── Send dialog (SmsDialog or EmailDialog by mode) ── */

	_open_send_dialog(doctype, mode, single_row_filter) {
		const me = this;
		const panel = me.store.get_panel(doctype);
		if (!panel || !panel.config || !panel.data) return;

		const config = panel.config;
		const recipient_field = mode === "sms" ? config.sms_field : config.email_field;
		if (!recipient_field) {
			frappe.msgprint(
				__("No {0} field configured for this panel.", [mode === "sms" ? "SMS" : "Email"]),
			);
			return;
		}

		let filters, user_filters, row_count;
		if (single_row_filter) {
			filters = single_row_filter;
			user_filters = [];
			row_count = 1;
		} else {
			const filtered_rows = me._get_filtered_rows(doctype);
			if (!filtered_rows.length) {
				frappe.msgprint(__("No rows."));
				return;
			}
			filters = panel.parent_filter || {};
			user_filters = panel.user_filters || [];
			row_count = filtered_rows.length;
		}

		if (me._send_dialog) {
			me._send_dialog.close();
		}

		const DialogClass =
			mode === "sms" ? nce_events.panel_page.SmsDialog : nce_events.panel_page.EmailDialog;
		me._send_dialog = new DialogClass({
			doctype: doctype,
			config: config,
			filters: filters,
			user_filters: user_filters,
			row_count: row_count,
			z_index: me._float_z + 10,
			on_close: function () {
				me._send_dialog = null;
			},
		});
	}

	_close_send_panel() {
		if (this._send_dialog) {
			this._send_dialog.close();
			this._send_dialog = null;
		}
	}

	/* ── Card popover (hidden for now — removed old card_fields logic) ── */

	_hide_card() {
		$(".panel-card-popover").remove();
	}

	/* ── Drill-column width calc (disabled — drill buttons removed) ── */
	/*
	_calc_drill_col_width(child_doctypes) {
		const measurer = $('<div style="position:absolute;top:-9999px;left:-9999px;white-space:nowrap;visibility:hidden;"></div>');
		$(document.body).append(measurer);

		let total = 0;
		child_doctypes.forEach(function (child) {
			const btn = $(`<button class="btn btn-xs drill-btn">${frappe.utils.escape_html(child.label)} <span class="drill-count">(999)</span> <i class="fa fa-chevron-right" style="font-size:9px;"></i></button>`);
			measurer.append(btn);
			total += btn[0].offsetWidth + 6;
		});

		measurer.remove();
		return Math.ceil(total + 16);
	}
	*/

	/* ── Column auto-sizing ── */

	_calc_col_widths(columns, rows, float_w) {
		const sample = rows.slice(0, 20);
		const MIN_COL = 50;
		const MAX_COL = 500;
		const avg_chars = [];

		const me = this;
		columns.forEach(function (col) {
			let total = 0;
			let count = 0;
			sample.forEach(function (row) {
				let v = me._get_row_value(row, col.fieldname);
				const s = String(v || "");
				total += s.length;
				count++;
			});
			const header_len = (col.label || col.fieldname).length;
			let avg = count > 0 ? total / count : header_len;
			avg = Math.max(avg, header_len);
			avg_chars.push(Math.max(avg, 2));
		});

		let total_chars = 0;
		avg_chars.forEach(function (c) {
			total_chars += c;
		});

		const available = float_w - 160;

		let widths = [];
		avg_chars.forEach(function (c) {
			const w = Math.round((c / total_chars) * available);
			widths.push(Math.min(MAX_COL, Math.max(MIN_COL, w)));
		});

		let w_sum = 0;
		widths.forEach(function (w) {
			w_sum += w;
		});
		if (w_sum > available && w_sum > 0) {
			const scale = available / w_sum;
			widths = widths.map(function (w) {
				return Math.floor(w * scale);
			});
		}

		return widths;
	}

	/* ── Column drag resize ── */

	_bind_col_resize(doctype) {
		const me = this;
		const float_el = me.floats[doctype];
		if (!float_el) return;

		float_el.find(".col-resize-handle").on("mousedown", function (e) {
			e.preventDefault();
			e.stopPropagation();
			const $handle = $(this);
			const $th = $handle.closest("th");
			const start_x = e.clientX;
			const start_w = $th.outerWidth();
			const col_idx = parseInt($handle.attr("data-col"), 10);

			$("body").addClass("col-resizing");
			let raf = null;
			$(document).on("mousemove.col_resize", function (ev) {
				if (raf) return;
				raf = requestAnimationFrame(function () {
					const new_w = Math.max(30, start_w + ev.clientX - start_x);
					$th.css({ width: new_w, minWidth: new_w });
					float_el.find(".panel-table tbody tr").each(function () {
						$(this).children("td").eq(col_idx).css({ width: new_w, minWidth: new_w });
					});
					raf = null;
				});
			});
			$(document).on("mouseup.col_resize", function () {
				if (raf) {
					cancelAnimationFrame(raf);
					raf = null;
				}
				$("body").removeClass("col-resizing");
				$(document).off("mousemove.col_resize mouseup.col_resize");
			});
		});
	}

	/* ── Progressive background loading ── */

	_fetch_remaining(doctype) {
		const me = this;
		let panel = me.store.get_panel(doctype);
		if (!panel || !panel.data) return;

		const loaded = panel.data.rows.length;
		const total = panel.data.total;
		if (loaded >= total) {
			me._update_count(doctype);
			return;
		}

		const PAGE = me._PAGE_SIZE;
		me.store
			.fetch_data_page(doctype, loaded, PAGE)
			.then(function (page_data) {
				if (me._destroyed) return;
				panel = me.store.get_panel(doctype);
				if (!panel || !panel.data) return;

				const new_rows = page_data.rows || [];
				if (!new_rows.length) return;

				panel.data.rows = panel.data.rows.concat(new_rows);
				me._append_rows(doctype, new_rows);
				me._update_count(doctype);

				if (panel.data.rows.length < total) {
					me._fetch_remaining(doctype);
				}
			})
			.catch(function (err) {
				console.error(`Background fetch error for ${doctype}:`, err);
			});
	}

	_append_rows(doctype, new_rows) {
		const me = this;
		const float_el = me.floats[doctype];
		if (!float_el) return;

		const panel = me.store.get_panel(doctype);
		if (!panel || !panel.config || !panel.data) return;

		const tbody = float_el.find(".panel-table tbody");
		if (!tbody.length) return;

		const existing_count = tbody.find("tr").length;
		const is_wp = doctype === me.WP_DOCTYPE;

		const col_widths = [];
		float_el.find(".panel-table thead th").each(function () {
			col_widths.push(parseInt($(this).css("width"), 10) || 100);
		});

		const display_columns = me._get_display_columns(panel.config, panel.data.columns || []);
		const row_ctx = me._build_row_ctx(
			doctype,
			panel.config,
			panel.data,
			col_widths,
			is_wp,
			null,
			display_columns,
		);

		let html = "";
		new_rows.forEach(function (row, bi) {
			html += me._build_row_html(row, existing_count + bi, row_ctx);
		});

		tbody.append(html);
	}

	_update_count(doctype) {
		const me = this;
		const float_el = me.floats[doctype];
		if (!float_el) return;

		const panel = me.store.get_panel(doctype);
		if (!panel || !panel.data) return;

		const filtered = me._get_filtered_rows(doctype);
		const total = panel.data.total || 0;
		const loaded = panel.data.rows.length;
		let text;
		if (loaded < total) {
			text = `${filtered.length} / ${total} records (loading\u2026)`;
		} else if (filtered.length !== total) {
			text = `${filtered.length} / ${total} records`;
		} else {
			text = `${total} records`;
		}
		float_el.find(".pane-count").text(text);
	}

	/* ── Row HTML builder (shared by _render_panel and _append_rows) ── */

	_build_row_html(row, ri, ctx) {
		const me = this;
		const is_sel = ctx.selected_row && row.name === ctx.selected_row.name;
		let html = `<tr class="panel-row${is_sel ? " selected" : ""}${ri % 2 === 1 ? " alt" : ""}" data-row-idx="${ri}">`;

		ctx.columns.forEach(function (col, ci) {
			const fn = col.fieldname.toLowerCase();
			let value;
			if (col.is_action) {
				if (fn === "_email_action") value = me._get_row_value(row, ctx.email_field);
				else if (fn === "_phone_action") value = me._get_row_value(row, ctx.sms_field);
				else value = "";
			} else {
				value = me._get_row_value(row, col.fieldname);
			}
			if (value === null || value === undefined) value = "";
			if (typeof value === "object") value = JSON.stringify(value);
			if (!col.is_action && me._looks_like_date(value))
				value = frappe.datetime.str_to_user(value);

			const w = ctx.col_widths[ci] || 100;
			const parts = [`width:${w}px`, "min-width:30px"];

			if (col.is_action) {
				let cell_html = "";
				if (fn === "_email_action" && value && String(value).indexOf("@") !== -1) {
					cell_html =
						'<button type="button" class="btn btn-xs btn-default panel-cell-btn panel-email-one-btn" data-doctype="' +
						frappe.utils.escape_html(ctx.doctype) +
						'" data-row-name="' +
						frappe.utils.escape_html(row.name) +
						'" title="' +
						__("Send email") +
						'"><i class="fa fa-envelope"></i></button>';
				} else if (fn === "_phone_action" && value && /[\d+]/.test(String(value))) {
					const tel_val = String(value).replace(/\s+/g, "");
					cell_html =
						'<button type="button" class="btn btn-xs btn-default panel-cell-btn panel-tel-link" data-tel="' +
						frappe.utils.escape_html(tel_val) +
						'" title="' +
						__("Call") +
						'"><i class="fa fa-phone"></i></button> ';
					cell_html +=
						'<button type="button" class="btn btn-xs btn-default panel-cell-btn panel-sms-one-btn" data-doctype="' +
						frappe.utils.escape_html(ctx.doctype) +
						'" data-row-name="' +
						frappe.utils.escape_html(row.name) +
						'" title="' +
						__("Send SMS") +
						'"><i class="fa fa-comment"></i></button>';
				}
				html += `<td style="${parts.join(";")};">${cell_html}</td>`;
				return;
			}

			if (ctx.gender_tint_set[fn]) {
				let gv;
				const colGender = ctx.tint_by_gender[fn];
				if (colGender === "Male" && ctx.male_hex) {
					parts.push("font-weight:700 !important", `color:${ctx.male_hex} !important`);
				} else if (colGender === "Female" && ctx.female_hex) {
					parts.push("font-weight:700 !important", `color:${ctx.female_hex} !important`);
				} else {
					gv = me._get_row_gender(row, ctx.gender_col);
					if (me._looks_male(gv) && ctx.male_hex) {
						parts.push(
							"font-weight:700 !important",
							`color:${ctx.male_hex} !important`,
						);
					} else if (me._looks_female(gv) && ctx.female_hex) {
						parts.push(
							"font-weight:700 !important",
							`color:${ctx.female_hex} !important`,
						);
					}
				}
			} else if (col.is_link || col.is_related_link) {
				parts.push("color:royalblue !important", "text-decoration:underline");
			} else if (ctx.bold_set[fn]) {
				parts.push("font-weight:700 !important");
			}

			let cell_html = frappe.utils.escape_html(String(value));
			if (col.is_link && col.link_doctype && value) {
				const route = `/app/${col.link_doctype.toLowerCase().replace(/ /g, "-")}/${encodeURIComponent(value)}`;
				cell_html = `<a href="${route}" target="_blank" class="panel-link-val" style="color:royalblue;text-decoration:underline;">${cell_html}</a>`;
			}
			if (col.is_related_link && col.related_doctype) {
				cell_html = `<span class="panel-related-val" style="color:royalblue;text-decoration:underline;cursor:pointer;" data-related-dt="${frappe.utils.escape_html(col.related_doctype)}" data-link-field="${frappe.utils.escape_html(col.related_link_field)}" data-row-name="${frappe.utils.escape_html(row.name)}">${cell_html}</span>`;
			}
			html += `<td style="${parts.join(";")};">${cell_html}</td>`;
		});

		/* ── Drill buttons (disabled — link fields shown as columns instead) ──
		if (ctx.has_drills) {
			html += '<td class="drill-cell">';
			ctx.child_doctypes.forEach(function (child) {
				const count_key = `_count_${child.doctype}`;
				const cnt = row[count_key];
				const is_zero = (cnt === 0 || cnt === "0");
				html += `<button class="btn btn-xs drill-btn${is_zero ? " disabled" : ""}" data-child-dt="${frappe.utils.escape_html(child.doctype)}" data-link-field="${frappe.utils.escape_html(child.link_field)}" data-row-name="${frappe.utils.escape_html(row.name)}">${frappe.utils.escape_html(child.label)} <span class="drill-count">(${cnt == null ? "?" : cnt})</span> <i class="fa fa-chevron-right" style="font-size:9px;"></i></button>`;
			});
			html += "</td>";
		}
		*/

		html += "</tr>";
		return html;
	}

	_get_display_columns(config, base_columns) {
		let cols = base_columns.slice();
		const email_field = (config.email_field || "").trim().toLowerCase();
		const sms_field = (config.sms_field || "").trim().toLowerCase();
		if (email_field) cols.push({ fieldname: "_email_action", label: "", is_action: true });
		if (sms_field) cols.push({ fieldname: "_phone_action", label: "", is_action: true });
		return cols;
	}

	_build_row_ctx(doctype, config, data, col_widths, is_wp, selected_row, display_columns) {
		const columns = display_columns || data.columns || [];
		return {
			doctype: doctype,
			columns: columns,
			col_widths: col_widths,
			bold_set: this._field_set(config.bold_fields),
			male_hex: (config.male_hex || "").trim(),
			female_hex: (config.female_hex || "").trim(),
			gender_col: (config.gender_column || "").trim(),
			gender_tint_set: this._field_set(config.gender_color_fields),
			tint_by_gender: config.tint_by_gender || {},
			sms_field: (config.sms_field || "").toLowerCase(),
			email_field: (config.email_field || "").toLowerCase(),
			// child_doctypes: data.child_doctypes || [],   // drill buttons disabled
			// has_drills: !is_wp && (data.child_doctypes || []).length > 0,
			selected_row: selected_row || null,
		};
	}

	/* ── Shared draggable ── */

	_make_float_draggable(el, handle_selectors, ignore_selector, ns) {
		function start_drag(e) {
			if (ignore_selector && $(e.target).closest(ignore_selector).length) return;
			e.preventDefault();
			const sx = e.clientX,
				sy = e.clientY;
			let dx = 0,
				dy = 0;
			$("body").addClass("panel-float-dragging");
			$(document).on(`mousemove.${ns}`, function (ev) {
				dx = ev.clientX - sx;
				dy = ev.clientY - sy;
				el[0].style.transform = `translate(${dx}px,${dy}px)`;
			});
			$(document).on(`mouseup.${ns}`, function () {
				const sl = parseInt(el.css("left"), 10) || 0;
				const st = parseInt(el.css("top"), 10) || 0;
				el[0].style.transform = "";
				el[0].style.left = `${sl + dx}px`;
				el[0].style.top = `${Math.min(st + dy, window.innerHeight - 40)}px`;
				$("body").removeClass("panel-float-dragging");
				$(document).off(`mousemove.${ns} mouseup.${ns}`);
			});
		}
		handle_selectors.forEach(function (sel) {
			el.find(sel).on(`mousedown.${ns}`, start_drag);
		});
	}

	/* ── Utilities ── */

	_field_set(list) {
		const s = {};
		if (!list || !list.length) return s;
		list.forEach(function (f) {
			s[f.trim().toLowerCase()] = true;
		});
		return s;
	}

	_looks_like_date(v) {
		return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
	}

	/** Get value from row by key. Case-insensitive lookup (Phone/phone, etc.). */
	_get_row_value(row, key) {
		let v = row[key] || row[key.toLowerCase()] || row[key.toUpperCase()];
		if (v !== undefined && v !== null) return v;
		const want = key.toLowerCase();
		for (const k in row) {
			if (k.toLowerCase() === want) return row[k];
		}
		return undefined;
	}

	/** Get gender value from row. Case-insensitive key lookup. Auto-detects when gender_col empty. */
	_get_row_gender(row, gender_col) {
		const want = (gender_col || "gender").toLowerCase();
		const wantBare = want.split(".").pop();
		function find() {
			for (const k in row) {
				const kb = (k.split(".").pop() || "").toLowerCase();
				if (k.toLowerCase() === want || kb === wantBare) {
					const v = row[k];
					if (v != null && String(v).trim()) return String(v).trim().toLowerCase();
				}
			}
			return "";
		}
		const v = row[gender_col] || (gender_col && row[gender_col.toLowerCase()]);
		if (v != null && String(v).trim()) return String(v).trim().toLowerCase();
		return find();
	}

	_looks_male(v) {
		return /^(m|male|boy|man|men|boys)$/.test(v);
	}
	_looks_female(v) {
		return /^(f|female|girl|woman|women|girls)$/.test(v);
	}
};
