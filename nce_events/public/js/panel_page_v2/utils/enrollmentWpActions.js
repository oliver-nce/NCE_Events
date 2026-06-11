import { frappeCall } from "./frappeCall.js";

function __(s) {
	return typeof window.__ === "function" ? window.__(s) : s;
}

function escapeHtml(s) {
	if (typeof frappe !== "undefined" && frappe.utils?.escape_html) {
		return frappe.utils.escape_html(String(s ?? ""));
	}
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function money(n) {
	return n != null ? `$${parseFloat(n).toFixed(2)}` : "—";
}

export const CANCELLATION_FEE_PROMPT_FIELD = {
	fieldname: "cancellation_fee",
	fieldtype: "Currency",
	label: __("Cancellation Fee"),
	reqd: 0,
	description: __(
		"Optional fee. Leave blank or 0 for no fee.",
	),
};

export function parseCancellationFeeInput(raw) {
	if (raw == null || String(raw).trim() === "") {
		return null;
	}
	const fee = parseFloat(raw);
	if (!Number.isFinite(fee) || fee < 0) {
		throw new Error(__("Cancellation fee cannot be negative."));
	}
	return fee;
}

export function promptCancellationFee({ title, primaryLabel, confirmMessage }) {
	return new Promise((resolve, reject) => {
		if (typeof frappe === "undefined" || !frappe.prompt) {
			reject(new Error("frappe.prompt is unavailable"));
			return;
		}
		const fields = [CANCELLATION_FEE_PROMPT_FIELD];
		if (confirmMessage) {
			fields.unshift({
				fieldtype: "HTML",
				fieldname: "confirm_html",
				options: `<p class="text-muted" style="margin:0 0 8px">${escapeHtml(confirmMessage)}</p>`,
			});
		}
		frappe.prompt(
			fields,
			(values) => {
				try {
					resolve(parseCancellationFeeInput(values.cancellation_fee));
				} catch (e) {
					frappe.msgprint({
						title: __("Invalid Cancellation Fee"),
						message: e?.message || String(e),
						indicator: "orange",
					});
					reject(e);
				}
			},
			title,
			primaryLabel,
		);
	});
}

export function buildRefundOutcomeHtml(result) {
	const o = result?.outcome || {};
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
				`<tr><td class="theme-text-muted" style="padding:3px 12px 3px 0">${escapeHtml(label)}</td><td style="padding:3px 0"><strong>${escapeHtml(val)}</strong></td></tr>`,
		)
		.join("");

	const fee = o.fee_order;
	let feeSection = "";
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
					`<tr><td class="theme-text-muted" style="padding:3px 12px 3px 0">${escapeHtml(label)}</td><td style="padding:3px 0"><strong>${escapeHtml(val)}</strong></td></tr>`,
			)
			.join("");
		feeSection = `<hr><p style="margin:10px 0 6px"><strong>${__("Cancellation fee order")}</strong></p><table style="width:100%">${feeRows}</table>`;
		if (fee.pay_now_url) {
			feeSection += `<p class="theme-text-muted theme-text-sm" style="margin-top:8px">${__("Payment link")}: ${escapeHtml(fee.pay_now_url)}</p>`;
		}
	}

	const summary = result?.summary
		? `<p style="margin-bottom:10px">${escapeHtml(result.summary)}</p>`
		: "";
	const footer =
		o.status === "refunded"
			? `<p class="theme-text-muted" style="margin-top:12px">${__("This enrollment will disappear from the panel within ~10 minutes.")}</p>`
			: "";

	return `${summary}<table style="width:100%">${rows}</table>${feeSection}${footer}`;
}

export function showRefundActionResult(result, enrollmentId, { elapsedMs } = {}) {
	const message = buildRefundOutcomeHtml(result);
	let elapsedText = "";
	if (typeof elapsedMs === "number" && isFinite(elapsedMs)) {
		elapsedText = `<p class="theme-text-muted theme-text-sm" style="margin-top:8px">API round-trip: ${(elapsedMs / 1000).toFixed(2)}s (${Math.round(elapsedMs)} ms)</p>`;
	}
	if (typeof frappe !== "undefined" && frappe.msgprint) {
		frappe.msgprint({
			title: __("Registration Cancelled"),
			message: `${message}${elapsedText}`,
			indicator: "green",
		});
	}
	const removeName =
		enrollmentId ||
		(result?.outcome?.order_item_id != null ? String(result.outcome.order_item_id) : "");
	if (removeName) {
		window._nce_remove_panel_row?.("Enrollments", removeName);
	}
	window._nce_close_form_dialog?.();
}

export async function runProductRefund(enrollmentName, cancellationFee) {
	return frappeCall("nce_events.api.exchange.execute_product_refund", {
		enrollment_name: enrollmentName,
		cancellation_fee: cancellationFee,
	});
}
