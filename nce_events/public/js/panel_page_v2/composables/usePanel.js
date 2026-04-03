import { ref, shallowRef } from "vue";
import { frappeCall } from "../utils/frappeCall.js";

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

	// ── Relative date resolution ──────────────────────────────────────────────
	// Resolves date shorthand to a concrete yyyy-mm-dd string.
	// Supported:
	//   "today"
	//   "N days ago", "N months ago", "N years ago"
	//   "current_date() -interval N day/month/year"  (from migration patch)
	//   "current_date() +interval N day/month/year"
	//   bare "current_date()" / "curdate()" / "now()"
	// Anything else is returned unchanged.
	function _resolveFilterValue(val) {
		if (!val) return val;
		const s = String(val).trim().toLowerCase();

		if (s === "today") {
			const d = new Date();
			d.setHours(0, 0, 0, 0);
			return d.toISOString().slice(0, 10);
		}

		// "N days/months/years ago"
		const agoM = s.match(/^(\d+)\s+(day|month|year)s?\s+ago$/);
		if (agoM) {
			const n = parseInt(agoM[1], 10);
			const unit = agoM[2];
			const d = new Date();
			d.setHours(0, 0, 0, 0);
			if (unit === "day") d.setDate(d.getDate() - n);
			if (unit === "month") d.setMonth(d.getMonth() - n);
			if (unit === "year") d.setFullYear(d.getFullYear() - n);
			return d.toISOString().slice(0, 10);
		}

		// "current_date() -interval 30 day" (and +, and curdate/now variants)
		const sqlM = s.match(
			/(?:current_date\(\s*\)|curdate\(\s*\)|now\(\s*\))\s*([-+])\s*interval\s+(\d+)\s+(day|month|year)/,
		);
		if (sqlM) {
			const sign = sqlM[1] === "-" ? -1 : 1;
			const n = parseInt(sqlM[2], 10) * sign;
			const unit = sqlM[3];
			const d = new Date();
			d.setHours(0, 0, 0, 0);
			if (unit === "day") d.setDate(d.getDate() + n);
			if (unit === "month") d.setMonth(d.getMonth() + n);
			if (unit === "year") d.setFullYear(d.getFullYear() + n);
			return d.toISOString().slice(0, 10);
		}

		// bare current_date() / curdate() / now()
		if (/^(?:current_date\(\s*\)|curdate\(\s*\)|now\(\s*\))$/.test(s)) {
			const d = new Date();
			d.setHours(0, 0, 0, 0);
			return d.toISOString().slice(0, 10);
		}

		return val;
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
				const right = String(_resolveFilterValue(filterVal) ?? "").trim();

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
