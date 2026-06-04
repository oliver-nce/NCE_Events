/**
 * Form Dialog submit timings: console + optional Desk msgprint copy block.
 *
 * Regular click → console.log lines only.
 * Shift+click   → live dialog opens immediately and streams each step.
 *
 * Enable popup after regular submit: localStorage.setItem("nce_fd_submit_trace", "1")
 * Disable: localStorage.removeItem("nce_fd_submit_trace")
 */

export function createSubmitPerfTrace({ liveDialog = false } = {}) {
	const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
	const lines = [];
	let _pre = null;
	let _dialog = null;

	if (liveDialog && typeof frappe !== "undefined" && frappe.ui?.Dialog) {
		try {
			_dialog = new frappe.ui.Dialog({
				title: "Submit trace — running…",
				size: "large",
			});
			_dialog.show();
			const pre = document.createElement("pre");
			pre.style.cssText =
				"white-space:pre-wrap;max-height:65vh;overflow:auto;font-size:var(--font-size-sm);" +
				"user-select:all;padding:8px;margin:0;line-height:1.5;";
			_dialog.$body[0].appendChild(pre);
			_pre = pre;
		} catch {
			_pre = null;
			_dialog = null;
		}
	}

	function updateLiveDialog() {
		if (!_pre) return;
		try {
			_pre.textContent = lines.join("\n");
			_pre.scrollTop = _pre.scrollHeight;
		} catch {
			/* ignore */
		}
	}

	function push(cat, msg) {
		const now = typeof performance !== "undefined" ? performance.now() : Date.now();
		const delta = +(now - t0).toFixed(1);
		const line = `[+${delta} ms] ${cat}: ${msg}`;
		lines.push(line);
		if (typeof console !== "undefined" && console.log) {
			console.log("[NCE submit]", line);
		}
		updateLiveDialog();
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

		if (_dialog) {
			try {
				_dialog.set_title("Submit trace — done");
			} catch {
				/* ignore */
			}
			return;
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
				`<p class="theme-text-muted theme-text-sm" style="margin-bottom:8px">${__(
					"Copy the block below. Disable popup:",
				)} <code>localStorage.removeItem('nce_fd_submit_trace')</code></p>` +
				`<pre class="theme-text-sm" style="white-space:pre-wrap;max-height:60vh;overflow:auto;user-select:all;">${frappe.utils.escape_html(raw)}</pre>`,
			indicator: "blue",
			wide: true,
		});
	}

	function join() {
		return lines.join("\n");
	}

	return { push, lines, shouldPopup, showCopyDialog, join };
}
