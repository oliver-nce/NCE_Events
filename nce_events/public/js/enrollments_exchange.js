frappe.ui.form.on("Enrollments", {
	refresh(frm) {
		// Only show on saved, non-cancelled records
		if (frm.is_new() || frm.doc.docstatus === 2) {
			return;
		}

		const btnExchange = frm.add_custom_button(__("Switch to Another Event"), () => _do_exchange(frm));
		btnExchange.css({ "background-color": "#000", color: "#fff", "border-color": "#000" });

		const btnCancel = frm.add_custom_button(__("Cancel Registration"), () => _do_refund(frm));
		btnCancel.css({ color: "#c0392b", "border-color": "#c0392b" });
	},
});

function _do_exchange(frm) {
	// The Enrollment's Frappe primary key (name) is the WooCommerce order_item_id
	const order_item_id = frm.doc.name;

	frappe.prompt(
		[
			{
				fieldname: "new_product_id",
				fieldtype: "Int",
				label: __("New Product ID"),
				reqd: 1,
				description: __(
					"Enter the WooCommerce Product ID for the new event to switch this enrollment (Order Item ID: {0}) to.",
					[order_item_id],
				),
			},
			{
				fieldname: "cancellation_fee",
				fieldtype: "Currency",
				label: __("Cancellation Fee"),
				reqd: 0,
				description: __(
					"Optional fee added to the replacement order. Leave blank or 0 for no fee.",
				),
			},
		],
		(values) => {
			const new_product_id = values.new_product_id;

			if (!new_product_id || new_product_id <= 0) {
				frappe.msgprint({
					title: __("Invalid Product ID"),
					message: __("Please enter a valid positive integer for the new product ID."),
					indicator: "orange",
				});
				return;
			}

			const feeRaw = values.cancellation_fee;
			if (feeRaw != null && String(feeRaw).trim() !== "" && parseFloat(feeRaw) < 0) {
				frappe.msgprint({
					title: __("Invalid Cancellation Fee"),
					message: __("Cancellation fee cannot be negative."),
					indicator: "orange",
				});
				return;
			}

			frappe.call({
				method: "nce_events.api.exchange.execute_product_exchange",
				args: {
					enrollment_name: frm.doc.name,
					new_product_id: new_product_id,
					cancellation_fee: feeRaw,
				},
				freeze: true,
				freeze_message: __("Processing event switch…"),
				callback(r) {
					if (!r.message) return;
					_show_success(frm, r.message);
				},
			});
		},
		__("Switch to Another Event"),
		__("Confirm"),
	);
}

function _do_refund(frm) {
	const order_item_id = frm.doc.name;

	frappe.prompt(
		[
			{
				fieldtype: "HTML",
				fieldname: "confirm_html",
				options:
					"<p class=\"text-muted\">" +
					__("This will cancel the registration in WooCommerce, issue store credit, and remove this enrollment.") +
					"</p>",
			},
			{
				fieldname: "cancellation_fee",
				fieldtype: "Currency",
				label: __("Cancellation Fee"),
				reqd: 0,
				description: __(
					"Optional fee charged on a separate fee order. Leave blank or 0 for no fee.",
				),
			},
		],
		(values) => {
			const feeRaw = values.cancellation_fee;
			if (feeRaw != null && String(feeRaw).trim() !== "" && parseFloat(feeRaw) < 0) {
				frappe.msgprint({
					title: __("Invalid Cancellation Fee"),
					message: __("Cancellation fee cannot be negative."),
					indicator: "orange",
				});
				return;
			}

			frappe.call({
				method: "nce_events.api.exchange.execute_product_refund",
				args: {
					enrollment_name: frm.doc.name,
					cancellation_fee: feeRaw,
				},
				freeze: true,
				freeze_message: __("Processing cancellation…"),
				callback(r) {
					if (!r.message) return;
					_show_refund_success(frm, r.message);
				},
			});
		},
		__("Cancel Registration"),
		__("Confirm Cancellation"),
	);
}

