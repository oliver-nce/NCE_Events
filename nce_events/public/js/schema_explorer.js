(function () {
	"use strict";

	if (!window.nce_events) window.nce_events = {};
	if (!window.nce_events.schema_explorer) window.nce_events.schema_explorer = {};

	let _float_el = null;
	let _columns = [];
	let _visited = {};
	let _last_editable = null;
	let _last_sel_start = 0;
	let _last_sel_end = 0;
	let _last_range = null;

	function _save_selection() {
		if (!_last_editable) return;
		if (_last_editable.selectionStart !== undefined) {
			_last_sel_start = _last_editable.selectionStart || 0;
			_last_sel_end = _last_editable.selectionEnd || 0;
		}
		if (_last_editable.contentEditable === "true") {
			const sel = window.getSelection();
			if (sel && sel.rangeCount > 0 && _last_editable.contains(sel.anchorNode)) {
				_last_range = sel.getRangeAt(0).cloneRange();
			}
		}
	}

	$(document).on("focusin.se_track", function (e) {
		const el = e.target;
		if ($(el).closest(".se-float, .se-tag-panel").length) return;
		const tag = (el.tagName || "").toLowerCase();
		if (tag === "textarea" || (tag === "input" && el.type === "text") ||
			el.contentEditable === "true") {
			console.log("[SE] focusin: set _last_editable", tag, el.className, "contentEditable=" + el.contentEditable);
			_last_editable = el;
			_save_selection();
		}
	});

	$(document).on("mouseup.se_track keyup.se_track", function (e) {
		if (_last_editable && (_last_editable === e.target || _last_editable.contains(e.target))) {
			_save_selection();
		}
	});

	$(document).on("selectionchange.se_track", function () {
		if (_last_editable && _last_editable.contentEditable === "true") {
			const sel = window.getSelection();
			const inside = sel && sel.rangeCount > 0 && _last_editable.contains(sel.anchorNode);
			if (inside) {
				_last_range = sel.getRangeAt(0).cloneRange();
				console.log("[SE] selectionchange: saved range", _last_range.startOffset);
			}
		}
	});

	const SKIP_FIELDTYPES = {
		"Section Break": 1, "Column Break": 1, "Tab Break": 1,
		"HTML": 1, "Fold": 1, "Heading": 1, "Button": 1,
		"Table MultiSelect": 1,
	};

	const SKIP_FIELDNAMES = {
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
				const rows = r.message || [];
				const seen = {};
				const options = [];
				rows.forEach(function (row) {
					const dt = row.frappe_doctype;
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
				}, __("Tag Finder"), __("Open"));
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
		const $float = $('<div class="se-float"></div>');

		const $header = $(
			`<div class="se-header">
			<span class="se-title">Tag Finder: ${frappe.utils.escape_html(doctype)}</span>
			<button class="se-close">&times;</button>
			</div>`
		);
		$float.append($header);

		const $body = $('<div class="se-body"></div>');
		$float.append($body);

		const $footer = $(
			`<div class="se-footer">Tag Finder: ${frappe.utils.escape_html(doctype)}</div>`
		);
		$float.append($footer);

		$(document.body).append($float);
		_float_el = $float;

		const vh = window.innerHeight;
		let left_pos = window.innerWidth - 300;
		const $send = $(".send-panel");
		if ($send.length) {
			const sr = $send[0].getBoundingClientRect();
			left_pos = sr.right + 400;
		}
		if (left_pos + 260 > window.innerWidth) {
			left_pos = window.innerWidth - 280;
		}
		$float.css({
			top: `${Math.max(60, Math.round(vh * 0.08))}px`,
			left: `${left_pos}px`,
			right: "auto",
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
			const sx = e.clientX, sy = e.clientY;
			let sl = parseInt($float.css("left"), 10) || 0;
			const st = parseInt($float.css("top"), 10) || 0;

			if ($float.css("right") !== "auto") {
				$float.css({ left: `${$float.offset().left}px`, right: "auto" });
				sl = parseInt($float.css("left"), 10);
			}

			$("body").addClass("se-dragging");
			$(document).on("mousemove.se", function (ev) {
				let newTop = st + ev.clientY - sy;
				newTop = Math.max(0, Math.min(newTop, window.innerHeight - 40));
				$float.css({
					left: `${sl + ev.clientX - sx}px`,
					top: `${newTop}px`,
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
			const removed = _columns.pop();
			if (removed.$el) removed.$el.remove();
			delete _visited[removed.doctype];
		}

		_visited[doctype] = true;

		const col = {
			doctype: doctype,
			via_field: via_field,
			via_type: via_type,
			fields: [],
			active_field: null,
			$el: null,
		};
		_columns.push(col);

		frappe.model.with_doctype(doctype, function () {
			const meta = frappe.get_meta(doctype);
			const fields = [];

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

			if (col_idx === 0) {
				frappe.call({
					method: "nce_events.api.tags.get_pronoun_tags_for_doctype",
					args: { doctype: doctype },
					callback: function (r) {
						const tags = r.message || [];
						const pronoun_fields = tags.map(function (t) {
							return {
								fieldname: t.field_name,
								label: t.label || t.field_name,
								jinja_tag: t.jinja_tag || "",
								is_pronoun: true,
							};
						});
						col.fields = pronoun_fields.concat(col.fields);
						_render_column(col, col_idx);
					},
				});
			} else {
				_render_column(col, col_idx);
			}
		});
	}

	function _render_column(col, col_idx) {
		const $col = $('<div class="se-column"></div>');
		const $ch = $(
			`<div class="se-col-header">${frappe.utils.escape_html(col.doctype)}<span class="se-col-count">${col.fields.length} fields</span></div>`
		);
		$col.append($ch);

		const $tiles = $('<div class="se-tiles"></div>');

		col.fields.forEach(function (f) {
			let cls = "se-tile";
			let is_circular = false;

			if (f.is_pronoun) {
				cls += " se-tile-pronoun";
			} else if (f.is_link) {
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

			let badge_text = f.is_pronoun ? "pronoun" : f.fieldtype;
			if ((f.is_link || f.is_table) && f.options) {
				badge_text += ` \u2192 ${f.options}`;
			}

			const $tile = $(`<div class="${cls}">
				<div class="se-tile-top">
					<span class="se-tile-label">${frappe.utils.escape_html(f.label)}</span>${
						(f.is_link || f.is_table) && !is_circular
							? '<span class="se-tile-arrow">\u25B6</span>' : ''}
				</div>
				<div class="se-tile-meta">
					<span class="se-tile-fieldname">${frappe.utils.escape_html(f.fieldname)}</span>
					<span class="se-tile-badge">${frappe.utils.escape_html(badge_text)}</span>
				</div>
			</div>`);

			if (is_circular) {
				$tile.attr("title", `Circular: ${f.options} already in path`);
			}

			$tile.on("click", function () {
				if (is_circular) return;

				if (f.is_pronoun && f.jinja_tag) {
					_show_tag_dialog(col_idx, f, f.jinja_tag);
				} else if (f.is_link || f.is_table) {
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

		const $body = _float_el.find(".se-body");
		$body.append($col);

		setTimeout(function () {
			$body[0].scrollLeft = $body[0].scrollWidth;
		}, 50);
	}

	/* ── Tag Generation ─────────────────────────────────── */

	function _build_tag(col_idx, field) {
		const hops = [];
		for (let i = 0; i <= col_idx; i++) {
			hops.push(_columns[i]);
		}

		let table_hop_idx = -1;
		for (let j = 1; j < hops.length; j++) {
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
		const depth = hops.length - 1;

		if (depth === 0) {
			return `{{ doc.${field.fieldname} }}`;
		}
		if (depth === 1) {
			return `{{ frappe.db.get_value('${hops[1].doctype}', doc.${hops[1].via_field}, '${field.fieldname}') }}`;
		}
		if (depth === 2) {
			return `{{ frappe.db.get_value('${hops[2].doctype}', frappe.db.get_value('${hops[1].doctype}', doc.${hops[1].via_field}, '${hops[2].via_field}'), '${field.fieldname}') }}`;
		}

		const lines = [];
		lines.push(`{% set hop1 = frappe.get_doc('${hops[1].doctype}', doc.${hops[1].via_field}) %}`);
		for (let k = 2; k < hops.length; k++) {
			lines.push(`{% set hop${k} = frappe.get_doc('${hops[k].doctype}', hop${k - 1}.${hops[k].via_field}) %}`);
		}
		lines.push(`{{ hop${hops.length - 1}.${field.fieldname} }}`);
		return lines.join("\n");
	}

	function _build_table_tag(hops, field, table_hop_idx) {
		const pre = [];
		for (let i = 0; i < table_hop_idx; i++) {
			pre.push(hops[i]);
		}

		const table_field = hops[table_hop_idx].via_field;

		const post = [];
		for (let j = table_hop_idx; j < hops.length; j++) {
			post.push(hops[j]);
		}

		const pre_depth = pre.length - 1;
		const lines = [];
		let table_accessor;

		if (pre_depth === 0) {
			table_accessor = `doc.${table_field}`;
		} else if (pre_depth === 1) {
			lines.push(`{% set parent_doc = frappe.get_doc('${pre[1].doctype}', doc.${pre[1].via_field}) %}`);
			table_accessor = `parent_doc.${table_field}`;
		} else {
			lines.push(`{% set hop1 = frappe.get_doc('${pre[1].doctype}', doc.${pre[1].via_field}) %}`);
			for (let p = 2; p < pre.length; p++) {
				lines.push(`{% set hop${p} = frappe.get_doc('${pre[p].doctype}', hop${p - 1}.${pre[p].via_field}) %}`);
			}
			table_accessor = `hop${pre.length - 1}.${table_field}`;
		}

		const post_depth = post.length - 1;
		let inner;

		if (post_depth === 0) {
			inner = `{{ row.${field.fieldname} }}`;
		} else if (post_depth === 1) {
			inner = `{{ frappe.db.get_value('${post[1].doctype}', row.${post[1].via_field}, '${field.fieldname}') }}`;
		} else if (post_depth === 2) {
			inner = `{{ frappe.db.get_value('${post[2].doctype}', frappe.db.get_value('${post[1].doctype}', row.${post[1].via_field}, '${post[2].via_field}'), '${field.fieldname}') }}`;
		} else {
			const il = [];
			il.push(`{% set rh1 = frappe.get_doc('${post[1].doctype}', row.${post[1].via_field}) %}`);
			for (let r = 2; r < post.length; r++) {
				il.push(`{% set rh${r} = frappe.get_doc('${post[r].doctype}', rh${r - 1}.${post[r].via_field}) %}`);
			}
			il.push(`{{ rh${post.length - 1}.${field.fieldname} }}`);
			inner = il.join("\n");
		}

		lines.push(`{% for row in ${table_accessor} %}`);
		lines.push(inner);
		lines.push("{% endfor %}");
		return lines.join("\n");
	}

	function _build_path_string(col_idx, field) {
		const parts = [];
		for (let i = 0; i <= col_idx; i++) {
			const c = _columns[i];
			if (i === 0) {
				parts.push(c.doctype);
			} else {
				parts.push(`${c.via_field} (${c.via_type})`);
				parts.push(c.doctype);
			}
		}
		parts.push(field.fieldname);
		return parts.join(" \u2192 ");
	}

	/* ── Tag Panel (non-modal, draggable, multiple allowed) ── */

	let _tag_panel_count = 0;

	function _apply_filters(tag, fallback, is_html) {
		let result = tag;
		if (fallback) {
			const safe = fallback.replace(/'/g, "\\'");
			result = result.replace(
				/\{\{([^}]+)\}\}/g,
				function (m, inner) { return `{{ ${inner.trim()} | default('${safe}') }}`; }
			);
		}
		if (is_html) {
			result = result.replace(
				/\{\{([^}]+)\}\}/g,
				function (m, inner) {
					const trimmed = inner.trim();
					if (trimmed.indexOf("| safe") === -1) {
						return `{{ ${trimmed} | safe }}`;
					}
					return m;
				}
			);
		}
		return result;
	}

	function _show_tag_dialog(col_idx, field, precomputed_tag) {
		const base_tag = precomputed_tag || _build_tag(col_idx, field);
		const path = field.is_pronoun
			? `${_columns[0] ? _columns[0].doctype : ""} \u2192 ${field.fieldname} (pronoun)`
			: _build_path_string(col_idx, field);

		_tag_panel_count++;
		const cascade = (_tag_panel_count - 1) * 24;
		const top = Math.min(100 + cascade, window.innerHeight - 200);
		const left = Math.min(160 + cascade, window.innerWidth - 420);

		const $panel = $(`<div class="se-tag-panel">
			<div class="se-tag-panel-header">
				<span class="se-title">${frappe.utils.escape_html(field.label)}</span>
				<button class="se-close">&times;</button>
			</div>
			<div class="se-tag-panel-body">
				<div class="se-tag-lbl">Field</div>
				<div class="se-tag-val">${frappe.utils.escape_html(field.label)} <span style="color:#8D949A;">(${frappe.utils.escape_html(field.fieldname)})</span></div>
				<div class="se-tag-lbl">Path</div>
				<div class="se-tag-val" style="font-size:12px;">${frappe.utils.escape_html(path)}</div>
				<div class="se-tag-lbl">Fallback Value</div>
				<div class="se-tag-val">
					<input type="text" class="se-fallback-input" placeholder="e.g. Student (leave empty for none)">
				</div>
				<div class="se-tag-lbl">Tag</div>
				<pre class="se-tag-pre">${frappe.utils.escape_html(base_tag)}</pre>
				<div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:6px;">
					<label class="se-html-check-label"><input type="checkbox" class="se-html-check"> Is this HTML?</label>
					<span style="display:flex;gap:6px;">
						<button class="btn btn-default btn-sm se-insert-btn">Insert at Cursor</button>
						<button class="btn btn-primary btn-sm se-copy-btn">Copy to Clipboard</button>
					</span>
				</div>
			</div>
		</div>`);

		$panel.css({ top: `${top}px`, left: `${left}px` });
		$(document.body).append($panel);

		$panel.on("mousedown", function () {
			$(".se-tag-panel").css("z-index", 1070);
			$panel.css("z-index", 1080);
		});
		$panel.trigger("mousedown");

		const $header = $panel.find(".se-tag-panel-header");
		const $pre = $panel.find(".se-tag-pre");
		const $input = $panel.find(".se-fallback-input");
		const $html_check = $panel.find(".se-html-check");

		function _update_tag() {
			const fb = $input.val().trim();
			const is_html = $html_check.is(":checked");
			$pre.text(_apply_filters(base_tag, fb, is_html));
		}

		$input.on("input", _update_tag);
		$html_check.on("change", _update_tag);

		$pre.on("click", function () {
			const range = document.createRange();
			range.selectNodeContents(this);
			const sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		});

		$panel.find(".se-insert-btn").on("click", function () {
			const current_tag = $pre.text();
			console.log("[SE] Insert clicked. _last_editable:", _last_editable ? _last_editable.tagName + "." + _last_editable.className : null);
			console.log("[SE] _last_range:", _last_range);
			console.log("[SE] contentEditable:", _last_editable ? _last_editable.contentEditable : "N/A");
			if (!_last_editable || !_last_editable.parentNode) {
				frappe.show_alert({ message: __("Click into the message box first, then click Insert"), indicator: "orange" });
				return;
			}
			const before = _last_editable.value;
			_insert_at_cursor(_last_editable, current_tag);
			const inserted = _last_editable.value !== undefined
				? (_last_editable.value !== before)
				: true;
			if (inserted) {
				frappe.show_alert({ message: __("Tag inserted"), indicator: "green" });
				$panel.remove();
			} else {
				frappe.show_alert({ message: __("Click into the message box first, then click Insert"), indicator: "orange" });
			}
		});

		$panel.find(".se-copy-btn").on("click", function () {
			const current_tag = $pre.text();
			if (navigator.clipboard) {
				navigator.clipboard.writeText(current_tag).then(function () {
					frappe.show_alert({ message: __("Tag copied"), indicator: "green" });
					$panel.remove();
				});
			} else {
				_clipboard_fallback(current_tag);
				$panel.remove();
			}
		});

		$panel.find(".se-close").on("click", function () {
			$panel.remove();
		});

		_make_draggable($panel, $header);
	}

	function _insert_at_cursor(el, text) {
		const tag = (el.tagName || "").toLowerCase();
		if (tag === "textarea" || tag === "input") {
			el.focus();
			let start = _last_sel_start || 0;
			let end = _last_sel_end || 0;
			const val = el.value || "";
			if (start > val.length) start = val.length;
			if (end > val.length) end = val.length;
			el.selectionStart = start;
			el.selectionEnd = end;
			if (document.execCommand) {
				document.execCommand("insertText", false, text);
			} else {
				el.value = `${val.substring(0, start)}${text}${val.substring(end)}`;
			}
			const new_pos = start + text.length;
			el.selectionStart = new_pos;
			el.selectionEnd = new_pos;
			$(el).trigger("change").trigger("input");
			_last_sel_start = new_pos;
			_last_sel_end = new_pos;
		} else if (el.contentEditable === "true") {
			console.log("[SE] _insert_at_cursor: contentEditable path");
			console.log("[SE] _last_range:", _last_range, "contains:", _last_range ? el.contains(_last_range.startContainer) : "N/A");
			el.focus();
			if (_last_range && el.contains(_last_range.startContainer)) {
				const sel = window.getSelection();
				sel.removeAllRanges();
				sel.addRange(_last_range);
				console.log("[SE] Range restored");
			} else {
				console.log("[SE] Range NOT restored");
			}
			document.execCommand("insertText", false, text);
			_save_selection();
		}
	}

	function _clipboard_fallback(text) {
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.style.position = "fixed";
		ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.select();
		document.execCommand("copy");
		document.body.removeChild(ta);
		frappe.show_alert({ message: __("Tag copied"), indicator: "green" });
	}

	/* ── CSS cleanup (styles now in schema_explorer.css) ── */

	function _inject_css() {
		const existing = document.getElementById("se-style");
		if (existing) existing.remove();
	}
})();
