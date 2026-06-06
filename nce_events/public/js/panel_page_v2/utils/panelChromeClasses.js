/** Per-panel surface bg defaults — match runtime fallbacks when Page Panel fields are empty. */
export const PANEL_CHROME_DEFAULTS = {
	frame_bg_class: "theme-bg-surface",
	header_bg_class: "theme-bg-primary",
	footer_bg_class: "theme-bg-primary",
	col_header_bg_class: "theme-bg-secondary-600",
	filter_bar_bg_class: "theme-bg-primary-100",
	row_bg_class: "theme-bg-surface",
	row_alt_bg_class: "theme-bg-row-alt",
	dialog_header_bg_class: "theme-bg-primary",
};

/** Resolved shipping bg class for one chrome slot (configured value or default). */
export function panelChromeBg(config, field) {
	const key = String(field || "");
	const v = (config?.[key] || "").trim();
	return v || PANEL_CHROME_DEFAULTS[key] || "";
}

/** Derive paired -fg-tonal text class from a theme-bg-* class (footer, click hint). */
export function themeBgToFgTonal(bgClass) {
	const s = String(bgClass || "").trim();
	const m = s.match(/^theme-bg-([a-z]+)(?:-(\d+))?$/);
	if (!m) return "theme-text-primary-fg-tonal";
	const role = m[1];
	const shade = m[2];
	return shade ? `theme-text-${role}-${shade}-fg-tonal` : `theme-text-${role}-fg-tonal`;
}
