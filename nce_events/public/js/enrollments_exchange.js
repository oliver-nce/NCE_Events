frappe.ui.form.on("Enrollments", {
	refresh(frm) {
		// Only show on saved, non-cancelled records
		if (frm.is_new() || frm.doc.docstatus === 2) {
			return;
		}

		const btn = frm.add_custom_button(__("Switch to Another Event"), () => _do_exchange(frm));
		btn.css({ "background-color": "#000", color: "#fff", "border-color": "#000" });
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

			frappe.call({
				method: "nce_events.api.exchange.execute_product_exchange",
				args: {
					enrollment_name: frm.doc.name,
					new_product_id: new_product_id,
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