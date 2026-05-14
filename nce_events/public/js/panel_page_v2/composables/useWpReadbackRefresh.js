/**
 * useWpReadbackRefresh
 *
 * Owns the full WP SQL read-back UX: detect configuration, size the post-save
 * wait, poll Frappe until the NCE_Sync worker's upsert has landed, merge the
 * fresh doc into the visible panel row, and bump a reactive `reloadTick` so
 * the open Form Dialog runs form.load() without closing.
 *
 * No dialog open/close state lives here — that belongs to usePanelFormDialogHost.
 */

import { ref } from "vue";
import { frappeCall } from "../utils/frappeCall.js";

// ── Timing constants ─────────────────────────────────────────────────────────
// Wall-time budget: NCE_Sync queue pickup + WP push + write_back_refresh_seconds
// + WP triggers + WP SELECT + Frappe upsert.
const CUSHION_MS   = 1500;   // added on top of write_back_refresh_seconds
const MIN_WAIT_MS  = 1500;   // never wait less than this
const MAX_WAIT_MS  = 8000;   // hard cap regardless of config
const POLL_RETRIES = 2;      // extra frappe.client.get attempts after initial wait
const POLL_GAP_MS  = 750;    // gap between retry GETs

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleepMs(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Safari needs the space between date and time replaced with 'T'. */
function parseFrappeModified(s) {
	if (!s) return 0;
	const ms = Date.parse(String(s).trim().replace(" ", "T"));
	return Number.isFinite(ms) ? ms : 0;
}

function computeWaitMs(writeBackRefreshSeconds) {
	const target = (Number(writeBackRefreshSeconds) || 0) * 1000 + CUSHION_MS;
	return Math.min(MAX_WAIT_MS, Math.max(MIN_WAIT_MS, target));
}

function frappeFreezeRefreshing() {
	if (typeof frappe !== "undefined" && frappe.dom?.freeze) {
		const msg = typeof window.__ === "function" ? window.__("Refreshing…") : "Refreshing…";
		frappe.dom.freeze(msg);
	}
}

function frappeUnfreeze() {
	if (typeof frappe !== "undefined" && frappe.dom?.unfreeze) {
		frappe.dom.unfreeze();
	}
}

/** Mutable row array from a floated panel — tries the reactive ref first. */
function panelRowList(panel) {
	const pr = panel._panelRows;
	if (pr?.value !== undefined && Array.isArray(pr.value)) return pr.value;
	if (Array.isArray(panel.rows)) return panel.rows;
	return [];
}

/** Merge fresh doc into the panel row that matches any of the known name candidates. */
function mergeFreshDocIntoPanel(panel, doc, oldRowName, savedName) {
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
 * Fetch by savedName first, then oldRowName (covers WP-side PK renames).
 * Returns the doc or null.
 */
async function fetchDoc(doctype, savedName, oldRowName) {
	const tries = Array.from(
		new Set([savedName, oldRowName].filter((n) => n != null && String(n).trim() !== ""))
	).map((n) => String(n).trim());

	for (const name of tries) {
		try {
			const doc = await frappeCall("frappe.client.get", { doctype, name });
			if (doc?.name != null && String(doc.name).trim() !== "") return doc;
		} catch {
			// try next candidate
		}
	}
	return null;
}

/**
 * Poll Frappe until doc.modified is strictly newer than savedModified, proving
 * NCE_Sync's read-back upsert has landed. Falls back to the last fetched doc
 * so the caller always has something to work with.
 */
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

// ── Composable ────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   reloadTick: import('vue').Ref<number>,
 *   runIfEnabled: (opts: {
 *     doctype: string,
 *     savedDoc: object|null,
 *     oldRowName: string|null,
 *     panel: object|null,
 *     setDialogDocName: (name: string) => void,
 *   }) => Promise<boolean>
 * }}
 */
export function useWpReadbackRefresh() {
	/** Bumped after WP read-back; watched by PanelFormDialog to run form.load(). */
	const reloadTick = ref(0);

	/**
	 * Check whether WP read-back is configured for this doctype and, if so:
	 *   1. Show the "Refreshing…" spinner.
	 *   2. Wait for the NCE_Sync worker to finish (dynamic delay + polling).
	 *   3. Merge the fresh doc into the panel row.
	 *   4. Update the dialog's doc name (handles WP-side PK renames).
	 *   5. Bump reloadTick so the dialog calls form.load().
	 *
	 * @returns {Promise<boolean>} true when the WP read-back path was taken,
	 *   false when the doctype has no read-back configured (caller should do a
	 *   standard panel._reload() instead).
	 */
	async function runIfEnabled({ doctype, savedDoc, oldRowName, panel, setDialogDocName }) {
		let readback = { enabled: 0, write_back_refresh_seconds: 0 };

		if (doctype) {
			try {
				const r = await frappeCall(
					"nce_events.api.wp_readback_panel.doctype_has_wp_sql_live_readback",
					{ frappe_doctype: doctype },
				);
				if (r && typeof r === "object") {
					readback = {
						enabled: Number(r.enabled) || 0,
						write_back_refresh_seconds: Number(r.write_back_refresh_seconds) || 0,
					};
				}
			} catch {
				readback = { enabled: 0, write_back_refresh_seconds: 0 };
			}
		}

		if (readback.enabled !== 1) return false;

		const savedName =
			savedDoc?.name != null && String(savedDoc.name).trim() !== ""
				? String(savedDoc.name).trim()
				: null;
		const savedModified = savedDoc?.modified ? String(savedDoc.modified) : null;

		frappeFreezeRefreshing();
		try {
			await sleepMs(computeWaitMs(readback.write_back_refresh_seconds));
			const fresh = await fetchDocPolling(doctype, savedName, oldRowName, savedModified);
			const freshName = fresh?.name != null ? String(fresh.name).trim() : "";
			setDialogDocName(freshName || savedName || oldRowName || null);
			if (panel && fresh) mergeFreshDocIntoPanel(panel, fresh, oldRowName, savedName);
			reloadTick.value++;
		} finally {
			frappeUnfreeze();
		}

		return true;
	}

	return { reloadTick, runIfEnabled };
}
