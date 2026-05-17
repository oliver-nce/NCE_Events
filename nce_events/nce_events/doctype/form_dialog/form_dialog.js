// Form Dialog — Desk UI for portal_field_config on Related DocTypes (Display-tab pattern).

(function () {
	const SKIP_TYPES = new Set([
		"Tab Break",
		"Section Break",
		"Column Break",
		"Heading",
		"HTML",
		"Image",
		"Fold",
		"Table",
		"Button",
	]);

	function _cint(v) {
		const n = parseInt(v, 10);
		return Number.isNaN(n) ? 0 : n;
	}

	function _parseInfo(row) {
		if (!row || !row.info) {
			return {};
		}
		try {
			const o = JSON.parse(row.info);
			return typeof o === "object" && o !== null ? o : {};
		} catch (e) {
			return {};
		}
	}

	function _parsePortalRaw(raw) {
		if (!raw || !String(raw).trim()) {
			return [];
		}
		try {
			const data = JSON.parse(raw);
			return Array.isArray(data) ? data.filter((x) => x && typeof x === "object") : [];
		} catch (e) {
			return [];
		}
	}

	function _fieldEligible(f) {
		const fn = ((f && f.fieldname) || "").trim();
		if (!fn) {
			return false;
		}
		if (_cint(f.hidden)) {
			return false;
		}
		const ft = ((f && f.fieldtype) || "").trim();
		return !SKIP_TYPES.has(ft);
	}

	/** Mirror api/form_dialog/portal_fields._build_portal_editor_rows */
	function _buildEditorRows(metaFields, portalEntries) {
		const eligible = (metaFields || []).filter(_fieldEligible);
		const byFn = {};
		eligible.forEach(function (f) {
			byFn[String(f.fieldname).trim()] = f;
		});

		const out = [];
		const seen = new Set();

		(portalEntries || []).forEach(function (entry) {
			const fn = String(entry.fieldname || "").trim();
			if (!fn || !byFn[fn] || seen.has(fn)) {
				return;
			}
			seen.add(fn);
			const f = byFn[fn];
			const showB = _cint(entry.show) ? 1 : 0;
			const rowOut = {
				fieldname: fn,
				label: (String(f.label || "").trim() || fn),
				fieldtype: String(f.fieldtype || ""),
				show: showB,
				editable: _cint(entry.editable) ? 1 : 0,
			};
			let sr = _cint(entry.sort_rank);
			if (!showB) {
				sr = 0;
			}
			let sd = String(entry.sort_dir || "").trim().toLowerCase();
			if (sd !== "asc" && sd !== "desc") {
				sd = "asc";
			}
			if (sr > 0 && showB) {
				rowOut.sort_rank = sr;
				rowOut.sort_dir = sd;
			}
			out.push(rowOut);
		});

		eligible.forEach(function (f) {
			const fn = String(f.fieldname).trim();
			if (seen.has(fn)) {
				return;
			}
			seen.add(fn);
			out.push({
				fieldname: fn,
				label: (String(f.label || "").trim() || fn),
				fieldtype: String(f.fieldtype || ""),
				show: 0,
				editable: 0,
			});
		});
		return out;
	}

	function _injectCssOnce() {
		if (document.getElementById("fd-portal-matrix-css")) {
			return;
		}
		const css = `
			.fd-portal-shell { margin-top: 12px; padding: 12px 0 16px; border-top: 1px solid var(--border-color, #d1d8dd); }
			.fd-portal-shell .fd-portal-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-color, #36414c); }
			.fd-portal-shell .fd-portal-outer-bar,
			.fd-portal-shell .fd-portal-inner-bar { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; padding: 0 0 8px; }
			.fd-portal-shell .fd-portal-inner-bar { padding-top: 4px; border-bottom: 1px solid var(--border-color, #eef1f5); margin-bottom: 8px; }
			.fd-portal-shell table.fd-portal-matrix { width: 100%; border-collapse: collapse; font-size: 12px; }
			.fd-portal-shell .matrix-drag-over { outline: 2px solid #2490ef; outline-offset: -2px; }
			.fd-portal-shell tr[draggable="true"]:active .fd-portal-drag-handle { cursor: grabbing; }
			.fd-portal-shell .fd-sort-up.btn-primary,
			.fd-portal-shell .fd-sort-down.btn-primary { color: #fff; }
		`;
		$("<style>").attr("id", "fd-portal-matrix-css").text(css).appendTo("head");
	}

	function _portalRowsWithKind(frm) {
		const out = [];
		(frm.doc.related_doctypes || []).forEach(function (r) {
			if (r.name && String(r.name).trim()) {
				out.push({ kind: "related", row: r });
			}
		});
		(frm.doc.inline_child_tables || []).forEach(function (r) {
			if (r.name && String(r.name).trim()) {
				out.push({ kind: "inline", row: r });
			}
		});
		return out;
	}

	function _getPortalRowBundle(frm, rowName) {
		const bundles = _portalRowsWithKind(frm);
		for (let i = 0; i < bundles.length; i++) {
			if (bundles[i].row.name === rowName) {
				return bundles[i];
			}
		}
		return null;
	}

	function _payloadFromTbody($tbody) {
		const payload = [];
		$tbody.find("tr").each(function () {
			const fn = $(this).attr("data-fieldname");
			if (!fn) {
				return;
			}
			const show = $(this).find(".fd-portal-show").prop("checked") ? 1 : 0;
			const sr = parseInt($(this).attr("data-sort-rank") || "0", 10) || 0;
			const sd = $(this).attr("data-sort-dir") === "desc" ? "desc" : "asc";
			const o = {
				fieldname: fn,
				show: show,
				editable: $(this).find(".fd-portal-editable").prop("checked") ? 1 : 0,
			};
			if (show && sr > 0) {
				o.sort_rank = sr;
				o.sort_dir = sd;
			}
			payload.push(o);
		});
		return payload;
	}

	function _applySortUi($tr) {
		const show = $tr.find(".fd-portal-show").prop("checked");
		let sr = parseInt($tr.attr("data-sort-rank") || "0", 10) || 0;
		let sd = $tr.attr("data-sort-dir") === "desc" ? "desc" : "asc";
		if (!show) {
			sr = 0;
			sd = "asc";
			$tr.attr("data-sort-rank", "0");
			$tr.attr("data-sort-dir", "asc");
		}
		const $rk = $tr.find(".fd-portal-sort-rank");
		const $up = $tr.find(".fd-sort-up");
		const $dn = $tr.find(".fd-sort-down");
		if (!show || sr <= 0) {
			$rk.text("—");
			$up.removeClass("btn-primary").prop("disabled", true);
			$dn.removeClass("btn-primary").prop("disabled", true);
			return;
		}
		$rk.text(String(sr));
		$up.prop("disabled", false);
		$dn.prop("disabled", false);
		$up.toggleClass("btn-primary", sd === "asc");
		$dn.toggleClass("btn-primary", sd === "desc");
	}

	function _maxSortRank($tbody) {
		let m = 0;
		$tbody.find("tr").each(function () {
			const r = parseInt($(this).attr("data-sort-rank") || "0", 10) || 0;
			if (r > m) {
				m = r;
			}
		});
		return m;
	}

	function _renumberSortRanks($tbody) {
		const ranked = [];
		$tbody.find("tr").each(function () {
			const $tr = $(this);
			const sr = parseInt($tr.attr("data-sort-rank") || "0", 10) || 0;
			if ($tr.find(".fd-portal-show").prop("checked") && sr > 0) {
				ranked.push({ $tr: $tr, sr: sr });
			}
		});
		ranked.sort(function (a, b) {
			return a.sr - b.sr;
		});
		ranked.forEach(function (item, idx) {
			item.$tr.attr("data-sort-rank", String(idx + 1));
		});
		$tbody.find("tr").each(function () {
			const $tr = $(this);
			if (!$tr.find(".fd-portal-show").prop("checked")) {
				$tr.attr("data-sort-rank", "0");
				$tr.attr("data-sort-dir", "asc");
			}
		});
		$tbody.find("tr").each(function () {
			_applySortUi($(this));
		});
	}

	function _fieldsTbodyForSync(frm) {
		if (!frm._fd_portal || !frm._fd_portal.$innerContent) {
			return null;
		}
		const $live = frm._fd_portal.$innerContent.find(".fd-portal-field-tbody");
		if ($live.length) {
			return $live;
		}
		const cached = frm._fd_portal.lastFieldsTbody;
		return cached && cached.length ? cached : null;
	}

	function _syncRowToDoc(frm, rowName) {
		const bundle = _getPortalRowBundle(frm, rowName);
		const row = bundle && bundle.row;
		if (!row || !frm._fd_portal) {
			return;
		}
		const $tbody = _fieldsTbodyForSync(frm);
		if (!$tbody || !$tbody.length) {
			return;
		}
		const payload = _payloadFromTbody($tbody);
		row.portal_field_config = JSON.stringify(payload);
		frm.dirty();
	}

	function _wireFieldsTabEvents(frm, rowName, $tbody, $innerContent) {
		let dragSrc = null;
		$tbody
			.find("tr")
			.on("dragstart", function (e) {
				dragSrc = this;
				$(this).css("opacity", "0.4");
				e.originalEvent.dataTransfer.effectAllowed = "move";
				e.originalEvent.dataTransfer.setData("text/plain", "");
			})
			.on("dragend", function () {
				$(this).css("opacity", "");
				$tbody.find("tr").removeClass("matrix-drag-over");
			})
			.on("dragover", function (e) {
				e.preventDefault();
				e.originalEvent.dataTransfer.dropEffect = "move";
				$tbody.find("tr").removeClass("matrix-drag-over");
				$(this).addClass("matrix-drag-over");
			})
			.on("drop", function (e) {
				e.preventDefault();
				if (!dragSrc || dragSrc === this) {
					return;
				}
				const $target = $(this);
				const $src = $(dragSrc);
				if ($src.index() < $target.index()) {
					$target.after($src);
				} else {
					$target.before($src);
				}
				$tbody.find("tr").removeClass("matrix-drag-over");
				_syncRowToDoc(frm, rowName);
			});

		$innerContent.off(".fdPortal");
		$innerContent.on("change.fdPortal", ".fd-portal-show", function () {
			const $tr = $(this).closest("tr");
			if (!$(this).prop("checked")) {
				$tr.attr("data-sort-rank", "0");
				$tr.attr("data-sort-dir", "asc");
			}
			_renumberSortRanks($tbody);
			_syncRowToDoc(frm, rowName);
		});
		$innerContent.on("change.fdPortal", ".fd-portal-editable", function () {
			_syncRowToDoc(frm, rowName);
		});
		$innerContent.on("click.fdPortal", ".fd-portal-sort-rank", function (e) {
			e.preventDefault();
			const $tr = $(this).closest("tr");
			if (!$tr.find(".fd-portal-show").prop("checked")) {
				return;
			}
			const cur = parseInt($tr.attr("data-sort-rank") || "0", 10) || 0;
			if (cur > 0) {
				$tr.attr("data-sort-rank", "0");
				$tr.attr("data-sort-dir", "asc");
			} else {
				const mx = _maxSortRank($tbody);
				$tr.attr("data-sort-rank", String(mx + 1));
				$tr.attr("data-sort-dir", "asc");
			}
			_renumberSortRanks($tbody);
			_syncRowToDoc(frm, rowName);
		});
		$innerContent.on("click.fdPortal", ".fd-sort-up", function (e) {
			e.preventDefault();
			e.stopPropagation();
			const $tr = $(this).closest("tr");
			const sr = parseInt($tr.attr("data-sort-rank") || "0", 10) || 0;
			if (sr <= 0 || !$tr.find(".fd-portal-show").prop("checked")) {
				return;
			}
			$tr.attr("data-sort-dir", "asc");
			_applySortUi($tr);
			_syncRowToDoc(frm, rowName);
		});
		$innerContent.on("click.fdPortal", ".fd-sort-down", function (e) {
			e.preventDefault();
			e.stopPropagation();
			const $tr = $(this).closest("tr");
			const sr = parseInt($tr.attr("data-sort-rank") || "0", 10) || 0;
			if (sr <= 0 || !$tr.find(".fd-portal-show").prop("checked")) {
				return;
			}
			$tr.attr("data-sort-dir", "desc");
			_applySortUi($tr);
			_syncRowToDoc(frm, rowName);
		});
		$innerContent.on("click.fdPortal", ".fd-portal-sort-clear", function (e) {
			e.preventDefault();
			$tbody.find("tr").each(function () {
				$(this).attr("data-sort-rank", "0");
				$(this).attr("data-sort-dir", "asc");
			});
			$tbody.find("tr").each(function () {
				_applySortUi($(this));
			});
			_syncRowToDoc(frm, rowName);
		});
		$innerContent.on("click.fdPortal", ".fd-portal-select-all", function (e) {
			e.preventDefault();
			$tbody.find(".fd-portal-show").prop("checked", true);
			_renumberSortRanks($tbody);
			_syncRowToDoc(frm, rowName);
		});
		$innerContent.on("click.fdPortal", ".fd-portal-select-none", function (e) {
			e.preventDefault();
			$tbody.find(".fd-portal-show").prop("checked", false);
			$tbody.find("tr").each(function () {
				$(this).attr("data-sort-rank", "0");
				$(this).attr("data-sort-dir", "asc");
			});
			$tbody.find("tr").each(function () {
				_applySortUi($(this));
			});
			_syncRowToDoc(frm, rowName);
		});
	}

	function _renderOrderTab(frm, rowName, $innerContent, rows) {
		const shown = rows.filter(function (r) {
			return r.show;
		});
		if (!shown.length) {
			$innerContent.html(
				'<p class="text-muted" style="margin:0;font-size:12px;">' +
					__("No columns shown. Turn on Show in the Fields tab first.") +
					"</p>"
			);
			return;
		}

		const $tbodyFields = frm._fd_portal.lastFieldsTbody;
		let orderKeys = [];
		if ($tbodyFields && $tbodyFields.length) {
			$tbodyFields.find("tr").each(function () {
				const fn = $(this).attr("data-fieldname");
				if (!fn) {
					return;
				}
				if ($(this).find(".fd-portal-show").prop("checked")) {
					orderKeys.push(fn);
				}
			});
		} else {
			shown.forEach(function (r) {
				orderKeys.push(r.fieldname);
			});
		}

		const byFn = {};
		rows.forEach(function (r) {
			byFn[r.fieldname] = r;
		});
		orderKeys = orderKeys.filter(function (k) {
			return byFn[k] && byFn[k].show;
		});

		const thLeft =
			'style="text-align:left;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;"';
		const thGrip = 'style="width:24px;padding:4px;border-bottom:2px solid #d1d8dd;"';
		let html =
			'<p class="text-muted" style="margin:0 0 8px;font-size:11px;">' +
			__("Drag to set column order for the panel related grid. Hidden fields stay below.") +
			"</p>";
		html += `<table class="fd-portal-order-matrix table table-bordered" style="margin:0;font-size:12px;"><thead><tr>
			<th ${thGrip}></th><th ${thLeft}>${__("Field")}</th><th ${thLeft}>${__("Label")}</th></tr></thead><tbody>`;

		orderKeys.forEach(function (fn, i) {
			const r = byFn[fn];
			const bg = i % 2 !== 0 ? ' style="background:#f8f9fa;"' : "";
			html +=
				'<tr draggable="true" data-fieldname="' +
				frappe.utils.escape_html(fn) +
				'"' +
				bg +
				'><td style="padding:4px;text-align:center;cursor:grab;">' +
				'<span class="fd-portal-drag-handle" style="color:#b7babe;font-size:14px;">&#x2630;</span></td>' +
				'<td style="padding:4px 8px;color:#8d949a;font-size:11px;">' +
				frappe.utils.escape_html(fn) +
				"</td>" +
				'<td style="padding:4px 8px;color:#4c5a67;">' +
				frappe.utils.escape_html(r.label || fn) +
				"</td></tr>";
		});
		html += "</tbody></table>";
		$innerContent.html(html);

		const $order = $innerContent.find(".fd-portal-order-matrix tbody");
		let dragOrderSrc = null;
		$order
			.find("tr")
			.on("dragstart", function (e) {
				dragOrderSrc = this;
				$(this).css("opacity", "0.4");
				e.originalEvent.dataTransfer.effectAllowed = "move";
				e.originalEvent.dataTransfer.setData("text/plain", "");
			})
			.on("dragend", function () {
				$(this).css("opacity", "");
				$order.find("tr").removeClass("matrix-drag-over");
			})
			.on("dragover", function (e) {
				e.preventDefault();
				e.originalEvent.dataTransfer.dropEffect = "move";
				$order.find("tr").removeClass("matrix-drag-over");
				$(this).addClass("matrix-drag-over");
			})
			.on("drop", function (e) {
				e.preventDefault();
				if (!dragOrderSrc || dragOrderSrc === this) {
					return;
				}
				const $target = $(this);
				const $src = $(dragOrderSrc);
				if ($src.index() < $target.index()) {
					$target.after($src);
				} else {
					$target.before($src);
				}
				$order.find("tr").removeClass("matrix-drag-over");

				const $tbodyFields = frm._fd_portal.lastFieldsTbody;
				if (!$tbodyFields || !$tbodyFields.length) {
					return;
				}
				const newShownOrder = [];
				$order.find("tr").each(function () {
					const fn = $(this).attr("data-fieldname");
					if (fn) {
						newShownOrder.push(fn);
					}
				});
				const hiddenTrs = [];
				$tbodyFields.find("tr").each(function () {
					const fn = $(this).attr("data-fieldname");
					if (!fn || $(this).find(".fd-portal-show").prop("checked")) {
						return;
					}
					hiddenTrs.push(this);
				});
				const shownEls = [];
				newShownOrder.forEach(function (fn) {
					const el = $tbodyFields.find('tr[data-fieldname="' + frappe.utils.escape_html(fn) + '"]')[0];
					if (el) {
						shownEls.push(el);
					}
				});
				$tbodyFields.empty();
				shownEls.forEach(function (tr) {
					$tbodyFields.append(tr);
				});
				hiddenTrs.forEach(function (tr) {
					$tbodyFields.append(tr);
				});
				_syncRowToDoc(frm, rowName);
			});
	}

	function _renderFieldsTab(frm, rowName, $innerContent, info, rows) {
		let warn = "";
		if (info.capture_error) {
			warn =
				'<div class="alert alert-warning" style="margin-bottom:10px;padding:8px;font-size:11px;">' +
				frappe.utils.escape_html(String(info.capture_error).substring(0, 500)) +
				"</div>";
		}
		const metaList = Array.isArray(info.fields) ? info.fields : [];
		if (!metaList.length && !info.capture_error) {
			warn =
				'<div class="alert alert-warning" style="margin-bottom:10px;padding:8px;font-size:11px;">' +
				__(
					"No frozen fields in Tab render JSON. Rebuild or capture this Form Dialog from Page Panel."
				) +
				"</div>";
		}

		let tableHtml =
			warn +
			'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">' +
			'<span style="display:flex;gap:6px;align-items:center;">' +
			'<a href="#" class="fd-portal-select-all" style="font-size:12px;color:#4198F0;">' +
			__("Select All") +
			'</a><span style="color:#d1d8dd;">|</span>' +
			'<a href="#" class="fd-portal-select-none" style="font-size:12px;color:#4198F0;">' +
			__("Select None") +
			"</a></span>" +
			'<div style="display:flex;align-items:center;gap:8px;"><strong>' +
			__("Sort by") +
			'</strong><button type="button" class="btn btn-default btn-xs fd-portal-sort-clear">' +
			__("Clear sort") +
			"</button></div></div>" +
			'<div style="overflow-y:auto;max-height:52vh;border:1px solid #d1d8dd;border-radius:4px;">' +
			'<table class="table table-bordered fd-portal-matrix" style="margin:0;font-size:12px;">' +
			'<thead style="position:sticky;top:0;background:#f7fafc;z-index:1;"><tr>' +
			'<th style="width:36px;"></th><th>' +
			__("Field") +
			'</th><th style="width:70px;">' +
			__("Show") +
			'</th><th style="width:90px;">' +
			__("Editable") +
			'</th><th style="min-width:108px;">' +
			__("Sort") +
			"</th></tr></thead><tbody class=\"fd-portal-field-tbody\">";

		rows.forEach(function (row) {
			const fn = row.fieldname || "";
			const sh = row.show ? " checked" : "";
			const ed = row.editable ? " checked" : "";
			const srRaw = parseInt(row.sort_rank, 10) || 0;
			const sdRaw = row.sort_dir === "desc" ? "desc" : "asc";
			const showOn = !!row.show && Number(row.show) !== 0;
			const effSr = showOn && srRaw > 0 ? srRaw : 0;
			const effSd = effSr > 0 ? sdRaw : "asc";
			const rankLabel = effSr > 0 ? String(effSr) : "—";
			const upPrim = effSr > 0 && effSd === "asc" ? " btn-primary" : "";
			const dnPrim = effSr > 0 && effSd === "desc" ? " btn-primary" : "";
			const btnDis = effSr <= 0 ? " disabled" : "";
			tableHtml +=
				'<tr draggable="true" data-fieldname="' +
				frappe.utils.escape_html(fn) +
				'" data-sort-rank="' +
				effSr +
				'" data-sort-dir="' +
				effSd +
				'">' +
				'<td class="text-muted fd-portal-drag" title="' +
				__("Drag row (column order + Display-style)") +
				'" style="cursor:grab;text-align:center;"><span class="fd-portal-drag-handle" style="color:#b7babe;">&#x2630;</span></td>' +
				"<td>" +
				frappe.utils.escape_html(row.label || fn) +
				' <span class="text-muted">(' +
				frappe.utils.escape_html(row.fieldtype || "") +
				")</span></td>" +
				'<td class="text-center"><input type="checkbox" class="fd-portal-show"' +
				sh +
				" /></td>" +
				'<td class="text-center"><input type="checkbox" class="fd-portal-editable"' +
				ed +
				' /></td><td class="text-center" style="white-space:nowrap;">' +
				'<span class="fd-portal-sort-rank" style="display:inline-block;min-width:18px;font-weight:600;cursor:pointer;margin-right:4px;">' +
				rankLabel +
				'</span><span class="btn-group" role="group">' +
				'<button type="button" class="btn btn-xs btn-default fd-sort-up' +
				upPrim +
				'" title="' +
				__("Ascending") +
				'"' +
				btnDis +
				">↑</button>" +
				'<button type="button" class="btn btn-xs btn-default fd-sort-down' +
				dnPrim +
				'" title="' +
				__("Descending") +
				'"' +
				btnDis +
				">↓</button></span></td></tr>";
		});

		tableHtml += "</tbody></table></div>";
		$innerContent.html(tableHtml);
		const $tbody = $innerContent.find(".fd-portal-field-tbody");
		frm._fd_portal.lastFieldsTbody = $tbody;
		_wireFieldsTabEvents(frm, rowName, $tbody, $innerContent);
	}

	function _showInnerTab(frm, rowName, innerId) {
		if (!frm._fd_portal) {
			return;
		}
		const bundle = _getPortalRowBundle(frm, rowName);
		const row = bundle && bundle.row;
		if (!row) {
			return;
		}
		frm._fd_portal.activeInner = innerId;
		const $innerBar = frm._fd_portal.$innerBar;
		const $innerContent = frm._fd_portal.$innerContent;
		$innerBar.find(".fd-portal-inner-btn").css({ background: "", color: "", fontWeight: "" });
		$innerBar.find('.fd-portal-inner-btn[data-inner="' + innerId + '"]').css({
			background: "#4198F0",
			color: "#fff",
			fontWeight: "600",
		});

		const info = _parseInfo(row);
		const portalEntries = _parsePortalRaw(row.portal_field_config);
		const metaFields = Array.isArray(info.fields) ? info.fields : [];
		const rows = _buildEditorRows(metaFields, portalEntries);

		if (innerId === "fields") {
			_renderFieldsTab(frm, rowName, $innerContent, info, rows);
		} else {
			_renderOrderTab(frm, rowName, $innerContent, rows);
		}
	}

	function _showOuterTab(frm, rowName) {
		if (!frm._fd_portal) {
			return;
		}
		const prev = frm._fd_portal.activeOuter;
		if (prev && prev !== rowName) {
			_syncRowToDoc(frm, prev);
		}

		frm._fd_portal.activeOuter = rowName;
		const $outerBar = frm._fd_portal.$outerBar;
		const $innerShell = frm._fd_portal.$innerShell;
		$outerBar.find(".fd-portal-outer-btn").css({ background: "", color: "", fontWeight: "" });
		$outerBar.find('.fd-portal-outer-btn[data-row-name="' + frappe.utils.escape_html(rowName) + '"]').css({
			background: "#171717",
			color: "#fff",
			fontWeight: "600",
		});

		$innerShell.empty();
		const $innerBar = $(
			'<div class="fd-portal-inner-bar">' +
				'<button type="button" class="btn btn-xs btn-default fd-portal-inner-btn" data-inner="fields">' +
				__("Fields") +
				'</button><button type="button" class="btn btn-xs btn-default fd-portal-inner-btn" data-inner="order">' +
				__("Order") +
				"</button></div>"
		);
		const $innerContent = $('<div class="fd-portal-inner-content"></div>');
		$innerShell.append($innerBar).append($innerContent);
		frm._fd_portal.$innerBar = $innerBar;
		frm._fd_portal.$innerContent = $innerContent;

		$innerBar.on("click", ".fd-portal-inner-btn", function () {
			const id = $(this).attr("data-inner");
			if (frm._fd_portal.activeInner === "fields" && id === "order") {
				_syncRowToDoc(frm, rowName);
			}
			_showInnerTab(frm, rowName, id);
		});

		_showInnerTab(frm, rowName, "fields");
	}

	function _renderPortalShell(frm) {
		_injectCssOnce();
		const fdRel = frm.fields_dict.related_doctypes;
		const fdInl = frm.fields_dict.inline_child_tables;
		const fd = fdRel || fdInl;
		if (!fd || !fd.$wrapper) {
			return;
		}

		let $shell = fd.$wrapper.next(".fd-portal-shell");
		if (!$shell.length) {
			$shell = $('<div class="fd-portal-shell"></div>');
			fd.$wrapper.after($shell);
		}

		const bundles = _portalRowsWithKind(frm);
		let html =
			'<div class="fd-portal-title">' +
			__("Portal columns (related & inline tabs)") +
			"</div>";
		html += '<div class="fd-portal-outer-bar"></div>';
		html += '<div class="fd-portal-inner-shell"></div>';

		$shell.empty().html(html);
		const $outerBar = $shell.find(".fd-portal-outer-bar");
		const $innerShell = $shell.find(".fd-portal-inner-shell");

		frm._fd_portal = {
			$shell: $shell,
			$outerBar: $outerBar,
			$innerShell: $innerShell,
			$innerBar: null,
			$innerContent: null,
			activeOuter: null,
			activeInner: "fields",
		};

		if (!bundles.length) {
			$innerShell.html(
				'<p class="text-muted" style="margin:0;font-size:12px;">' +
					__(
						"Save this Form Dialog after adding Related DocTypes or Inline Child Table rows. Then configure portal columns per tab."
					) +
					"</p>"
			);
			return;
		}

		bundles.forEach(function (b) {
			const r = b.row;
			const label =
				b.kind === "inline"
					? String(r.tab_label || "").trim() ||
					  String(r.parent_fieldname || "").trim() ||
					  String(r.child_doctype || "").trim() ||
					  __("Inline")
					: String(r.tab_label || "").trim() ||
					  String(r.child_doctype || "").trim() ||
					  __("Related");
			$outerBar.append(
				'<button type="button" class="btn btn-xs btn-default fd-portal-outer-btn" data-row-name="' +
					frappe.utils.escape_html(r.name) +
					'" style="padding:2px 12px;border-radius:4px;font-size:11px;">' +
					frappe.utils.escape_html(label) +
					"</button>"
			);
		});

		$outerBar.on("click", ".fd-portal-outer-btn", function () {
			const rn = $(this).attr("data-row-name");
			if (rn) {
				_showOuterTab(frm, rn);
			}
		});

		_showOuterTab(frm, bundles[0].row.name);
	}

	function ensurePortalUi(frm) {
		if (!frm.fields_dict.related_doctypes && !frm.fields_dict.inline_child_tables) {
			return;
		}
		_renderPortalShell(frm);
	}

	frappe.ui.form.on("Form Dialog", {
		refresh(frm) {
			ensurePortalUi(frm);
		},
		validate(frm) {
			if (frm._fd_portal && frm._fd_portal.activeOuter) {
				_syncRowToDoc(frm, frm._fd_portal.activeOuter);
			}
		},
	});
})();
