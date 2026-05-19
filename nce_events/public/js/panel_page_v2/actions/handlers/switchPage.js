import { frappeCall } from "../../utils/frappeCall.js";

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
		window.location.assign(cfg.route);
	} catch (e) {
		ctx.msgprint({
			title: __("Switch Page"),
			message: String(e?.message || e),
			indicator: "red",
		});
	}
}
