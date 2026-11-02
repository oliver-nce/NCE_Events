/** Fixed panel chrome class names (Frappe UI bridge colours via scoped CSS in consumers).
 *
 * code-index:begin
 * {
 *  "purpose": "Fixed panel chrome bg/border class names and CSS var helpers for panel floats and tables.",
 *  "read_when": "When changing default panel float surface colours or table divider CSS variables.",
 *  "gotchas": [],
 *  "keywords": ["panelChromeClasses", "PANEL_CHROME_DEFAULTS", "panelChromeBg", "panelChromeBorder", "PANEL_BORDER_DEFAULTS"],
 *  "format": 1
 * }
 * code-index:end
 */
export const PANEL_CHROME_DEFAULTS = {
	frame_bg_class: "ppv2-chrome-surface",
	header_bg_class: "ppv2-chrome-header",
	header_toolbar_bg_class: "ppv2-chrome-header-toolbar",
	footer_bg_class: "ppv2-chrome-footer",
	col_header_bg_class: "ppv2-chrome-col-header",
	filter_bar_bg_class: "ppv2-chrome-filter-bar",
	row_bg_class: "ppv2-chrome-row",
	row_alt_bg_class: "ppv2-chrome-row-alt",
	dialog_header_bg_class: "ppv2-chrome-dialog-header",
};

/** Legacy border slot keys — frame uses ppv2-chrome-border; dividers use CSS vars below. */
export const PANEL_BORDER_DEFAULTS = {
	frame_border_class: "ppv2-chrome-border",
	frame_border_color_class: "",
	filter_divider_class: "",
	filter_divider_color_class: "",
	col_header_line_class: "",
	col_header_line_color_class: "",
	row_divider_class: "",
	row_divider_color_class: "",
	col_divider_class: "",
	col_divider_color_class: "",
};

const BORDER_WIDTH_PX = {
	filter_divider_class: "1px",
	col_header_line_class: "1px",
	row_divider_class: "1px",
	col_divider_class: "1px",
	frame_border_class: "1px",
};

/** Resolved bg class for one chrome slot (config ignored; fixed defaults). */
export function panelChromeBg(_config, field) {
	const key = String(field || "");
	return PANEL_CHROME_DEFAULTS[key] || "";
}

/** Resolved border class for one chrome slot (config ignored). */
export function panelChromeBorder(_config, field) {
	const key = String(field || "");
	if (Object.prototype.hasOwnProperty.call(PANEL_BORDER_DEFAULTS, key)) {
		return PANEL_BORDER_DEFAULTS[key] || "";
	}
	return "";
}

/** @deprecated Config ignored — returns 1px (2px for strong). */
export function panelChromeBorderWidthVar(_config, field) {
	const key = String(field || "");
	return BORDER_WIDTH_PX[key] || "1px";
}

/** @deprecated Config ignored — returns var(--border-color). */
export function panelChromeBorderColorCss(_config, _colorField) {
	return "var(--border-color)";
}

/** Full-box frame border classes for PanelFloat. */
export function panelChromeFrameBorderClasses(_config) {
	const width = panelChromeBorder(null, "frame_border_class");
	return width ? [width] : [];
}

/** CSS custom properties for PanelTable directional dividers. */
export function panelChromeTableBorderStyleVars(_config) {
	return {
		"--ppv2-col-header-line-w": "1px",
		"--ppv2-col-header-line-c": "var(--border-color)",
		"--ppv2-row-divider-w": "1px",
		"--ppv2-row-divider-c": "var(--border-color)",
		"--ppv2-col-divider-w": "1px",
		"--ppv2-col-divider-c": "var(--border-color)",
	};
}

/** CSS custom properties for filter bar bottom divider. */
export function panelChromeFilterDividerStyleVars(_config) {
	return {
		"--ppv2-filter-divider-w": "1px",
		"--ppv2-filter-divider-c": "var(--border-color)",
	};
}

/** @deprecated Always mono; config ignored. */
export function panelChromeFgType(_config, _bgField) {
	return "mono";
}

/** @deprecated Config ignored — buttons on primary chrome use ppv2-chrome-fg-on-primary. */
export function themeBgToFgMonoClass(bgClass) {
	if (String(bgClass || "").includes("chrome-header") || String(bgClass || "").includes("chrome-footer") || String(bgClass || "").includes("chrome-dialog")) {
		return "ppv2-chrome-fg-on-primary";
	}
	return "";
}

/** @deprecated Tonal fg removed; always empty. */
export function themeBgToFgTextClass(_bgClass, _fgType = "mono") {
	return "";
}

/** Explicit fg for chrome children (e.g. Desk buttons) on primary backgrounds. */
export function panelChromeExplicitFgClass(_config, bgField) {
	const bg = panelChromeBg(null, bgField);
	return themeBgToFgMonoClass(bg);
}

/** Runtime text class for one chrome slot — empty (colour set on bg class). */
export function panelChromeFgTextClass(_config, _bgField) {
	return "";
}

/** @deprecated Use panelChromeFgTextClass. */
export function themeBgToFgTonal(_bgClass) {
	return "";
}
