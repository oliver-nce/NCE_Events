// Copyright (c) 2026, Oliver Reid and contributors
// For license information, please see license.txt

const _QBTL_OPS = [
	{ value: "=", label: "=" },
	{ value: "<>", label: "≠" },
	{ value: "<", label: "<" },
	{ value: ">", label: ">" },
	{ value: "<=", label: "≤" },
	{ value: ">=", label: "≥" },
];

const _QBTL_OP_LABEL = { "=": "=", "<>": "≠", "!=": "≠", "<": "<", ">": ">", "<=": "≤", ">=": "≥" };

frappe.ui.form.on("Query Based Table Link", {
	refresh: function (frm) {
		_qbtl_render(frm);
	},
	left_table: function (frm) {
		_qbtl_render(frm);
	},
	right_table: function (frm) {
		_qbtl_render(frm);
	},
});

function _qbtl_esc(s) {
	return frappe.utils.escape_html(String(s == null ? "" : s));
}

function _qbtl_parse_json_list(raw) {
	if (!raw) {
		return [];
	}
	try {
		const v = typeof raw === "string" ? JSON.parse(raw) : raw;
		return Array.isArray(v) ? v : [];
	} catch (e) {
		return [];
	}
}

function _qbtl_conditions(frm) {
	return _qbtl_parse_json_list(frm.doc.conditions_json).filter(function (c) {
		return c && c.left_field && c.right_field && c.op;
	});
}

function _qbtl_clause(conditions) {
	return conditions
		.map(function (c) {
			const op = c.op === "!=" ? "<>" : c.op;
			return "left." + c.left_field + " " + op + " right." + c.right_field;
		})
		.join(" AND ");
}

function _qbtl_persist(frm, conditions) {
	frm.set_value("conditions_json", JSON.stringify(conditions));
	frm.set_value("where_clause", _qbtl_clause(conditions));
}

function _qbtl_host(frm) {
	const field = frm.get_field("criteria_builder");
	if (!field || !field.$wrapper) {
		return null;
	}
	field.$wrapper.find(".control-label, .help-box, .clearfix").first().hide();
	let $host = field.$wrapper.find(".control-input-wrapper");
	if (!$host.length) {
		$host = field.$wrapper;
	}
	return $host;
}

function _qbtl_fetch_fields(doctype, callback) {
	if (!doctype) {
		callback([]);
		return;
	}
	frappe.call({
		method: "nce_events.api.panel_api_pkg.discovery.get_doctype_fields",
		args: { root_doctype: doctype },
		callback: function (r) {
			const msg = r && r.message;
			const fields = msg && Array.isArray(msg.fields) ? msg.fields : Array.isArray(msg) ? msg : [];
			callback(fields);
		},
	});
}

function _qbtl_field_options(fields) {
	return (fields || [])
		.map(function (f) {
			const fn = String(f.fieldname || "").trim();
			if (!fn) {
				return "";
			}
			const lab = String(f.label || "").trim();
			const text = lab && lab !== fn ? fn + " — " + lab : fn;
			return '<option value="' + _qbtl_esc(fn) + '">' + _qbtl_esc(text) + "</option>";
		})
		.join("");
}

function _qbtl_criterion_label(frm, c) {
	const left = frm.doc.left_table || "left";
	const right = frm.doc.right_table || "right";
	const op = _QBTL_OP_LABEL[c.op] || c.op;
	return left + "::" + c.left_field + " " + op + " " + right + "::" + c.right_field;
}

function _qbtl_fill_criteria($host, frm) {
	const $sel = $host.find("[data-qbtl=criteria]");
	const conditions = _qbtl_conditions(frm);
	const prev = $sel.val();
	$sel.empty();
	conditions.forEach(function (c, i) {
		$sel.append(
			$("<option>")
				.attr("value", String(i))
				.text(_qbtl_criterion_label(frm, c))
		);
	});
	if (prev != null && $sel.find('option[value="' + prev + '"]').length) {
		$sel.val(prev);
	}
}

function _qbtl_cint(val) {
	if (typeof cint === "function") {
		return cint(val);
	}
	const n = parseInt(String(val == null ? "" : val), 10);
	return Number.isNaN(n) ? 0 : n;
}

