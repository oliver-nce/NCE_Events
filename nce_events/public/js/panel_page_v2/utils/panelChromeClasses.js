/** Per-panel surface bg defaults — match runtime fallbacks when Page Panel fields are empty. */
export const PANEL_CHROME_DEFAULTS = {
	frame_bg_class: "theme-bg-surface",
	header_bg_class: "theme-bg-primary",
	header_toolbar_bg_class: "theme-bg-secondary-900",
	footer_bg_class: "theme-bg-primary",
	col_header_bg_class: "theme-bg-secondary-600",
	filter_bar_bg_class: "theme-bg-primary-100",
	row_bg_class: "theme-bg-surface",
	row_alt_bg_class: "theme-bg-row-alt",
	dialog_header_bg_class: "theme-bg-primary",
};

const PALETTE_ROLES = new Set([
	"primary",
	"secondary",
	"accent",
	"success",
	"info",
	"warning",
	"danger",
]);

/** Resolved shipping bg class for one chrome slot (configured value or default). */
export function panelChromeBg(config, field) {
	const key = String(field || "");
	const v = (config?.[key] || "").trim();
	return v || PANEL_CHROME_DEFAULTS[key] || "";
}

/** Saved foreground pairing mode for a bg slot: mono (default) or tonal. */
export function panelChromeFgType(config, bgField) {
	const fgField = String(bgField || "").replace(/_bg_class$/, "_fg_type");
	const v = (config?.[fgField] || "").trim().toLowerCase();
	return v === "tonal" ? "tonal" : "mono";
}

function _fgClassFromBg(bgClass, variant) {
	const s = String(bgClass || "").trim();
	const m = s.match(/^theme-bg-([a-z]+)(?:-(\d+))?$/);
	if (!m || !PALETTE_ROLES.has(m[1])) return "";
	const role = m[1];
	const suffix = variant === "tonal" ? "-fg-tonal" : "-fg";
	return `theme-text-${role}${suffix}`;
}

/** Mono paired fg class from a theme-bg-* class (for children that do not inherit). */
export function themeBgToFgMonoClass(bgClass) {
	return _fgClassFromBg(bgClass, "mono");
}

/** Derive explicit theme-text-* fg class from a theme-bg-* class. Empty for mono (bg auto-pairs). */
export function themeBgToFgTextClass(bgClass, fgType = "mono") {
	if ((fgType || "mono").toLowerCase() !== "tonal") return "";
	return _fgClassFromBg(bgClass, "tonal");
}

/**
 * Explicit fg for chrome children (e.g. Desk <button>) that ignore parent theme-bg color.
 * Mono → theme-text-{role}-fg; tonal → theme-text-{role}-fg-tonal.
 */
export function panelChromeExplicitFgClass(config, bgField) {
	const bg = panelChromeBg(config, bgField);
	const fgType = panelChromeFgType(config, bgField);
	return themeBgToFgTextClass(bg, fgType) || themeBgToFgMonoClass(bg);
}

/** Runtime text class for one chrome slot from saved bg + fg type. */
export function panelChromeFgTextClass(config, bgField) {
	const bg = panelChromeBg(config, bgField);
	const fgType = panelChromeFgType(config, bgField);
	return themeBgToFgTextClass(bg, fgType);
}

/** @deprecated Use panelChromeFgTextClass — kept for callers not yet migrated. */
export function themeBgToFgTonal(bgClass) {
	return themeBgToFgTextClass(bgClass, "tonal");
}
