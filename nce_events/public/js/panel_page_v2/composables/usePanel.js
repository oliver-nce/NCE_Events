// Panel float composable fetching definition, rows, columns, and actions for a doctype panel.
//
// code-index:begin
// {
//  "purpose": "Panel float composable fetching definition, rows, columns, and actions for a doctype panel.",
//  "read_when": "When changing panel row fetch, column config, or panel float open/close lifecycle.",
//  "gotchas": [],
//  "keywords": ["usePanel", "doctype", "parentFilter", "definition", "rows", "columns", "fetchPanel"],
//  "format": 1
// }
// code-index:end

import { ref, shallowRef } from "vue";
import { frappeCall } from "../utils/frappeCall.js";

const LAYOUT_FIELDTYPES = new Set([
	"Section Break",
	"Column Break",
	"Tab Break",
	"HTML",
	"Button",
	"Table",
	"Fold",
]);

function simpleTitleCase(name) {
	return String(name || "")
		.replace(/_/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map one Find criterion term to a virtual_page_read filter condition. */
function criterionTermToCondition(field, term) {
	const s = String(term ?? "").trim();
	if (!s) return null;

	if (s === "=") return { field, op: "empty", value: "" };
	if (s === "*") return { field, op: "notempty", value: "" };

	for (const op of [">=", "<=", "!="]) {
		if (s.startsWith(op)) {
			return { field, op, value: s.slice(op.length).trim() };
		}
	}
	for (const op of [">", "<"]) {
		if (s.startsWith(op)) {
			return { field, op, value: s.slice(op.length).trim() };
		}
	}
	if (s.startsWith("=")) return { field, op: "=", value: s.slice(1).trim() };
	if (s.startsWith("~")) return { field, op: "like", value: s.slice(1).trim() };
	if (s.includes("*") || s.includes("%")) return { field, op: "like", value: s };
	return { field, op: "like", value: s };
}

function andGroupFromCriteriaRow(row) {
	if (!row || typeof row !== "object") return null;
	const conditions = [];
	for (const [field, term] of Object.entries(row)) {
		const cond = criterionTermToCondition(field, term);
		if (cond) conditions.push(cond);
	}
	return conditions.length ? conditions : null;
}

/**
 * Build virtual_page_read "or" groups from Find criteria rows (one AND group per row).
 */
export function virtualFindGroupsFromCriteria(criteriaRows) {
	if (!Array.isArray(criteriaRows)) return [];
	const groups = [];
	for (const row of criteriaRows) {
		const g = andGroupFromCriteriaRow(row);
		if (g) groups.push(g);
	}
	return groups;
}

export function usePanel(doctype, parentFilter = {}) {
	const config = shallowRef(null);
	const columns = ref([]);
	const rows = ref([]);
	const total = ref(0);
	const fullTotal = ref(0);
	const loading = ref(false);
	const error = ref(null);

	const isVirtual = ref(false);
	const limitStart = ref(0);
	const pageLength = ref(1000);
	const orderBy = ref("");

	// Full unfiltered dataset from backend
	const _allRows = ref([]);
	// current active user filters [{field, op, value}]
	const userFilters = ref([]);
	/** When true, rows are pinned to a Find found set (skip _applyFilters). */
	let _foundSetPinned = false;
	/** Virtual Find OR groups: array of AND condition arrays. */
	let _findGroups = null;

	// Incremented on every load so stale calls self-cancel
	let _loadId = 0;

	/** Virtual sliding window: up to 3 consecutive server pages. */
	const _pageChunks = [];
	const loadedPageCount = ref(0);
	const windowGeneration = ref(0);
	let _virtualPaging = false;

	function fetchConfig() {
		return frappeCall("nce_events.api.panel_api_pkg.panel_data.get_panel_config", {
			root_doctype: doctype,
		});
	}

	function fetchData(filters = {}) {
		return frappeCall("nce_events.api.panel_api_pkg.panel_data.get_panel_data", {
			root_doctype: doctype,
			filters: JSON.stringify({ ...parentFilter, ...filters }),
		});
	}

	async function _lookupVirtualFromWpTables() {
		let pageLen = 1000;
		let hit = false;
		try {
			const list = await frappeCall("frappe.client.get_list", {
				doctype: "WP Tables",
				filters: { doctype_source: "Virtual" },
				or_filters: [
					["nce_name", "=", doctype],
					["frappe_doctype", "=", doctype],
				],
				fields: ["name", "nce_name", "frappe_doctype", "page_size"],
				limit_page_length: 20,
			});
			const rows = Array.isArray(list) ? list : [];
			const row = rows.find(
				(r) => r && (r.nce_name === doctype || r.frappe_doctype === doctype)
			);
			if (row) {
				hit = true;
				const ps = parseInt(row.page_size, 10);
				if (Number.isInteger(ps) && ps >= 1) pageLen = ps;
			}
		} catch {
			/* treat as no hit */
		}
		return { hit, pageLen };
	}

	async function _resolveIsVirtual() {
		const { hit, pageLen } = await _lookupVirtualFromWpTables();
		let metaVirtual = false;
		if (!hit && typeof frappe !== "undefined" && frappe.model?.with_doctype) {
			try {
				await frappe.model.with_doctype(doctype);
				const meta = frappe.get_meta(doctype);
				if (meta?.is_virtual === 1 || meta?.is_virtual === true) metaVirtual = true;
			} catch {
				metaVirtual = false;
			}
		}
		const virt = hit || metaVirtual;
		isVirtual.value = virt;
		if (virt && hit) pageLength.value = pageLen;
		else if (virt && !hit) pageLength.value = 1000;
		if (!virt) loadedPageCount.value = 0;
		return virt;
	}

	function _buildVirtualColumns(cfg, meta) {
		const metaFields = (meta?.fields || []).filter(
			(f) => f.fieldname && !LAYOUT_FIELDTYPES.has(f.fieldtype)
		);
		const metaByName = Object.fromEntries(metaFields.map((f) => [f.fieldname, f]));

		const makeCol = (fieldname, mf) => ({
			fieldname,
			label: mf?.label || simpleTitleCase(fieldname),
			...(mf?.fieldtype ? { fieldtype: mf.fieldtype } : {}),
			is_link: mf?.fieldtype === "Link" && !!mf?.options,
			...(mf?.fieldtype === "Link" && mf?.options
				? { link_doctype: mf.options }
				: {}),
		});

		const order = cfg?.column_order || [];
		const ordered = order.filter((n) => n && !String(n).startsWith("_"));
		if (ordered.length) {
			return ordered.map((fn) => makeCol(fn, metaByName[fn]));
		}
		return metaFields.map((mf) => makeCol(mf.fieldname, mf));
	}

	function _buildVirtualFiltersPayload() {
		const and = [];
		for (const [field, value] of Object.entries(parentFilter || {})) {
			if (value == null || value === "") continue;
			and.push({ field, op: "=", value });
		}
		for (const f of userFilters.value) {
			if (!f.field || String(f.value ?? "") === "") continue;
			and.push({
				field: f.field,
				op: f.op || "=",
				value: _resolveFilterValue(f.value),
			});
		}
		const payload = {};
		if (and.length) payload.and = and;
		if (_findGroups && _findGroups.length) payload.or = _findGroups;
		return Object.keys(payload).length ? payload : {};
	}

	function _hasUserQuery() {
		const hasUser = userFilters.value.some(
			(f) => f.field && String(f.value ?? "") !== ""
		);
		return hasUser || !!(_findGroups && _findGroups.length);
	}

	/** Match count for paging. The denominator stays the count from when the panel opened. */
	function _noteVirtualTotal(n) {
		if (typeof n !== "number") return;
		total.value = n;
		if (!_hasUserQuery()) fullTotal.value = n;
	}

	function _flattenVirtualChunks() {
		const out = [];
		for (const ch of _pageChunks) {
			if (ch.rows?.length) out.push(...ch.rows);
		}
		return out;
	}

	function _publishVirtualRows() {
		_allRows.value = [];
		rows.value = _flattenVirtualChunks();
		loadedPageCount.value = isVirtual.value ? _pageChunks.length : 0;
		if (_pageChunks.length) {
			limitStart.value = _pageChunks[0].start;
		}
	}

	async function _fetchVirtualPageData(start) {
		const data = await frappeCall("nce_sync.api.virtual_page_read", {
			doctype,
			filters: JSON.stringify(_buildVirtualFiltersPayload()),
			order_by: orderBy.value || "",
			limit_start: start,
			limit_page_length: pageLength.value,
		});
		return {
			rows: data?.rows || [],
			total: typeof data?.total === "number" ? data.total : 0,
		};
	}

	async function _fetchVirtualPage(myId) {
		let meta = null;
		try {
			if (typeof frappe !== "undefined" && frappe.model?.with_doctype) {
				await frappe.model.with_doctype(doctype);
			}
			if (typeof frappe !== "undefined" && frappe.get_meta) {
				meta = frappe.get_meta(doctype);
			}
		} catch {
			meta = null;
		}
		columns.value = _buildVirtualColumns(config.value, meta);

		const data = await _fetchVirtualPageData(limitStart.value);

		if (myId !== _loadId) return;

		_pageChunks.length = 0;
		_pageChunks.push({ start: limitStart.value, rows: data.rows || [] });
		_noteVirtualTotal(data.total);
		windowGeneration.value += 1;
		_publishVirtualRows();
	}

	async function appendVirtualPage() {
		if (_virtualPaging || !isVirtual.value) return { droppedStart: false, added: false };
		const myId = _loadId;
		if (!_pageChunks.length) return { droppedStart: false, added: false };

		const last = _pageChunks[_pageChunks.length - 1];
		const nextOffset = last.start + last.rows.length;
		if (nextOffset >= total.value) return { droppedStart: false, added: false };

		_virtualPaging = true;
		let droppedStart = false;
		try {
			const data = await _fetchVirtualPageData(nextOffset);
			if (myId !== _loadId) return { droppedStart: false, added: false };

			_noteVirtualTotal(data.total);

			const fetchedRows = data.rows || [];
			if (!fetchedRows.length) return { droppedStart: false, added: false };

			if (_pageChunks.length >= 3) {
				_pageChunks.shift();
				droppedStart = true;
			}
			_pageChunks.push({ start: nextOffset, rows: fetchedRows });
			_publishVirtualRows();
			return { droppedStart, added: true };
		} catch (e) {
			throw e;
		} finally {
			_virtualPaging = false;
		}
	}

	async function prependVirtualPage() {
		if (_virtualPaging || !isVirtual.value) return { prepended: false };
		const myId = _loadId;
		if (!_pageChunks.length) return { prepended: false };

		const first = _pageChunks[0];
		if (first.start <= 0) return { prepended: false };

		const prevStart = Math.max(0, first.start - pageLength.value);

		_virtualPaging = true;
		try {
			const data = await _fetchVirtualPageData(prevStart);
			if (myId !== _loadId) return { prepended: false };

			_noteVirtualTotal(data.total);

			const fetchedRows = data.rows || [];
			if (!fetchedRows.length) return { prepended: false };

			_pageChunks.unshift({ start: prevStart, rows: fetchedRows });
			if (_pageChunks.length > 3) {
				_pageChunks.pop();
			}
			_publishVirtualRows();
			return { prepended: true };
		} catch (e) {
			throw e;
		} finally {
			_virtualPaging = false;
		}
	}

	async function _refetchVirtual() {
		const myId = ++_loadId;
		loading.value = true;
		error.value = null;
		try {
			await _fetchVirtualPage(myId);
			if (myId !== _loadId) return;
			loading.value = false;
		} catch (e) {
			if (myId !== _loadId) return;
			error.value = String(e);
			console.error(`Panel virtual fetch error [${doctype}]:`, e);
			loading.value = false;
		}
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
			/(?:current_date\(\s*\)|curdate\(\s*\)|now\(\s*\))\s*([-+])\s*interval\s+(\d+)\s+(day|month|year)/
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
	// User filters from the filter bar only; empty = full loaded set (_allRows).
	// default_filters seed the filter widget on open (PanelTableFilterBar), not a hidden fallback.
	function _applyFilters() {
		if (_foundSetPinned) return;
		const active = userFilters.value.filter((f) => f.field && String(f.value ?? "") !== "");
		rows.value =
			active.length > 0 ? _applyUserFilters(_allRows.value, active) : _allRows.value;
		total.value = rows.value.length;
	}

	function setFoundSet(found) {
		_foundSetPinned = true;
		rows.value = Array.isArray(found) ? found : [];
		total.value = rows.value.length;
	}

	function clearFoundSet() {
		_foundSetPinned = false;
		_applyFilters();
	}

	async function _loadOrReload() {
		const myId = ++_loadId;
		loading.value = true;
		error.value = null;

		try {
			const virt = await _resolveIsVirtual();
			if (myId !== _loadId) return;

			if (virt) {
				const cfg = await fetchConfig();
				if (myId !== _loadId) return;
				config.value = cfg;
				await _fetchVirtualPage(myId);
				if (myId !== _loadId) return;
			} else {
				const [cfg, data] = await Promise.all([fetchConfig(), fetchData()]);
				if (myId !== _loadId) return;

				config.value = cfg;
				columns.value = data.columns || [];
				_allRows.value = data.rows || [];
				if (!_foundSetPinned) _applyFilters();
				fullTotal.value = data.full_count ?? 0;
			}
			loading.value = false;
		} catch (e) {
			if (myId !== _loadId) return;
			error.value = String(e);
			console.error(`Panel load error [${doctype}]:`, e);
			loading.value = false;
		}
	}

	// ── Load / reload ─────────────────────────────────────────────────────────
	async function load() {
		await _loadOrReload();
	}

	async function reload() {
		await _loadOrReload();
	}

	function setFilters(newUserFilters = []) {
		userFilters.value = newUserFilters;
		_foundSetPinned = false;
		if (!isVirtual.value) {
			_applyFilters();
			return;
		}
		limitStart.value = 0;
		return _refetchVirtual();
	}

	/** Layer filter bar on a fixed row set (Find browse mode). */
	function setFiltersOnFoundSet(newUserFilters = [], sourceRows = []) {
		userFilters.value = newUserFilters;
		_foundSetPinned = true;
		const active = userFilters.value.filter(
			(f) => f.field && String(f.value ?? "") !== ""
		);
		rows.value =
			active.length > 0 ? _applyUserFilters(sourceRows, active) : sourceRows;
		total.value = rows.value.length;
	}

	function setVirtualOrder(fieldname, dir) {
		orderBy.value = `${fieldname} ${dir}`;
		limitStart.value = 0;
		return _refetchVirtual();
	}

	function setVirtualPage(nextStart) {
		if (nextStart < 0) return Promise.resolve();
		limitStart.value = nextStart;
		return _refetchVirtual();
	}

	function applyVirtualFind(groups) {
		_findGroups = groups && groups.length ? groups : null;
		limitStart.value = 0;
		_foundSetPinned = false;
		return _refetchVirtual();
	}

	return {
		config,
		columns,
		rows,
		allRows: _allRows,
		total,
		fullTotal,
		loading,
		error,
		isVirtual,
		limitStart,
		pageLength,
		loadedPageCount,
		windowGeneration,
		load,
		reload,
		setFilters,
		setFiltersOnFoundSet,
		setFoundSet,
		clearFoundSet,
		setVirtualOrder,
		setVirtualPage,
		applyVirtualFind,
		appendVirtualPage,
		prependVirtualPage,
	};
}
