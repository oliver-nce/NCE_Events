frappe.pages["page-view"].on_page_show = function (wrapper) {
	var route = frappe.get_route();
	var page_name = route[1] || null;

	if (!wrapper._page_obj) {
		wrapper._page_obj = frappe.ui.make_app_page({
			parent: wrapper,
			title: "Page View",
			single_column: true,
		});
	}

	var page = wrapper._page_obj;

	if (page_name) {
		if (wrapper._current_page === page_name && wrapper._explorer) return;

		wrapper._current_page = page_name;
		if (wrapper._explorer) {
			wrapper._explorer.destroy();
			wrapper._explorer = null;
		}

		frappe.require(
			[
				"/assets/nce_events/js/panel_page/store.js",
				"/assets/nce_events/js/panel_page/ui.js",
				"/assets/nce_events/css/panel_page.css",
			],
			function () {
				wrapper._explorer = new nce_events.panel_page.ExplorerV2(page, page_name);
			}
		);
	} else {
		wrapper._current_page = null;
		if (wrapper._explorer) {
			wrapper._explorer.destroy();
			wrapper._explorer = null;
		}
		page.set_title("NCE Events");
		_show_landing(page);
	}
};

function _show_landing(page) {
	$(page.body).empty();
	var container = $('<div class="panel-landing"></div>').appendTo(page.body);
	container.html('<div class="panel-landing-loading">Loading\u2026</div>');

	frappe.call({
		method: "nce_events.api.panel_api.get_active_v2_pages",
		callback: function (r) {
			container.empty();
			var pages = r.message || [];

			if (!pages.length) {
				container.html(
					'<div class="panel-landing-empty">' +
						"<p>No active pages configured.</p>" +
						'<p>Create a <a href="/app/page-definition">Page Definition</a> to get started.</p>' +
					"</div>"
				);
				return;
			}

			var grid = $('<div class="panel-landing-grid"></div>').appendTo(container);
			pages.forEach(function (pg) {
				var card = $(
					'<a class="panel-landing-card" href="/app/page-view/' +
						encodeURIComponent(pg.page_name) + '">' +
						'<div class="panel-card-title">' +
							frappe.utils.escape_html(pg.page_title) +
						"</div>" +
						'<div class="panel-card-name">' +
							frappe.utils.escape_html(pg.page_name) +
						"</div>" +
					"</a>"
				);
				grid.append(card);
			});
		},
	});
}
