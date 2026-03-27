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
	// default_filters from backend config [{field, op, value}] — pre-populated in filter widget
	let _defaultFilters = [];
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
		// If user has entered any filters, use only those — default filters are already
		// visible in the widget and the user is in full control.
		// If no user filters, fall back to default filters.
		const combined = active.length > 0 ? active : _defaultFilters;
		rows.value = _applyUserFilters(_allRows.value, combined);
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
			_defaultFilters = data.default_filters || [];
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
			_defaultFilters = data.default_filters || [];
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
