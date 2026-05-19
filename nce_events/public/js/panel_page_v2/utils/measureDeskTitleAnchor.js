/**
 * Position a PanelFloat beside the Frappe desk page title (coords relative to .ppv2-root).
 */
export function measureDeskTitleAnchor() {
	const gap = 12;
	const fallback = { x: 280, y: 8, w: 320, h: 80 };

	const root = document.querySelector(".ppv2-root");
	const titleEl =
		document.querySelector(".page-head .page-title") ||
		document.querySelector(".page-head h3") ||
		document.querySelector(".title-text");

	if (!root || !titleEl) {
		return fallback;
	}

	const titleRect = titleEl.getBoundingClientRect();
	const rootRect = root.getBoundingClientRect();

	return {
		x: Math.max(8, titleRect.right - rootRect.left + gap),
		y: Math.max(0, titleRect.top - rootRect.top),
		w: 320,
		h: 80,
	};
}
