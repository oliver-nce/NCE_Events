/**
 * Client check for nce_sync per-DocType sync busy flag (Redis gate).
 * Used before opening panel Form Dialogs on mirrored tables.
 *
 * code-index:begin
 * {
 *  "purpose": "Client check for nce_sync per-DocType Redis busy gate before opening mirrored form dialogs.",
 *  "read_when": "When blocking form dialog open during sync or changing assertDoctypeNotSyncBusy.",
 *  "gotchas": [],
 *  "keywords": ["syncGateClient", "isDoctypeSyncBusy", "assertDoctypeNotSyncBusy", "nce_sync", "Redis gate", "mirrored tables"],
 *  "format": 1
 * }
 * code-index:end
 */

import { frappeCall } from "./frappeCall.js";
import { ppv2DebugWarn } from "./ppv2Debug.js";

/**
 * @param {string} doctype
 * @returns {Promise<boolean>} true if a sync is in progress for this DocType
 */
export async function isDoctypeSyncBusy(doctype) {
	const dt = String(doctype || "").trim();
	if (!dt) return false;
	try {
		const r = await frappeCall("nce_events.api.sync_status.is_doctype_sync_busy", {
			doctype: dt,
		});
		return !!r?.busy;
	} catch (e) {
		ppv2DebugWarn("[syncGateClient] is_doctype_sync_busy failed:", e);
		return false;
	}
}

/**
 * Show a message and return false when the DocType is sync-busy; true when OK to proceed.
 * @param {string} doctype
 * @returns {Promise<boolean>}
 */
export async function assertDoctypeNotSyncBusy(doctype) {
	const dt = String(doctype || "").trim();
	if (!dt) return true;
	if (!(await isDoctypeSyncBusy(dt))) return true;

	const title =
		typeof window.__ === "function" ? window.__("Sync in progress") : "Sync in progress";
	const message =
		typeof window.__ === "function"
			? window.__(
					"A WordPress sync is running for {0}. Wait for it to finish, then open the record again.",
					[dt],
				)
			: `A WordPress sync is running for ${dt}. Wait for it to finish, then open the record again.`;

	if (typeof frappe !== "undefined" && frappe.msgprint) {
		frappe.msgprint({ title, message, indicator: "orange" });
	}
	return false;
}
