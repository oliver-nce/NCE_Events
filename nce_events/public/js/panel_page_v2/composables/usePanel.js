import { ref, reactive, shallowRef } from "vue";

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
	const loading = ref(false);
	const error = ref(null);

	async function fetchConfig() {
		return frappeCall("nce_events.api.panel_api.get_panel_config", {
			root_doctype: doctype,
		});
	}

	async function fetchData(filters = {}, userFilters = [], limit = 50, start = 0) {
		return frappeCall("nce_events.api.panel_api.get_panel_data", {
			root_doctype: doctype,
			filters: JSON.stringify({ ...parentFilter, ...filters }),
			user_filters: JSON.stringify(userFilters),
			limit,
			start,
		});
	}

	async function load() {
		loading.value = true;
		error.value = null;
		try {
			const cfg = await fetchConfig();
			config.value = cfg;
			const data = await fetchData();
			columns.value = data.columns || [];
			rows.value = data.rows || [];
			total.value = data.total || 0;

			if (rows.value.length < total.value) {
				const rest = await fetchData({}, [], 0, rows.value.length);
				rows.value = rows.value.concat(rest.rows || []);
			}
		} catch (e) {
			error.value = String(e);
			console.error(`Panel load error [${doctype}]:`, e);
		} finally {
			loading.value = false;
		}
	}

	return { config, columns, rows, total, loading, error, load, fetchData };
}
