/**
 * Normalize Events doc dates before WooCommerce preview/publish.
 * Ensures YYYY-MM-DD strings (Frappe Date / JSON Date / Moment) so Python getdate sees them.
 */
const WOO_EVENTS_DATE_FIELDNAMES = ["first_session_date", "end_date"];

/** MM-DD-YYYY as shown in Frappe Desk US datepickers, e.g. 05-28-2026 */
function usStyleMmDdYyyyToYmd(t) {
	const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(t.trim());
	if (!m) {
		return null;
	}
	const mm = m[1].padStart(2, "0");
	const dd = m[2].padStart(2, "0");
	const yyyy = m[3];
	return `${yyyy}-${mm}-${dd}`;
}

function coerceToYmd(v) {
	if (v == null || v === "") {
		return v;
	}
	if (typeof v === "string") {
		const t = v.trim();
		if (!t) {
			return "";
		}
		if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
			return t;
		}
		if (/^\d{4}-\d{2}-\d{2}T/.test(t)) {
			return t.slice(0, 10);
		}
		if (typeof frappe !== "undefined" && frappe.datetime?.user_to_str) {
			try {
				const s = frappe.datetime.user_to_str(t, true);
				if (s && /^\d{4}-\d{2}-\d{2}/.test(String(s))) {
					return String(s).slice(0, 10);
				}
			} catch {
				/* fall through */
			}
		}
		const us = usStyleMmDdYyyyToYmd(t);
		if (us) {
			return us;
		}
		return t;
	}
	if (v instanceof Date) {
		if (Number.isNaN(v.getTime())) {
			return "";
		}
		const y = v.getFullYear();
		const m = String(v.getMonth() + 1).padStart(2, "0");
		const d = String(v.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}
	if (v && typeof v === "object" && v._isAMomentObject && typeof v.format === "function") {
		return v.format("YYYY-MM-DD");
	}
	if (typeof frappe !== "undefined" && frappe.datetime?.user_to_str) {
		try {
			const s = frappe.datetime.user_to_str(v, true);
			if (s && /^\d{4}-\d{2}-\d{2}/.test(String(s))) {
				return String(s).slice(0, 10);
			}
		} catch {
			/* keep original below */
		}
	}
	return v;
}

/**
 * @param {Record<string, unknown>} doc
 * @returns {Record<string, unknown>}
 */
export function normalizeDocForWooEventsPublish(doc) {
	if (!doc || typeof doc !== "object") {
		return doc;
	}
	const plain = JSON.parse(JSON.stringify(doc));
	for (const fn of WOO_EVENTS_DATE_FIELDNAMES) {
		if (!Object.prototype.hasOwnProperty.call(plain, fn)) {
			continue;
		}
		plain[fn] = coerceToYmd(plain[fn]);
	}
	return plain;
}
