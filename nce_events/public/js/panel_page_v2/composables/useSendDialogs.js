let _sendDialog = null;

function _openSendDialog(p, mode) {
	const cfg = p.config;
	if (!cfg) return;
	const recipientField = mode === "sms" ? cfg.sms_field : cfg.email_field;
	if (!recipientField) {
		frappe.msgprint(
			__("No {0} field configured for this panel.", [mode === "sms" ? "SMS" : "Email"])
		);
		return;
	}
	// p._panelRows is a ref auto-unwrapped by Vue's reactive proxy — gives
	// the current filtered array directly (no .value needed). p.rows is a
	// stale snapshot from load time that doesn't update when filters change.
	const currentRows = p._panelRows || p.rows;
	if (!currentRows.length) {
		frappe.msgprint(__("No rows."));
		return;
	}

	if (_sendDialog) {
		_sendDialog.close();
		_sendDialog = null;
	}

	frappe.require(
		[
			"/assets/nce_events/js/js_dialogs/ai_tools.js",
			"/assets/nce_events/js/js_dialogs/sms_dialog.js",
			"/assets/nce_events/js/js_dialogs/email_dialog.js",
			"/assets/nce_events/css/panel_page.css",
		],
		() => {
			const DialogClass =
				mode === "sms"
					? nce_events.panel_page.SmsDialog
					: nce_events.panel_page.EmailDialog;
			_sendDialog = new DialogClass({
				doctype: p.doctype,
				config: cfg,
				row_names: currentRows.map((r) => r.name),
				row_count: currentRows.length,
				z_index: 9999,
				init_left: (p.x || 40) + 60,
				init_top: (p.y || 60) + 20,
				on_close() {
					_sendDialog = null;
				},
			});
		}
	);
}

function _openSendDialogOne(p, mode, row) {
	const cfg = p.config;
	if (!cfg) return;
	const recipientField = mode === "sms" ? cfg.sms_field : cfg.email_field;
	if (!recipientField) return;

	if (_sendDialog) {
		_sendDialog.close();
		_sendDialog = null;
	}

	frappe.require(
		[
			"/assets/nce_events/js/js_dialogs/ai_tools.js",
			"/assets/nce_events/js/js_dialogs/sms_dialog.js",
			"/assets/nce_events/js/js_dialogs/email_dialog.js",
			"/assets/nce_events/css/panel_page.css",
		],
		() => {
			const DialogClass =
				mode === "sms"
					? nce_events.panel_page.SmsDialog
					: nce_events.panel_page.EmailDialog;
			_sendDialog = new DialogClass({
				doctype: p.doctype,
				config: cfg,
				row_names: [row.name],
				row_count: 1,
				z_index: 9999,
				init_left: (p.x || 40) + 60,
				init_top: (p.y || 60) + 20,
				on_close() {
					_sendDialog = null;
				},
			});
		}
	);
}

export function useSendDialogs() {
	return {
		onEmail(p) {
			_openSendDialog(p, "email");
		},
		onSms(p) {
			_openSendDialog(p, "sms");
		},
		onEmailOne(p, row) {
			_openSendDialogOne(p, "email", row);
		},
		onSmsOne(p, row) {
			_openSendDialogOne(p, "sms", row);
		},
	};
}
