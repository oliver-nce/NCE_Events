import { ref, shallowRef } from "vue";

function frappeCall(method, args) {
	return new Promise((resolve, reject) => {
		frappe.call({
			method,
			args,
			callback: (r) => (r.message ? resolve(r.message) : reject("Empty response")),
			error: reject,
		});
	});
}

export function usePanel(doctype, parentFilter = {}) {
	const config = shallowRef(null);
	const columns = ref([]);
	const rows = ref([]);
	const total = ref(0);
	const fullTotal = ref(0);
	const loading = ref(false);
	const error = ref(null);

	// Full unfiltered dataset from backend
	const _allRows = ref([]);
	// core_filter string from backend config
	const coreFilter = ref("");
	// current active user filters
	const userFilters = ref([]);

	// Incremented on every load so stale background loops self-cancel
	let _loadId = 0;

	function fetchConfig() {
		return frappeCall("nce_events.api.panel_api.get_panel_config", {
			root_doctype: doctype,
		});
	}

	function fetchData(filters = {}) {
		return frappeCall("nce_events.api.panel_api.get_panel_data", {
			root_doctype: doctype,
			filters: JSON.stringify({ ...parentFilter, ...filters }),
		});
	}

	// Parse and apply core_filter (SQL-like string) to rows
	// Resolve SQL date functions to ISO date strings before parsing
	// Handles: current_date(), now(), curdate(), and INTERVAL N DAY/MONTH/YEAR arithmetic
	function _resolveSqlDateFunctions(str) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Replace: current_date() [+/-] interval N day/month/year
		// e.g. "current_date() -interval 30 day"  →  "2024-11-15"
		str = str.replace(
			/(?:current_date\(\s*\)|curdate\(\s*\)|now\(\s*\))\s*([-+])\s*interval\s+(\d+)\s+(day|month|year)/gi,
			(_, sign, n, unit) => {
				const d = new Date(today);
				const amount = parseInt(n, 10) * (sign === "-" ? -1 : 1);
				if (/day/i.test(unit)) d.setDate(d.getDate() + amount);
				if (/month/i.test(unit)) d.setMonth(d.getMonth() + amount);
				if (/year/i.test(unit)) d.setFullYear(d.getFullYear() + amount);
				return `'${d.toISOString().slice(0, 10)}'`;
			},
		);

		// Replace bare current_date() / curdate() / now() with today's date
		str = str.replace(/(?:current_date\(\s*\)|curdate\(\s*\)|now\(\s*\))/gi, () => {
			return `'${today.toISOString().slice(0, 10)}'`;
		});

		return str;
	}

	function _applyCoreFilter(allRows, coreFilterStr) {
		if (!coreFilterStr || !allRows.length) return allRows;

		try {
			const resolved = _resolveSqlDateFunctions(coreFilterStr);
			const parsed = _parseCoreFilter(resolved);
			return allRows.filter((row) => _matchesCoreFilter(row, parsed));
		} catch (e) {
			// Fail open: return all rows if parsing fails
			console.warn(`core_filter parse error: ${e.message}`);
			return allRows;
		}
	}

	// Parse SQL-like filter string into AST
	// Example: "status = 'Active' AND amount > 100"
	function _parseCoreFilter(str) {
		const parts = [];
		const tokens = _tokenizeFilter(str);
		let i = 0;

		function peek() {
			return tokens[i];
		}
		function consume() {
			return tokens[i++];
		}

		function parseExpression() {
			let left = parseComparison();

			while (peek() && (peek().type === "AND" || peek().type === "OR")) {
				const op = consume().type;
				const right = parseComparison();
				left = { type: "BINOP", op, left, right };
			}
			return left;
		}

		function parseComparison() {
			if (peek() && peek().type === "NOT") {
				consume();
				return { type: "NOT", expr: parseComparison() };
			}

			if (peek() && peek().type === "LPAREN") {
				consume(); // consume '('
				const expr = parseExpression();
				if (peek() && peek().type === "RPAREN") consume(); // consume ')'
				return expr;
			}

			// fieldname operator value
			const fieldToken = consume();
			if (!fieldToken) return { type: "TRUE" };

			const opToken = consume();
			if (!opToken) return { type: "TRUE" };

			const valueToken = consume();
			if (!valueToken) return { type: "TRUE" };

			return {
				type: "CMP",
				field: fieldToken.value,
				op: opToken.value,
				value: _unquote(valueToken.value),
			};
		}

		return parseExpression();
	}

	// Tokenize filter string
	function _tokenizeFilter(str) {
		const tokens = [];
		let i = 0;
		const keywords = ["AND", "OR", "NOT", "IN", "LIKE"];

		while (i < str.length) {
			// Skip whitespace
			if (/[ \t\n\r]/.test(str[i])) {
				i++;
				continue;
			}

			// Parentheses
			if (str[i] === "(") {
				tokens.push({ type: "LPAREN", value: "(" });
				i++;
				continue;
			}
			if (str[i] === ")") {
				tokens.push({ type: "RPAREN", value: ")" });
				i++;
				continue;
			}

			// Keywords (case-insensitive)
			let kw = "";
			let j = i;
			while (j < str.length && /[a-zA-Z]/.test(str[j])) {
				kw += str[j];
				j++;
			}
			if (keywords.includes(kw.toUpperCase())) {
				tokens.push({ type: kw.toUpperCase(), value: kw.toUpperCase() });
				i = j;
				continue;
			}

			// Operators
			if (str[i] === "=" && str[i + 1] === "=") {
				tokens.push({ type: "=", value: "=" });
				i += 2;
				continue;
			}
			if (str[i] === "=") {
				tokens.push({ type: "=", value: "=" });
				i++;
				continue;
			}
			if (str[i] === "!" && str[i + 1] === "=") {
				tokens.push({ type: "!=", value: "!=" });
				i += 2;
				continue;
			}
			if (str[i] === ">" && str[i + 1] !== "=") {
				tokens.push({ type: ">", value: ">" });
				i++;
				continue;
			}
			if (str[i] === "<" && str[i + 1] !== "=") {
				tokens.push({ type: "<", value: "<" });
				i++;
				continue;
			}
			if (str[i] === ">" && str[i + 1] === "=") {
				tokens.push({ type: ">=", value: ">=" });
				i += 2;
				continue;
			}
			if (str[i] === "<" && str[i + 1] === "=") {
				tokens.push({ type: "<=", value: "<=" });
				i += 2;
				continue;
			}

			// Quoted string
			if (str[i] === "'" || str[i] === '"') {
				const quote = str[i];
				j = i + 1;
				while (j < str.length && str[j] !== quote) {
					j++;
				}
				tokens.push({ type: "VALUE", value: str.slice(i + 1, j) });
				i = j + 1;
				continue;
			}

			// Unquoted value (number or identifier)
			j = i;
			while (j < str.length && /[0-9a-zA-Z_.\-]/.test(str[j])) {
				j++;
			}
			if (j > i) {
				tokens.push({ type: "VALUE", value: str.slice(i, j) });
				i = j;
				continue;
			}

			i++; // skip unknown char
		}
		return tokens;
	}

	// Unquote SQL string value
	function _unquote(val) {
		if (!val) return val;
		if (
			(val.startsWith("'") && val.endsWith("'")) ||
			(val.startsWith('"') && val.endsWith('"'))
		) {
			return val.slice(1, -1);
		}
		return val;
	}

	// Check if row matches parsed filter AST
	function _matchesCoreFilter(row, ast) {
		if (!ast || ast.type === "TRUE") return true;
		if (ast.type === "NOT") return !_matchesCoreFilter(row, ast.expr);
		if (ast.type === "BINOP") {
			if (ast.op === "AND")
				return _matchesCoreFilter(row, ast.left) && _matchesCoreFilter(row, ast.right);
			if (ast.op === "OR")
				return _matchesCoreFilter(row, ast.left) || _matchesCoreFilter(row, ast.right);
		}
		if (ast.type === "CMP") {
			return _compareCore(row[ast.field], ast.value, ast.op);
		}
		return true;
	}

	// Compare a single value against filter (core_filter)
	// For date fields (ISO yyyy-mm-dd strings), string lexicographic order is correct.
	// For numeric fields, fall back to parseFloat.
	function _compareCore(val, filterVal, op) {
		if (val === undefined || val === null) val = "";
		if (filterVal === undefined || filterVal === null) filterVal = "";
		const left = String(val).trim();
		const right = String(filterVal).trim();

		// Detect date strings: yyyy-mm-dd
		const dateRe = /^\d{4}-\d{2}-\d{2}/;
		if (dateRe.test(left) && dateRe.test(right)) {
			// Lexicographic comparison is correct for ISO dates
			switch (op) {
				case "=":
					return left.slice(0, 10) === right.slice(0, 10);
				case "!=":
					return left.slice(0, 10) !== right.slice(0, 10);
				case ">":
					return left.slice(0, 10) > right.slice(0, 10);
				case "<":
					return left.slice(0, 10) < right.slice(0, 10);
				case ">=":
					return left.slice(0, 10) >= right.slice(0, 10);
				case "<=":
					return left.slice(0, 10) <= right.slice(0, 10);
				default:
					return left.slice(0, 10) === right.slice(0, 10);
			}
		}

		const leftLow = left.toLowerCase();
		const rightLow = right.toLowerCase();
		const leftNum = parseFloat(left);
		const rightNum = parseFloat(right);
		const numeric = !isNaN(leftNum) && !isNaN(rightNum);

		switch (op) {
			case "=":
				return leftLow === rightLow;
			case "!=":
				return leftLow !== rightLow;
			case ">":
				return numeric ? leftNum > rightNum : leftLow > rightLow;
			case "<":
				return numeric ? leftNum < rightNum : leftLow < rightLow;
			case ">=":
				return numeric ? leftNum >= rightNum : leftLow >= rightLow;
			case "<=":
				return numeric ? leftNum <= rightNum : leftLow <= rightLow;
			case "like":
				return leftLow.includes(rightLow);
			case "in":
				return right
					.split(",")
					.map((s) => s.trim().toLowerCase())
					.includes(leftLow);
			default:
				return leftLow === rightLow;
		}
	}

	// Apply user filters (from filter widget) to rows
	function _applyUserFilters(allRows, activeFilters) {
		if (!activeFilters.length) return allRows;

		return allRows.filter((row) => {
			for (const f of activeFilters) {
				if (!f.field) continue;
				const rowVal = row[f.field];
				const filterVal = f.value;

				if (rowVal === undefined || rowVal === null) {
					if (f.op !== "!=") return false;
					continue;
				}

				const left = String(rowVal).toLowerCase();
				const right = String(filterVal || "").toLowerCase();

				switch (f.op) {
					case "=":
						if (left !== right) return false;
						break;
					case "!=":
						if (left === right) return false;
						break;
					case ">":
						if (parseFloat(left) <= parseFloat(right || 0)) return false;
						break;
					case "<":
						if (parseFloat(left) >= parseFloat(right || 0)) return false;
						break;
					case "like":
						if (!left.includes(right)) return false;
						break;
					case "in":
						// in operator: value is comma-separated list
						const inValues = right.split(",").map((s) => s.trim());
						if (!inValues.includes(left)) return false;
						break;
					default:
						if (left !== right) return false;
				}
			}
			return true;
		});
	}

	function _applyFilters() {
		const active = userFilters.value.filter((f) => f.field && String(f.value ?? "") !== "");

		if (active.length === 0) {
			// No user filters — apply core_filter
			rows.value = _applyCoreFilter(_allRows.value, coreFilter.value);
		} else {
			// User filters present — drop core_filter, filter raw dataset
			rows.value = _applyUserFilters(_allRows.value, active);
		}
		total.value = rows.value.length;
	}

	async function load() {
		const myId = ++_loadId;
		loading.value = true;
		error.value = null;

		try {
			// Fetch config and data in parallel — neither depends on the other
			const [cfg, data] = await Promise.all([fetchConfig(), fetchData()]);

			if (myId !== _loadId) return; // superseded by a newer load

			config.value = cfg;
			columns.value = data.columns || [];
			// Store full unfiltered dataset
			_allRows.value = data.rows || [];
			// Store core_filter for client-side application
			coreFilter.value = data.core_filter || "";
			// Apply filters (initially no user filters, so core_filter applies)
			_applyFilters();
			// Full count is the raw count from backend (before core_filter)
			fullTotal.value = data.full_count ?? 0;
			loading.value = false;
		} catch (e) {
			if (myId !== _loadId) return;
			error.value = String(e);
			console.error(`Panel load error [${doctype}]:`, e);
			loading.value = false;
		}
	}

	// Reload data from backend (hard refresh)
	async function reload() {
		const myId = ++_loadId;
		loading.value = true;
		error.value = null;

		try {
			const [cfg, data] = await Promise.all([fetchConfig(), fetchData()]);

			if (myId !== _loadId) return;

			config.value = cfg;
			columns.value = data.columns || [];
			_allRows.value = data.rows || [];
			coreFilter.value = data.core_filter || "";
			_applyFilters();
			fullTotal.value = data.full_count ?? 0;
			loading.value = false;
		} catch (e) {
			if (myId !== _loadId) return;
			error.value = String(e);
			console.error(`Panel reload error [${doctype}]:`, e);
			loading.value = false;
		}
	}

	// Set user filters and re-apply (synchronous, no API call)
	function setFilters(newUserFilters = []) {
		userFilters.value = newUserFilters;
		_applyFilters();
	}

	return { config, columns, rows, total, fullTotal, loading, error, load, reload, setFilters };
}
