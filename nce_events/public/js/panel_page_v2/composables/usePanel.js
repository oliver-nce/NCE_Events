import { ref, shallowRef } from "vue";

const PAGE_SIZE = 400;

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

	// Incremented on every load/refetch so stale background loops self-cancel
	let _loadId = 0;

	function fetchConfig() {
		return frappeCall("nce_events.api.panel_api.get_panel_config", {
			root_doctype: doctype,
		});
	}

	function fetchData(filters = {}, userFilters = [], limit = PAGE_SIZE, start = 0) {
		return frappeCall("nce_events.api.panel_api.get_panel_data", {
			root_doctype: doctype,
			filters: JSON.stringify({ ...parentFilter, ...filters }),
			user_filters: JSON.stringify(userFilters),
			limit,
			start,
		});
	}

	async function load() {
		const myId = ++_loadId;
		loading.value = true;
		error.value = null;

		try {
			// Fetch config and first page in parallel — neither depends on the other
			const [cfg, data] = await Promise.all([
				fetchConfig(),
				fetchData({}, [], PAGE_SIZE, 0),
			]);

			if (myId !== _loadId) return; // superseded by a newer load

			config.value = cfg;
			columns.value = data.columns || [];
			rows.value = data.rows || [];
			total.value = data.total || 0;
			fullTotal.value = data.full_count ?? data.total ?? 0;
			loading.value = false;

			// Stream remaining pages in the background without blocking render
			if (rows.value.length < total.value) {
				_streamRemaining(myId);
			}
		} catch (e) {
			if (myId !== _loadId) return;
			error.value = String(e);
			console.error(`Panel load error [${doctype}]:`, e);
			loading.value = false;
		}
	}

	async function _streamRemaining(myId) {
		while (true) {
			if (myId !== _loadId) return; // cancelled
			const start = rows.value.length;
			if (start >= total.value) return;

			try {
				const page = await fetchData({}, [], PAGE_SIZE, start);
				if (myId !== _loadId) return;
				const newRows = page.rows || [];
				if (!newRows.length) return;
				// Append reactively so the table updates as each batch arrives
				rows.value = rows.value.concat(newRows);
			} catch (e) {
				console.error(`Panel background fetch error [${doctype}]:`, e);
				return;
			}
		}
	}

	async function refetch(userFilters = []) {
		const myId = ++_loadId;
		loading.value = true;
		error.value = null;
		try {
			const data = await fetchData({}, userFilters, 0, 0);
			if (myId !== _loadId) return;
			rows.value = data.rows || [];
			total.value = data.total || 0;
		} catch (e) {
			if (myId !== _loadId) return;
			error.value = String(e);
		} finally {
			if (myId === _loadId) loading.value = false;
		}
	}

	return { config, columns, rows, total, fullTotal, loading, error, load, fetchData, refetch };
}
