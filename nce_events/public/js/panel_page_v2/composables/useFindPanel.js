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

function rowHasCriteria(row) {
	if (!row || typeof row !== "object") return false;
	return Object.keys(row).some((k) => String(row[k] ?? "").trim() !== "");
}

function activeCriterionKeys(row) {
	if (!row || typeof row !== "object") return [];
	return Object.keys(row).filter((k) => String(row[k] ?? "").trim() !== "");
}

function snapshotRow(row) {
	const out = {};
	for (const [k, v] of Object.entries(row || {})) {
		out[k] = v == null ? "" : String(v);
	}
	return out;
}

/**
 * In-place Find mode for a panel float (null = normal, find = criteria, browse = found set).
 */
export function useFindPanel() {
	const mode = ref(null);
	const criteriaRows = ref([]);
	const activeRowIndex = ref(0);
	const foundRows = ref([]);
	const lastCriteriaRows = ref(null);
	const constrainNames = ref(null);
	const foundSetActive = ref(false);
	let allRowsRef = null;
	let columnFieldnames = [];

	const findMatchActive = computed(() => foundSetActive.value);
	const isActive = computed(() => mode.value != null);
	const hasAnyCriteria = computed(() => criteriaRows.value.some(rowHasCriteria));

	/** Active row for single-request actions (constrain / extend). */
	const criteria = computed(() => {
		const rows = criteriaRows.value;
		const idx = activeRowIndex.value;
		if (idx >= 0 && idx < rows.length) return rows[idx];
		return rows[0] || {};
	});

	function initCriteriaForRow(row, columns) {
		for (const c of columns || []) {
			const fn = c?.fieldname;
			if (!fn) continue;
			if (!(fn in row)) row[fn] = "";
		}
	}

	function initCriteriaForColumns(columns) {
		columnFieldnames = (columns || []).map((c) => c?.fieldname).filter(Boolean);
		for (const row of criteriaRows.value) {
			initCriteriaForRow(row, columns);
		}
	}

	function _makeEmptyRow(columns) {
		const row = reactive({});
		initCriteriaForRow(row, columns);
		return row;
	}

	function _resetCriteriaRows(columns) {
		criteriaRows.value = [_makeEmptyRow(columns)];
		activeRowIndex.value = 0;
	}

	function _clearRowValues(row) {
		for (const k of Object.keys(row)) row[k] = "";
	}

	function _clearAllRowValues() {
		for (const row of criteriaRows.value) _clearRowValues(row);
	}

	function setActiveRowIndex(index) {
		const n = criteriaRows.value.length;
		if (index >= 0 && index < n) activeRowIndex.value = index;
	}

	function setCriterion(rowIndex, fieldname, value) {
		const row = criteriaRows.value[rowIndex];
		if (!row || !fieldname) return;
		if (!(fieldname in row)) row[fieldname] = "";
		row[fieldname] = value == null ? "" : String(value);
	}

	function _criteriaRowForSingleFind() {
		const rows = criteriaRows.value;
		const idx = activeRowIndex.value;
		if (idx >= 0 && idx < rows.length && rowHasCriteria(rows[idx])) {
			return rows[idx];
		}
		for (let i = rows.length - 1; i >= 0; i--) {
			if (rowHasCriteria(rows[i])) return rows[i];
		}
		return null;
	}

	function _matchRows(keys, criteriaRow, { extend = false } = {}) {
		let source = resolveAllRows(allRowsRef);
		let matches = source.filter((row) =>
			keys.every((k) => matchFindCriterion(row[k], criteriaRow[k]))
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

	function _unionMatchAllRows({ extend = false } = {}) {
		const byName = new Map();
		if (extend && foundRows.value.length) {
			for (const row of foundRows.value) {
				if (row?.name != null) byName.set(String(row.name), row);
			}
		}
		for (const row of criteriaRows.value) {
			const keys = activeCriterionKeys(row);
			if (!keys.length) continue;
			for (const match of _matchRows(keys, row, { extend: false })) {
				if (match?.name != null) byName.set(String(match.name), match);
			}
		}
		return [...byName.values()];
	}

	function _applyBrowse(matches, applyRows) {
		foundRows.value = matches;
		lastCriteriaRows.value = criteriaRows.value.map(snapshotRow);
		foundSetActive.value = true;
		mode.value = "browse";
		if (typeof applyRows === "function") applyRows(matches);
	}

	function _restoreCriteriaFromSnapshot(saved, columns) {
		if (Array.isArray(saved) && saved.length) {
			criteriaRows.value = saved.map((snap) => {
				const row = reactive({});
				initCriteriaForRow(row, columns);
				for (const [k, v] of Object.entries(snap)) {
					if (k in row) row[k] = v == null ? "" : String(v);
				}
				return row;
			});
		} else {
			_resetCriteriaRows(columns);
		}
		activeRowIndex.value = 0;
	}

	function activate(allRows, columns) {
		allRowsRef = allRows;
		_resetCriteriaRows(columns);
		initCriteriaForColumns(columns);
		mode.value = "find";
	}

	function newFind(columns) {
		initCriteriaForColumns(columns);
		_resetCriteriaRows(columns);
		mode.value = "find";
	}

	function addOrRow(columns) {
		if (!hasAnyCriteria.value) return false;
		initCriteriaForColumns(columns);
		const row = _makeEmptyRow(columns);
		criteriaRows.value.push(row);
		activeRowIndex.value = criteriaRows.value.length - 1;
		return true;
	}

	function duplicateOrRow(columns) {
		const idx = activeRowIndex.value;
		const rows = criteriaRows.value;
		if (idx < 0 || idx >= rows.length) return false;
		initCriteriaForColumns(columns);
		const src = rows[idx];
		const copy = reactive(snapshotRow(src));
		initCriteriaForRow(copy, columns);
		criteriaRows.value.push(copy);
		activeRowIndex.value = criteriaRows.value.length - 1;
		return true;
	}

	function performFind(applyRows) {
		if (!criteriaRows.value.some((row) => activeCriterionKeys(row).length)) {
			return false;
		}
		_applyBrowse(_unionMatchAllRows(), applyRows);
		return true;
	}

	function performFindConstrain(applyRows) {
		if (foundRows.value.length) {
			constrainNames.value = foundRows.value
				.map((row) => (row?.name != null ? String(row.name) : ""))
				.filter(Boolean);
		}
		const row = _criteriaRowForSingleFind();
		const keys = row ? activeCriterionKeys(row) : [];
		if (!keys.length) return false;
		_applyBrowse(_matchRows(keys, row), applyRows);
		return true;
	}

	function extendFind(applyRows) {
		const row = _criteriaRowForSingleFind();
		const keys = row ? activeCriterionKeys(row) : [];
		if (!keys.length) return false;
		_applyBrowse(_matchRows(keys, row, { extend: true }), applyRows);
		return true;
	}

	function modifyFind(columns) {
		_restoreCriteriaFromSnapshot(lastCriteriaRows.value, columns);
		mode.value = "find";
	}

	function enterConstrainMode() {
		const names = foundRows.value
			.map((row) => (row?.name != null ? String(row.name) : ""))
			.filter(Boolean);
		constrainNames.value = names.length ? names : null;
		_clearAllRowValues();
		if (criteriaRows.value.length) {
			activeRowIndex.value = Math.min(
				activeRowIndex.value,
				criteriaRows.value.length - 1
			);
		}
		mode.value = "find";
	}

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
		lastCriteriaRows.value = null;
		constrainNames.value = null;
		foundRows.value = [];
		criteriaRows.value = [];
		activeRowIndex.value = 0;
		columnFieldnames = [];
		allRowsRef = null;
		if (typeof clearRows === "function") clearRows();
	}

	function reapplyLastFind(applyRows, columns) {
		const saved = lastCriteriaRows.value;
		if (!saved || !foundSetActive.value) return false;
		_restoreCriteriaFromSnapshot(saved, columns);
		return performFind(applyRows);
	}

	return {
		mode,
		criteria,
		criteriaRows,
		activeRowIndex,
		foundRows,
		lastCriteriaRows,
		foundSetActive,
		findMatchActive,
		isActive,
		hasAnyCriteria,
		initCriteriaForColumns,
		setActiveRowIndex,
		setCriterion,
		activate,
		newFind,
		addOrRow,
		duplicateOrRow,
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