function _show_refund_success(frm, data) {
	const o = data.outcome || {};
	const e = (s) => frappe.utils.escape_html(String(s ?? ""));
	const money = (n) => (n != null ? `$${parseFloat(n).toFixed(2)}` : "—");

	const rows = [
		["Player", o.player_name],
		["Event", o.event_name],
		["Order #", o.order_id],
		["Credit issued", money(o.credit_issued)],
		o.store_credit_balance != null ? ["Store credit balance", money(o.store_credit_balance)] : null,
	]
		.filter(Boolean)
		.map(
			([label, val]) =>
				`<tr><td style="padding:3px 12px 3px 0;color:#6c757d">${e(label)}</td><td style="padding:3px 0"><strong>${e(val)}</strong></td></tr>`,
		)
		.join("");

	let feeSection = "";
	const fee = o.fee_order;
	if (fee && typeof fee === "object") {
		const feeRows = [
			["Fee order #", fee.order_id],
			["Fee amount", money(fee.fee_amount)],
			fee.amount_charged != null ? ["Charged", money(fee.amount_charged)] : null,
			fee.amount_still_due ? ["Amount still due", money(fee.amount_still_due)] : null,
		]
			.filter(Boolean)
			.map(
				([label, val]) =>
					`<tr><td style="padding:3px 12px 3px 0;color:#6c757d">${e(label)}</td><td style="padding:3px 0"><strong>${e(val)}</strong></td></tr>`,
			)
			.join("");
		feeSection = `<hr><p style="margin:10px 0 6px"><strong>${__("Cancellation fee order")}</strong></p><table style="width:100%">${feeRows}</table>`;
	}

	const summary = data.summary ? `<p style="margin-bottom:10px">${e(data.summary)}</p>` : "";
	const footer = `<p class="text-muted" style="margin-top:12px">${__(
		"This enrollment will disappear from the panel within ~10 minutes.",
	)}</p>`;

	frappe.msgprint({
		title: __("Registration Cancelled"),
		message: `${summary}<table style="width:100%">${rows}</table>${feeSection}<hr>${footer}`,
		indicator: "green",
	});

	window._nce_refresh_panel?.("Enrollments");
	window._nce_close_form_dialog?.();
}

function _show_success(frm, data) {
	const o = data.outcome || {};
	const e = (s) => frappe.utils.escape_html(String(s ?? ""));
	const money = (n) => (n != null ? `$${parseFloat(n).toFixed(2)}` : "—");

	const rows = [
		["Player", o.player_name],
		["Switched from", o.old_event_name],
		["Switched to", o.new_event_name],
		["New order #", o.new_order_id],
		["Credit issued", money(o.credit_issued)],
		["Credit applied", money(o.credit_applied)],
		o.amount_charged_to_card ? ["Charged to card", money(o.amount_charged_to_card)] : null,
		o.amount_still_due ? ["Amount still due", money(o.amount_still_due)] : null,
	]
		.filter(Boolean)
		.map(
			([label, val]) =>
				`<tr><td style="padding:3px 12px 3px 0;color:#6c757d">${e(label)}</td><td style="padding:3px 0"><strong>${e(val)}</strong></td></tr>`,
		)
		.join("");

	const footer =
		o.status === "payment_required"
			? `<p class="text-muted" style="margin-top:12px">The new enrollment will appear here when ${money(o.amount_still_due)} has been paid by the customer.</p>`
			: `<p class="text-muted" style="margin-top:12px">The new enrollment will appear here within ~10 minutes.</p>`;

	const summary = data.summary ? `<p style="margin-bottom:10px">${e(data.summary)}</p>` : "";

	frappe.msgprint({
		title: __("Event Switch Successful"),
		message: `${summary}<table style="width:100%">${rows}</table><hr>${footer}`,
		indicator: "green",
	});

	window._nce_refresh_panel?.("Enrollments");
	window._nce_close_form_dialog?.();
}