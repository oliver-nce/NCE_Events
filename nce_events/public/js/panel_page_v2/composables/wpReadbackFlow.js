/**
 * WP SQL read-back helpers — job-poll edition.
 * Used by PanelFormDialog after save: poll NCE Sync job IDs until all finish,
 * then fetch the fresh doc from Frappe.
 */

import { frappeCall } from "../utils/frappeCall.js";

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
 * @param {{ intervalMs?: number, timeoutMs?: number }} opts
 * @returns {Promise<{ allFinished: boolean, anyFailed: boolean, statuses: Record<string,string|null> }>}
 */
export async function pollSyncJobsUntilDone(
	jobIds,
	{ intervalMs = DEFAULT_POLL_INTERVAL_MS, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
	if (!jobIds || !jobIds.length) {
		return { allFinished: true, anyFailed: false, statuses: {} };
	}
	const terminal = new Set(["finished", "failed", "stopped"]);
	const statuses = Object.fromEntries(jobIds.map((id) => [id, "queued"]));
	const pending = new Set(jobIds);
	const deadline = Date.now() + timeoutMs;

	while (pending.size > 0 && Date.now() < deadline) {
		await sleepMs(intervalMs);
		for (const id of Array.from(pending)) {
			try {
				const st = await frappeCall(
					"nce_events.api.sync_status.get_sync_job_status",
					{ job_id: id },
				);
				const status = st ?? "missing";
				statuses[id] = status;
				if (terminal.has(status) || status === "missing") {
					pending.delete(id);
				}
			} catch {
				/* network blip — keep polling */
			}
		}
	}

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
