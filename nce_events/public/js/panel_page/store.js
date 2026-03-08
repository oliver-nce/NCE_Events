frappe.provide("nce_events.panel_page");

nce_events.panel_page.Store = class Store {
	constructor() {
		this.panels = {};
		this.open_stack = [];
	}

	/* ── Panel state helpers ── */

	get_panel(doctype) {
		return this.panels[doctype] || null;
	}

	is_open(doctype) {
		return this.open_stack.indexOf(doctype) >= 0;
	}

	/* ── Open / close ── */

	open_panel(doctype, parent_doctype, parent_filter) {
		if (!this.panels[doctype]) {
			this.panels[doctype] = {
				config: null,
				data: null,
				parent_doctype: parent_doctype || null,
				parent_filter: parent_filter || {},
				user_filters: [],
				selected_row: null,
			};
		} else {
			this.panels[doctype].parent_doctype = parent_doctype || null;
			this.panels[doctype].parent_filter = parent_filter || {};
			this.panels[doctype].user_filters = [];
			this.panels[doctype].selected_row = null;
		}
		if (this.open_stack.indexOf(doctype) < 0) {
			this.open_stack.push(doctype);
		}
	}

	close_panel(doctype) {
		const children = this._get_descendants(doctype);
		const me = this;
		children.forEach(function (dt) {
			const idx = me.open_stack.indexOf(dt);
			if (idx >= 0) me.open_stack.splice(idx, 1);
			delete me.panels[dt];
		});
		const idx = this.open_stack.indexOf(doctype);
		if (idx >= 0) this.open_stack.splice(idx, 1);
		delete this.panels[doctype];
	}

	close_all_except(doctype) {
		const me = this;
		const to_close = me.open_stack.filter(function (dt) { return dt !== doctype; });
		to_close.forEach(function (dt) {
			delete me.panels[dt];
		});
		me.open_stack = [doctype];
	}

	_get_descendants(doctype) {
		const me = this;
		let result = [];
		me.open_stack.forEach(function (dt) {
			const p = me.panels[dt];
			if (p && p.parent_doctype === doctype) {
				result.push(dt);
				result = result.concat(me._get_descendants(dt));
			}
		});
		return result;
	}

	/* ── Data fetching ── */

	fetch_config(doctype) {
		const me = this;
		return new Promise(function (resolve, reject) {
			frappe.call({
				method: "nce_events.api.panel_api.get_panel_config",
				args: { root_doctype: doctype },
				callback: function (r) {
					if (r.message) {
						if (me.panels[doctype]) me.panels[doctype].config = r.message;
						resolve(r.message);
					} else {
						reject("No config for " + doctype);
					}
				},
				error: reject,
			});
		});
	}

	fetch_data(doctype, limit) {
		const me = this;
		const panel = me.panels[doctype];
		if (!panel) return Promise.reject("Panel not open: " + doctype);

		const filters = Object.assign({}, panel.parent_filter || {});
		const args = {
			root_doctype: doctype,
			filters: JSON.stringify(filters),
		};
		if (limit) {
			args.limit = limit;
			args.start = 0;
		}

		return new Promise(function (resolve, reject) {
			frappe.call({
				method: "nce_events.api.panel_api.get_panel_data",
				args: args,
				callback: function (r) {
					if (r.message && me.panels[doctype]) {
						me.panels[doctype].data = r.message;
						resolve(r.message);
					} else {
						reject("No data for " + doctype);
					}
				},
				error: reject,
			});
		});
	}

	fetch_data_page(doctype, start, limit) {
		const me = this;
		const panel = me.panels[doctype];
		if (!panel) return Promise.reject("Panel not open: " + doctype);

		const filters = Object.assign({}, panel.parent_filter || {});

		return new Promise(function (resolve, reject) {
			frappe.call({
				method: "nce_events.api.panel_api.get_panel_data",
				args: {
					root_doctype: doctype,
					filters: JSON.stringify(filters),
					limit: limit,
					start: start,
				},
				callback: function (r) {
					if (r.message) {
						resolve(r.message);
					} else {
						reject("No data for " + doctype);
					}
				},
				error: reject,
			});
		});
	}

	/* ── Row selection ── */

	select_row(doctype, row) {
		if (this.panels[doctype]) {
			this.panels[doctype].selected_row = row;
		}
	}

	get_selected(doctype) {
		const p = this.panels[doctype];
		return p ? p.selected_row : null;
	}

	/* ── User filters ── */

	get_merged_filters(doctype) {
		const p = this.panels[doctype];
		if (!p) return {};
		return Object.assign({}, p.parent_filter || {});
	}

	get_user_filters(doctype) {
		const p = this.panels[doctype];
		return p ? (p.user_filters || []) : [];
	}

	set_user_filters(doctype, filters) {
		if (this.panels[doctype]) {
			this.panels[doctype].user_filters = filters;
		}
	}
};
