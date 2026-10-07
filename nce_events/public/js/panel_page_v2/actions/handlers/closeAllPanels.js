/**
 * Panel Action: close_all_panels
 * Close all drilled table panels and overlay dialogs in the current SPA.
 * @param {{ closeAllPanels?: () => void; msgprint?: (opts: object) => void }} ctx
 *
 * code-index:begin
 * {
 *  "purpose": "Client Script handler close_all_panels closing drilled floats and overlay dialogs.",
 *  "read_when": "Changing close-all panel action scope or which dialogs get dismissed.",
 *  "gotchas": [],
 *  "keywords": ["close_all_panels", "closeAllPanels", "Panel Action", "overlay", "SPA"],
 *  "format": 1
 * }
 * code-index:end
 */
export default async function closeAllPanels(ctx) {
	if (typeof ctx.closeAllPanels !== "function") {
		ctx.msgprint?.({
			title: __("Error"),
			message: __("Close all is not available on this page."),
			indicator: "red",
		});
		return;
	}
	ctx.closeAllPanels();
}
