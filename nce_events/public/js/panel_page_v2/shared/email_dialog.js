frappe.provide("nce_events.panel_page");

nce_events.panel_page.EmailDialog = class EmailDialog {
	constructor(opts) {
		this.doctype = opts.doctype;
		this.config = opts.config;
		this.filters = opts.filters || {};
		this.user_filters = opts.user_filters || [];
		this.row_names = opts.row_names || [];
		this.row_count = opts.row_count || 0;
		this.z_index = opts.z_index || 110;
		this.init_left = opts.init_left ?? null;
		this.init_top = opts.init_top ?? null;
		this.on_close = opts.on_close || null;
		this.el = null;

		this._build();
		this._bind();
	}

	/* ── Build DOM ── */

	_build() {
		const me = this;
		const count = me.row_count;
		const title = `Send Email (${count} recipients)`;

		const el = $('<div class="send-panel send-panel-email"></div>');
		el.html(`
			<div class="send-panel-header">
				<span class="send-panel-title">${frappe.utils.escape_html(title)}</span>
				<button class="btn btn-xs send-tags-btn" title="Tag Finder" style="border-color:rgba(255,255,255,0.3);color:rgba(255,255,255,0.85);background:transparent;margin-left:auto;margin-right:6px;"><i class="fa fa-tags"></i></button>
				<button class="send-panel-close" title="Close">&times;</button>
			</div>
			<div class="send-panel-body">
				<div class="send-panel-form">
					<label class="send-field-label">From</label>
					<select class="send-field send-from-select">
						<option value="">Default</option>
					</select>
					<label class="send-field-label">Source</label>
					<select class="send-field send-source-select">
						<option value="type">Type a message</option>
						<option value="template">Use Email Template</option>
					</select>
					<div class="send-template-section" style="display:none;">
						<label class="send-field-label">Load from Email Template</label>
						<input class="send-field send-template-input" type="text" placeholder="Pick template to load into message below...">
					</div>
					<label class="send-field-label">Subject</label>
					<input class="send-field send-subject-input" type="text">
					<div class="send-message-section">
						<label class="send-field-label">Message</label>
						<div class="send-message-editor-wrap"></div>
					</div>
				</div>
				<div class="send-panel-footer">
					${nce_events.panel_page.ai_tools.build_bar_html()}
					<div class="send-panel-actions">
						<button class="btn btn-xs btn-default send-preview-btn"><i class="fa fa-eye"></i> Preview</button>
						<button class="btn btn-xs btn-default send-recipients-btn" title="Check who will receive this email"><i class="fa fa-users"></i> Who receives this?</button>
						<span class="send-actions-right">
							<button class="btn btn-xs btn-default send-cancel-btn">Cancel</button>
							<button class="btn btn-xs btn-primary send-send-btn">Send</button>
						</span>
					</div>
				</div>
			</div>
		`);

		const vh85 = window.innerHeight * 0.85;
		const defaultTop = Math.max(10, (window.innerHeight - vh85) / 2);
		const initTop = me.init_top != null ? me.init_top : defaultTop;
		const initLeft = me.init_left != null ? me.init_left : 60;
		el.css({
			top: initTop + "px",
			left: initLeft + "px",
			height: vh85 + "px",
			zIndex: me.z_index,
		});
		$(document.body).append(el);
		me.el = el;

		me._preview_el = $(`
			<div class="send-panel-preview" style="display:none;">
				<div class="send-preview-header">
					<span class="send-preview-title">Preview</span>
					<span class="send-preview-zoom-controls">
						<button class="send-preview-zoom-btn" data-action="out" title="Zoom out">&minus;</button>
						<button class="send-preview-zoom-btn send-preview-zoom-reset" data-action="reset" title="Reset zoom">100%</button>
						<button class="send-preview-zoom-btn" data-action="in" title="Zoom in">+</button>
					</span>
					<button class="send-preview-close" title="Close preview">&times;</button>
				</div>
				<div class="send-preview-subject"></div>
				<div class="send-preview-body"></div>
				<div class="send-test-row">
					<input class="send-field send-test-input" type="text" placeholder="Test email address...">
					<button class="btn btn-xs btn-default send-test-btn"><i class="fa fa-paper-plane"></i> Send Test</button>
				</div>
				<div class="send-panel-resize-handle"></div>
			</div>
		`);
		$(document.body).append(me._preview_el);
		me._make_draggable_preview(me._preview_el);
		me._make_resizable_preview(me._preview_el);
		me._setup_preview_zoom(me._preview_el);

		me._message_control = frappe.ui.form.make_control({
			parent: el.find(".send-message-editor-wrap"),
			df: {
				label: "",
				fieldname: "message",
				fieldtype: "Text Editor",
			},
			render_input: true,
		});

		me._make_draggable(el);
		me._make_resizable(el);

		me._load_from_accounts();

		me._ai_get_body = function () {
			return (me._message_control && me._message_control.get_value()) || "";
		};
		me._ai_set_body = function (val) {
			if (me._message_control && me._message_control.set_value) {
				me._message_control.set_value(val);
			}
		};
		me._ai_is_html = function () {
			return true;
		};

		nce_events.panel_page.ai_tools.attach(me);
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
				tpl_section.hide();
				msg_section.show();
			} else {
				tpl_section.show();
				msg_section.show();
			}
		});

		if (tpl_input.length) {
			me._setup_template_autocomplete(tpl_input, function (tpl_name) {
				me._load_template_into_editor(tpl_name);
			});
		}

		el.find(".send-panel-close").on("click", function () {
			me.close();
		});
		el.find(".send-cancel-btn").on("click", function () {
			me.close();
		});
		me._preview_el.find(".send-preview-close").on("click", function () {
			me._preview_el.hide();
		});

		el.on("click", ".send-preview-btn", function () {
			me._do_preview();
		});
		el.on("click", ".send-send-btn", function () {
			me._do_send();
		});
		el.on("click", ".send-recipients-btn", function () {
			me._do_show_recipients();
		});
		el.on("click", ".send-tags-btn", function () {
			me._open_tags();
		});
		me._preview_el.on("click", ".send-test-btn", function () {
			me._do_send_test();
		});
	}

	/* ── Load From (email account) options ── */

	_load_from_accounts() {
		const me = this;
		const sel = me.el.find(".send-from-select");
		frappe.call({
			method: "nce_events.api.messaging.get_email_accounts",
			callback: function (r) {
				const accounts = r.message || [];
				accounts.forEach(function (acc) {
					const label =
						acc.name && acc.name !== acc.email_id
							? acc.name + " — " + acc.email_id
							: acc.email_id;
					sel.append($("<option></option>").attr("value", acc.email_id).text(label));
				});
			},
		});
	}

	/* ── Tag Finder integration ── */

	_open_tags() {
		if (window._nce_open_tag_finder) {
			let tfX, tfY;
			if (this.el && this.el[0]) {
				const rect = this.el[0].getBoundingClientRect();
				tfX = Math.round(rect.right + 20);
				tfY = Math.round(rect.top);
			}
			window._nce_open_tag_finder(this.doctype, tfX, tfY);
		}
	}

	_close_tags() {
		if (window._nce_close_tag_finder) {
			window._nce_close_tag_finder();
		}
	}

	/* ── Load template into message editor (for one-off edits) ── */

	_load_template_into_editor(tpl_name) {
		const me = this;
		const el = me.el;
		if (!tpl_name || !tpl_name.trim()) return;
		frappe.call({
			method: "frappe.client.get",
			args: { doctype: "Email Template", name: tpl_name.trim() },
			freeze: false,
			callback: function (r) {
				if (!r.message) return;
				const body = r.message.response_html || r.message.response || "";
				const subject = r.message.subject || "";
				el.find(".send-subject-input").val(subject);
				me._template_body = body;
				if (me._message_control && me._message_control.quill) {
					me._message_control.quill.setText(body);
				}
			},
		});
	}

	/* ── Resolve message body (prefer stored template HTML, fall back to editor) ── */

	_resolve_body(callback) {
		const el = this.el;
		const subject = el.find(".send-subject-input").val() || "";
		const body =
			this._template_body ||
			(this._message_control &&
				this._message_control.get_value &&
				this._message_control.get_value()) ||
			"";
		if (!body || !String(body).trim()) {
			frappe.msgprint(__("Enter a message first."));
			return;
		}
		callback(body, subject);
	}

	/* ── Template autocomplete ── */

	_setup_template_autocomplete(input_el, on_pick) {
		const me = this;
		const list_el = $('<div class="send-template-list"></div>');
		$(document.body).append(list_el);
		let debounce;

		function position_and_show() {
			const rect = input_el[0].getBoundingClientRect();
			list_el.css({
				position: "fixed",
				left: rect.left + "px",
				top: rect.bottom + 2 + "px",
				width: rect.width + "px",
				zIndex: 99999,
			});
			list_el.show();
		}

		function do_search(q) {
			const filters = q ? { name: ["like", `%${q}%`] } : {};
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Email Template",
					filters: filters,
					fields: ["name"],
					limit_page_length: 20,
				},
				freeze: false,
				callback: function (r) {
					list_el.empty();
					(r.message || []).forEach(function (t) {
						const item = $('<div class="send-template-item"></div>').text(t.name);
						item.on("mousedown", function (e) {
							e.preventDefault();
							input_el.val(t.name);
							list_el.empty().hide();
							if (on_pick) on_pick(t.name);
						});
						list_el.append(item);
					});
					if (r.message && r.message.length) {
						position_and_show();
					} else {
						list_el.hide();
					}
				},
			});
		}

		input_el.on("focus", function (e) {
			e.stopPropagation();
			do_search(input_el.val().trim());
		});
		input_el.on("click", function (e) {
			e.stopPropagation();
		});
		input_el.on("input", function () {
			clearTimeout(debounce);
			debounce = setTimeout(function () {
				do_search(input_el.val().trim());
			}, 200);
		});
		input_el.on("blur", function () {
			setTimeout(function () {
				list_el.hide();
			}, 250);
		});

		me._tpl_list_el = list_el;
	}

	/* ── Preview ── */

	_do_preview() {
		const me = this;
		const el = me.el;
		const pv = me._preview_el;

		me._resolve_body(function (body_text, subject_text) {
			el.find(".send-preview-btn").prop("disabled", true);
			frappe.call({
				method: "nce_events.api.messaging.preview_panel_message",
				args: {
					root_doctype: me.doctype,
					filters: JSON.stringify(me.filters),
					user_filters: JSON.stringify(me.user_filters),
					row_names: JSON.stringify(me.row_names),
					body: body_text,
					subject: subject_text,
				},
				callback: function (r) {
					el.find(".send-preview-btn").prop("disabled", false);
					if (!r.message) return;
					if (r.message.error) {
						frappe.msgprint(r.message.error);
						return;
					}
					pv.find(".send-preview-subject").text(
						r.message.rendered_subject || "(No subject)",
					);
					pv.find(".send-preview-body").html(r.message.rendered_body || "");
					const rect = el[0].getBoundingClientRect();
					const pvW = 380;
					let pvLeft = rect.right + 8;
					if (pvLeft + pvW > window.innerWidth) pvLeft = rect.left - pvW - 8;
					if (pvLeft < 0) pvLeft = 8;
					pv.css({
						top: rect.top + "px",
						left: pvLeft + "px",
						height: rect.height + "px",
						zIndex: Math.max(parseInt(el.css("zIndex"), 10) || 110, 10060) + 10,
					});
					pv.show();
				},
				error: function () {
					el.find(".send-preview-btn").prop("disabled", false);
				},
			});
		});
	}

	/* ── Send — step-through reviewer ── */

	_do_send() {
		const me = this;
		me._resolve_body(function (final_body, final_subject) {
			if (!me.row_names || !me.row_names.length) {
				frappe.msgprint(__("No recipients."));
				return;
			}
			me._start_review(final_body, final_subject);
		});
	}

	_start_review(body, subject) {
		const me = this;
		const from_email = me.el.find(".send-from-select").val() || "";

		// state
		me._review_queue = me.row_names.slice();
		me._review_body = body;
		me._review_subject = subject;
		me._review_from = from_email;
		me._review_sent = 0;
		me._review_skipped = 0;
		me._review_total = me.row_names.length;

		me._build_review_panel();
		me._review_next();
	}

	_build_review_panel() {
		const me = this;

		if (me._review_el) {
			me._review_el.remove();
			me._review_el = null;
		}

		const panel = $(`
			<div class="send-review-panel">
				<div class="send-review-header">
					<span class="send-review-progress"></span>
					<button class="send-review-stop-btn" title="Stop sending">&times; Stop</button>
				</div>
				<div class="send-review-to-row">
					<span class="send-review-label">To:</span>
					<span class="send-review-to"></span>
				</div>
				<div class="send-review-subject-row">
					<span class="send-review-label">Subject:</span>
					<span class="send-review-subject"></span>
				</div>
				<div class="send-review-body"></div>
				<div class="send-review-actions">
					<button class="btn btn-xs btn-default send-review-skip-btn">Skip</button>
					<button class="btn btn-xs btn-default send-review-sendall-btn">Send All Remaining</button>
					<button class="btn btn-xs btn-primary send-review-send-btn"><i class="fa fa-paper-plane"></i> Send</button>
				</div>
			</div>
		`);

		$(document.body).append(panel);
		me._review_el = panel;

		me._make_popup_draggable(panel, ".send-review-header");

		// position to the right of the compose panel
		const rect = me.el[0].getBoundingClientRect();
		const pw = 420;
		let left = rect.right + 12;
		if (left + pw > window.innerWidth) left = rect.left - pw - 12;
		if (left < 0) left = 8;
		panel.css({
			top: rect.top + "px",
			left: left + "px",
			zIndex: (parseInt(me.el.css("zIndex"), 10) || 110) + 5,
		});

		panel.find(".send-review-stop-btn").on("click", function () {
			me._review_finish(true);
		});
		panel.find(".send-review-skip-btn").on("click", function () {
			me._review_skipped++;
			me._review_queue.shift();
			me._review_next();
		});
		panel.find(".send-review-send-btn").on("click", function () {
			me._review_do_send();
		});
		panel.find(".send-review-sendall-btn").on("click", function () {
			me._review_send_all();
		});
	}

	_review_next() {
		const me = this;
		const panel = me._review_el;
		if (!panel) return;

		if (!me._review_queue.length) {
			me._review_finish(false);
			return;
		}

		const row_name = me._review_queue[0];
		const done = me._review_total - me._review_queue.length;
		panel
			.find(".send-review-progress")
			.text(
				`${done + 1} of ${me._review_total} — sent: ${me._review_sent}, skipped: ${me._review_skipped}`,
			);
		panel.find(".send-review-to").text("Loading...");
		panel.find(".send-review-subject").text("");
		panel.find(".send-review-body").html("");
		panel.find(".send-review-send-btn, .send-review-skip-btn").prop("disabled", true);

		frappe.call({
			method: "nce_events.api.messaging.preview_one_email",
			args: {
				root_doctype: me.doctype,
				row_name: row_name,
				recipient_field: me.config.email_field,
				body: me._review_body,
				subject: me._review_subject,
				from_email: me._review_from,
			},
			callback: function (r) {
				if (!r.message) return;
				const msg = r.message;
				if (msg.error) {
					panel.find(".send-review-to").text("⚠ " + msg.error);
					panel.find(".send-review-send-btn").prop("disabled", true);
					panel.find(".send-review-skip-btn").prop("disabled", false);
					return;
				}
				panel.find(".send-review-to").text(msg.to || "(no address)");
				panel.find(".send-review-subject").text(msg.subject || "");
				panel.find(".send-review-body").html(msg.rendered_body || "");
				const can_send = !!msg.to;
				panel.find(".send-review-send-btn").prop("disabled", !can_send);
				panel.find(".send-review-skip-btn").prop("disabled", false);
			},
			error: function () {
				panel.find(".send-review-to").text("Error loading preview.");
				panel.find(".send-review-skip-btn").prop("disabled", false);
			},
		});
	}

	_review_do_send() {
		const me = this;
		const panel = me._review_el;
		const row_name = me._review_queue[0];

		panel
			.find(".send-review-send-btn")
			.prop("disabled", true)
			.html('<i class="fa fa-spinner fa-spin"></i>');
		panel.find(".send-review-skip-btn").prop("disabled", true);

		frappe.call({
			method: "nce_events.api.messaging.send_one_email",
			args: {
				root_doctype: me.doctype,
				row_name: row_name,
				recipient_field: me.config.email_field,
				body: me._review_body,
				subject: me._review_subject,
				from_email: me._review_from,
			},
			callback: function (r) {
				panel
					.find(".send-review-send-btn")
					.prop("disabled", false)
					.html('<i class="fa fa-paper-plane"></i> Send');
				panel.find(".send-review-skip-btn").prop("disabled", false);
				if (r.message && r.message.sent) {
					me._review_sent++;
					frappe.show_alert({
						message: __("Queued to {0}", [r.message.to]),
						indicator: "green",
					});
				} else if (r.message && r.message.error) {
					frappe.show_alert({ message: r.message.error, indicator: "orange" });
				}
				me._review_queue.shift();
				me._review_next();
			},
			error: function () {
				panel
					.find(".send-review-send-btn")
					.prop("disabled", false)
					.html('<i class="fa fa-paper-plane"></i> Send');
				panel.find(".send-review-skip-btn").prop("disabled", false);
			},
		});
	}

	_review_send_all() {
		const me = this;
		if (!me._review_queue || !me._review_queue.length) return;

		const queue = me._review_queue.slice();
		const totalToSend = queue.length;
		const alreadySent = me._review_sent || 0;
		const grandTotal = me._review_total || totalToSend;
		const doctype = me.doctype;
		const recipientField = me.config.email_field;
		const body = me._review_body;
		const subject = me._review_subject;
		const fromEmail = me._review_from;

		me.close();

		frappe.show_alert({
			message: __("Queueing {0} emails in background...", [totalToSend]),
			indicator: "blue",
		});

		let sent = alreadySent;
		let errors = 0;
		let idx = 0;

		function sendNext() {
			if (idx >= queue.length) {
				frappe.show_alert({
					message: __("Done. {0} of {1} queued.", [sent, grandTotal]),
					indicator: "green",
				});
				return;
			}

			const row_name = queue[idx];
			idx++;

			frappe.call({
				method: "nce_events.api.messaging.send_one_email",
				args: {
					root_doctype: doctype,
					row_name: row_name,
					recipient_field: recipientField,
					body: body,
					subject: subject,
					from_email: fromEmail,
				},
				callback: function (r) {
					if (r.message && r.message.sent) {
						sent++;
					} else {
						errors++;
					}
					if (idx % 100 === 0) {
						frappe.show_alert({
							message: __("Queued {0} / {1}...", [idx, totalToSend]),
							indicator: "blue",
						});
					}
					sendNext();
				},
				error: function () {
					errors++;
					if (idx % 100 === 0) {
						frappe.show_alert({
							message: __("Queued {0} / {1}... ({2} errors)", [idx, totalToSend, errors]),
							indicator: "orange",
						});
					}
					sendNext();
				},
			});
		}

		sendNext();
	}

	_review_finish(stopped) {
		const me = this;
		if (me._review_el) {
			me._review_el.remove();
			me._review_el = null;
		}
		const msg = stopped
			? __("Stopped. {0} sent, {1} skipped.", [me._review_sent, me._review_skipped])
			: __("Done. {0} of {1} queued.", [me._review_sent, me._review_total]);
		frappe.show_alert({ message: msg, indicator: me._review_sent > 0 ? "green" : "blue" });
		if (!stopped || me._review_sent > 0) me.close();
	}

	/* ── Show recipients ── */

	_do_show_recipients() {
		const me = this;
		const btn = me.el.find(".send-recipients-btn");
		btn.prop("disabled", true).html('<i class="fa fa-spinner fa-spin"></i> Loading...');

		frappe.call({
			method: "nce_events.api.messaging.get_recipients",
			args: {
				root_doctype: me.doctype,
				row_names: JSON.stringify(me.row_names),
				recipient_field: me.config.email_field,
			},
			callback: function (r) {
				btn.prop("disabled", false).html('<i class="fa fa-users"></i> Who receives this?');
				if (!r.message) return;
				const { total_rows, resolved, skipped } = r.message;
				me._show_recipients_popup(total_rows, resolved, skipped);
			},
			error: function () {
				btn.prop("disabled", false).html('<i class="fa fa-users"></i> Who receives this?');
			},
		});
	}

	_show_recipients_popup(total_rows, resolved, skipped) {
		const me = this;

		if (me._recipients_el) {
			me._recipients_el.remove();
			me._recipients_el = null;
		}

		const resolvedHtml = resolved.length
			? resolved
					.map(function (r) {
						return `<div class="recip-row recip-ok"><span class="recip-name">${frappe.utils.escape_html(r.name)}</span><span class="recip-addr">${frappe.utils.escape_html(r.address)}</span></div>`;
					})
					.join("")
			: `<div class="recip-empty">No resolved addresses.</div>`;

		const skippedHtml = skipped.length
			? `<div class="recip-skipped-header">Skipped — no address (${skipped.length}):</div>` +
				skipped
					.map(function (r) {
						return `<div class="recip-row recip-skip"><span class="recip-name">${frappe.utils.escape_html(r.name)}</span><span class="recip-addr recip-none">—</span></div>`;
					})
					.join("")
			: "";

		const popup = $(`
			<div class="send-recipients-popup">
				<div class="recip-header">
					<span class="recip-title">Recipients — ${resolved.length} of ${total_rows} rows have an address</span>
					<button class="recip-close" title="Close">&times;</button>
				</div>
				<div class="recip-body">
					${resolvedHtml}
					${skippedHtml}
				</div>
			</div>
		`);

		$(document.body).append(popup);
		me._recipients_el = popup;

		const rect = me.el[0].getBoundingClientRect();
		const pw = 320;
		let left = rect.right + 8;
		if (left + pw > window.innerWidth) left = rect.left - pw - 8;
		if (left < 0) left = 8;
		popup.css({
			top: rect.top + "px",
			left: left + "px",
			zIndex: Math.max(parseInt(me.el.css("zIndex"), 10) || 110, 110) + 5,
		});

		popup.find(".recip-close").on("click", function () {
			popup.remove();
			me._recipients_el = null;
		});

		me._make_popup_draggable(popup, ".recip-header");
	}

	/* ── Send test ── */

	_do_send_test() {
		const me = this;
		const pv = me._preview_el;
		const test_value = pv.find(".send-test-input").val().trim();

		if (!test_value) {
			frappe.msgprint(__("Enter a test email address."));
			return;
		}

		const test_btn = pv.find(".send-test-btn");

		me._resolve_body(function (body_text, subject_text) {
			test_btn.prop("disabled", true).text("Sending...");

			frappe.call({
				method: "nce_events.api.messaging.send_test_email",
				args: {
					root_doctype: me.doctype,
					filters: JSON.stringify(me.filters),
					user_filters: JSON.stringify(me.user_filters),
					body: body_text,
					subject: subject_text,
					test_email: test_value,
					from_email: me.el.find(".send-from-select").val() || "",
				},
				callback: function (r) {
					test_btn
						.prop("disabled", false)
						.html('<i class="fa fa-paper-plane"></i> Send Test');
					if (r.message && r.message.sent) {
						frappe.show_alert({
							message: __("Test email sent to {0}", [r.message.to]),
							indicator: "green",
						});
					} else if (r.message && r.message.error) {
						frappe.msgprint(r.message.error);
					}
				},
				error: function () {
					test_btn
						.prop("disabled", false)
						.html('<i class="fa fa-paper-plane"></i> Send Test');
				},
			});
		});
	}

	/* ── Preview: draggable ── */

	_make_draggable_preview(pv) {
		const ns = "pv_drag";
		pv.find(".send-preview-header").on(`mousedown.${ns}`, function (e) {
			if ($(e.target).closest("button").length) return;
			e.preventDefault();
			const sx = e.clientX,
				sy = e.clientY;
			const sl = parseInt(pv.css("left"), 10) || 0;
			const st = parseInt(pv.css("top"), 10) || 0;
			$(document).on(`mousemove.${ns}`, function (ev) {
				pv.css({
					left: `${sl + ev.clientX - sx}px`,
					top: `${Math.max(0, st + ev.clientY - sy)}px`,
				});
			});
			$(document).on(`mouseup.${ns}`, function () {
				$(document).off(`mousemove.${ns} mouseup.${ns}`);
			});
		});
	}

	/* ── Preview: resizable ── */

	_make_resizable_preview(pv) {
		const handle = pv.find(".send-panel-resize-handle");
		handle.on("mousedown", function (e) {
			e.preventDefault();
			e.stopPropagation();
			const sw = pv.outerWidth(),
				sh = pv.outerHeight();
			const sx = e.clientX,
				sy = e.clientY;
			$(document).on("mousemove.pv_resize", function (ev) {
				pv.css({
					width: `${Math.max(280, sw + ev.clientX - sx)}px`,
					height: `${Math.max(200, sh + ev.clientY - sy)}px`,
				});
			});
			$(document).on("mouseup.pv_resize", function () {
				$(document).off("mousemove.pv_resize mouseup.pv_resize");
			});
		});
	}

	/* ── Preview: zoom ── */

	_setup_preview_zoom(pv) {
		let zoom = 100;
		const body = pv.find(".send-preview-body");
		const label = pv.find(".send-preview-zoom-reset");

		function apply() {
			const scale = zoom / 100;
			body.css({
				transform: `scale(${scale})`,
				"transform-origin": "0 0",
				width: `${100 / scale}%`,
			});
			label.text(zoom + "%");
		}

		pv.on("click", ".send-preview-zoom-btn", function () {
			const action = $(this).data("action");
			if (action === "in") zoom = Math.min(200, zoom + 10);
			else if (action === "out") zoom = Math.max(30, zoom - 10);
			else zoom = 100;
			apply();
		});
	}

	/* ── Close ── */

	close() {
		if (this._tpl_list_el) {
			this._tpl_list_el.remove();
			this._tpl_list_el = null;
		}
		if (this._preview_el) {
			this._preview_el.remove();
			this._preview_el = null;
		}
		if (this._recipients_el) {
			this._recipients_el.remove();
			this._recipients_el = null;
		}
		if (this._review_el) {
			this._review_el.remove();
			this._review_el = null;
		}
		if (this.el) {
			this.el.remove();
			this.el = null;
		}
		this._close_tags();
		if (this.on_close) this.on_close();
	}

	/* ── Generic popup drag (for recipients popup, review panel, etc.) ── */

	_make_popup_draggable(el, handle_sel) {
		const ns = "popup_drag_" + Math.random().toString(36).slice(2);
		el.find(handle_sel).on(`mousedown.${ns}`, function (e) {
			if ($(e.target).closest("button").length) return;
			e.preventDefault();
			const sx = e.clientX,
				sy = e.clientY;
			const sl = parseInt(el.css("left"), 10) || 0;
			const st = parseInt(el.css("top"), 10) || 0;
			$(document).on(`mousemove.${ns}`, function (ev) {
				el.css({
					left: `${sl + ev.clientX - sx}px`,
					top: `${Math.max(0, st + ev.clientY - sy)}px`,
				});
			});
			$(document).on(`mouseup.${ns}`, function () {
				$(document).off(`mousemove.${ns} mouseup.${ns}`);
			});
		});
	}

	/* ── Draggable ── */

	_make_draggable(el) {
		const ns = "send_drag";
		function start_drag(e) {
			if (
				$(e.target).closest(
					"button, input, textarea, select, .send-template-list, .ql-editor, .ql-toolbar, .send-message-editor-wrap, .send-panel-footer",
				).length
			)
				return;
			e.preventDefault();
			const sx = e.clientX,
				sy = e.clientY;
			const sl = parseInt(el.css("left"), 10) || 0;
			const st = parseInt(el.css("top"), 10) || 0;
			const ghost = $("<div class='drag-ghost'></div>").css({
				position: "fixed",
				left: sl,
				top: st,
				width: el.outerWidth(),
				height: el.outerHeight(),
				zIndex: (parseInt(el.css("zIndex"), 10) || 100) + 1,
			});
			$(document.body).append(ghost);
			$("body").addClass("panel-float-dragging");
			$(document).on(`mousemove.${ns}`, function (ev) {
				ghost.css({
					left: `${sl + ev.clientX - sx}px`,
					top: `${Math.min(st + ev.clientY - sy, window.innerHeight - 40)}px`,
				});
			});
			$(document).on(`mouseup.${ns}`, function () {
				el.css({ left: ghost.css("left"), top: ghost.css("top") });
				ghost.remove();
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
			e.preventDefault();
			e.stopPropagation();
			const sw = el.outerWidth(),
				sh = el.outerHeight();
			const sx = e.clientX,
				sy = e.clientY;
			const ghost = $("<div class='drag-ghost'></div>").css({
				position: "fixed",
				left: parseInt(el.css("left"), 10) || 0,
				top: parseInt(el.css("top"), 10) || 0,
				width: sw,
				height: sh,
				zIndex: (parseInt(el.css("zIndex"), 10) || 100) + 1,
			});
			$(document.body).append(ghost);
			$("body").addClass("panel-float-dragging");
			$(document).on("mousemove.send_resize", function (ev) {
				ghost.css({
					width: `${Math.max(500, sw + ev.clientX - sx)}px`,
					height: `${Math.max(300, sh + ev.clientY - sy)}px`,
				});
			});
			$(document).on("mouseup.send_resize", function () {
				el.css({ width: ghost.css("width"), height: ghost.css("height") });
				ghost.remove();
				$("body").removeClass("panel-float-dragging");
				$(document).off("mousemove.send_resize mouseup.send_resize");
			});
		});
	}
};
