/**
 * Form Dialog submit timings: console + optional Desk msgprint copy block.
 *
 * Enable popup after submit: localStorage.setItem("nce_fd_submit_trace", "1")
 * Disable: localStorage.removeItem("nce_fd_submit_trace")
 */

export function createSubmitPerfTrace() {
	const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
	const lines = [];

	function push(cat, msg) {
		const now = typeof performance !== "undefined" ? performance.now() : Date.now();
		const delta = +(now - t0).toFixed(1);
		const line = `[+${delta} ms] ${cat}: ${msg}`;
		lines.push(line);
		if (typeof console !== "undefined" && console.log) {
			console.log("[NCE submit]", line);
		}
	}

	function shouldPopup() {
		try {
			return typeof localStorage !== "undefined" && localStorage.getItem("nce_fd_submit_trace") === "1";
		} catch {
			return false;
		}
	}

	function showCopyDialog() {
		if (!lines.length) return;
		try {
			if (typeof window !== "undefined") {
				window.__nce_last_submit_trace = lines.join("\n");
			}
		} catch {
			/* ignore */
		}
		if (!shouldPopup() || typeof frappe === "undefined" || !frappe.msgprint) return;
		const __ =
			typeof window !== "undefined" && typeof window.__ === "function"
				? window.__
				: (s) => s;
		const raw = lines.join("\n");
		frappe.msgprint({
			title: __("Submit timings & trace"),
			message:
				`<p class="text-muted" style="font-size:12px;margin-bottom:8px">${__(
					"Copy the block below. Disable popup:",
				)} <code>localStorage.removeItem('nce_fd_submit_trace')</code></p>` +
				`<pre style="white-space:pre-wrap;max-height:60vh;overflow:auto;user-select:all;font-size:11px;">${frappe.utils.escape_html(raw)}</pre>`,
			indicator: "blue",
			wide: true,
		});
	}

	function join() {
		return lines.join("\n");
	}

	return { push, lines, shouldPopup, showCopyDialog, join };
}
