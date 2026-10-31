// Popup filterable Email Template picker scoped to panel DocType reference_doctype.
//
// code-index:begin
// {
//  "purpose": "Popup filterable Email Template picker limited to templates whose Reference DocType matches the panel DocType.",
//  "read_when": "Changing how send dialogs pick Email Templates or the template DocType filter.",
//  "gotchas": [
//   "Only templates with reference_doctype equal to the panel DocType are listed; untagged templates are hidden."
//  ],
//  "keywords": ["template_picker", "Email Template", "reference_doctype", "picker", "send dialog"],
//  "format": 1
// }
// code-index:end

frappe.provide("nce_events.panel_page");

nce_events.panel_page.template_picker = {
	open(opts) {
		const doctype = opts.doctype;
		const zIndex = (opts.z_index || 110) + 10;
		const on_pick = opts.on_pick;

		$(".send-template-picker-backdrop").remove();

		const esc = frappe.utils.escape_html;
		const title = esc(__("Email Templates for {0}", [doctype]));

		const backdrop = $(`
			<div class="send-template-picker-backdrop">
				<div class="send-template-picker">
					<div class="send-template-picker-header">
						<span class="send-template-picker-title">${title}</span>
						<button type="button" class="send-template-picker-close" title="${esc(__("Close"))}">&times;</button>
					</div>
					<input class="send-field send-template-picker-search" type="text" placeholder="${esc(__("Filter by name or subject..."))}">
					<div class="send-template-picker-list"></div>
					<div class="send-template-picker-empty" style="display:none;"></div>
				</div>
			</div>
		`);
		backdrop.css({ zIndex });
		$(document.body).append(backdrop);

		const list_el = backdrop.find(".send-template-picker-list");
		const empty_el = backdrop.find(".send-template-picker-empty");
		const search_el = backdrop.find(".send-template-picker-search");
		let all_rows = [];
		let active_idx = 0;
		const ns = "send_tpl_picker_" + Math.random().toString(36).slice(2);

		function close() {
			backdrop.remove();
			$(document).off("." + ns);
			search_el.off("." + ns);
		}

		function pick(name) {
			close();
			if (on_pick) on_pick(name);
		}

		function visible_rows() {
			const q = (search_el.val() || "").trim().toLowerCase();
			if (!q) return all_rows;
			return all_rows.filter(function (t) {
				const name = (t.name || "").toLowerCase();
				const subject = (t.subject || "").toLowerCase();
				return name.indexOf(q) !== -1 || subject.indexOf(q) !== -1;
			});
		}

		function render() {
			const rows = visible_rows();
			list_el.empty();
			active_idx = 0;

			if (!all_rows.length) {
				empty_el
					.text(
						__(
							"No templates tagged for {0}. Set Reference DocType on an Email Template to {0} to list it here.",
							[doctype]
						)
					)
					.show();
				list_el.hide();
				return;
			}

			if (!rows.length) {
				empty_el.text(__("No templates match your filter.")).show();
				list_el.hide();
				return;
			}

			empty_el.hide();
			list_el.show();

			rows.forEach(function (t, idx) {
				const name_html = esc(t.name || "");
				const subject = (t.subject || "").trim();
				const subject_html = subject
					? `<div class="send-template-picker-subject">${esc(subject)}</div>`
					: `<div class="send-template-picker-subject"></div>`;
				const item = $(`
					<div class="send-template-picker-item" data-name="${name_html}">
						<div class="send-template-picker-name">${name_html}</div>
						${subject_html}
					</div>
				`);
				item.on("mousedown", function (e) {
					e.preventDefault();
					pick(t.name);
				});
				item.on("mouseenter", function () {
					active_idx = idx;
					sync_active();
				});
				list_el.append(item);
			});
			sync_active();
		}

		function sync_active() {
			const items = list_el.find(".send-template-picker-item");
			items.removeClass("is-active");
			const active = items.eq(active_idx);
			active.addClass("is-active");
			if (active.length && active[0].scrollIntoView) {
				active[0].scrollIntoView({ block: "nearest" });
			}
		}

		backdrop.find(".send-template-picker-close").on("click", function () {
			close();
		});

		backdrop.on("mousedown", function (e) {
			if (e.target === backdrop[0]) {
				close();
			}
		});

		search_el.on("input." + ns, function () {
			render();
		});

		search_el.on("keydown." + ns, function (e) {
			const rows = visible_rows();
			if (!rows.length) return;
			if (e.key === "ArrowDown") {
				e.preventDefault();
				active_idx = Math.min(active_idx + 1, rows.length - 1);
				sync_active();
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				active_idx = Math.max(active_idx - 1, 0);
				sync_active();
			} else if (e.key === "Enter") {
				e.preventDefault();
				const t = rows[active_idx];
				if (t) pick(t.name);
			} else if (e.key === "Escape") {
				e.preventDefault();
				close();
			}
		});

		$(document).on("keydown." + ns, function (e) {
			if (e.key === "Escape" && backdrop.parent().length) {
				close();
			}
		});

		empty_el.text(__("Loading…")).show();
		list_el.hide();

		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Email Template",
				filters: { reference_doctype: doctype },
				fields: ["name", "subject"],
				order_by: "name asc",
				limit_page_length: 0,
			},
			freeze: false,
			callback: function (r) {
				all_rows = r.message || [];
				render();
			},
		});

		search_el.trigger("focus");
	},
};
