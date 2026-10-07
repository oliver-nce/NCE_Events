/**
 * Frappe-style conditional expressions on a plain doc object (e.g. formData).
 *
 * depends_on / mandatory_depends_on / read_only_depends_on formats:
 *   "eval:doc.status=='Open'"  — JS expression with doc in scope
 *   "fieldname"                 — truthy check on field value
 *   ""                          — always true
 *
 * code-index:begin
 * {
 *  "purpose": "Evaluates Frappe depends_on mandatory_depends_on and read_only_depends_on expressions on formData.",
 *  "read_when": "When changing conditional field visibility, mandatory, or read-only expression parsing.",
 *  "gotchas": [
 *   "Empty depends_on string is always true."
 *  ],
 *  "keywords": ["frappeFieldExpr", "evaluateExpression", "depends_on", "mandatory_depends_on", "read_only_depends_on", "isLayoutField"],
 *  "format": 1
 * }
 * code-index:end
 */
export function evaluateExpression(expr, doc) {
	if (!expr) return true;
	if (expr.startsWith("eval:")) {
		try {
			const code = expr.slice(5);
			return new Function("doc", `return (${code})`)(doc);
		} catch {
			return true;
		}
	}
	return !!doc[expr];
}

/** Fieldtypes that are layout/display-only in a frozen meta list (no formData key). */
export const LAYOUT_FIELDTYPES = [
	"Tab Break",
	"Section Break",
	"Column Break",
	"Heading",
	"HTML",
	"Image",
	"Fold",
];

export function isLayoutField(fieldtype) {
	return LAYOUT_FIELDTYPES.includes(fieldtype);
}
