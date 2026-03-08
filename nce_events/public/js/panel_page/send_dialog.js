frappe.provide("nce_events.panel_page");

nce_events.panel_page.SendDialog = class SendDialog {
	constructor(opts) {
		this.doctype = opts.doctype;
		this.mode = opts.mode;
		this.config = opts.config;
		this.filters = opts.filters || {};
		this.row_count = opts.row_count || 0;
		this.z_index = opts.z_index || 110;
		this.on_close = opts.on_close || null;
		this.el = null;

		this._build();
		this._bind();
	}

	/* ── Build DOM ── */

	_build() {
		const me = this;
		const count = me.row_count;
		const mode = me.mode;
		const title = `${mode === "sms" ? "Send SMS" : "Send Email"} (${count} recipients)`;

		const el = $('<div class="send-panel"></div>');
		el.html(`
			<div class="send-panel-header">
				<span class="send-panel-title">${frappe.utils.escape_html(title)}</span>
				<button class="send-panel-close" title="Close">&times;</button>
			</div>
			<div class="send-panel-body">
				<div class="send-panel-form">
					<label class="send-field-label">Source</label>
					<select class="send-field send-source-select">
						<option value="type">Type a message</option>
						<option value="template">Use Email Template</option>
					</select>
					<label class="send-field-label">Subject</label>
					<input class="send-field send-subject-input" type="text">
					<div class="send-message-section">
						<label class="send-field-label">Message</label>
						<textarea class="send-field send-message-input" placeholder="Jinja2 tags supported. Sent to all ${count} rows."></textarea>
					</div>
					<div class="send-template-section" style="display:none;">
						<label class="send-field-label">Email Template</label>
						<input class="send-field send-template-input" type="text" placeholder="Template name...">
					</div>
					<label class="send-check-label"><input type="checkbox" class="send-copy-check"${mode === "sms" ? " checked" : ""}> Also send email copy</label>
					<div class="send-panel-actions">
						<button class="btn btn-xs btn-default send-preview-btn"><i class="fa fa-eye"></i> Preview</button>
						<span class="send-actions-right">
							<button class="btn btn-xs btn-default send-cancel-btn">Cancel</button>
							<button class="btn btn-xs btn-primary send-send-btn">Send</button>
						</span>
					</div>
				</div>
				<div class="send-panel-preview" style="display:none;">
					<div class="send-preview-header">
						<span class="send-preview-title">Preview</span>
						<button class="send-preview-close" title="Close preview">&times;</button>
					</div>
					<div class="send-preview-subject"></div>
					<div class="send-preview-body"></div>
					<div class="send-test-row">
						<input class="send-field send-test-input" type="text" placeholder="${mode === "sms" ? "Test phone number..." : "Test email address..."}">
						<button class="btn btn-xs btn-default send-test-btn"><i class="fa fa-paper-plane"></i> Send Test</button>
					</div>
				</div>
			</div>
		`);

		el.css({ top: "80px", left: "60px", zIndex: me.z_index });
		$(document.body).append(el);
		me.el = el;

		me._make_draggable(el);
		me._make_resizable(el);
	}

	/* ── Bind events ── */

	_bind() {
		const me = this;
		const el = me.el;

		const source_sel = el.find(".send-source-select");
		const msg_section = el.find(".send-message-section");
		const tpl_section = el.find(".send-template-section");
		const tpl_input = el.find(".send-template-input");

		source_sel.on("change", function () {
			if (source_sel.val() === "type") {
				msg_section.show(); tpl_section.hide();
				me._open_tags();
			} else {
				msg_section.hide(); tpl_section.show();
				me._close_tags();
			}
		});

		if (tpl_input.length) {
			me._setup_template_autocomplete(tpl_input);
		}

		el.find(".send-panel-close").on("click", function () { me.close(); });
		el.find(".send-cancel-btn").on("click", function () { me.close(); });
		el.find(".send-preview-close").on("click", function () { el.find(".send-panel-preview").hide(); });

		el.on("click", ".send-preview-btn", function () { me._do_preview(); });
		el.on("click", ".send-send-btn", function () { me._do_send(); });
		el.on("click", ".send-test-btn", function () { me._do_send_test(); });

		me._open_tags();
	}

	/* ── Tag Finder integration ── */

	_open_tags() {
		if (nce_events.schema_explorer && nce_events.schema_explorer.open) {
			nce_events.schema_explorer.open(this.doctype);
		}
	}

	_close_tags() {
		if (nce_events.schema_explorer && nce_events.schema_explorer.close) {
			nce_events.schema_explorer.close();
		}
	}

	/* ── Resolve message body from source (type or template) ── */

	_resolve_body(callback) {
		const el = this.el;
		const source = el.find(".send-source-select").val();
		const subject = el.find(".send-subject-input").val() || "";

		if (source === "template") {
			const tpl_name = el.find(".send-template-input").val().trim();
			if (!tpl_name) { frappe.msgprint(__("Select a template first.")); return; }
			frappe.call({
				method: "frappe.client.get",
				args: { doctype: "Email Template", name: tpl_name },
				callback: function (r) {
					if (!r.message) return;
					callback(r.message.response || "", subject || r.message.subject || "");
				}
			});
		} else {
			const body = el.find(".send-message-input").val() || "";
			if (!body.trim()) { frappe.msgprint(__("Enter a message first.")); return; }
			callback(body, subject);
		}
	}

	/* ── Template autocomplete ── */

	_setup_template_autocomplete(input_el) {
		const list_el = $('<div class="send-template-list"></div>').insertAfter(input_el);
		let debounce;
		input_el.on("input", function () {
			clearTimeout(debounce);
			debounce = setTimeout(function () {
				const q = input_el.val().trim();
				if (!q) { list_el.empty().hide(); return; }
				frappe.call({
					method: "frappe.client.get_list",
					args: { doctype: "Email Template", filters: { name: ["like", `%${q}%`] }, fields: ["name"], limit_page_length: 8 },
					callback: function (r) {
						list_el.empty();
						(r.message || []).forEach(function (t) {
							const item = $('<div class="send-template-item"></div>').text(t.name);
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

	/* ── Preview ── */

	_do_preview() {
		const me = this;
		const el = me.el;
		const filters = me.filters;
		const doctype = me.doctype;

		me._resolve_body(function (body_text, subject_text) {
			el.find(".send-preview-btn").prop("disabled", true);
			frappe.call({
				method: "nce_events.api.messaging.preview_panel_message",
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
					const preview_el = el.find(".send-panel-preview");
					preview_el.find(".send-preview-subject").text(r.message.rendered_subject || "(No subject)");
					preview_el.find(".send-preview-body").html(r.message.rendered_body || "");
					preview_el.show();
				},
				error: function () { el.find(".send-preview-btn").prop("disabled", false); },
			});
		});
	}

	/* ── Send ── */

	_do_send() {
		const me = this;
		const el = me.el;
		const send_btn = el.find(".send-send-btn");
		const send_copy = el.find(".send-copy-check").is(":checked") ? 1 : 0;
		const recipient_field = me.mode === "sms" ? me.config.sms_field : me.config.email_field;

		me._resolve_body(function (final_body, final_subject) {
			send_btn.prop("disabled", true).text("Sending...");
			frappe.call({
				method: "nce_events.api.messaging.send_panel_message",
				args: {
					root_doctype: me.doctype,
					filters: JSON.stringify(me.filters),
					mode: me.mode,
					recipient_field: recipient_field,
					body: final_body,
					subject: final_subject,
					send_email_copy: send_copy,
					email_field: me.config.email_field || "",
				},
				callback: function (r) {
					send_btn.prop("disabled", false).text("Send");
					if (r.message) {
						frappe.show_alert({ message: __("{0} messages sent", [r.message.sent || 0]), indicator: "green" });
						me.close();
					}
				},
				error: function () { send_btn.prop("disabled", false).text("Send"); },
			});
		});
	}

	/* ── Send test (email or SMS) ── */

	_do_send_test() {
		const me = this;
		const el = me.el;
		const test_value = el.find(".send-test-input").val().trim();
		const is_sms = me.mode === "sms";

		if (!test_value) {
			frappe.msgprint(is_sms ? __("Enter a test phone number.") : __("Enter a test email address."));
			return;
		}

		const test_btn = el.find(".send-test-btn");

		me._resolve_body(function (body_text, subject_text) {
			test_btn.prop("disabled", true).text("Sending...");

			const call_opts = {
				callback: function (r) {
					test_btn.prop("disabled", false).html('<i class="fa fa-paper-plane"></i> Send Test');
					if (r.message && r.message.sent) {
						const msg = is_sms ? __("Test SMS sent to {0}", [r.message.to]) : __("Test email sent to {0}", [r.message.to]);
						frappe.show_alert({ message: msg, indicator: "green" });
					} else if (r.message && r.message.error) {
						frappe.msgprint(r.message.error);
					}
				},
				error: function () {
					test_btn.prop("disabled", false).html('<i class="fa fa-paper-plane"></i> Send Test');
				},
			};

			if (is_sms) {
				call_opts.method = "nce_events.api.messaging.send_test_sms";
				call_opts.args = {
					root_doctype: me.doctype,
					filters: JSON.stringify(me.filters),
					body: body_text,
					test_phone: test_value,
				};
			} else {
				call_opts.method = "nce_events.api.messaging.send_test_email";
				call_opts.args = {
					root_doctype: me.doctype,
					filters: JSON.stringify(me.filters),
					body: body_text,
					subject: subject_text,
					test_email: test_value,
				};
			}

			frappe.call(call_opts);
		});
	}

	/* ── Close ── */

	close() {
		if (this.el) {
			this.el.remove();
			this.el = null;
		}
		this._close_tags();
		if (this.on_close) this.on_close();
	}

	/* ── Draggable ── */

	_make_draggable(el) {
		const ns = "send_drag";
		function start_drag(e) {
			if ($(e.target).closest("button, input, textarea, select, .send-template-list").length) return;
			e.preventDefault();
			const sx = e.clientX, sy = e.clientY;
			const sl = parseInt(el.css("left"), 10) || 0;
			const st = parseInt(el.css("top"), 10) || 0;
			$("body").addClass("panel-float-dragging");
			$(document).on(`mousemove.${ns}`, function (ev) {
				el.css({
					left: `${sl + ev.clientX - sx}px`,
					top: `${Math.min(st + ev.clientY - sy, window.innerHeight - 40)}px`,
				});
			});
			$(document).on(`mouseup.${ns}`, function () {
				$("body").removeClass("panel-float-dragging");
				$(document).off(`mousemove.${ns} mouseup.${ns}`);
			});
		}
		el.find(".send-panel-header").on(`mousedown.${ns}`, start_drag);
	}

	/* ── Resizable ── */

	_make_resizable(el) {
		const handle = $('<div class="send-panel-resize-handle"></div>');
		el.append(handle);
		handle.on("mousedown", function (e) {
			e.preventDefault(); e.stopPropagation();
			const sw = el.width(), sh = el.height();
			const sx = e.clientX, sy = e.clientY;
			$("body").addClass("panel-float-dragging");
			$(document).on("mousemove.send_resize", function (ev) {
				el.css({ width: `${Math.max(500, sw + ev.clientX - sx)}px`, height: `${Math.max(300, sh + ev.clientY - sy)}px` });
			});
			$(document).on("mouseup.send_resize", function () {
				$("body").removeClass("panel-float-dragging");
				$(document).off("mousemove.send_resize mouseup.send_resize");
			});
		});
	}
};
