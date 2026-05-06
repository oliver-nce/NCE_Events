frappe.ui.form.on("New Woo Commerce Product", {
	refresh(frm) {
		frm.add_custom_button(__("Publish to WooCommerce"), () => _do_publish(frm)).addClass(
			"btn-primary",
		);
	},
});

function _do_publish(frm) {
	frappe.call({
		method: "nce_events.api.events_publish.publish_new_woo_commerce_product",
		args: { doc: frm.doc },
		freeze: true,
		freeze_message: __("Publishing to WooCommerce\u2026"),
		callback(r) {
			if (!r.message?.ok) return;
			const wp_id = r.message.wp_id;
			frappe.msgprint({
				title: __("Published"),
				message: `<p>${__("Product created successfully on WooCommerce.")}</p><p><strong>${__("WooCommerce Product ID:")} ${frappe.utils.escape_html(String(wp_id))}</strong></p>`,
				indicator: "green",
				primary_action: {
					label: __("OK"),
					action() {
						_clear_and_reload(frm);
					},
				},
			});
		},
	});
}

function _clear_and_reload(frm) {
	frappe.call({
		method: "nce_events.api.events_publish.clear_new_woo_commerce_product",
		callback() {
			frm.reload_doc();
		},
	});
}
