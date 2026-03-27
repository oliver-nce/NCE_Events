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
	// core_filter parsed into [{field, op, value}] at load time
	let _coreFilters = [];
	// current active user filters [{field, op, value}]
	const userFilters = ref([]);

	// Incremented on every load so stale calls self-cancel
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

	// ── Core filter parsing ───────────────────────────────────────────────────
	// Resolve SQL date functions to a concrete ISO date string (yyyy-mm-dd).
	// Handles: current_date(), curdate(), now(), optionally ± INTERVAL N DAY/MONTH/YEAR
	function _resolveDateExpr(str) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// current_date() +/- interval N day/month/year
		const intervalRe =
			/(?:current_date\(\s*\)|curdate\(\s*\)|now\(\s*\))\s*([-+])\s*interval\s+(\d+)\s+(day|month|year)/i;
		const m = str.match(intervalRe);
		if (m) {
			const d = new Date(today);
			const amount = parseInt(m[2], 10) * (m[1] === "-" ? -1 : 1);
			if (/day/i.test(m[3])) d.setDate(d.getDate() + amount);
			else if (/month/i.test(m[3])) d.setMonth(d.getMonth() + amount);
			else if (/year/i.test(m[3])) d.setFullYear(d.getFullYear() + amount);
			return d.toISOString().slice(0, 10);
		}

		// bare current_date() / curdate() / now()
		if (/(?:current_date\(\s*\)|curdate\(\s*\)|now\(\s*\))/i.test(str)) {
			return today.toISOString().slice(0, 10);
		}

		// unquote single-quoted literals
		if (str.startsWith("'") && str.endsWith("'")) return str.slice(1, -1);
		if (str.startsWith('"') && str.endsWith('"')) return str.slice(1, -1);

		return str.trim();
	}

	// Parse a core_filter string like:
	//   "end_date > current_date() -interval 30 day"
	//   "status = 'Active' AND state != 'VIC'"
	// into [{field, op, value}, ...]
	// Returns [] and warns if unparseable (fail open).
	function _parseCoreFilterString(str) {
		if (!str || !str.trim()) return [];
		console.log("[usePanel] _parseCoreFilterString input:", str);

		const results = [];
		// Split on AND (case-insensitive); OR is not supported — treat as fail-open
		const clauses = str.split(/\bAND\b/i);

		const OPS = [">=", "<=", "!=", ">", "<", "=", /\blike\b/i, /\bin\b/i];

		for (const clause of clauses) {
			const s = clause.trim();
			if (!s) continue;

			let matched = false;
			for (const op of OPS) {
				const opStr =
					op instanceof RegExp ? op.source.replace(/\\b/g, "").replace(/\/i/, "") : op;
				const re = new RegExp(
					`^([\\w.]+)\\s*(?:${op instanceof RegExp ? op.source : escapeRe(op)})\\s*(.+)$`,
					"i",
				);
				const m = s.match(re);
				if (m) {
					const field = m[1].trim();
					const rawVal = m[2].trim();
					// The operator string to store — normalise keyword ops to lowercase
					const normOp =
						op instanceof RegExp ? opStr.toLowerCase().replace(/\\b/g, "").trim() : op;
					const value = _resolveDateExpr(rawVal);
					results.push({ field, op: normOp, value });
					matched = true;
					break;
				}
			}

			if (!matched) {
				console.warn(`usePanel: could not parse core_filter clause: "${s}" — skipping`);
			}
		}

		console.log("[usePanel] _parseCoreFilterString result:", results);
		return results;
	}

	function escapeRe(s) {
		return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	// ── User filter application ───────────────────────────────────────────────
	// Single path used for both core filters and user-entered filters.
	// Each filter: { field, op, value }
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

				const left = String(rowVal).trim();
				const right = String(filterVal ?? "").trim();

				// ISO date comparison (yyyy-mm-dd) — lexicographic order is correct
				const dateRe = /^\d{4}-\d{2}-\d{2}/;
				if (dateRe.test(left) && dateRe.test(right)) {
					const l = left.slice(0, 10);
					const r = right.slice(0, 10);
					switch (f.op) {
						case "=":
							if (l !== r) return false;
							break;
						case "!=":
							if (l === r) return false;
							break;
						case ">":
							if (!(l > r)) return false;
							break;
						case "<":
							if (!(l < r)) return false;
							break;
						case ">=":
							if (!(l >= r)) return false;
							break;
						case "<=":
							if (!(l <= r)) return false;
							break;
						default:
							if (l !== r) return false;
					}
					continue;
				}

				const leftLow = left.toLowerCase();
				const rightLow = right.toLowerCase();
				const leftNum = parseFloat(left);
				const rightNum = parseFloat(right);
				const numeric = !isNaN(leftNum) && !isNaN(rightNum);

				switch (f.op) {
					case "=":
						if (leftLow !== rightLow) return false;
						break;
					case "!=":
						if (leftLow === rightLow) return false;
						break;
					case ">":
						if (numeric ? leftNum <= rightNum : leftLow <= rightLow) return false;
						break;
					case "<":
						if (numeric ? leftNum >= rightNum : leftLow >= rightLow) return false;
						break;
					case ">=":
						if (numeric ? leftNum < rightNum : leftLow < rightLow) return false;
						break;
					case "<=":
						if (numeric ? leftNum > rightNum : leftLow > rightLow) return false;
						break;
					case "like":
						if (!leftLow.includes(rightLow)) return false;
						break;
					case "in": {
						const inValues = rightLow.split(",").map((s) => s.trim());
						if (!inValues.includes(leftLow)) return false;
						break;
					}
					default:
						if (leftLow !== rightLow) return false;
				}
			}
			return true;
		});
	}

	// ── Filter orchestration ──────────────────────────────────────────────────
	// core filters always applied; user filters layered on top (both AND-combined)
	function _applyFilters() {
		const active = userFilters.value.filter((f) => f.field && String(f.value ?? "") !== "");
		const combined = [..._coreFilters, ...active];
		console.log("[usePanel] _applyFilters", {
			allRows: _allRows.value.length,
			coreFilters: _coreFilters,
			userFilters: active,
			combined,
			sampleRow: _allRows.value[0],
		});
		rows.value = _applyUserFilters(_allRows.value, combined);
		console.log("[usePanel] after filter:", rows.value.length, "rows");
		total.value = rows.value.length;
	}

	// ── Load / reload ─────────────────────────────────────────────────────────
	async function load() {
		const myId = ++_loadId;
		loading.value = true;
		error.value = null;

		try {
			const [cfg, data] = await Promise.all([fetchConfig(), fetchData()]);

			if (myId !== _loadId) return;

			config.value = cfg;
			columns.value = data.columns || [];
			_allRows.value = data.rows || [];
			_coreFilters = _parseCoreFilterString(data.core_filter || "");
			_applyFilters();
			fullTotal.value = data.full_count ?? 0;
			loading.value = false;
		} catch (e) {
			if (myId !== _loadId) return;
			error.value = String(e);
			console.error(`Panel load error [${doctype}]:`, e);
			loading.value = false;
		}
	}

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
			_coreFilters = _parseCoreFilterString(data.core_filter || "");
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
