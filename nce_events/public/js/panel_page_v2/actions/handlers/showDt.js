// Panel Action handler opening a Frappe Desk DocType list in a new browser tab.
//
// code-index:begin
// {
//  "purpose": "Panel Action handler opening a Frappe Desk DocType list in a new browser tab.",
//  "read_when": "Changing show_dt client action or desk list navigation from panel actions.",
//  "gotchas": [],
//  "keywords": ["showDt", "show_dt", "Desk list", "DocType", "Panel Action"],
//  "format": 1
// }
// code-index:end

import { frappeCall } from "../../utils/frappeCall.js";
import { openDeskDoctypeListInNewTab } from "../../utils/openDeskDoctypeList.js";

/**
 * Open Desk list for a DocType in a new tab. Argument: slug or exact name
 * (e.g. error-log or Error Log), from `show_dt(error-log)` in Panel Action.
 * @param {{ args?: string[] }} ctx
 */
export default async function showDt(ctx) {
	const fragment = String(ctx.args?.[0] || "").trim();
	if (!fragment) {
		frappe.msgprint({
			title: __("Error"),
			message: __("Use show_dt(doctype), e.g. show_dt(error-log) or show_dt(\"Error Log\")."),
			indicator: "red",
		});
		return;
	}
	let doctype = fragment;
	try {
		const r = await frappeCall("nce_events.api.panel_actions.resolve_doctype_for_list_route", {
			fragment,
		});
		if (r?.doctype) {
			doctype = r.doctype;
		}
	} catch (e) {
		frappe.msgprint({
			title: __("Error"),
			message: String(e?.message || e),
			indicator: "red",
		});
		return;
	}
	openDeskDoctypeListInNewTab(doctype);
}
