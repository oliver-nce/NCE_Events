/**
 * Anchor the SPA page switcher inside Zone 2 (.ppv2-zone-pages).
 * All coordinates are positive and relative to that zone's top-left.
 */
const DEFAULT_W = 420;
const DEFAULT_H = 140;

export function measureDeskTitleAnchor(floatH = DEFAULT_H, floatW = DEFAULT_W) {
	const fallback = { x: 16, y: 4, w: floatW, h: floatH };

	const zone = document.querySelector(".ppv2-zone-pages");
	if (!zone) return fallback;

	const zoneRect = zone.getBoundingClientRect();
	const zoneWidth = zoneRect.width || 600;

	const gap = 16;
	const maxW = Math.max(260, zoneWidth - gap * 2);
	const w = Math.min(floatW, maxW);

	return {
		x: gap,
		y: 4,
		w: Math.round(w),
		h: floatH,
	};
}
