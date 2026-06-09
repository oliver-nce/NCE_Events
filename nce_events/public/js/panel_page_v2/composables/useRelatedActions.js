import { reactive, ref } from "vue";
import { frappeCall } from "../utils/frappeCall.js";

/**
 * Portal-action modal and row-action execution for a related-doctype tab.
 *
 * @param {import('vue').Ref | object} props — component props (definitionName, rootDoctype, rootDocName, ti, tab)
 * @param {{ fetchRelatedForTab: (ti: number) => Promise<void> }} deps
 */
export function useRelatedActions(props, { fetchRelatedForTab }) {
	const actionModal = reactive({
		open: false,
		title: "",
		confirm: "",
		promptArgs: [],
		values: {},
		error: null,
		running: false,
		action: null,
		row: null,
	});

	const actionRunningKey = ref(null);

	function actionRunKey(act, rw) {
		return `${act?.action_id || ""}:${rw?.name ?? ""}`;
	}

	function closeActionModal() {
		actionModal.open = false;
		actionModal.running = false;
		actionModal.error = null;
		actionModal.action = null;
		actionModal.row = null;
		actionModal.promptArgs = [];
		actionModal.values = {};
	}

	function formatActionResultSummary(result) {
		if (!result || typeof result !== "object") {
			return "Action completed.";
		}
		const data = result.data || result;
		const parts = [];
		if (data.message) {
			parts.push(String(data.message));
		}
		if (data.after && typeof data.after === "object") {
			if (data.after.credit != null) {
				parts.push(`Credit: ${data.after.credit}`);
			}
			if (data.after.charged != null) {
				parts.push(`Charged: ${data.after.charged}`);
			}
		}
		return parts.length ? parts.join(" · ") : "Action completed.";
	}

	function handleExchangeActionResult(result, enrollmentId, elapsedMs) {
		const o = result.outcome || {};
		const e = (s) =>
			typeof frappe !== "undefined" ? frappe.utils.escape_html(String(s ?? "")) : String(s ?? "");
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
					`<tr><td class="theme-text-muted" style="padding:3px 12px 3px 0">${e(label)}</td><td style="padding:3px 0"><strong>${e(val)}</strong></td></tr>`,
			)
			.join("");

		const footer =
			o.status === "payment_required"
				? `<p class="theme-text-muted" style="margin-top:12px">The new enrollment will appear here when ${money(o.amount_still_due)} has been paid by the customer.</p>`
				: `<p class="theme-text-muted" style="margin-top:12px">The new enrollment will appear here within ~10 minutes.</p>`;

		const summary = result.summary ? `<p style="margin-bottom:10px">${e(result.summary)}</p>` : "";

		let rawJson = "";
		try {
			rawJson = JSON.stringify(result, null, 2);
		} catch (err) {
			rawJson = String(result);
		}
		const elapsedText =
			typeof elapsedMs === "number" && isFinite(elapsedMs)
				? `<p class="theme-text-muted theme-text-sm" style="margin-top:8px">API round-trip: ${(elapsedMs / 1000).toFixed(2)}s (${Math.round(elapsedMs)} ms)</p>`
				: "";
		const rawSection = `<details style="margin-top:12px"><summary class="theme-text-muted" style="cursor:pointer">Full API response</summary><pre class="theme-bg-surface theme-border theme-rounded-sm theme-text-sm" style="margin-top:8px;max-height:300px;overflow:auto;padding:8px;white-space:pre-wrap;word-break:break-word">${e(rawJson)}</pre></details>`;

		if (typeof frappe !== "undefined" && frappe.msgprint) {
			frappe.msgprint({
				title: "Event Switch Successful",
				message: `${summary}<table style="width:100%">${rows}</table><hr>${footer}${elapsedText}${rawSection}`,
				indicator: "green",
			});
		}
		const removeName =
			enrollmentId || (o.old_order_item_id != null ? String(o.old_order_item_id) : "");
		if (removeName) window._nce_remove_panel_row?.(props.rootDoctype || "Enrollments", removeName);
		window._nce_close_form_dialog?.();
	}

	async function runPortalAction(act, rw, promptValues) {
		const defn = String(props.definitionName || "").trim();
		const dt = String(props.rootDoctype || "").trim();
		const dn = String(props.rootDocName || "").trim();
		const crn = props.tab?._related?.child_row_name;
		if (!defn || !dt || !dn || !crn || !rw?.name) {
			throw new Error("Missing context for portal action");
		}
		return frappeCall("nce_events.api.form_dialog.portal_actions.run_portal_action", {
			definition: defn,
			context_kind: "related",
			related_row_name: crn,
			root_doctype: dt,
			root_name: dn,
			child_name: String(rw.name),
			action_id: act.action_id,
			prompt_values: promptValues || {},
		});
	}

	async function submitActionModal() {
		if (!actionModal.action || !actionModal.row) {
			return;
		}
		for (const pa of actionModal.promptArgs || []) {
			if (pa.reqd && !String(actionModal.values[pa.arg] ?? "").trim()) {
				actionModal.error = `${pa.label || pa.arg} is required.`;
				return;
			}
		}
		actionModal.error = null;
		actionModal.running = true;
		const key = actionRunKey(actionModal.action, actionModal.row);
		actionRunningKey.value = key;
		const enrollmentId = String(props.rootDocName || "").trim();
		const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
		try {
			const r = await runPortalAction(actionModal.action, actionModal.row, { ...actionModal.values });
			const elapsedMs =
				(typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
			closeActionModal();
			if (r?.result?.outcome) {
				handleExchangeActionResult(r.result, enrollmentId, elapsedMs);
			} else {
				if (typeof frappe !== "undefined" && frappe.show_alert) {
					frappe.show_alert({
						message: formatActionResultSummary(r?.result),
						indicator: "green",
					});
				}
				await fetchRelatedForTab(props.ti);
			}
		} catch (e) {
			actionModal.error = e?.message || String(e) || "Action failed";
		} finally {
			actionModal.running = false;
			actionRunningKey.value = null;
		}
	}

	function onRelatedActionClick(act, rw) {
		const promptArgs = Array.isArray(act.promptArgs) ? act.promptArgs : [];
		const needsModal = promptArgs.length > 0 || !!act.confirm;
		if (!needsModal) {
			actionModal.action = act;
			actionModal.row = rw;
			void submitActionModalDirect(act, rw);
			return;
		}
		actionModal.open = true;
		actionModal.title = act.label || act.method || "Action";
		actionModal.confirm = act.confirm || "";
		actionModal.promptArgs = promptArgs;
		actionModal.values = {};
		actionModal.error = null;
		actionModal.running = false;
		actionModal.action = act;
		actionModal.row = rw;
	}

	async function submitActionModalDirect(act, rw) {
		const key = actionRunKey(act, rw);
		actionRunningKey.value = key;
		const enrollmentId = String(props.rootDocName || "").trim();
		const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
		try {
			const r = await runPortalAction(act, rw, {});
			const elapsedMs =
				(typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
			if (r?.result?.outcome) {
				handleExchangeActionResult(r.result, enrollmentId, elapsedMs);
			} else {
				if (typeof frappe !== "undefined" && frappe.show_alert) {
					frappe.show_alert({
						message: formatActionResultSummary(r?.result),
						indicator: "green",
					});
				}
				await fetchRelatedForTab(props.ti);
			}
		} catch (e) {
			if (typeof frappe !== "undefined" && frappe.show_alert) {
				frappe.show_alert({
					message: e?.message || String(e) || "Action failed",
					indicator: "red",
				});
			}
		} finally {
			actionRunningKey.value = null;
			actionModal.action = null;
			actionModal.row = null;
		}
	}

	return {
		actionModal,
		actionRunningKey,
		actionRunKey,
		closeActionModal,
		submitActionModal,
		onRelatedActionClick,
	};
}
