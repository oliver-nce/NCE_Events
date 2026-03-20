frappe.ui.form.on("Enrollments", {
    refresh(frm) {
        // Only show on saved, non-cancelled records
        if (frm.is_new() || frm.doc.docstatus === 2) {
            return;
        }

        frm.add_custom_button(
            __("Switch to Another Event"),
            () => _do_exchange(frm),
            __("Actions")
        );
    },
});

function _do_exchange(frm) {
    if (!frm.doc.order_item_id) {
        frappe.msgprint({
            title: __("Cannot Switch Event"),
            message: __("This enrollment has no Order Item ID. The exchange cannot be processed."),
            indicator: "orange",
        });
        return;
    }

    frappe.prompt(
        [
            {
                fieldname: "new_product_id",
                fieldtype: "Int",
                label: __("New Product ID"),
                reqd: 1,
                description: __("Enter the WooCommerce product ID for the new event."),
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
                    _show_success(r.message);
                },
            });
        },
        __("Switch to Another Event"),
        __("Confirm")
    );
}

function _show_success(data) {
    const after = data.data && data.data.after ? data.data.after : {};
    const new_order = data.data && data.data.new_order ? data.data.new_order : {};

    const old_event  = (after.event_name       || after.old_event_name || "previous event");
    const new_event  = (new_order.product_name || after.event_name     || "new event");
    const credit     = (after.credit_applied   != null ? after.credit_applied   : "—");
    const charged    = (after.amount_charged   != null ? after.amount_charged   : "—");
    const still_due  = (after.amount_still_due != null ? after.amount_still_due : "—");

    const lines = [
        `<p><strong>Switched from:</strong> ${frappe.utils.escape_html(String(old_event))}</p>`,
        `<p><strong>Switched to:</strong> ${frappe.utils.escape_html(String(new_event))}</p>`,
        `<p><strong>Credit applied:</strong> $${frappe.utils.escape_html(String(credit))}</p>`,
        `<p><strong>Amount charged:</strong> $${frappe.utils.escape_html(String(charged))}</p>`,
        still_due && still_due !== "—" && still_due !== 0
            ? `<p><strong>Amount still due:</strong> $${frappe.utils.escape_html(String(still_due))}</p>`
            : "",
        `<hr><p class="text-muted">The change will appear here in &lt;5 minutes.</p>`,
    ].join("");

    frappe.msgprint({
        title: __("Event Switch Successful"),
        message: lines,
        indicator: "green",
    });
}