function _qbtl_bind($host, frm) {
	if ($host.data("qbtl-bound")) {
		return;
	}
	$host.data("qbtl-bound", 1);

	$host.on("click.qbtl", "[data-qbtl=add]", function () {
		const lf = $host.find("[data-qbtl=left-fields]").val();
		const rf = $host.find("[data-qbtl=right-fields]").val();
		const op = $host.find("[data-qbtl=op]").val() || "=";
		if (!lf || !rf) {
			frappe.show_alert({ message: __("Select a field on each side"), indicator: "orange" });
			return;
		}
		const conditions = _qbtl_conditions(frm);
		conditions.push({ left_field: lf, op: op, right_field: rf });
		_qbtl_persist(frm, conditions);
		_qbtl_fill_criteria($host, frm);
		$host.find("[data-qbtl=criteria]").val(String(conditions.length - 1));
	});

	$host.on("click.qbtl", "[data-qbtl=change]", function () {
		const idx = parseInt($host.find("[data-qbtl=criteria]").val(), 10);
		const conditions = _qbtl_conditions(frm);
		if (Number.isNaN(idx) || !conditions[idx]) {
			frappe.show_alert({ message: __("Select a criterion to change"), indicator: "orange" });
			return;
		}
		const lf = $host.find("[data-qbtl=left-fields]").val();
		const rf = $host.find("[data-qbtl=right-fields]").val();
		const op = $host.find("[data-qbtl=op]").val() || "=";
		if (!lf || !rf) {
			frappe.show_alert({ message: __("Select a field on each side"), indicator: "orange" });
			return;
		}
		conditions[idx] = { left_field: lf, op: op, right_field: rf };
		_qbtl_persist(frm, conditions);
		_qbtl_fill_criteria($host, frm);
		$host.find("[data-qbtl=criteria]").val(String(idx));
	});

	$host.on("click.qbtl", "[data-qbtl=delete]", function () {
		const idx = parseInt($host.find("[data-qbtl=criteria]").val(), 10);
		const conditions = _qbtl_conditions(frm);
		if (Number.isNaN(idx) || !conditions[idx]) {
			frappe.show_alert({ message: __("Select a criterion to delete"), indicator: "orange" });
			return;
		}
		conditions.splice(idx, 1);
		_qbtl_persist(frm, conditions);
		_qbtl_fill_criteria($host, frm);
	});

	$host.on("change.qbtl", "[data-qbtl=left-sort-on]", function () {
		const on = $(this).is(":checked") ? 1 : 0;
		frm.set_value("left_sort_enabled", on);
		$host.find("[data-qbtl=left-sort-specify]").prop("disabled", !on);
	});

	$host.on("change.qbtl", "[data-qbtl=right-sort-on]", function () {
		const on = $(this).is(":checked") ? 1 : 0;
		frm.set_value("right_sort_enabled", on);
		$host.find("[data-qbtl=right-sort-specify]").prop("disabled", !on);
	});

	$host.on("click.qbtl", "[data-qbtl=left-sort-specify]", function () {
		if (!_qbtl_cint(frm.doc.left_sort_enabled)) {
			return;
		}
		_qbtl_sort_dialog(frm, "left");
	});

	$host.on("click.qbtl", "[data-qbtl=right-sort-specify]", function () {
		if (!_qbtl_cint(frm.doc.right_sort_enabled)) {
			return;
		}
		_qbtl_sort_dialog(frm, "right");
	});
}

