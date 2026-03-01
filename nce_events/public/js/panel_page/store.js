frappe.provide("nce_events.panel_page");

nce_events.panel_page.StoreV2 = class StoreV2 {
	constructor(page_name) {
		this.page_name = page_name;
		this.config = null;
		this.panes = [];
		this.selections = {};
		this.loading = {};
	}

	fetch_config() {
		var me = this;
		return new Promise(function (resolve, reject) {
			frappe.call({
				method: "nce_events.api.panel_api.get_page_config_v2",
				args: { page_name: me.page_name },
				callback: function (r) {
					if (r.message) {
						me.config = r.message;
						resolve(r.message);
					} else {
						reject("No config returned");
					}
				},
				error: reject,
			});
		});
	}

	get_panel_config(panel_number) {
		if (!this.config) return null;
		for (var i = 0; i < this.config.panels.length; i++) {
			if (this.config.panels[i].panel_number === panel_number)
				return this.config.panels[i];
		}
		return null;
	}

	get_panel_index(panel_number) {
		if (!this.config) return -1;
		for (var i = 0; i < this.config.panels.length; i++) {
			if (this.config.panels[i].panel_number === panel_number) return i;
		}
		return -1;
	}

	get_ordered_panels() {
		if (!this.config) return [];
		return this.config.panels.slice().sort(function (a, b) {
			return a.panel_number - b.panel_number;
		});
	}

	get_pane_state(panel_number) {
		return this.panes[panel_number] || null;
	}

	// columns: [{fieldname, label}]
	set_pane_data(panel_number, data) {
		this.panes[panel_number] = {
			columns: data.columns || [],
			rows: data.rows || [],
			total: data.total || 0,
			start: data.start || 0,
			limit: data.limit || 50,
		};
	}

	append_pane_data(panel_number, data) {
		var pane = this.panes[panel_number];
		if (!pane) return;
		pane.rows = pane.rows.concat(data.rows || []);
		pane.start = data.start || pane.start;
	}

	select_row(panel_number, row_data) {
		this.selections[String(panel_number)] = row_data;
		var ordered = this.get_ordered_panels();
		var dominated = false;
		for (var i = 0; i < ordered.length; i++) {
			if (dominated) {
				delete this.selections[String(ordered[i].panel_number)];
				delete this.panes[ordered[i].panel_number];
			}
			if (ordered[i].panel_number === panel_number) dominated = true;
		}
	}

	get_selected(panel_number) {
		return this.selections[String(panel_number)] || null;
	}

	has_more(panel_number) {
		var pane = this.panes[panel_number];
		if (!pane || !pane.limit) return false;
		return pane.rows.length < pane.total;
	}

	fetch_panel(panel_number, append) {
		var me = this;
		var pane_state = me.panes[panel_number];
		var start = append && pane_state ? pane_state.rows.length : 0;
		me.loading[panel_number] = true;
		return new Promise(function (resolve, reject) {
			frappe.call({
				method: "nce_events.api.panel_api.get_panel_data_v2",
				args: {
					page_name: me.page_name,
					panel_number: panel_number,
					selections: JSON.stringify(me.selections),
					limit: 50,
					start: start,
				},
				callback: function (r) {
					me.loading[panel_number] = false;
					if (r.message) {
						if (append) {
							me.append_pane_data(panel_number, r.message);
						} else {
							me.set_pane_data(panel_number, r.message);
						}
						resolve(r.message);
					} else {
						reject("No data returned");
					}
				},
				error: function (err) {
					me.loading[panel_number] = false;
					reject(err);
				},
			});
		});
	}
};

nce_events.panel_page.Store = class Store {
	constructor(page_name) {
		this.page_name = page_name;
		this.config = null;
		this.panes = [];
		this.selections = {};
		this.loading = {};
	}

	fetch_config() {
		var me = this;
		var local = (nce_events.panel_page.page_configs || {})[me.page_name];
		if (local) {
			me.config = local;
			return Promise.resolve(local);
		}
		return new Promise(function (resolve, reject) {
			frappe.call({
				method: "nce_events.api.panel_api.get_page_config",
				args: { page_name: me.page_name },
				callback: function (r) {
					if (r.message) {
						me.config = r.message;
						resolve(r.message);
					} else {
						reject("No config returned");
					}
				},
				error: reject,
			});
		});
	}

	get_panel_config(panel_number) {
		if (!this.config) return null;
		for (var i = 0; i < this.config.panels.length; i++) {
			if (this.config.panels[i].panel_number === panel_number) {
				return this.config.panels[i];
			}
		}
		return null;
	}

	get_panel_index(panel_number) {
		if (!this.config) return -1;
		for (var i = 0; i < this.config.panels.length; i++) {
			if (this.config.panels[i].panel_number === panel_number) return i;
		}
		return -1;
	}

	get_ordered_panels() {
		if (!this.config) return [];
		return this.config.panels.slice().sort(function (a, b) {
			return a.panel_number - b.panel_number;
		});
	}

	get_pane_state(panel_number) {
		return this.panes[panel_number] || null;
	}

	set_pane_data(panel_number, data) {
		this.panes[panel_number] = {
			columns: data.columns || [],
			rows: data.rows || [],
			total: data.total || 0,
			start: data.start || 0,
			limit: data.limit || 50,
		};
	}

	append_pane_data(panel_number, data) {
		var pane = this.panes[panel_number];
		if (!pane) return;
		pane.rows = pane.rows.concat(data.rows || []);
		pane.start = data.start || pane.start;
	}

	select_row(panel_number, row_data) {
		this.selections[String(panel_number)] = row_data;

		var ordered = this.get_ordered_panels();
		var dominated = false;
		for (var i = 0; i < ordered.length; i++) {
			if (dominated) {
				delete this.selections[String(ordered[i].panel_number)];
				delete this.panes[ordered[i].panel_number];
			}
			if (ordered[i].panel_number === panel_number) {
				dominated = true;
			}
		}
	}

	get_selected(panel_number) {
		return this.selections[String(panel_number)] || null;
	}

	has_more(panel_number) {
		var pane = this.panes[panel_number];
		if (!pane || !pane.limit) return false;
		return pane.rows.length < pane.total;
	}

	fetch_panel(panel_number, append) {
		var me = this;
		var pane_state = me.panes[panel_number];
		var start = append && pane_state ? pane_state.rows.length : 0;

		me.loading[panel_number] = true;

		return new Promise(function (resolve, reject) {
			frappe.call({
				method: "nce_events.api.panel_api.get_panel_data",
				args: {
					page_name: me.page_name,
					panel_number: panel_number,
					selections: JSON.stringify(me.selections),
					limit: 50,
					start: start,
				},
				callback: function (r) {
					me.loading[panel_number] = false;
					if (r.message) {
						if (append) {
							me.append_pane_data(panel_number, r.message);
						} else {
							me.set_pane_data(panel_number, r.message);
						}
						resolve(r.message);
					} else {
						reject("No data returned");
					}
				},
				error: function (err) {
					me.loading[panel_number] = false;
					reject(err);
				},
			});
		});
	}
};
