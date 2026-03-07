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

		me._open_wp_tables();
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
		me._create_float(me.WP_DOCTYPE, true);
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
		me._create_float(doctype, false);
		me._show_loading(doctype);

		me.store.fetch_config(doctype).then(function () {
			return me.store.fetch_data(doctype);
		}).then(function () {
			if (me._destroyed) return;
			me.store.fetch_child_doctypes(doctype).then(function () {
				me._render_panel(doctype);
			});
		});
	}

	/* ── Float management ── */

	_create_float(doctype, is_root) {
		if (this.floats[doctype]) {
			this._bring_to_front(doctype);
			return;
		}
		this._float_z += 1;
		if (!is_root) {
			this._float_offset += 30;
			if (this._float_offset > 150) this._float_offset = 30;
		}

		var float_el = $('<div class="panel-float" data-doctype="' + frappe.utils.escape_html(doctype) + '"></div>');
		if (is_root) {
			float_el.css({
				top: "60px", left: "40px",
				width: "70vw", height: "calc(100vh - 140px)",
				zIndex: this._float_z,
			});
		} else {
			float_el.css({
				top: (100 + this._float_offset) + "px",
				left: (180 + this._float_offset) + "px",
				zIndex: this._float_z,
			});
		}

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
		var child_doctypes = me.store._child_cache[doctype] || [];
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
					html += '<button class="btn btn-xs drill-btn" data-child-dt="' +
						frappe.utils.escape_html(child.doctype) +
						'" data-link-field="' + frappe.utils.escape_html(child.link_field) +
						'" data-row-name="' + frappe.utils.escape_html(row.name) +
						'">' + frappe.utils.escape_html(child.label) +
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

		if (!is_wp) {
			html += '<button class="panel-float-close" title="Close">&times;</button>';
		}
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
				if (!target_dt) {
					frappe.show_alert({ message: __("No frappe_doctype on this WP Tables row"), indicator: "orange" });
					return;
				}
				me.store.close_all_except(me.WP_DOCTYPE);
				Object.keys(me.floats).forEach(function (dt) {
					if (dt !== me.WP_DOCTYPE) {
						me.floats[dt].remove();
						delete me.floats[dt];
					}
				});
				me._open_doctype_panel(target_dt, me.WP_DOCTYPE, {});
			}
		});

		float_el.find(".drill-btn").on("click", function () {
			var child_dt = $(this).data("child-dt");
			var link_field = $(this).data("link-field");
			var row_name = $(this).data("row-name");
			if (!child_dt || !row_name) return;

			var parent_filter = {};
			parent_filter[link_field] = row_name;
			me._open_doctype_panel(child_dt, doctype, parent_filter);
		});
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

	/* ── Send dialog ── */

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

		var count = (panel.data.rows || []).length;
		if (!count) { frappe.msgprint(__("No rows.")); return; }

		var d = new frappe.ui.Dialog({
			title: (mode === "sms" ? __("Send SMS") : __("Send Email")) + " (" + count + " recipients)",
			fields: [
				{ fieldname: "source", fieldtype: "Select", label: __("Source"),
				  options: "Type a message\nUse Email Template", default: "Type a message",
				  onchange: function () {
					var v = d.get_value("source");
					d.fields_dict.message.$wrapper.toggle(v === "Type a message");
					d.fields_dict.template.$wrapper.toggle(v === "Use Email Template");
				  }},
				{ fieldname: "message", fieldtype: "Small Text", label: __("Message"),
				  description: __("Jinja2 tags supported. Sent to all {0} rows.", [count]) },
				{ fieldname: "template", fieldtype: "Link", label: __("Email Template"),
				  options: "Email Template", hidden: 1 },
				{ fieldname: "subject", fieldtype: "Data", label: __("Subject") },
				{ fieldname: "send_email_copy", fieldtype: "Check", label: __("Also send email copy"),
				  default: mode === "sms" ? 1 : 0 },
			],
			primary_action_label: __("Send"),
			primary_action: function (vals) {
				var body = vals.message || "";
				var subject = vals.subject || "";
				if (vals.source === "Use Email Template" && vals.template) {
					d.disable_primary_action();
					frappe.call({
						method: "frappe.client.get",
						args: { doctype: "Email Template", name: vals.template },
						callback: function (r) {
							if (!r.message) { d.enable_primary_action(); return; }
							body = r.message.response || "";
							subject = subject || r.message.subject || "";
							me._do_send(doctype, mode, recipient_field, body, subject, vals.send_email_copy, config.email_field, d);
						},
					});
					return;
				}
				if (!body.trim()) { frappe.msgprint(__("Enter a message or select a template.")); return; }
				me._do_send(doctype, mode, recipient_field, body, subject, vals.send_email_copy, config.email_field, d);
			},
		});
		d.fields_dict.template.$wrapper.hide();
		d.show();
	}

	_do_send(doctype, mode, recipient_field, body, subject, send_email_copy, email_field, dialog) {
		var panel = this.store.get_panel(doctype);
		var filters = panel ? panel.parent_filter : {};
		dialog.disable_primary_action();
		frappe.call({
			method: "nce_events.api.panel_api.send_panel_message",
			args: {
				root_doctype: doctype, filters: JSON.stringify(filters),
				mode: mode, recipient_field: recipient_field,
				body: body, subject: subject,
				send_email_copy: send_email_copy ? 1 : 0,
				email_field: email_field || "",
			},
			callback: function (r) {
				dialog.enable_primary_action();
				if (r.message) {
					frappe.show_alert({ message: __("{0} messages sent", [r.message.sent || 0]), indicator: "green" });
					dialog.hide();
				}
			},
			error: function () { dialog.enable_primary_action(); },
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
