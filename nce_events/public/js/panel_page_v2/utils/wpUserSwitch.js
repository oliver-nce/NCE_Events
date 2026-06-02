/**
 * Open WordPress in a new tab logged in as the family user (signed bridge URL).
 */

export function familyIdFromRow(row, fieldname) {
	const fn = String(fieldname || "").trim();
	if (!fn || !row) return "";
	const v = row[fn] ?? row[fn.toLowerCase()] ?? row[fn.toUpperCase()];
	return v == null ? "" : String(v).trim();
}

export async function openWpUserSwitch(familyId, { frappeCall, msgprint } = {}) {
	const id = String(familyId || "").trim();
	if (!id) {
		msgprint?.({
			title: __("View as"),
			message: __("No family ID on this row."),
			indicator: "orange",
		});
		return;
	}
	try {
		const r = await frappeCall("nce_events.api.wp_user_switch.get_wp_switch_url", {
			family_id: id,
		});
		const url = r?.url;
		if (!url) {
			throw new Error(__("No switch URL returned."));
		}
		window.open(url, "_blank", "noopener,noreferrer");
	} catch (e) {
		msgprint?.({
			title: __("View as"),
			message: String(e?.message || e),
			indicator: "red",
		});
	}
}