function _qbtl_shell_html() {
	const opOpts = _QBTL_OPS.map(function (o) {
		return '<option value="' + o.value + '">' + _qbtl_esc(o.label) + "</option>";
	}).join("");
	return (
		'<div class="qbtl-builder" style="border:1px solid var(--border-color,#d1d8dd);border-radius:6px;padding:12px;background:var(--fg-color,#fff);">' +
		'<div style="display:flex;gap:12px;align-items:stretch;">' +
		'<div style="flex:1;min-width:0;">' +
		'<div class="text-muted" style="font-size:11px;font-weight:600;text-transform:uppercase;margin:0 0 6px;">' +
		__("Left fields") +
		"</div>" +
		'<select data-qbtl="left-fields" size="12" class="form-control" style="height:220px;font-size:12px;"></select>' +
		"</div>" +
		'<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;width:88px;flex:0 0 88px;">' +
		'<select data-qbtl="op" class="form-control" style="width:72px;font-size:16px;text-align:center;">' +
		opOpts +
		"</select>" +
		'<button type="button" class="btn btn-xs btn-primary" data-qbtl="add">' +
		__("Add") +
		"</button>" +
		"</div>" +
		'<div style="flex:1;min-width:0;">' +
		'<div class="text-muted" style="font-size:11px;font-weight:600;text-transform:uppercase;margin:0 0 6px;">' +
		__("Right fields") +
		"</div>" +
		'<select data-qbtl="right-fields" size="12" class="form-control" style="height:220px;font-size:12px;"></select>' +
		"</div>" +
		"</div>" +
		'<div style="margin:12px 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;color:#74808b;">' +
		__("Criteria") +
		"</div>" +
		'<select data-qbtl="criteria" size="5" class="form-control" style="height:110px;font-size:12px;"></select>' +
		'<div style="margin:8px 0 0;display:flex;gap:8px;">' +
		'<button type="button" class="btn btn-xs btn-default" data-qbtl="change">' +
		__("Change") +
		"</button>" +
		'<button type="button" class="btn btn-xs btn-default" data-qbtl="delete">' +
		__("Delete") +
		"</button>" +
		"</div>" +
		'<div style="margin:14px 0 0;display:flex;gap:16px;justify-content:space-between;flex-wrap:wrap;">' +
		'<label style="margin:0;font-weight:400;display:flex;align-items:center;gap:8px;">' +
		'<input type="checkbox" data-qbtl="left-sort-on"/> ' +
		__("Sort records") +
		'<button type="button" class="btn btn-xs btn-default" data-qbtl="left-sort-specify" disabled>' +
		__("Specify…") +
		"</button>" +
		"</label>" +
		'<label style="margin:0;font-weight:400;display:flex;align-items:center;gap:8px;">' +
		'<input type="checkbox" data-qbtl="right-sort-on"/> ' +
		__("Sort records") +
		'<button type="button" class="btn btn-xs btn-default" data-qbtl="right-sort-specify" disabled>' +
		__("Specify…") +
		"</button>" +
		"</label>" +
		"</div>" +
		"</div>"
	);
}

function _qbtl_render(frm) {
	const $host = _qbtl_host(frm);
	if (!$host) {
		return;
	}
	if (!$host.find("[data-qbtl=left-fields]").length) {
		$host.off(".qbtl");
		$host.removeData("qbtl-bound");
		$host.removeData("qbtl-tables");
		$host.html(_qbtl_shell_html());
		_qbtl_bind($host, frm);
	}

	const leftOn = _qbtl_cint(frm.doc.left_sort_enabled);
	const rightOn = _qbtl_cint(frm.doc.right_sort_enabled);
	$host.find("[data-qbtl=left-sort-on]").prop("checked", !!leftOn);
	$host.find("[data-qbtl=right-sort-on]").prop("checked", !!rightOn);
	$host.find("[data-qbtl=left-sort-specify]").prop("disabled", !leftOn);
	$host.find("[data-qbtl=right-sort-specify]").prop("disabled", !rightOn);
	_qbtl_fill_criteria($host, frm);

	const leftDt = String(frm.doc.left_table || "").trim();
	const rightDt = String(frm.doc.right_table || "").trim();
	const cacheKey = leftDt + "\0" + rightDt;
	if ($host.data("qbtl-tables") === cacheKey) {
		return;
	}
	$host.data("qbtl-tables", cacheKey);

	function apply(side, fields) {
		frm["_qbtl_" + side + "_fields"] = fields;
		$host.find("[data-qbtl=" + side + "-fields]").html(_qbtl_field_options(fields));
	}

	if (!leftDt) {
		apply("left", []);
	} else {
		_qbtl_fetch_fields(leftDt, function (fields) {
			apply("left", fields);
			if (rightDt === leftDt) {
				apply("right", fields);
			}
		});
	}
	if (!rightDt) {
		apply("right", []);
	} else if (rightDt !== leftDt) {
		_qbtl_fetch_fields(rightDt, function (fields) {
			apply("right", fields);
		});
	}
}

