/**
 * WP SQL read-back helpers — job-poll edition.
 * Used by PanelFormDialog after save: poll NCE Sync job IDs until all finish,
 * then fetch the fresh doc from Frappe.
 */

import { frappeCall } from "../utils/frappeCall.js";
import { ppv2DebugLog, ppv2DebugWarn } from "../utils/ppv2Debug.js";

const DEFAULT_POLL_INTERVAL_MS = 600;
const DEFAULT_TIMEOUT_MS = 120_000;

function sleepMs(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function panelRowList(panel) {
	const pr = panel._panelRows;
	if (pr?.value !== undefined && Array.isArray(pr.value)) return pr.value;
	if (Array.isArray(panel.rows)) return panel.rows;
	return [];
}

/** Merge fresh Desk doc into the matching floated panel row. */
export function mergeFreshDocIntoPanel(panel, doc, oldRowName, savedName) {
	if (!panel || !doc) return;
	const docNameStr = doc.name != null ? String(doc.name).trim() : "";
	const needles = Array.from(
		new Set(
			[String(oldRowName || ""), String(savedName || ""), docNameStr].filter((s) => s !== ""),
		),
	);
	const list = panelRowList(panel);
	let target = null;
	for (const needle of needles) {
		target = list.find((r) => r && String(r.name) === needle);
		if (target) break;
	}
	if (target) Object.assign(target, doc);
}

/**
 * Poll all jobIds until every one reaches a terminal state or timeout.
 *
 * @param {string[]} jobIds
 * @param {{ intervalMs?: number, timeoutMs?: number, log?: (category: string, message: string) => void }} opts
 * @returns {Promise<{ allFinished: boolean, anyFailed: boolean, statuses: Record<string,string|null> }>}
 */
export async function pollSyncJobsUntilDone(
	jobIds,
	{ intervalMs = DEFAULT_POLL_INTERVAL_MS, timeoutMs = DEFAULT_TIMEOUT_MS, log } = {},
) {
	if (!jobIds || !jobIds.length) {
		return { allFinished: true, anyFailed: false, statuses: {} };
	}
	const terminal = new Set(["finished", "failed", "stopped"]);
	const statuses = Object.fromEntries(jobIds.map((id) => [id, "queued"]));
	const pending = new Set(jobIds);
	const errorCounts = Object.fromEntries(jobIds.map((id) => [id, 0]));
	const MAX_CONSECUTIVE_ERRORS = 3;
	const deadline = Date.now() + timeoutMs;
	const pollStart = Date.now();

	ppv2DebugLog("[NCE readback] polling jobs:", jobIds);
	log?.(
		"poll",
		`start (${jobIds.length} job(s), interval ${intervalMs}ms, timeout ${timeoutMs}ms)`,
	);
	while (pending.size > 0 && Date.now() < deadline) {
		await sleepMs(intervalMs);
		log?.("poll_tick", `${pending.size} pending, elapsed ${Date.now() - pollStart}ms`);
		for (const id of Array.from(pending)) {
			try {
				const st = await frappeCall(
					"nce_events.api.sync_status.get_sync_job_status",
					{ job_id: id },
				);
				const status = st ?? "missing";
				statuses[id] = status;
				errorCounts[id] = 0;
				ppv2DebugLog(`[NCE readback] job ${id.slice(0, 8)}… → ${status}`);
				log?.("job_status", `${id.slice(0, 8)}… → ${status}`);
				if (terminal.has(status) || status === "missing") {
					pending.delete(id);
				}
			} catch (err) {
				errorCounts[id] = (errorCounts[id] || 0) + 1;
				ppv2DebugWarn("[NCE readback] poll error for job", id.slice(0, 8) + "…", err);
				log?.(
					"job_poll_err",
					`${id.slice(0, 8)}… ${err?.message || String(err)} (error ${errorCounts[id]}/${MAX_CONSECUTIVE_ERRORS})`,
				);
				if (errorCounts[id] >= MAX_CONSECUTIVE_ERRORS) {
					statuses[id] = "missing";
					pending.delete(id);
					ppv2DebugWarn("[NCE readback] giving up on job", id.slice(0, 8) + "… after", MAX_CONSECUTIVE_ERRORS, "errors");
					log?.("job_gave_up", `${id.slice(0, 8)}… removed after ${MAX_CONSECUTIVE_ERRORS} consecutive errors`);
				}
			}
		}
	}
	const timedOut = pending.size > 0 && Date.now() >= deadline;
	if (timedOut) {
		log?.("poll_timeout", `${pending.size} job(s) still pending after ${timeoutMs}ms`);
	}
	ppv2DebugLog("[NCE readback] poll done. allFinished:", pending.size === 0, "statuses:", statuses);
	log?.("poll_done", `allFinished=${pending.size === 0} anyTimedOut=${timedOut}`);

	const anyFailed = Object.values(statuses).some(
		(s) => s === "failed" || s === "stopped",
	);
	const allFinished = pending.size === 0;
	return { allFinished, anyFailed, statuses };
}

/**
 * Fetch the fresh Frappe doc after sync jobs complete.
 * @returns {Promise<object|null>}
 */
export async function fetchFreshDocAfterSync(doctype, docName) {
	if (!doctype || !docName) return null;
	try {
		const doc = await frappeCall("frappe.client.get", { doctype, name: docName });
		if (doc?.name != null && String(doc.name).trim() !== "") return doc;
	} catch {
		/* ignore */
	}
	return null;
}
