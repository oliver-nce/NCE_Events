/**
 * Promise wrapper for frappe.call.
 * Resolves with r.message when message is not null/undefined; otherwise rejects.
 *
 * @param {{ freeze?: boolean; freeze_message?: string }} [opts]
 *
 * code-index:begin
 * {
 *  "purpose": "Promise wrapper for frappe.call resolving message or rejecting when response is empty.",
 *  "read_when": "When changing panel page API call error handling or freeze options.",
 *  "gotchas": [],
 *  "keywords": ["frappeCall", "frappe.call", "freeze_message", "r.message", "Promise wrapper"],
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
			callback: (r) => (r.message != null ? resolve(r.message) : reject("Empty response")),
			error: reject,
		});
	});
}
