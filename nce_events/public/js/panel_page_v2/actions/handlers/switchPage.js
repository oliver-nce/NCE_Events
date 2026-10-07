// Panel Action handler switch_page navigating to another SPA page by slug.
//
// code-index:begin
// {
//  "purpose": "Panel Action handler switch_page navigating to another SPA page by slug.",
//  "read_when": "Changing SPA page switch action or target slug resolution from panel actions.",
//  "gotchas": [],
//  "keywords": ["switchPage", "switch_page", "SPA", "page_slug", "navigateToSpaPage"],
//  "format": 1
// }
// code-index:end

import { frappeCall } from "../../utils/frappeCall.js";
import { navigateToSpaPage } from "../../utils/navigateToSpaPage.js";

/**
 * Panel Action: switch_page(<target_spa>).
 * target_spa = page_slug, doctype_source_mode (Mirror/Native), or switch_handler_slug.
 * Resolved server-side via resolve_spa_switch.
 */
export default async function switchPage(ctx) {
	const target = (ctx?.args && ctx.args[0]) || "";
	if (!target) {
		ctx.msgprint({
			title: __("Switch Page"),
			message: __("Missing target SPA (e.g. Native or panel-page-native)"),
			indicator: "orange",
		});
		return;
	}
	try {
		const cfg = await frappeCall("nce_events.api.spa_page.resolve_spa_switch", {
			target_spa: target,
		});
		navigateToSpaPage(cfg.route);
	} catch (e) {
		ctx.msgprint({
			title: __("Switch Page"),
			message: String(e?.message || e),
			indicator: "red",
		});
	}
}
