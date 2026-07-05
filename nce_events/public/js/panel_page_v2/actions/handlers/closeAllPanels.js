/**
 * Panel Action: close_all_panels
 * Close all drilled table panels and overlay dialogs in the current SPA.
 * @param {{ closeAllPanels?: () => void; msgprint?: (opts: object) => void }} ctx
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
