/**
 * Panel Action: cascade_panels
 * Stagger open drilled panel floats diagonally (same step as drill-down placement).
 * @param {{ cascadePanels?: () => void; showAlert?: (opts: object) => void }} ctx
 */
export default async function cascadePanels(ctx) {
	if (typeof ctx.cascadePanels !== "function") {
		ctx.msgprint?.({
			title: __("Error"),
			message: __("Cascade is not available on this page."),
			indicator: "red",
		});
		return;
	}
	ctx.cascadePanels();
}
