import { ref, reactive, unref } from "vue";
import { matchFindCriterion } from "../utils/findCriterion.js";

function resolveAllRows(allRows) {
	const r = unref(allRows);
	if (Array.isArray(r)) return r;
	if (r != null && typeof r === "object" && Array.isArray(r.value)) return r.value;
	return [];
}

/**
 * Find Panel state: Find Mode (criteria row) and Browse Mode (match grid).
 */
export function useFindPanel({ allRows }) {
	const mode = ref("find");
	const criteria = reactive({});
	const rows = ref([]);
	const lastCriteria = ref(null);

	function initCriteriaForColumns(columns) {
		for (const c of columns || []) {
			const fn = c?.fieldname;
			if (!fn) continue;
			if (!(fn in criteria)) criteria[fn] = "";
		}
	}

	function setCriterion(fieldname, value) {
		if (!fieldname) return;
		criteria[fieldname] = value == null ? "" : String(value);
	}

	function enterFindMode() {
		for (const k of Object.keys(criteria)) criteria[k] = "";
		rows.value = [];
		lastCriteria.value = null;
		mode.value = "find";
	}

	function cancelFind() {
		/* Caller closes the panel */
	}

	function performFind() {
		const keys = Object.keys(criteria).filter((k) => String(criteria[k] ?? "").trim() !== "");
		if (!keys.length) return false;

		const source = resolveAllRows(allRows);
		rows.value = source.filter((row) =>
			keys.every((k) => matchFindCriterion(row[k], criteria[k]))
		);
		lastCriteria.value = { ...criteria };
		mode.value = "browse";
		return true;
	}

	return {
		mode,
		criteria,
		rows,
		lastCriteria,
		initCriteriaForColumns,
		setCriterion,
		enterFindMode,
		cancelFind,
		performFind,
	};
}
