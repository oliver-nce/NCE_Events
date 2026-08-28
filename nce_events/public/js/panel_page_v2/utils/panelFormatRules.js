import { panelRowVal } from "./panelTableColWidths.js";

export function fieldKeyMatchesColumn(fieldKey, col) {
	const k = String(fieldKey || "").trim().toLowerCase();
	if (!k || !col) return false;
	const bare = k.includes(".") ? k.split(".").pop() : k;
	const fn = String(col.fieldname || "").toLowerCase();
	return fn === k || fn === bare;
}

export function formatRuleForColumn(formatRules, col) {
	const rules = formatRules || [];
	for (let i = 0; i < rules.length; i++) {
		if (fieldKeyMatchesColumn(rules[i].field_name, col)) return rules[i];
	}
	return null;
}

export function isFormatRuleActive(row, col, formatRules) {
	const rule = formatRuleForColumn(formatRules, col);
	if (!rule) return false;
	return Number(panelRowVal(row, rule.flag_key)) === 1;
}

export function activeFormatRule(row, col, formatRules) {
	return isFormatRuleActive(row, col, formatRules) ? formatRuleForColumn(formatRules, col) : null;
}

/**
 * Inline style for a conditional-format rule — local override on dialog theme tokens.
 * Only sets properties the rule defines (color, weight, italic, underline).
 */
export function formatRuleInlineStyle(row, col, formatRules) {
	const rule = activeFormatRule(row, col, formatRules);
	if (!rule) return undefined;
	const style = {};
	if (rule.color) style.color = rule.color;
	if (rule.font_weight) style.fontWeight = rule.font_weight;
	if (rule.italic) style.fontStyle = "italic";
	if (rule.underline) style.textDecoration = "underline";
	return Object.keys(style).length ? style : undefined;
}
