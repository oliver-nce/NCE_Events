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
 * Find Panel state — mirrors Form Dialog find chrome (criteria / post-find).
 */
export function useFindPanel({ allRows }) {
	const mode = ref("find");
	const criteria = reactive({});
	const rows = ref([]);
	const lastCriteria = ref(null);
	/** Names to intersect on the next Perform Find (one-shot). */
	const constrainNames = ref(null);
	/** True after at least one find has been run (enables Constrain in criteria phase). */
	const foundSetActive = ref(false);

	const findMatchActive = computed(() => foundSetActive.value);

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

	function performFind() {
		const keys = _activeCriterionKeys();
		if (!keys.length) return false;

		let source = resolveAllRows(allRows);
		let matches = source.filter((row) =>
			keys.every((k) => matchFindCriterion(row[k], criteria[k]))
		);

		const constrain = constrainNames.value;
		if (Array.isArray(constrain) && constrain.length) {
			const set = new Set(constrain.map(String));
			matches = matches.filter((row) => row?.name != null && set.has(String(row.name)));
			constrainNames.value = null;
		}

		rows.value = matches;
		lastCriteria.value = { ...criteria };
		foundSetActive.value = true;
		mode.value = "browse";
		return true;
	}

	function performFindConstrain() {
		if (rows.value.length) {
			constrainNames.value = rows.value
				.map((row) => (row?.name != null ? String(row.name) : ""))
				.filter(Boolean);
		}
		return performFind();
	}

	/** Browse → criteria with last search terms (Modify Find). */
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

	/** Browse → criteria to narrow within current found set. */
	function enterConstrainMode() {
		const names = rows.value
			.map((row) => (row?.name != null ? String(row.name) : ""))
			.filter(Boolean);
		constrainNames.value = names.length ? names : null;
		_clearCriteriaValues();
		mode.value = "find";
	}

	/** Browse → show full dataset (Show All). */
	function showAll() {
		rows.value = [...resolveAllRows(allRows)];
		lastCriteria.value = null;
		constrainNames.value = null;
		foundSetActive.value = false;
		_clearCriteriaValues();
		mode.value = "browse";
	}

	function cancelFind() {
		/* Caller closes the panel */
	}

	return {
		mode,
		criteria,
		rows,
		lastCriteria,
		foundSetActive,
		findMatchActive,
		initCriteriaForColumns,
		performFind,
		performFindConstrain,
		modifyFind,
		enterConstrainMode,
		showAll,
		cancelFind,
	};
}
