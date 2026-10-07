/**
 * Column list for Find Panel: visible panel columns + search-only columns on the right.
 *
 * code-index:begin
 * {
 *  "purpose": "Builds Find Panel column list from visible panel columns plus search-only columns.",
 *  "read_when": "When changing Find Panel column layout or search-only column inclusion.",
 *  "gotchas": [],
 *  "keywords": ["buildFindColumns", "Find Panel", "search-only columns", "panel columns", "visible columns"],
 *  "format": 1
 * }
 * code-index:end
 */
export function buildFindColumns(panel) {
	const visibleCols = (Array.isArray(panel?.columns) ? panel.columns : []).filter(
		(c) => c?.fieldname && !c.fieldname.startsWith("_") && !c.is_related_link
	);
	const soColumns = Array.isArray(panel?.config?.search_only_columns)
		? panel.config.search_only_columns
		: [];
	const visibleFns = new Set(visibleCols.map((c) => c.fieldname));
	return [
		...visibleCols,
		...soColumns.filter((c) => c?.fieldname && !visibleFns.has(c.fieldname)),
	];
}
