import { ref, watch } from "vue";

import { frappeCall } from "../utils/frappeCall.js";
import { useNceEvalShellStore } from "../stores/shell.js";

const METHOD = "nce_events.api.evaluations.get_event_enrollments";

/**
 * Load enrollments for the shell’s current eventId (re-fetch when it changes).
 */
export function useEnrollments() {
	const shell = useNceEvalShellStore();
	const rows = ref([]);
	const loading = ref(false);
	const error = ref(null);

	async function load() {
		if (!shell.eventId) {
			rows.value = [];
			error.value = null;
			return;
		}
		loading.value = true;
		error.value = null;
		try {
			const data = await frappeCall(METHOD, {
				event_id: shell.eventId,
			});
			rows.value = Array.isArray(data) ? data : [];
		} catch (e) {
			const msg =
				e?.message ||
				e?.exc ||
				(typeof e === "string" ? e : "Failed to load enrollments");
			error.value = msg;
			rows.value = [];
		} finally {
			loading.value = false;
		}
	}

	watch(
		() => shell.eventId,
		() => {
			load();
		},
		{ immediate: true },
	);

	return { rows, loading, error, refresh: load };
}
