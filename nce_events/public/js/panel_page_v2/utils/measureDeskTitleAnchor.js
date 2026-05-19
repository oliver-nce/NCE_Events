/**
 * Anchor the SPA page switcher inside the reserved top strip (.ppv2-spa-header).
 * Title occupies the left 1/3; switcher sits in the right 2/3.
 * All coordinates are positive and relative to .ppv2-root.
 */
export function measureDeskTitleAnchor(floatH = 44) {
	const fallback = { x: 360, y: 8, w: 320, h: floatH };

	const root = document.querySelector(".ppv2-root");
	if (!root) return fallback;

	const rootRect = root.getBoundingClientRect();
	const rootWidth = rootRect.width || 1024;

	const header = root.querySelector(".ppv2-spa-header");
	const headerH = header ? header.getBoundingClientRect().height : 56;

	const titleSlotWidth = rootWidth / 3;
	const gap = 16;
	const desiredW = 320;
	const maxRightArea = rootWidth - titleSlotWidth - gap * 2;
	const w = Math.max(220, Math.min(desiredW, maxRightArea));

	return {
		x: Math.round(titleSlotWidth + gap),
		y: Math.round(Math.max(4, (headerH - floatH) / 2)),
		w: Math.round(w),
		h: floatH,
	};
}
