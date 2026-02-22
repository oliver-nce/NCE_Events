frappe.provide("nce_events.hierarchy");

nce_events.hierarchy.Store = class Store {
	constructor() {
		this.panes = [];
		this.selected_path = [];
		this.loading = {};
	}

	get_pane_state(index) {
		return this.panes[index] || null;
	}

	set_pane_data(index, data) {
		this.panes[index] = {
			rows: data.rows || [],
			total: data.total || 0,
			start: data.start || 0,
			limit: data.limit || 50,
			parent_sku: data.parent_sku || null,
		};
	}

	append_pane_data(index, data) {
		var pane = this.panes[index];
		if (!pane) return;
		pane.rows = pane.rows.concat(data.rows || []);
		pane.start = data.start || pane.start;
	}

	select_row(pane_index, row_name) {
		this.selected_path[pane_index] = row_name;
		this.selected_path.length = pane_index + 1;
		this.panes.length = pane_index + 1;
	}

	get_selected(pane_index) {
		return this.selected_path[pane_index] || null;
	}

	has_more(pane_index) {
		var pane = this.panes[pane_index];
		if (!pane || !pane.limit) return false;
		return pane.rows.length < pane.total;
	}

	fetch_pane(pane_index, parent_name, append) {
		var me = this;
		var config = nce_events.hierarchy.PANE_CONFIG[pane_index];
		if (!config) return Promise.reject("No config for pane " + pane_index);

		var pane_state = me.panes[pane_index];
		var start = append && pane_state ? pane_state.rows.length : 0;

		me.loading[pane_index] = true;

		return new Promise(function (resolve, reject) {
			frappe.call({
				method: "nce_events.api.hierarchy_explorer.get_pane_data",
				args: {
					pane: config.api_pane,
					parent_name: parent_name || null,
					limit: 50,
					start: start,
				},
				callback: function (r) {
					me.loading[pane_index] = false;
					if (r.message) {
						if (append) {
							me.append_pane_data(pane_index, r.message);
						} else {
							me.set_pane_data(pane_index, r.message);
						}
						resolve(r.message);
					} else {
						reject("No data returned");
					}
				},
				error: function (err) {
					me.loading[pane_index] = false;
					reject(err);
				},
			});
		});
	}
};
