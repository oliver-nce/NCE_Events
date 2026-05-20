/**
 * Column list for Find Panel: visible panel columns + search-only columns on the right.
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
