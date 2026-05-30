/**
 * Client check for nce_sync per-DocType sync busy flag (Redis gate).
 * Used before opening panel Form Dialogs on mirrored tables.
 */

import { frappeCall } from "./frappeCall.js";

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
		console.warn("[syncGateClient] is_doctype_sync_busy failed:", e);
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
