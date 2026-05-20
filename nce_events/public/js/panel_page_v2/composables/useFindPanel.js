import { ref, reactive, computed, unref } from "vue";
import { matchFindCriterion } from "../utils/findCriterion.js";

function resolveAllRows(allRows) {
	let r = unref(allRows);
	if (Array.isArray(r)) return r;
	for (let i = 0; i < 3 && r != null && typeof r === "object" && !Array.isArray(r); i++) {
		if (Array.isArray(r.value)) return r.value;
		r = r.value;
	}
	return [];
}

/**
 * In-place Find mode for a panel float (null = normal, find = criteria, browse = found set).
 */
export function useFindPanel() {
	const mode = ref(null);
	const criteria = reactive({});
	const foundRows = ref([]);
	const lastCriteria = ref(null);
	const constrainNames = ref(null);
	const foundSetActive = ref(false);
	let allRowsRef = null;

	const findMatchActive = computed(() => foundSetActive.value);
	const isActive = computed(() => mode.value != null);

	function initCriteriaForColumns(columns) {
		for (const c of columns || []) {
			const fn = c?.fieldname;
			if (!fn) continue;
			if (!(fn in criteria)) criteria[fn] = "";
		}
	}

	function _clearCriteriaValues() {
		for (const k of Object.keys(criteria)) criteria[k] = "";
	}

	function _activeCriterionKeys() {
		return Object.keys(criteria).filter((k) => String(criteria[k] ?? "").trim() !== "");
	}

	function _matchRows(keys, { extend = false } = {}) {
		let source = resolveAllRows(allRowsRef);
		let matches = source.filter((row) =>
			keys.every((k) => matchFindCriterion(row[k], criteria[k]))
		);

		const constrain = constrainNames.value;
		if (Array.isArray(constrain) && constrain.length) {
			const set = new Set(constrain.map(String));
			matches = matches.filter((row) => row?.name != null && set.has(String(row.name)));
			constrainNames.value = null;
		}

		if (extend && foundRows.value.length) {
			const byName = new Map();
			for (const row of foundRows.value) {
				if (row?.name != null) byName.set(String(row.name), row);
			}
			for (const row of matches) {
				if (row?.name != null) byName.set(String(row.name), row);
			}
			matches = [...byName.values()];
		}

		return matches;
	}

	function _applyBrowse(matches, applyRows) {
		foundRows.value = matches;
		lastCriteria.value = { ...criteria };
		foundSetActive.value = true;
		mode.value = "browse";
		if (typeof applyRows === "function") applyRows(matches);
	}

	function activate(allRows, columns) {
		allRowsRef = allRows;
		initCriteriaForColumns(columns);
		_clearCriteriaValues();
		mode.value = "find";
	}

	function newFind(columns) {
		initCriteriaForColumns(columns);
		_clearCriteriaValues();
		mode.value = "find";
	}

	function performFind(applyRows) {
		const keys = _activeCriterionKeys();
		if (!keys.length) return false;
		_applyBrowse(_matchRows(keys), applyRows);
		return true;
	}

	function performFindConstrain(applyRows) {
		if (foundRows.value.length) {
			constrainNames.value = foundRows.value
				.map((row) => (row?.name != null ? String(row.name) : ""))
				.filter(Boolean);
		}
		return performFind(applyRows);
	}

	function extendFind(applyRows) {
		const keys = _activeCriterionKeys();
		if (!keys.length) return false;
		_applyBrowse(_matchRows(keys, { extend: true }), applyRows);
		return true;
	}

	function modifyFind() {
		const last = lastCriteria.value;
		_clearCriteriaValues();
		if (last && typeof last === "object") {
			for (const [k, v] of Object.entries(last)) {
				if (k in criteria) criteria[k] = v == null ? "" : String(v);
			}
		}
		mode.value = "find";
	}

	function enterConstrainMode() {
		const names = foundRows.value
			.map((row) => (row?.name != null ? String(row.name) : ""))
			.filter(Boolean);
		constrainNames.value = names.length ? names : null;
		_clearCriteriaValues();
		mode.value = "find";
	}

	/** Cancel from criteria: return to browse if a found set exists, else exit find. */
	function cancelFindCriteria(applyRows, clearRows) {
		if (foundSetActive.value && foundRows.value.length) {
			mode.value = "browse";
			if (typeof applyRows === "function") applyRows(foundRows.value);
			return;
		}
		exitFind(clearRows);
	}

	function exitFind(clearRows) {
		mode.value = null;
		foundSetActive.value = false;
		lastCriteria.value = null;
		constrainNames.value = null;
		foundRows.value = [];
		_clearCriteriaValues();
		allRowsRef = null;
		if (typeof clearRows === "function") clearRows();
	}

	function reapplyLastFind(applyRows) {
		const last = lastCriteria.value;
		if (!last || !foundSetActive.value) return false;
		_clearCriteriaValues();
		for (const [k, v] of Object.entries(last)) {
			if (k in criteria) criteria[k] = v == null ? "" : String(v);
		}
		return performFind(applyRows);
	}

	return {
		mode,
		criteria,
		foundRows,
		lastCriteria,
		foundSetActive,
		findMatchActive,
		isActive,
		initCriteriaForColumns,
		activate,
		newFind,
		performFind,
		performFindConstrain,
		extendFind,
		modifyFind,
		enterConstrainMode,
		cancelFindCriteria,
		exitFind,
		reapplyLastFind,
	};
}
