/**
 * Anchor the SPA page switcher inside the reserved top strip (.ppv2-spa-header).
 * Title occupies the left 1/3; switcher sits in the right 2/3.
 * All coordinates are positive and relative to .ppv2-root.
 */
/**
 * Default initial size for the switcher float. Large enough to show 2–3 page
 * buttons in a single row plus header/footer chrome; PanelFloat handles wrap and
 * the user can resize/drag from there.
 */
const DEFAULT_W = 420;
const DEFAULT_H = 140;

export function measureDeskTitleAnchor(floatH = DEFAULT_H, floatW = DEFAULT_W) {
	const fallback = { x: 360, y: 4, w: floatW, h: floatH };

	const root = document.querySelector(".ppv2-root");
	if (!root) return fallback;

	const rootRect = root.getBoundingClientRect();
	const rootWidth = rootRect.width || 1024;

	const titleSlotWidth = rootWidth / 3;
	const gap = 16;
	const maxRightArea = rootWidth - titleSlotWidth - gap * 2;
	const w = Math.max(260, Math.min(floatW, maxRightArea));

	return {
		x: Math.round(titleSlotWidth + gap),
		y: 4,
		w: Math.round(w),
		h: floatH,
	};
}
