frappe.pages["event-explorer"].on_page_show = function (wrapper) {
	if (!wrapper._page_obj) {
		wrapper._page_obj = frappe.ui.make_app_page({
			parent: wrapper,
			title: "Event Explorer Beta",
			single_column: true,
		});
	}

	var page = wrapper._page_obj;
	if (wrapper._explorer) return;

	frappe.require(
		[
			"/assets/nce_events/js/panel_page/config.js",
			"/assets/nce_events/js/panel_page/store.js",
			"/assets/nce_events/js/panel_page/ui.js",
			"/assets/nce_events/css/panel_page.css",
		],
		function () {
			wrapper._explorer = new nce_events.panel_page.Explorer(page, "event-explorer");
		}
	);
};
