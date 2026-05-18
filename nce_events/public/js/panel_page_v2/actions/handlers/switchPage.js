/**
 * Client Script panel action: navigate to another Frappe Page by slug.
 * Configured on Panel Action as client_handler = `switch_page(panel-page-native)`.
 * Uses a full browser navigation so the target page mounts a fresh Vue SPA.
 */
export default function switchPage(ctx) {
	const slug = (ctx?.args && ctx.args[0]) || "";
	if (!slug) {
		ctx.msgprint({
			title: __("Switch Page"),
			message: __("Missing target page slug"),
			indicator: "orange",
		});
		return;
	}
	window.location.assign("/app/" + slug);
}
