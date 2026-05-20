/**
 * FileMaker-style criterion match against a single cell value.
 * Operators: = (empty), * (nonempty), >=, <=, !=, >, <, =value (exact),
 * ~value (contains), wildcard (* / %), default (contains).
 */
export function matchFindCriterion(cellValue, term) {
	const s = String(term ?? "").trim();
	if (!s) return true;
	const v = cellValue == null ? "" : String(cellValue).trim();
	const vLow = v.toLowerCase();

	if (s === "=") return v === "";
	if (s === "*") return v !== "";

	for (const op of [">=", "<=", "!="]) {
		if (s.startsWith(op)) {
			const right = s.slice(op.length).trim().toLowerCase();
			const vN = parseFloat(v),
				rN = parseFloat(right);
			const num = !isNaN(vN) && !isNaN(rN);
			if (op === ">=") return num ? vN >= rN : vLow >= right;
			if (op === "<=") return num ? vN <= rN : vLow <= right;
			if (op === "!=") return vLow !== right;
		}
	}
	for (const op of [">", "<"]) {
		if (s.startsWith(op)) {
			const right = s.slice(op.length).trim().toLowerCase();
			const vN = parseFloat(v),
				rN = parseFloat(right);
			const num = !isNaN(vN) && !isNaN(rN);
			if (op === ">") return num ? vN > rN : vLow > right;
			if (op === "<") return num ? vN < rN : vLow < right;
		}
	}
	if (s.startsWith("=")) return vLow === s.slice(1).trim().toLowerCase();
	if (s.startsWith("~")) return vLow.includes(s.slice(1).trim().toLowerCase());
	if (s.includes("*") || s.includes("%")) {
		const pat = s
			.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
			.replace(/\*/g, ".*")
			.replace(/%/g, ".*");
		return new RegExp("^" + pat + "$", "i").test(v);
	}
	return vLow.includes(s.toLowerCase());
}
