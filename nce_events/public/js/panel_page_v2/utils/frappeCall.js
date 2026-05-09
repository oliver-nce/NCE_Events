/**
 * Promise wrapper for frappe.call.
 * Resolves with r.message when message is not null/undefined; otherwise rejects.
 *
 * @param {{ freeze?: boolean; freeze_message?: string }} [opts]
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
