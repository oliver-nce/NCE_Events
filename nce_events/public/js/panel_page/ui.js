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
		this.setup();
	}

	/* ── Setup ── */

	setup() {
		var me = this;
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
		var FONT_MAP = {
			"Inter": "'Inter', sans-serif",
			"Source Sans 3": "'Source Sans 3', sans-serif",
			"Arial": "Arial, sans-serif",
			"Helvetica": "Helvetica, Arial, sans-serif",
			"Georgia": "Georgia, serif",
			"Verdana": "Verdana, sans-serif",
			"Tahoma": "Tahoma, sans-serif",
			"System Default": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
		};

		frappe.call({
			method: "frappe.client.get",
			args: { doctype: "Display Settings", name: "Display Settings" },
			async: false,
			callback: function (r) {
				if (!r || !r.message) return;
				var doc = r.message;
				var font = FONT_MAP[doc.font_family] || "'Inter', sans-serif";
				var weight = parseInt(doc.font_weight) || 400;
				var size = doc.font_size || "13px";
				var color = doc.text_color || "#333333";
				var muted = doc.muted_text_color || "#555555";

				var sel = ".panel-float, .panel-float .panel-table td, .panel-float .panel-table th, " +
					".panel-float .pane-label, .panel-float .pane-count, .panel-float .drill-btn, " +
					".panel-float .panel-float-footer, .panel-float .pane-filter-widget, " +
					".panel-float .filter-col-select, " +
					".panel-float .filter-op-select, .panel-float .filter-val-input";

				var send_sel = ".send-panel, .send-panel .send-field, .send-panel .send-field-label, " +
					".send-panel .send-panel-title, .send-panel .send-check-label, " +
					".send-panel .send-panel-actions .btn, " +
					".send-preview-body, .send-preview-subject, .send-preview-recipient";

				var css = sel + ", " + send_sel + " {\n" +
					"  font-family: " + font + " !important;\n" +
					"  font-weight: " + weight + " !important;\n" +
					"  font-size: " + size + " !important;\n" +
					"}\n" +
					".panel-float .panel-table td, .send-panel .send-field, " +
					".send-preview-body, .send-preview-subject {\n" +
					"  color: " + color + " !important;\n" +
					"}\n" +
					".panel-float .panel-table th,\n" +
					".panel-float .pane-count,\n" +
					".panel-float .drill-btn.disabled,\n" +
					".send-panel .send-field-label, .send-preview-recipient {\n" +
					"  color: " + muted + " !important;\n" +
					"}\n";

				$("#display-settings-runtime").remove();
				$("<style>").attr("id", "display-settings-runtime").text(css).appendTo("head");
			}
		});
	}

	destroy() {
		this._destroyed = true;
		this._hide_card();
		if (this._click_timer) clearTimeout(this._click_timer);
		$(document).off("mousedown.panel_explorer");
		var me = this;
		Object.keys(me.floats).forEach(function (dt) {
			if (me.floats[dt]) me.floats[dt].remove();
		});
		if (me.container) me.container.remove();
	}

	/* ── WP Tables (root panel) ── */

	_open_wp_tables() {
		var me = this;
		me.store.open_panel(me.WP_DOCTYPE, null, {});
		me._create_float(me.WP_DOCTYPE, true, null);
		me._show_loading(me.WP_DOCTYPE);

		me.store.fetch_config(me.WP_DOCTYPE).then(function () {
			return me.store.fetch_data(me.WP_DOCTYPE);
		}).then(function () {
			if (me._destroyed) return;
			me._render_panel(me.WP_DOCTYPE);
		});
	}

	/* ── Open a DocType panel (from WP Tables row click or drill-down) ── */

	_open_doctype_panel(doctype, parent_doctype, parent_filter) {
		var me = this;
		me.store.open_panel(doctype, parent_doctype, parent_filter);
		me._create_float(doctype, false, parent_doctype);
		me._show_loading(doctype);

		me.store.fetch_config(doctype).then(function () {
			return me.store.fetch_data(doctype);
		}).then(function () {
			if (!me._destroyed) me._render_panel(doctype);
		}).catch(function (err) {
			console.error("Error loading panel " + doctype + ":", err);
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

		var top = 60, left = 40;
		if (!is_root && parent_doctype && this.floats[parent_doctype]) {
			var parent_el = this.floats[parent_doctype];
			top = (parseInt(parent_el.css("top"), 10) || 60) + 100;
			left = (parseInt(parent_el.css("left"), 10) || 40) + 100;
		} else if (!is_root) {
			top = 160;
			left = 140;
		}

		var float_el = $('<div class="panel-float" data-doctype="' + frappe.utils.escape_html(doctype) + '"></div>');
		float_el.css({
			top: top + "px", left: left + "px",
			width: "900px", height: "600px",
			zIndex: this._float_z,
		});

		var pane_el = $(
			'<div class="panel-pane" data-doctype="' + frappe.utils.escape_html(doctype) + '">' +
			'<div class="panel-pane-header"></div>' +
			'<div class="panel-pane-body"></div>' +
			'</div>'
		);
		var footer_el = $('<div class="panel-float-footer">' + frappe.utils.escape_html(doctype) + '</div>');
		float_el.append(pane_el, footer_el);
		$(document.body).append(float_el);
		this.floats[doctype] = float_el;

		var me = this;
		float_el.on("mousedown.float_focus", function () {
			me._bring_to_front(doctype);
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
		var me = this;
		var descendants = me.store._get_descendants(doctype);
		descendants.forEach(function (dt) {
			if (me.floats[dt]) { me.floats[dt].remove(); delete me.floats[dt]; }
		});
		if (me.floats[doctype]) { me.floats[doctype].remove(); delete me.floats[doctype]; }
		me.store.close_panel(doctype);
	}

	_show_loading(doctype) {
		var float_el = this.floats[doctype];
		if (!float_el) return;
		float_el.find(".panel-pane-body").html(
			'<div class="panel-loading">' + __("Loading\u2026") + '</div>'
		);
	}

	_make_draggable(float_el) {
		function start_drag(e) {
			if ($(e.target).closest(".pane-header-btn, .panel-float-close, .pane-filter-widget, .drill-btn").length) return;
			e.preventDefault();
			var sx = e.clientX, sy = e.clientY;
			var sl = parseInt(float_el.css("left"), 10) || 0;
			var st = parseInt(float_el.css("top"), 10) || 0;
			$("body").addClass("panel-float-dragging");
			$(document).on("mousemove.float_drag", function (ev) {
				float_el.css({
					left: (sl + ev.clientX - sx) + "px",
					top: Math.min(st + ev.clientY - sy, window.innerHeight - 40) + "px",
				});
			});
			$(document).on("mouseup.float_drag", function () {
				$("body").removeClass("panel-float-dragging");
				$(document).off("mousemove.float_drag mouseup.float_drag");
			});
		}
		float_el.find(".panel-pane-header").on("mousedown.float_drag", start_drag);
		float_el.find(".panel-float-footer").on("mousedown.float_drag", start_drag);
	}

	/* ── Panel rendering ── */

	_render_panel(doctype, opts) {
		var me = this;
		var float_el = me.floats[doctype];
		if (!float_el || me._destroyed) return;

		var panel = me.store.get_panel(doctype);
		if (!panel || !panel.config || !panel.data) return;

		var skip_header = opts && opts.skip_header;
		if (!skip_header) me._render_header(doctype);

		var config = panel.config;
		var data = panel.data;
		var rows = me._get_filtered_rows(doctype);
		var columns = data.columns || [];

		var bold_set = me._field_set(config.bold_fields);
		var male_hex = (config.male_hex || "").trim();
		var female_hex = (config.female_hex || "").trim();
		var gender_col = (config.gender_column || "").trim();
		var gender_tint_set = me._field_set(config.gender_color_fields);

		var is_wp = (doctype === me.WP_DOCTYPE);
		var child_doctypes = data.child_doctypes || [];
		var has_drills = !is_wp && child_doctypes.length > 0;

		var html = '<table class="panel-table"><thead><tr>';
		columns.forEach(function (col) {
			var fn = col.fieldname.toLowerCase();
			var extra = bold_set[fn] ? ' style="font-weight:700;"' : "";
			html += "<th" + extra + ">" + frappe.utils.escape_html(col.label) + "</th>";
		});
		if (has_drills) {
			html += '<th class="drill-col"></th>';
		}
		html += "</tr></thead><tbody>";

		rows.forEach(function (row, ri) {
			var sel = panel.selected_row;
			var is_sel = sel && row.name === sel.name;
			html += '<tr class="panel-row' + (is_sel ? " selected" : "") + (ri % 2 === 1 ? " alt" : "") +
				'" data-row-idx="' + ri + '">';

			columns.forEach(function (col) {
				var fn = col.fieldname.toLowerCase();
				var value = row[col.fieldname];
				if (value === null || value === undefined) value = row[fn];
				if (value === null || value === undefined) value = "";
				if (me._looks_like_date(value)) value = frappe.datetime.str_to_user(value);

				var style = "";
				if (gender_col && gender_tint_set[fn]) {
					var gv = String(row[gender_col] || row[gender_col.toLowerCase()] || "").trim().toLowerCase();
					if (me._looks_male(gv) && male_hex) {
						style = ' style="font-weight:700;color:' + male_hex + ';"';
					} else if (me._looks_female(gv) && female_hex) {
						style = ' style="font-weight:700;color:' + female_hex + ';"';
					}
				} else if (bold_set[fn]) {
					style = ' style="font-weight:700;"';
				}

				html += "<td" + style + ">" + frappe.utils.escape_html(String(value)) + "</td>";
			});

			if (has_drills) {
				html += '<td class="drill-cell">';
				child_doctypes.forEach(function (child) {
					var count_key = "_count_" + child.doctype;
					var cnt = row[count_key];
					var is_zero = (cnt === 0 || cnt === "0");
					html += '<button class="btn btn-xs drill-btn' + (is_zero ? " disabled" : "") +
						'" data-child-dt="' + frappe.utils.escape_html(child.doctype) +
						'" data-link-field="' + frappe.utils.escape_html(child.link_field) +
						'" data-row-name="' + frappe.utils.escape_html(row.name) +
						'">' + frappe.utils.escape_html(child.label) +
						' <span class="drill-count">(' + (cnt == null ? "?" : cnt) + ')</span>' +
						' <i class="fa fa-chevron-right" style="font-size:9px;"></i></button>';
				});
				html += "</td>";
			}

			html += "</tr>";
		});

		html += "</tbody></table>";

		float_el.find(".panel-pane-body").html(html);
		me._bind_events(doctype);

		if (!skip_header && config.show_filter) {
			var uf = me.store.get_user_filters(doctype);
			if (uf.length > 0) {
				me._render_filter_widget(doctype);
			}
		}
	}

	/* ── Header ── */

	_render_header(doctype) {
		var me = this;
		var float_el = me.floats[doctype];
		if (!float_el) return;

		var panel = me.store.get_panel(doctype);
		if (!panel || !panel.config || !panel.data) return;

		var config = panel.config;
		var label = config.header_text || doctype;
		var filtered_rows = me._get_filtered_rows(doctype);
		var total = panel.data.total || 0;
		var is_wp = (doctype === me.WP_DOCTYPE);

		var html = '<div class="pane-title-row">';
		html += '<span class="pane-label">' + frappe.utils.escape_html(label) + '</span>';
		html += '<span class="pane-title-right">';

		if (config.show_filter) {
			html += '<button class="btn btn-xs btn-default pane-header-btn pane-filter-toggle-btn" title="Filter">' +
				'<i class="fa fa-filter"></i></button>';
		}
		if (config.show_sheets) {
			html += '<button class="btn btn-xs btn-default pane-header-btn pane-sheets-btn" title="Export">' +
				'<i class="fa fa-table"></i></button>';
		}
		if (config.show_email) {
			html += '<button class="btn btn-xs btn-default pane-header-btn pane-email-btn" title="Email">' +
				'<i class="fa fa-envelope"></i></button>';
		}
		if (config.show_sms) {
			html += '<button class="btn btn-xs btn-default pane-header-btn pane-sms-btn" title="SMS">' +
				'<i class="fa fa-comment"></i></button>';
		}

		html += '<span class="pane-count">';
		html += (filtered_rows.length !== total) ? (filtered_rows.length + " / " + total) : String(total);
		html += ' records</span>';

		html += '<button class="panel-float-close" title="Close">&times;</button>';
		html += '</span></div>';

		var header_el = float_el.find(".panel-pane-header");
		header_el.html(html);

		if (config.show_filter) {
			header_el.find(".pane-filter-toggle-btn").on("click", function () {
				var widget = float_el.find(".pane-filter-widget");
				if (widget.length) {
					widget.remove();
				} else {
					me._render_filter_widget(doctype);
				}
			});
		}
		header_el.find(".pane-sheets-btn").on("click", function () { me._on_sheets(doctype); });
		header_el.find(".pane-email-btn").on("click", function () { me._open_send_dialog(doctype, "email"); });
		header_el.find(".pane-sms-btn").on("click", function () { me._open_send_dialog(doctype, "sms"); });
		header_el.find(".panel-float-close").on("click", function () { me._close_float(doctype); });

		float_el.find(".panel-float-footer").text(label);
	}

	/* ── Event binding ── */

	_bind_events(doctype) {
		var me = this;
		var float_el = me.floats[doctype];
		if (!float_el) return;
		var is_wp = (doctype === me.WP_DOCTYPE);

		float_el.find(".panel-row").on("click", function (e) {
			if ($(e.target).closest(".drill-btn").length) return;

			var ri = parseInt($(this).data("row-idx"), 10);
			var rows = me._get_filtered_rows(doctype);
			var row = rows[ri];
			if (!row) return;

			me.store.select_row(doctype, row);
			float_el.find(".panel-row").removeClass("selected");
			$(this).addClass("selected");

			if (is_wp) {
				var target_dt = row.frappe_doctype;
				if (target_dt) {
					me._wp_open_target(target_dt);
				} else {
					frappe.db.get_value("WP Tables", row.name, "frappe_doctype").then(function (r) {
						var dt = r && r.message && r.message.frappe_doctype;
						if (!dt) {
							frappe.show_alert({ message: __("No frappe_doctype on this WP Tables row"), indicator: "orange" });
							return;
						}
						me._wp_open_target(dt);
					});
				}
			}
		});

		float_el.find(".drill-btn").on("click", function () {
			if ($(this).hasClass("disabled")) return;
			var child_dt = $(this).data("child-dt");
			var link_field = $(this).data("link-field");
			var row_name = $(this).data("row-name");
			if (!child_dt || !row_name) return;

			var parent_filter = {};
			parent_filter[link_field] = row_name;
			me._open_doctype_panel(child_dt, doctype, parent_filter);
		});
	}

	_wp_open_target(target_dt) {
		var me = this;
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
		var panel = this.store.get_panel(doctype);
		if (!panel || !panel.data) return [];
		var all_rows = panel.data.rows || [];
		var conditions = panel.user_filters || [];
		var active = conditions.filter(function (c) { return c.field && c.value !== ""; });
		if (!active.length) return all_rows;
		return all_rows.filter(function (row) {
			return active.every(function (c) {
				var cell = String(row[c.field] == null ? "" : row[c.field]);
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

	_render_filter_widget(doctype) {
		var me = this;
		var float_el = me.floats[doctype];
		if (!float_el) return;
		var panel = me.store.get_panel(doctype);
		if (!panel || !panel.data) return;

		var conditions = me.store.get_user_filters(doctype);
		var ops = ["=", "!=", ">", "<", "like", "in"];
		var columns = panel.data.columns || [];

		var widget = $('<div class="pane-filter-widget"></div>');

		conditions.forEach(function (cond, i) {
			var row = $('<div class="filter-condition-row"></div>');
			var col_sel = $('<select class="filter-col-select"></select>');
			col_sel.append('<option value="">— column —</option>');
			columns.forEach(function (col) {
				var opt = $("<option></option>").val(col.fieldname).text(col.label);
				if (col.fieldname === cond.field) opt.prop("selected", true);
				col_sel.append(opt);
			});
			var op_sel = $('<select class="filter-op-select"></select>');
			ops.forEach(function (op) {
				var opt = $("<option></option>").val(op).text(op);
				if (op === cond.op) opt.prop("selected", true);
				op_sel.append(opt);
			});
			var val_inp = $('<input class="filter-val-input" type="text" placeholder="value">').val(cond.value);
			var rm_btn = $('<button class="btn btn-xs filter-remove-btn" title="Remove">&times;</button>');

			rm_btn.on("click", function () {
				conditions.splice(i, 1);
				me.store.set_user_filters(doctype, conditions);
				me._render_filter_widget(doctype);
				me._render_panel(doctype, { skip_header: false });
			});
			col_sel.on("change", function () { conditions[i].field = $(this).val(); me._render_panel(doctype, { skip_header: true }); });
			op_sel.on("change", function () { conditions[i].op = $(this).val(); me._render_panel(doctype, { skip_header: true }); });
			val_inp.on("input", function () {
				conditions[i].value = $(this).val();
				if (me._filter_debounce) clearTimeout(me._filter_debounce);
				me._filter_debounce = setTimeout(function () { me._render_panel(doctype, { skip_header: true }); }, 400);
			});

			row.append(col_sel, op_sel, val_inp, rm_btn);
			widget.append(row);
		});

		var add_btn = $('<button class="btn btn-xs btn-default filter-add-btn">+ Add Filter</button>');
		add_btn.on("click", function () {
			conditions.push({ field: "", op: "=", value: "" });
			me.store.set_user_filters(doctype, conditions);
			me._render_filter_widget(doctype);
		});
		widget.append(add_btn);

		float_el.find(".pane-filter-widget").remove();
		float_el.find(".panel-pane-header").append(widget);
	}

	/* ── Export ── */

	_on_sheets(doctype) {
		var panel = this.store.get_panel(doctype);
		var filters = panel ? panel.parent_filter : {};
		frappe.call({
			method: "nce_events.api.panel_api.export_panel_data",
			args: { root_doctype: doctype, filters: JSON.stringify(filters) },
			callback: function (r) {
				if (!r.message) return;
				var url = window.location.origin + r.message.url;
				var formula = '=IMPORTDATA("' + url + '")';
				if (navigator.clipboard && navigator.clipboard.writeText) {
					navigator.clipboard.writeText(formula).then(function () {
						frappe.show_alert({ message: __("Link copied — paste in Google Sheets"), indicator: "green" });
					});
				} else {
					frappe.show_alert({ message: __("Exported {0} rows", [r.message.rows_exported]), indicator: "green" });
				}
			},
		});
	}

	/* ── Send dialog (custom floating panel) ── */

	_open_send_dialog(doctype, mode) {
		var me = this;
		var panel = me.store.get_panel(doctype);
		if (!panel || !panel.config || !panel.data) return;

		var config = panel.config;
		var recipient_field = mode === "sms" ? config.sms_field : config.email_field;
		if (!recipient_field) {
			frappe.msgprint(__("No {0} field configured for this panel.", [mode === "sms" ? "SMS" : "Email"]));
			return;
		}

		var rows = panel.data.rows || [];
		var count = rows.length;
		if (!count) { frappe.msgprint(__("No rows.")); return; }

		if (me._send_panel_el) { me._close_send_panel(); }

		var title = (mode === "sms" ? "Send SMS" : "Send Email") + " (" + count + " recipients)";

		var el = $('<div class="send-panel"></div>');
		el.html(
			'<div class="send-panel-header">' +
				'<span class="send-panel-title">' + frappe.utils.escape_html(title) + '</span>' +
				'<button class="send-panel-close" title="Close">&times;</button>' +
			'</div>' +
			'<div class="send-panel-body">' +
				'<div class="send-panel-form">' +
					'<label class="send-field-label">Source</label>' +
					'<select class="send-field send-source-select">' +
						'<option value="type">Type a message</option>' +
						'<option value="template">Use Email Template</option>' +
					'</select>' +
					'<label class="send-field-label">Subject</label>' +
					'<input class="send-field send-subject-input" type="text">' +
					'<div class="send-message-section">' +
						'<label class="send-field-label">Message</label>' +
						'<textarea class="send-field send-message-input" placeholder="Jinja2 tags supported. Sent to all ' + count + ' rows."></textarea>' +
					'</div>' +
					'<div class="send-template-section" style="display:none;">' +
						'<label class="send-field-label">Email Template</label>' +
						'<input class="send-field send-template-input" type="text" placeholder="Template name...">' +
					'</div>' +
					'<label class="send-check-label"><input type="checkbox" class="send-copy-check"' +
						(mode === "sms" ? ' checked' : '') + '> Also send email copy</label>' +
					'<div class="send-panel-actions">' +
						'<button class="btn btn-xs btn-default send-preview-btn"><i class="fa fa-eye"></i> Preview</button>' +
						'<span class="send-actions-right">' +
							'<button class="btn btn-xs btn-default send-cancel-btn">Cancel</button>' +
							'<button class="btn btn-xs btn-primary send-send-btn">Send</button>' +
						'</span>' +
					'</div>' +
				'</div>' +
				'<div class="send-panel-preview" style="display:none;">' +
					'<div class="send-preview-header">' +
						'<span class="send-preview-title">Preview</span>' +
						'<button class="send-preview-close" title="Close preview">&times;</button>' +
					'</div>' +
					'<div class="send-preview-recipient"></div>' +
					'<div class="send-preview-subject"></div>' +
					'<div class="send-preview-body"></div>' +
				'</div>' +
			'</div>'
		);

		el.css({ top: "80px", left: "60px", zIndex: me._float_z + 10 });
		$(document.body).append(el);
		me._send_panel_el = el;
		me._send_panel_mode = mode;
		me._send_panel_doctype = doctype;

		me._make_send_panel_draggable(el);
		me._make_send_panel_resizable(el);

		var source_sel = el.find(".send-source-select");
		var msg_section = el.find(".send-message-section");
		var tpl_section = el.find(".send-template-section");
		var tpl_input = el.find(".send-template-input");

		function _open_tags() {
			if (nce_events.schema_explorer && nce_events.schema_explorer.open) {
				nce_events.schema_explorer.open(doctype);
			}
		}
		function _close_tags() {
			if (nce_events.schema_explorer && nce_events.schema_explorer.close) {
				nce_events.schema_explorer.close();
			}
		}

		source_sel.on("change", function () {
			if (source_sel.val() === "type") {
				msg_section.show(); tpl_section.hide();
				_open_tags();
			} else {
				msg_section.hide(); tpl_section.show();
				_close_tags();
			}
		});

		if (tpl_input.length) {
			me._setup_template_autocomplete(tpl_input);
		}

		el.find(".send-panel-close").on("click", function () { me._close_send_panel(); });
		el.find(".send-cancel-btn").on("click", function () { me._close_send_panel(); });
		el.find(".send-preview-close").on("click", function () { el.find(".send-panel-preview").hide(); });

		el.find(".send-preview-btn").on("click", function () {
			me._do_preview(doctype);
		});

		el.find(".send-send-btn").on("click", function () {
			me._do_send_from_panel(doctype, mode, recipient_field, config);
		});

		_open_tags();
	}

	_setup_template_autocomplete(input_el) {
		var list_el = $('<div class="send-template-list"></div>').insertAfter(input_el);
		var debounce;
		input_el.on("input", function () {
			clearTimeout(debounce);
			debounce = setTimeout(function () {
				var q = input_el.val().trim();
				if (!q) { list_el.empty().hide(); return; }
				frappe.call({
					method: "frappe.client.get_list",
					args: { doctype: "Email Template", filters: { name: ["like", "%" + q + "%"] }, fields: ["name"], limit_page_length: 8 },
					callback: function (r) {
						list_el.empty();
						(r.message || []).forEach(function (t) {
							var item = $('<div class="send-template-item"></div>').text(t.name);
							item.on("click", function () {
								input_el.val(t.name);
								list_el.empty().hide();
							});
							list_el.append(item);
						});
						list_el.toggle(!!(r.message && r.message.length));
					}
				});
			}, 200);
		});
		input_el.on("blur", function () {
			setTimeout(function () { list_el.hide(); }, 200);
		});
	}

	_do_preview(doctype) {
		var me = this;
		var el = me._send_panel_el;
		if (!el) return;
		var panel = me.store.get_panel(doctype);
		if (!panel) return;
		var filters = panel.parent_filter || {};

		var body = "", subject = el.find(".send-subject-input").val() || "";
		var source = el.find(".send-source-select").val();

		function render_preview(body_text, subject_text) {
			el.find(".send-preview-btn").prop("disabled", true);
			frappe.call({
				method: "nce_events.api.panel_api.preview_panel_message",
				args: {
					root_doctype: doctype,
					filters: JSON.stringify(filters),
					body: body_text,
					subject: subject_text,
				},
				callback: function (r) {
					el.find(".send-preview-btn").prop("disabled", false);
					if (!r.message) return;
					if (r.message.error) { frappe.msgprint(r.message.error); return; }
					var preview_el = el.find(".send-panel-preview");
					var ctx = r.message.context || {};
					var recipient_info = Object.keys(ctx).slice(0, 3).map(function (k) { return k + ": " + ctx[k]; }).join(" | ");
					preview_el.find(".send-preview-recipient").text(recipient_info);
					preview_el.find(".send-preview-subject").text(r.message.rendered_subject || "(No subject)");
					preview_el.find(".send-preview-body").html(r.message.rendered_body || "");
					preview_el.show();
				},
				error: function () { el.find(".send-preview-btn").prop("disabled", false); },
			});
		}

		if (source === "template") {
			var tpl_name = el.find(".send-template-input").val().trim();
			if (!tpl_name) { frappe.msgprint(__("Select a template first.")); return; }
			frappe.call({
				method: "frappe.client.get",
				args: { doctype: "Email Template", name: tpl_name },
				callback: function (r) {
					if (!r.message) return;
					render_preview(r.message.response || "", subject || r.message.subject || "");
				}
			});
		} else {
			body = el.find(".send-message-input").val() || "";
			if (!body.trim()) { frappe.msgprint(__("Enter a message first.")); return; }
			render_preview(body, subject);
		}
	}

	_do_send_from_panel(doctype, mode, recipient_field, config) {
		var me = this;
		var el = me._send_panel_el;
		if (!el) return;
		var panel = me.store.get_panel(doctype);
		var filters = panel ? panel.parent_filter : {};

		var source = el.find(".send-source-select").val();
		var body = el.find(".send-message-input").val() || "";
		var subject = el.find(".send-subject-input").val() || "";
		var send_copy = el.find(".send-copy-check").is(":checked") ? 1 : 0;
		var send_btn = el.find(".send-send-btn");

		function do_send(final_body, final_subject) {
			send_btn.prop("disabled", true).text("Sending...");
			frappe.call({
				method: "nce_events.api.panel_api.send_panel_message",
				args: {
					root_doctype: doctype, filters: JSON.stringify(filters),
					mode: mode, recipient_field: recipient_field,
					body: final_body, subject: final_subject,
					send_email_copy: send_copy,
					email_field: config.email_field || "",
				},
				callback: function (r) {
					send_btn.prop("disabled", false).text("Send");
					if (r.message) {
						frappe.show_alert({ message: __("{0} messages sent", [r.message.sent || 0]), indicator: "green" });
						me._close_send_panel();
					}
				},
				error: function () { send_btn.prop("disabled", false).text("Send"); },
			});
		}

		if (source === "template") {
			var tpl_name = el.find(".send-template-input").val().trim();
			if (!tpl_name) { frappe.msgprint(__("Select a template.")); return; }
			frappe.call({
				method: "frappe.client.get",
				args: { doctype: "Email Template", name: tpl_name },
				callback: function (r) {
					if (!r.message) return;
					do_send(r.message.response || "", subject || r.message.subject || "");
				}
			});
			return;
		}
		if (!body.trim()) { frappe.msgprint(__("Enter a message or select a template.")); return; }
		do_send(body, subject);
	}

	_close_send_panel() {
		if (this._send_panel_el) {
			this._send_panel_el.remove();
			this._send_panel_el = null;
		}
		if (nce_events.schema_explorer && nce_events.schema_explorer.close) {
			nce_events.schema_explorer.close();
		}
	}

	_make_send_panel_draggable(el) {
		function start_drag(e) {
			if ($(e.target).closest("button, input, textarea, select, .send-template-list").length) return;
			e.preventDefault();
			var sx = e.clientX, sy = e.clientY;
			var sl = parseInt(el.css("left"), 10) || 0;
			var st = parseInt(el.css("top"), 10) || 0;
			$("body").addClass("panel-float-dragging");
			$(document).on("mousemove.send_drag", function (ev) {
				el.css({ left: (sl + ev.clientX - sx) + "px", top: Math.min(st + ev.clientY - sy, window.innerHeight - 40) + "px" });
			});
			$(document).on("mouseup.send_drag", function () {
				$("body").removeClass("panel-float-dragging");
				$(document).off("mousemove.send_drag mouseup.send_drag");
			});
		}
		el.find(".send-panel-header").on("mousedown.send_drag", start_drag);
	}

	_make_send_panel_resizable(el) {
		var handle = $('<div class="send-panel-resize-handle"></div>');
		el.append(handle);
		handle.on("mousedown", function (e) {
			e.preventDefault(); e.stopPropagation();
			var sw = el.width(), sh = el.height();
			var sx = e.clientX, sy = e.clientY;
			$("body").addClass("panel-float-dragging");
			$(document).on("mousemove.send_resize", function (ev) {
				el.css({ width: Math.max(500, sw + ev.clientX - sx) + "px", height: Math.max(300, sh + ev.clientY - sy) + "px" });
			});
			$(document).on("mouseup.send_resize", function () {
				$("body").removeClass("panel-float-dragging");
				$(document).off("mousemove.send_resize mouseup.send_resize");
			});
		});
	}

	/* ── Card popover (hidden for now — removed old card_fields logic) ── */

	_hide_card() {
		$(".panel-card-popover").remove();
	}

	/* ── Utilities ── */

	_field_set(list) {
		var s = {};
		if (!list || !list.length) return s;
		list.forEach(function (f) { s[f.trim().toLowerCase()] = true; });
		return s;
	}

	_looks_like_date(v) {
		return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
	}

	_looks_male(v) { return /^(m|male|boy|man|men|boys)$/.test(v); }
	_looks_female(v) { return /^(f|female|girl|woman|women|girls)$/.test(v); }
};
