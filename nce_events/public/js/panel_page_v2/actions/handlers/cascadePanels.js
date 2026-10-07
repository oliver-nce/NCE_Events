/**
 * Panel Action: cascade_panels
 * Stagger open drilled panel floats diagonally (same step as drill-down placement).
 * @param {{ cascadePanels?: () => void; showAlert?: (opts: object) => void }} ctx
 *
 * code-index:begin
 * {
 *  "purpose": "Client Script handler cascade_panels staggering open drilled panel floats diagonally.",
 *  "read_when": "Changing cascade panel action behavior or drill-down float placement.",
 *  "gotchas": [],
 *  "keywords": ["cascade_panels", "Panel Action", "cascadePanels", "drilled", "float"],
 *  "format": 1
 * }
 * code-index:end
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
