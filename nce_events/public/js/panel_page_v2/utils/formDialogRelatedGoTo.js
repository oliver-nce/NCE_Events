/**
 * Build get_panel_data drill-down filters for Form Dialog related-tab "Go to".
 * Mirrors nce_events.api.form_dialog._helpers._filters_for_related_rows.
 *
 * @param {{ link_field?: string, hop_chain?: object[] }} related
 * @param {string} rootDocName
 * @param {object[]} rows — loaded related-tab rows (must include `name` for multi-hop)
 * @returns {Record<string, string | [string, string[]]> | null} null when filter cannot be built
 */
export function buildRelatedTabPanelFilter(related, rootDocName, rows) {
	const linkField = String(related?.link_field || "").trim();
	if (!linkField) {
		return null;
	}
	const root = String(rootDocName || "").trim();
	if (!root) {
		return null;
	}

	const hopChain = Array.isArray(related?.hop_chain) ? related.hop_chain : [];
	if (!hopChain.length) {
		return { [linkField]: root };
	}

	const names = [];
	const seen = new Set();
	for (const rw of rows || []) {
		if (!rw || rw.name == null || rw.name === "") {
			continue;
		}
		const s = String(rw.name).trim();
		if (!s || seen.has(s)) {
			continue;
		}
		seen.add(s);
		names.push(s);
	}
	if (!names.length) {
		return null;
	}
	if (names.length === 1) {
		return { [linkField]: names[0] };
	}
	return { [linkField]: ["in", names] };
}

/**
 * @param {number} ti
 * @param {Record<number, { loading?: boolean, error?: string|null, rows?: object[] }>} relatedState
 */
export function canGoToRelatedPanel(tab, rootDocName, relatedState, ti) {
	if (!tab?._related?.child_row_name || !String(rootDocName || "").trim()) {
		return false;
	}
	if (!String(tab._related.link_field || "").trim()) {
		return false;
	}
	const st = relatedState[ti];
	if (!st || st.loading || st.error) {
		return false;
	}
	const hopChain = Array.isArray(tab._related.hop_chain) ? tab._related.hop_chain : [];
	if (!hopChain.length) {
		return true;
	}
	const rows = st.rows || [];
	return rows.some((rw) => rw && rw.name != null && String(rw.name).trim() !== "");
}
