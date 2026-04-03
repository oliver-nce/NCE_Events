import { toRaw } from "vue";

/** Stable JSON for dirty-checking reactive form state vs loaded snapshot. */
export function snapshotForCompare(data) {
	const raw = toRaw(data) || {};
	const sorted = {};
	for (const k of Object.keys(raw).sort()) {
		let v = raw[k];
		if (v === undefined) v = null;
		sorted[k] = v;
	}
	return JSON.stringify(sorted);
}
