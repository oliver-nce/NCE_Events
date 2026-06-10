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

/** Per-panel line/border width + color defaults (Colours tab → Lines & borders). */
export const PANEL_BORDER_DEFAULTS = {
	frame_border_class: "theme-border",
	frame_border_color_class: "",
	filter_divider_class: "theme-border-thin",
	filter_divider_color_class: "",
	col_header_line_class: "theme-border-strong",
	col_header_line_color_class: "",
	row_divider_class: "theme-border-thin",
	row_divider_color_class: "",
	col_divider_class: "theme-border-thin",
	col_divider_color_class: "",
};

const BORDER_WIDTH_CSS_VARS = {
	"theme-border-thin": "--nce-border-width-thin",
	"theme-border": "--nce-border-width",
	"theme-border-strong": "--nce-border-width-strong",
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

/** Resolved border width or color class for one chrome slot (configured value or default). */
export function panelChromeBorder(config, field) {
	const key = String(field || "");
	const v = (config?.[key] || "").trim();
	if (v) return v;
	if (Object.prototype.hasOwnProperty.call(PANEL_BORDER_DEFAULTS, key)) {
		return PANEL_BORDER_DEFAULTS[key] || "";
	}
	return "";
}

/** CSS var name for a theme-border* width class (directional lines in scoped CSS). */
export function panelChromeBorderWidthVar(config, field) {
	const cls = panelChromeBorder(config, field);
	return BORDER_WIDTH_CSS_VARS[cls] || BORDER_WIDTH_CSS_VARS["theme-border"];
}

/** CSS color value for a theme-{bg|text|border}-{role}-{shade} class, or site border token when empty. */
export function panelChromeBorderColorCss(config, colorField) {
	const raw = (config?.[colorField] || "").trim();
	if (!raw) return "var(--nce-color-border)";
	const m = raw.match(/^theme-(?:bg|text|border)-([a-z]+)-(\d+)$/);
	if (!m || !PALETTE_ROLES.has(m[1])) return "var(--nce-color-border)";
	return `var(--nce-color-${m[1]}-${m[2]})`;
}

/** Full-box frame border classes (width + optional color) for PanelFloat. */
export function panelChromeFrameBorderClasses(config) {
	const width = panelChromeBorder(config, "frame_border_class");
	const color = panelChromeBorder(config, "frame_border_color_class");
	return [width, color].filter(Boolean);
}

/** CSS custom properties for PanelTable directional dividers. */
export function panelChromeTableBorderStyleVars(config) {
	return {
		"--ppv2-col-header-line-w": `var(${panelChromeBorderWidthVar(config, "col_header_line_class")})`,
		"--ppv2-col-header-line-c": panelChromeBorderColorCss(
			config,
			"col_header_line_color_class"
		),
		"--ppv2-row-divider-w": `var(${panelChromeBorderWidthVar(config, "row_divider_class")})`,
		"--ppv2-row-divider-c": panelChromeBorderColorCss(config, "row_divider_color_class"),
		"--ppv2-col-divider-w": `var(${panelChromeBorderWidthVar(config, "col_divider_class")})`,
		"--ppv2-col-divider-c": panelChromeBorderColorCss(config, "col_divider_color_class"),
	};
}

/** CSS custom properties for filter bar bottom divider. */
export function panelChromeFilterDividerStyleVars(config) {
	return {
		"--ppv2-filter-divider-w": `var(${panelChromeBorderWidthVar(config, "filter_divider_class")})`,
		"--ppv2-filter-divider-c": panelChromeBorderColorCss(
			config,
			"filter_divider_color_class"
		),
	};
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
