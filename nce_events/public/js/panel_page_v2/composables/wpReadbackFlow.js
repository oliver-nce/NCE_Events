/**
 * WP SQL read-back helpers (NCE_Sync live write-back + refresh-from-WP).
 * Used by PanelFormDialog for post-save wait/poll; host imports merge for the panel row.
 */

import { frappeCall } from "../utils/frappeCall.js";

const CUSHION_MS = 1500;
const MIN_WAIT_MS = 1500;
const MAX_WAIT_MS = 8000;
const POLL_RETRIES = 2;
const POLL_GAP_MS = 750;

function sleepMs(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseFrappeModified(s) {
	if (!s) return 0;
	const ms = Date.parse(String(s).trim().replace(" ", "T"));
	return Number.isFinite(ms) ? ms : 0;
}

export function computeWpReadbackWaitMs(writeBackRefreshSeconds) {
	const target = (Number(writeBackRefreshSeconds) || 0) * 1000 + CUSHION_MS;
	return Math.min(MAX_WAIT_MS, Math.max(MIN_WAIT_MS, target));
}

/**
 * @returns {{ enabled: number, write_back_refresh_seconds: number }}
 */
export async function fetchReadbackConfig(frappe_doctype) {
	const out = { enabled: 0, write_back_refresh_seconds: 0 };
	const dt = (frappe_doctype || "").trim();
	if (!dt) return out;
	try {
		const r = await frappeCall(
			"nce_events.api.wp_readback_panel.doctype_has_wp_sql_live_readback",
			{ frappe_doctype: dt },
		);
		if (r && typeof r === "object") {
			out.enabled = Number(r.enabled) || 0;
			out.write_back_refresh_seconds = Number(r.write_back_refresh_seconds) || 0;
		}
	} catch {
		/* treat as disabled */
	}
	return out;
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

async function fetchDoc(doctype, savedName, oldRowName) {
	const tries = Array.from(
		new Set([savedName, oldRowName].filter((n) => n != null && String(n).trim() !== "")),
	).map((n) => String(n).trim());

	for (const name of tries) {
		try {
			const doc = await frappeCall("frappe.client.get", { doctype, name });
			if (doc?.name != null && String(doc.name).trim() !== "") return doc;
		} catch {
			/* next */
		}
	}
	return null;
}

async function fetchDocPolling(doctype, savedName, oldRowName, savedModified) {
	const baselineMs = parseFrappeModified(savedModified);
	let last = null;

	for (let attempt = 0; attempt <= POLL_RETRIES; attempt++) {
		const doc = await fetchDoc(doctype, savedName, oldRowName);
		if (doc) last = doc;
		if (!baselineMs || (doc && parseFrappeModified(doc.modified) > baselineMs)) {
			return doc;
		}
		if (attempt < POLL_RETRIES) await sleepMs(POLL_GAP_MS);
	}

	return last;
}

/**
 * Sleep for WP Tables delay, then poll until ``modified`` moves past ``savedDoc.modified``.
 *
 * @param {{ enabled: number, write_back_refresh_seconds: number }} cfg — from ``fetchReadbackConfig`` (must have enabled === 1)
 * @returns {Promise<object|null>} Fresh doc dict or null
 */
export async function waitForWpReadbackFreshDoc(doctype, savedDoc, oldRowName, cfg) {
	await sleepMs(computeWpReadbackWaitMs(cfg.write_back_refresh_seconds));
	const savedName =
		savedDoc?.name != null && String(savedDoc.name).trim() !== ""
			? String(savedDoc.name).trim()
			: null;
	const savedModified = savedDoc?.modified ? String(savedDoc.modified) : null;
	return fetchDocPolling(doctype, savedName, oldRowName, savedModified);
}
