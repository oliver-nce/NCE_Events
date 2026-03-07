(function () {
	"use strict";

	if (!window.nce_events) window.nce_events = {};
	if (!window.nce_events.schema_explorer) window.nce_events.schema_explorer = {};

	var _float_el = null;
	var _columns = [];
	var _visited = {};

	var SKIP_FIELDTYPES = {
		"Section Break": 1, "Column Break": 1, "Tab Break": 1,
		"HTML": 1, "Fold": 1, "Heading": 1, "Button": 1,
		"Table MultiSelect": 1,
	};

	var SKIP_FIELDNAMES = {
		name: 1, owner: 1, creation: 1, modified: 1, modified_by: 1,
		docstatus: 1, idx: 1, parent: 1, parentfield: 1, parenttype: 1,
	};

	/* ── Public API ─────────────────────────────────────── */

	nce_events.schema_explorer.open = function (doctype) {
		if (doctype) {
			_open_explorer(doctype);
		} else {
			_prompt_doctype();
		}
	};

	nce_events.schema_explorer.close = function () {
		if (_float_el) {
			_float_el.remove();
			_float_el = null;
			_columns = [];
			_visited = {};
		}
		$(".se-tag-panel").remove();
	};

	/* ── DocType Picker (limited to WP Tables) ──────────── */

	function _prompt_doctype() {
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "WP Tables",
				filters: { frappe_doctype: ["is", "set"] },
				fields: ["frappe_doctype"],
				limit_page_length: 0,
			},
			callback: function (r) {
				var rows = r.message || [];
				var seen = {};
				var options = [];
				rows.forEach(function (row) {
					var dt = row.frappe_doctype;
					if (dt && !seen[dt]) {
						seen[dt] = true;
						options.push(dt);
					}
				});
				options.sort();
				if (!options.length) {
					frappe.msgprint(__("No DocTypes found in WP Tables."));
					return;
				}
				frappe.prompt([{
					fieldname: "doctype",
					label: __("DocType"),
					fieldtype: "Select",
					options: options.join("\n"),
					reqd: 1,
				}], function (values) {
					_open_explorer(values.doctype);
				}, __("Schema Explorer"), __("Open"));
			},
		});
	}

	/* ── Open Explorer ──────────────────────────────────── */

	function _open_explorer(doctype) {
		if (_float_el) {
			_float_el.remove();
			_float_el = null;
		}
		_columns = [];
		_visited = {};
		_inject_css();
		_create_float(doctype);
		_load_column(doctype, null, null, 0);
	}

	/* ── Floating Window ────────────────────────────────── */

	function _create_float(doctype) {
		var $float = $('<div class="se-float"></div>');

		var $header = $(
			'<div class="se-header">' +
			'<span class="se-title">Schema Explorer: ' +
			frappe.utils.escape_html(doctype) + '</span>' +
			'<button class="se-close">&times;</button>' +
			'</div>'
		);
		$float.append($header);

		var $body = $('<div class="se-body"></div>');
		$float.append($body);

		var $footer = $(
			'<div class="se-footer">Schema Explorer: ' +
			frappe.utils.escape_html(doctype) + '</div>'
		);
		$float.append($footer);

		$(document.body).append($float);
		_float_el = $float;

		var vw = window.innerWidth;
		var vh = window.innerHeight;
		$float.css({
			top: Math.max(60, Math.round(vh * 0.1)) + "px",
			left: Math.max(40, Math.round((vw - 700) / 2)) + "px",
		});

		$header.find(".se-close").on("click", function () {
			_float_el.remove();
			_float_el = null;
			_columns = [];
			_visited = {};
		});

		_make_draggable($float, $header);
		_make_draggable($float, $footer);
	}

	function _make_draggable($float, $handle) {
		$handle.on("mousedown", function (e) {
			if ($(e.target).hasClass("se-close")) return;
			e.preventDefault();
			var sx = e.clientX, sy = e.clientY;
			var sl = parseInt($float.css("left"), 10) || 0;
			var st = parseInt($float.css("top"), 10) || 0;

			if ($float.css("right") !== "auto") {
				$float.css({ left: $float.offset().left + "px", right: "auto" });
				sl = parseInt($float.css("left"), 10);
			}

			$("body").addClass("se-dragging");
			$(document).on("mousemove.se", function (ev) {
				var newTop = st + ev.clientY - sy;
				newTop = Math.max(0, Math.min(newTop, window.innerHeight - 40));
				$float.css({
					left: (sl + ev.clientX - sx) + "px",
					top: newTop + "px",
				});
			});
			$(document).on("mouseup.se", function () {
				$(document).off("mousemove.se mouseup.se");
				$("body").removeClass("se-dragging");
			});
		});
	}

	/* ── Load & Render Column ───────────────────────────── */

	function _load_column(doctype, via_field, via_type, col_idx) {
		while (_columns.length > col_idx) {
			var removed = _columns.pop();
			if (removed.$el) removed.$el.remove();
			delete _visited[removed.doctype];
		}

		_visited[doctype] = true;

		var col = {
			doctype: doctype,
			via_field: via_field,
			via_type: via_type,
			fields: [],
			active_field: null,
			$el: null,
		};
		_columns.push(col);

		frappe.model.with_doctype(doctype, function () {
			var meta = frappe.get_meta(doctype);
			var fields = [];

			(meta.fields || []).forEach(function (f) {
				if (SKIP_FIELDTYPES[f.fieldtype]) return;
				if (f.fieldtype === "Table") {
					fields.push({
						fieldname: f.fieldname,
						label: f.label || f.fieldname,
						fieldtype: f.fieldtype,
						options: f.options || "",
						is_link: false,
						is_table: true,
					});
					return;
				}
				if (SKIP_FIELDNAMES[f.fieldname]) return;
				fields.push({
					fieldname: f.fieldname,
					label: f.label || f.fieldname,
					fieldtype: f.fieldtype,
					options: f.options || "",
					is_link: f.fieldtype === "Link",
					is_table: false,
				});
			});

			col.fields = fields;
			_render_column(col, col_idx);
		});
	}

	function _render_column(col, col_idx) {
		var $col = $('<div class="se-column"></div>');
		var $ch = $(
			'<div class="se-col-header">' +
			frappe.utils.escape_html(col.doctype) +
			'<span class="se-col-count">' + col.fields.length + ' fields</span>' +
			'</div>'
		);
		$col.append($ch);

		var $tiles = $('<div class="se-tiles"></div>');

		col.fields.forEach(function (f) {
			var cls = "se-tile";
			var is_circular = false;

			if (f.is_link) {
				if (f.options && _visited[f.options]) {
					cls += " se-tile-circular";
					is_circular = true;
				} else {
					cls += " se-tile-link";
				}
			} else if (f.is_table) {
				if (f.options && _visited[f.options]) {
					cls += " se-tile-circular";
					is_circular = true;
				} else {
					cls += " se-tile-table";
				}
			}

			var badge_text = f.fieldtype;
			if ((f.is_link || f.is_table) && f.options) {
				badge_text += " \u2192 " + f.options;
			}

			var $tile = $(
				'<div class="' + cls + '">' +
				'<div class="se-tile-top">' +
				'<span class="se-tile-label">' + frappe.utils.escape_html(f.label) + '</span>' +
				((f.is_link || f.is_table) && !is_circular
					? '<span class="se-tile-arrow">\u25B6</span>' : '') +
				'</div>' +
				'<div class="se-tile-meta">' +
				'<span class="se-tile-fieldname">' + frappe.utils.escape_html(f.fieldname) + '</span>' +
				'<span class="se-tile-badge">' + frappe.utils.escape_html(badge_text) + '</span>' +
				'</div>' +
				'</div>'
			);

			if (is_circular) {
				$tile.attr("title", "Circular: " + f.options + " already in path");
			}

			$tile.on("click", function () {
				if (is_circular) return;

				if (f.is_link || f.is_table) {
					col.active_field = f.fieldname;
					$tiles.find(".se-tile").removeClass("se-tile-active");
					$tile.addClass("se-tile-active");
					_load_column(
						f.options,
						f.fieldname,
						f.is_table ? "Table" : "Link",
						col_idx + 1
					);
				} else {
					_show_tag_dialog(col_idx, f);
				}
			});

			$tiles.append($tile);
		});

		$col.append($tiles);
		col.$el = $col;

		var $body = _float_el.find(".se-body");
		$body.append($col);

		setTimeout(function () {
			$body[0].scrollLeft = $body[0].scrollWidth;
		}, 50);
	}

	/* ── Tag Generation ─────────────────────────────────── */

	function _build_tag(col_idx, field) {
		var hops = [];
		for (var i = 0; i <= col_idx; i++) {
			hops.push(_columns[i]);
		}

		var table_hop_idx = -1;
		for (var j = 1; j < hops.length; j++) {
			if (hops[j].via_type === "Table") {
				table_hop_idx = j;
				break;
			}
		}

		if (table_hop_idx === -1) {
			return _build_link_chain_tag(hops, field);
		}
		return _build_table_tag(hops, field, table_hop_idx);
	}

	function _build_link_chain_tag(hops, field) {
		var depth = hops.length - 1;

		if (depth === 0) {
			return "{{ doc." + field.fieldname + " }}";
		}
		if (depth === 1) {
			return "{{ frappe.db.get_value('" + hops[1].doctype +
				"', doc." + hops[1].via_field +
				", '" + field.fieldname + "') }}";
		}
		if (depth === 2) {
			return "{{ frappe.db.get_value('" + hops[2].doctype + "', " +
				"frappe.db.get_value('" + hops[1].doctype +
				"', doc." + hops[1].via_field +
				", '" + hops[2].via_field + "'), " +
				"'" + field.fieldname + "') }}";
		}

		var lines = [];
		lines.push("{% set hop1 = frappe.get_doc('" +
			hops[1].doctype + "', doc." + hops[1].via_field + ") %}");
		for (var k = 2; k < hops.length; k++) {
			lines.push("{% set hop" + k + " = frappe.get_doc('" +
				hops[k].doctype + "', hop" + (k - 1) + "." +
				hops[k].via_field + ") %}");
		}
		lines.push("{{ hop" + (hops.length - 1) + "." + field.fieldname + " }}");
		return lines.join("\n");
	}

	function _build_table_tag(hops, field, table_hop_idx) {
		var pre = [];
		for (var i = 0; i < table_hop_idx; i++) {
			pre.push(hops[i]);
		}

		var table_field = hops[table_hop_idx].via_field;

		var post = [];
		for (var j = table_hop_idx; j < hops.length; j++) {
			post.push(hops[j]);
		}

		var pre_depth = pre.length - 1;
		var lines = [];
		var table_accessor;

		if (pre_depth === 0) {
			table_accessor = "doc." + table_field;
		} else if (pre_depth === 1) {
			lines.push("{% set parent_doc = frappe.get_doc('" +
				pre[1].doctype + "', doc." + pre[1].via_field + ") %}");
			table_accessor = "parent_doc." + table_field;
		} else {
			lines.push("{% set hop1 = frappe.get_doc('" +
				pre[1].doctype + "', doc." + pre[1].via_field + ") %}");
			for (var p = 2; p < pre.length; p++) {
				lines.push("{% set hop" + p + " = frappe.get_doc('" +
					pre[p].doctype + "', hop" + (p - 1) + "." +
					pre[p].via_field + ") %}");
			}
			table_accessor = "hop" + (pre.length - 1) + "." + table_field;
		}

		var post_depth = post.length - 1;
		var inner;

		if (post_depth === 0) {
			inner = "{{ row." + field.fieldname + " }}";
		} else if (post_depth === 1) {
			inner = "{{ frappe.db.get_value('" + post[1].doctype +
				"', row." + post[1].via_field +
				", '" + field.fieldname + "') }}";
		} else if (post_depth === 2) {
			inner = "{{ frappe.db.get_value('" + post[2].doctype + "', " +
				"frappe.db.get_value('" + post[1].doctype +
				"', row." + post[1].via_field +
				", '" + post[2].via_field + "'), " +
				"'" + field.fieldname + "') }}";
		} else {
			var il = [];
			il.push("{% set rh1 = frappe.get_doc('" +
				post[1].doctype + "', row." + post[1].via_field + ") %}");
			for (var r = 2; r < post.length; r++) {
				il.push("{% set rh" + r + " = frappe.get_doc('" +
					post[r].doctype + "', rh" + (r - 1) + "." +
					post[r].via_field + ") %}");
			}
			il.push("{{ rh" + (post.length - 1) + "." + field.fieldname + " }}");
			inner = il.join("\n");
		}

		lines.push("{% for row in " + table_accessor + " %}");
		lines.push(inner);
		lines.push("{% endfor %}");
		return lines.join("\n");
	}

	function _build_path_string(col_idx, field) {
		var parts = [];
		for (var i = 0; i <= col_idx; i++) {
			var c = _columns[i];
			if (i === 0) {
				parts.push(c.doctype);
			} else {
				parts.push(c.via_field + " (" + c.via_type + ")");
				parts.push(c.doctype);
			}
		}
		parts.push(field.fieldname);
		return parts.join(" \u2192 ");
	}

	/* ── Tag Panel (non-modal, draggable, multiple allowed) ── */

	var _tag_panel_count = 0;

	function _apply_default_filter(tag, fallback) {
		if (!fallback) return tag;
		var safe = fallback.replace(/'/g, "\\'");
		return tag.replace(
			/\{\{([^}]+)\}\}/g,
			function (m, inner) { return "{{ " + inner.trim() + " | default('" + safe + "') }}"; }
		);
	}

	function _show_tag_dialog(col_idx, field) {
		var base_tag = _build_tag(col_idx, field);
		var path = _build_path_string(col_idx, field);

		_tag_panel_count++;
		var cascade = (_tag_panel_count - 1) * 24;
		var top = Math.min(100 + cascade, window.innerHeight - 200);
		var left = Math.min(160 + cascade, window.innerWidth - 420);

		var $panel = $(
			'<div class="se-tag-panel">' +
			'<div class="se-tag-panel-header">' +
			'<span class="se-title">' + frappe.utils.escape_html(field.label) + '</span>' +
			'<button class="se-close">&times;</button>' +
			'</div>' +
			'<div class="se-tag-panel-body">' +
			'<div class="se-tag-lbl">Field</div>' +
			'<div class="se-tag-val">' +
			frappe.utils.escape_html(field.label) +
			' <span style="color:#8D949A;">(' +
			frappe.utils.escape_html(field.fieldname) + ')</span></div>' +
			'<div class="se-tag-lbl">Path</div>' +
			'<div class="se-tag-val" style="font-size:12px;">' +
			frappe.utils.escape_html(path) + '</div>' +
			'<div class="se-tag-lbl">Fallback Value</div>' +
			'<div class="se-tag-val">' +
			'<input type="text" class="se-fallback-input" placeholder="e.g. Student (leave empty for none)">' +
			'</div>' +
			'<div class="se-tag-lbl">Tag</div>' +
			'<pre class="se-tag-pre">' +
			frappe.utils.escape_html(base_tag) + '</pre>' +
			'<div style="margin-top:10px;text-align:right;">' +
			'<button class="btn btn-primary btn-sm se-copy-btn">Copy to Clipboard</button>' +
			'</div>' +
			'</div>' +
			'</div>'
		);

		$panel.css({ top: top + "px", left: left + "px" });
		$(document.body).append($panel);

		$panel.on("mousedown", function () {
			$(".se-tag-panel").css("z-index", 1070);
			$panel.css("z-index", 1080);
		});
		$panel.trigger("mousedown");

		var $header = $panel.find(".se-tag-panel-header");
		var $pre = $panel.find(".se-tag-pre");
		var $input = $panel.find(".se-fallback-input");

		$input.on("input", function () {
			var fb = $(this).val().trim();
			var rendered = _apply_default_filter(base_tag, fb);
			$pre.text(rendered);
		});

		$pre.on("click", function () {
			var range = document.createRange();
			range.selectNodeContents(this);
			var sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		});

		$panel.find(".se-copy-btn").on("click", function () {
			var current_tag = $pre.text();
			if (navigator.clipboard) {
				navigator.clipboard.writeText(current_tag).then(function () {
					frappe.show_alert({ message: __("Tag copied"), indicator: "green" });
				});
			} else {
				_clipboard_fallback(current_tag);
			}
		});

		$header.find(".se-close").on("click", function () {
			$panel.remove();
		});

		_make_draggable($panel, $header);
	}

	function _clipboard_fallback(text) {
		var ta = document.createElement("textarea");
		ta.value = text;
		ta.style.position = "fixed";
		ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.select();
		document.execCommand("copy");
		document.body.removeChild(ta);
		frappe.show_alert({ message: __("Tag copied"), indicator: "green" });
	}

	/* ── CSS Injection ──────────────────────────────────── */

	function _inject_css() {
		if (document.getElementById("se-style")) return;

		var css =
			".se-float{position:fixed;z-index:1060;width:700px;height:60vh;" +
			"min-width:320px;min-height:220px;" +
			"background:#FAFAFA;border:1px solid #A2CCF6;border-radius:8px;" +
			"box-shadow:0 8px 32px rgba(18,107,196,.22),0 2px 8px rgba(0,0,0,.08);" +
			"display:flex;flex-direction:column;overflow:hidden;resize:both}" +

			".se-header{display:flex;align-items:center;justify-content:space-between;" +
			"padding:8px 12px;background:#126BC4;color:#fff;cursor:move;flex-shrink:0}" +
			".se-title{font-weight:600;font-size:14px;font-family:Arial,sans-serif}" +
			".se-close{background:none;border:none;color:#fff;font-size:18px;" +
			"line-height:1;cursor:pointer;padding:0 4px;opacity:.8}" +
			".se-close:hover{opacity:1}" +

			".se-footer{height:24px;line-height:24px;padding:0 12px;" +
			"background:#126BC4;color:rgba(255,255,255,.75);" +
			"font-size:11px;font-weight:600;font-family:Arial,sans-serif;" +
			"cursor:move;flex-shrink:0;white-space:nowrap;overflow:hidden;" +
			"text-overflow:ellipsis;border-top:1px solid #105EAD}" +

			".se-body{flex:1;display:flex;overflow-x:auto;overflow-y:hidden;min-height:0}" +

			".se-column{min-width:230px;max-width:320px;display:flex;flex-direction:column;" +
			"border-right:1px solid #A2CCF6;flex-shrink:0}" +

			".se-col-header{padding:8px 10px;background:#E3F0FC;color:#105EAD;" +
			"font-weight:600;font-size:13px;font-family:Arial,sans-serif;" +
			"border-bottom:2px solid #A2CCF6;white-space:nowrap;overflow:hidden;" +
			"text-overflow:ellipsis;flex-shrink:0;display:flex;align-items:center;" +
			"justify-content:space-between;gap:6px}" +
			".se-col-count{font-size:10px;color:#6D757E;font-weight:400;white-space:nowrap}" +

			".se-tiles{flex:1;overflow-y:auto;padding:4px}" +

			".se-tile{padding:7px 10px;margin-bottom:3px;border-radius:5px;" +
			"cursor:pointer;transition:background .12s;" +
			"border:1px solid #A2CCF6;border-left:3px solid transparent}" +
			".se-tile:hover{background:#F1F7FE}" +

			".se-tile-link{border-left-color:#4198F0;background:#F1F7FE}" +
			".se-tile-link:hover{background:#E3F0FC}" +

			".se-tile-table{border-left-color:#F2B90D;background:#FEFBF0;" +
			"border-color:#F2B90D}" +
			".se-tile-table:hover{background:#FDF3D7}" +

			".se-tile-circular{border-left-color:#D7D9DB;background:#F4F5F5;" +
			"border-color:#D7D9DB;opacity:.45;cursor:not-allowed}" +

			".se-tile-active{background:#C7E0FA!important;border-left-color:#126BC4;" +
			"border-color:#126BC4}" +

			".se-tile-top{display:flex;align-items:center;justify-content:space-between}" +
			".se-tile-label{font-size:14px;font-weight:500;color:#464D53;" +
			"font-family:Arial,sans-serif;flex:1;min-width:0;" +
			"overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
			".se-tile-arrow{font-size:9px;color:#4198F0;margin-left:4px;flex-shrink:0}" +

			".se-tile-meta{display:flex;justify-content:space-between;" +
			"align-items:center;margin-top:2px;gap:4px}" +
			".se-tile-fieldname{font-size:11px;color:#8D949A;font-family:monospace;" +
			"overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}" +
			".se-tile-badge{font-size:10px;color:#6D757E;background:#EAEBEC;" +
			"padding:1px 6px;border-radius:3px;font-family:Arial,sans-serif;" +
			"white-space:nowrap;flex-shrink:0}" +

			".se-tag-panel{position:fixed;z-index:1080;width:420px;" +
			"background:#fff;border:1px solid #A2CCF6;border-radius:8px;" +
			"box-shadow:0 8px 32px rgba(18,107,196,.22),0 2px 8px rgba(0,0,0,.08);" +
			"display:flex;flex-direction:column;overflow:hidden;resize:both;" +
			"min-width:280px;min-height:180px}" +
			".se-tag-panel-header{display:flex;align-items:center;justify-content:space-between;" +
			"padding:8px 12px;background:#126BC4;color:#fff;cursor:move;flex-shrink:0}" +
			".se-tag-panel-body{padding:14px 16px;font-family:Arial,sans-serif;" +
			"font-size:13px;color:#464D53;overflow-y:auto;flex:1}" +
			".se-tag-lbl{font-weight:600;color:#105EAD;font-size:12px;" +
			"text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px}" +
			".se-tag-val{margin-bottom:10px;font-size:13px}" +
			".se-fallback-input{width:100%;padding:5px 8px;font-size:13px;" +
			"border:1px solid #C7E0FA;border-radius:4px;font-family:Arial,sans-serif;" +
			"color:#464D53;outline:none}" +
			".se-fallback-input:focus{border-color:#4198F0;" +
			"box-shadow:0 0 0 2px rgba(65,152,240,.2)}" +
			".se-tag-pre{background:#F1F7FE;border:1px solid #C7E0FA;" +
			"border-radius:6px;padding:12px 14px;margin:0;font-size:13px;" +
			"white-space:pre-wrap;word-break:break-all;user-select:all;" +
			"cursor:text;color:#105EAD;font-family:monospace;line-height:1.5}" +

			"body.se-dragging,body.se-dragging *{user-select:none!important}";

		$("head").append($('<style id="se-style"></style>').text(css));
	}
})();
