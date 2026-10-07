/**
 * Promise wrapper for frappe.call (mirrors panel_page_v2 pattern).
 *
 * @param {{ freeze?: boolean; freeze_message?: string }} [opts]
 *
 * code-index:begin
 * {
 *  "purpose": "Promise wrapper for frappe.call used by the evaluations Vue SPA.",
 *  "read_when": "Changing async Frappe RPC calls in evaluations or adding freeze options.",
 *  "gotchas": [],
 *  "keywords": ["frappeCall", "frappe.call", "Promise", "evaluations", "freeze"],
 *  "format": 1
 * }
 * code-index:end
 */
export function frappeCall(method, args, opts = {}) {
	const freeze = opts?.freeze;
	const freeze_message = opts?.freeze_message;
	return new Promise((resolve, reject) => {
		frappe.call({
			method,
			args,
			...(freeze !== undefined ? { freeze } : {}),
			...(freeze_message !== undefined ? { freeze_message } : {}),
			callback: (r) =>
				r.message != null ? resolve(r.message) : reject(new Error("Empty response")),
			error: reject,
		});
	});
}