function _qbtl_sort_rows_html(fields, rows) {
	const fieldOpts =
		'<option value="">' + _qbtl_esc(__("Field")) + "</option>" + _qbtl_field_options(fields);
	if (!rows.length) {
		rows = [{ fieldname: "", dir: "asc" }];
	}
	return rows
		.map(function (row, i) {
			const fn = String(row.fieldname || "");
			const dir = String(row.dir || "asc").toLowerCase() === "desc" ? "desc" : "asc";
			return (
				'<div class="qbtl-sort-row" data-field="' +
				_qbtl_esc(fn) +
				'" data-dir="' +
				dir +
				'" data-idx="' +
				i +
				'" style="display:flex;gap:8px;align-items:center;margin:0 0 8px;">' +
				'<select class="form-control input-sm qbtl-sort-field" style="flex:1;">' +
				fieldOpts +
				"</select>" +
				'<select class="form-control input-sm qbtl-sort-dir" style="width:110px;">' +
				'<option value="asc">' +
				__("Ascending") +
				"</option>" +
				'<option value="desc">' +
				__("Descending") +
				"</option>" +
				"</select>" +
				'<button type="button" class="btn btn-xs btn-default qbtl-sort-remove">' +
				__("Remove") +
				"</button>" +
				"</div>"
			);
		})
		.join("");
}

function _qbtl_read_sort_rows($box) {
	const rows = [];
	$box.find(".qbtl-sort-row").each(function () {
		const fn = String($(this).find(".qbtl-sort-field").val() || "").trim();
		if (!fn) {
			return;
		}
		const dir = $(this).find(".qbtl-sort-dir").val() === "desc" ? "desc" : "asc";
		rows.push({ fieldname: fn, dir: dir });
	});
	return rows;
}

function _qbtl_sort_dialog(frm, side) {
	const fields = frm["_qbtl_" + side + "_fields"] || [];
	const jsonKey = side === "left" ? "left_sort_json" : "right_sort_json";
	let rows = _qbtl_parse_json_list(frm.doc[jsonKey]).map(function (r) {
		return { fieldname: r.fieldname || "", dir: r.dir === "desc" ? "desc" : "asc" };
	});

	const d = new frappe.ui.Dialog({
		title: __("Sort records — {0}", [side === "left" ? frm.doc.left_table : frm.doc.right_table]),
		fields: [{ fieldname: "host", fieldtype: "HTML" }],
		primary_action_label: __("Apply"),
		primary_action: function () {
			const $box = d.fields_dict.host.$wrapper;
			frm.set_value(jsonKey, JSON.stringify(_qbtl_read_sort_rows($box)));
			d.hide();
		},
	});
	d.show();

	function paint() {
		const $box = d.fields_dict.host.$wrapper;
		$box.html(
			'<div class="qbtl-sort-box">' +
				_qbtl_sort_rows_html(fields, rows) +
				'<button type="button" class="btn btn-xs btn-default qbtl-sort-add">' +
				__("Add field") +
				"</button>" +
				"</div>"
		);
		$box.find(".qbtl-sort-row").each(function () {
			const $row = $(this);
			$row.find(".qbtl-sort-field").val($row.attr("data-field") || "");
			$row.find(".qbtl-sort-dir").val($row.attr("data-dir") || "asc");
		});
		$box.find(".qbtl-sort-add").on("click", function () {
			rows = _qbtl_read_sort_rows($box);
			rows.push({ fieldname: "", dir: "asc" });
			paint();
		});
		$box.find(".qbtl-sort-remove").on("click", function () {
			const $row = $(this).closest(".qbtl-sort-row");
			$row.remove();
			rows = _qbtl_read_sort_rows($box);
			if (!rows.length) {
				rows = [{ fieldname: "", dir: "asc" }];
				paint();
			}
		});
	}
	paint();
}
