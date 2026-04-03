/**
 * Promise wrapper for frappe.call.
 * Resolves with r.message when message is not null/undefined; otherwise rejects.
 */
export function frappeCall(method, args) {
	return new Promise((resolve, reject) => {
		frappe.call({
			method,
			args,
			callback: (r) => (r.message != null ? resolve(r.message) : reject("Empty response")),
			error: reject,
		});
	});
}
