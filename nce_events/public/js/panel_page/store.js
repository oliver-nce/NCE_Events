frappe.provide("nce_events.panel_page");

nce_events.panel_page.Store = class Store {
	constructor() {
		this.panels = {};
		this.open_stack = [];
		this._child_cache = {};
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
		var children = this._get_descendants(doctype);
		var me = this;
		children.forEach(function (dt) {
			var idx = me.open_stack.indexOf(dt);
			if (idx >= 0) me.open_stack.splice(idx, 1);
			delete me.panels[dt];
		});
		var idx = this.open_stack.indexOf(doctype);
		if (idx >= 0) this.open_stack.splice(idx, 1);
		delete this.panels[doctype];
	}

	close_all_except(doctype) {
		var me = this;
		var to_close = me.open_stack.filter(function (dt) { return dt !== doctype; });
		to_close.forEach(function (dt) {
			delete me.panels[dt];
		});
		me.open_stack = [doctype];
	}

	_get_descendants(doctype) {
		var me = this;
		var result = [];
		me.open_stack.forEach(function (dt) {
			var p = me.panels[dt];
			if (p && p.parent_doctype === doctype) {
				result.push(dt);
				result = result.concat(me._get_descendants(dt));
			}
		});
		return result;
	}

	/* ── Data fetching ── */

	fetch_config(doctype) {
		var me = this;
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
		var me = this;
		var panel = me.panels[doctype];
		if (!panel) return Promise.reject("Panel not open: " + doctype);

		var filters = Object.assign({}, panel.parent_filter || {});
		var args = {
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
		var me = this;
		var panel = me.panels[doctype];
		if (!panel) return Promise.reject("Panel not open: " + doctype);

		var filters = Object.assign({}, panel.parent_filter || {});

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

	fetch_child_doctypes(doctype) {
		var me = this;
		if (me._child_cache[doctype]) {
			return Promise.resolve(me._child_cache[doctype]);
		}
		return new Promise(function (resolve) {
			frappe.call({
				method: "nce_events.api.panel_api.get_child_doctypes",
				args: { root_doctype: doctype },
				callback: function (r) {
					var children = r.message || [];
					me._child_cache[doctype] = children;
					resolve(children);
				},
				error: function (err) {
					console.error("fetch_child_doctypes failed for " + doctype + ":", err);
					me._child_cache[doctype] = [];
					resolve([]);
				},
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
		var p = this.panels[doctype];
		return p ? p.selected_row : null;
	}

	/* ── User filters ── */

	get_merged_filters(doctype) {
		var p = this.panels[doctype];
		if (!p) return {};
		return Object.assign({}, p.parent_filter || {});
	}

	get_user_filters(doctype) {
		var p = this.panels[doctype];
		return p ? (p.user_filters || []) : [];
	}

	set_user_filters(doctype, filters) {
		if (this.panels[doctype]) {
			this.panels[doctype].user_filters = filters;
		}
	}
};
