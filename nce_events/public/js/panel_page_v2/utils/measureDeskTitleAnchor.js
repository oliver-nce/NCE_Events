/**
 * Position a PanelFloat beside the Frappe desk page title (coords relative to .ppv2-root).
 * Y may be negative when the title sits above the Vue root (typical SPA page layout).
 */
export function measureDeskTitleAnchor(floatH = 80) {
	const gap = 12;
	const fallback = { x: 280, y: -52, w: 320, h: floatH };

	const root = document.querySelector(".ppv2-root");
	const pageHead = document.querySelector(".page-head");
	const titleEl =
		pageHead?.querySelector(".page-title") ||
		pageHead?.querySelector("h3") ||
		pageHead?.querySelector(".title-text");

	if (!root || !titleEl) {
		return fallback;
	}

	const titleRect = titleEl.getBoundingClientRect();
	const rootRect = root.getBoundingClientRect();

	return {
		x: Math.max(8, titleRect.right - rootRect.left + gap),
		y: titleRect.top - rootRect.top + (titleRect.height - floatH) / 2,
		w: 320,
		h: floatH,
	};
}
