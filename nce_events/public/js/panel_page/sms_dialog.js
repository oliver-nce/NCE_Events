frappe.provide("nce_events.panel_page");

nce_events.panel_page.SmsDialog = class SmsDialog {
	constructor(opts) {
		this.doctype = opts.doctype;
		this.config = opts.config;
		this.filters = opts.filters || {};
		this.user_filters = opts.user_filters || [];
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
		const title = `Send SMS (${count} recipients)`;

		const el = $('<div class="send-panel"></div>');
		el.html(`
			<div class="send-panel-header">
				<span class="send-panel-title">${frappe.utils.escape_html(title)}</span>
				<button class="send-panel-close" title="Close">&times;</button>
			</div>
			<div class="send-panel-body">
				<div class="send-panel-form">
					<label class="send-field-label">Message</label>
					<textarea class="send-field send-message-input" placeholder="Jinja2 tags supported. Sent to all ${count} rows."></textarea>
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
					<div class="send-preview-body"></div>
					<div class="send-test-row">
						<input class="send-field send-test-input" type="text" placeholder="Test phone number...">
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

	/* ── Preview ── */

	_do_preview() {
		const me = this;
		const el = me.el;
		const body_text = el.find(".send-message-input").val() || "";

		if (!body_text.trim()) { frappe.msgprint(__("Enter a message first.")); return; }

		el.find(".send-preview-btn").prop("disabled", true);
		frappe.call({
			method: "nce_events.api.messaging.preview_panel_message",
			args: {
				root_doctype: me.doctype,
				filters: JSON.stringify(me.filters),
				user_filters: JSON.stringify(me.user_filters),
				body: body_text,
				subject: "",
			},
			callback: function (r) {
				el.find(".send-preview-btn").prop("disabled", false);
				if (!r.message) return;
				if (r.message.error) { frappe.msgprint(r.message.error); return; }
				const preview_el = el.find(".send-panel-preview");
				preview_el.find(".send-preview-body").html(r.message.rendered_body || "");
				preview_el.show();
			},
			error: function () { el.find(".send-preview-btn").prop("disabled", false); },
		});
	}

	/* ── Send ── */

	_do_send() {
		const me = this;
		const el = me.el;
		const send_btn = el.find(".send-send-btn");
		const body_text = el.find(".send-message-input").val() || "";

		if (!body_text.trim()) { frappe.msgprint(__("Enter a message first.")); return; }

		send_btn.prop("disabled", true).text("Sending...");
		frappe.call({
			method: "nce_events.api.messaging.send_panel_message",
			args: {
				root_doctype: me.doctype,
				filters: JSON.stringify(me.filters),
				user_filters: JSON.stringify(me.user_filters),
				mode: "sms",
				recipient_field: me.config.sms_field,
				body: body_text,
				subject: "",
				send_email_copy: 0,
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
	}

	/* ── Send test ── */

	_do_send_test() {
		const me = this;
		const el = me.el;
		const test_value = el.find(".send-test-input").val().trim();
		const body_text = el.find(".send-message-input").val() || "";

		if (!test_value) {
			frappe.msgprint(__("Enter a test phone number."));
			return;
		}
		if (!body_text.trim()) {
			frappe.msgprint(__("Enter a message first."));
			return;
		}

		const test_btn = el.find(".send-test-btn");
		test_btn.prop("disabled", true).text("Sending...");

		frappe.call({
			method: "nce_events.api.messaging.send_test_sms",
			args: {
				root_doctype: me.doctype,
				filters: JSON.stringify(me.filters),
				user_filters: JSON.stringify(me.user_filters),
				body: body_text,
				test_phone: test_value,
			},
			callback: function (r) {
				test_btn.prop("disabled", false).html('<i class="fa fa-paper-plane"></i> Send Test');
				if (r.message && r.message.sent) {
					frappe.show_alert({ message: __("Test SMS sent to {0}", [r.message.to]), indicator: "green" });
				} else if (r.message && r.message.error) {
					frappe.msgprint(r.message.error);
				}
			},
			error: function () {
				test_btn.prop("disabled", false).html('<i class="fa fa-paper-plane"></i> Send Test');
			},
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
