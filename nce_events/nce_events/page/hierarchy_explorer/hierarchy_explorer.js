frappe.pages["hierarchy-explorer"].on_page_show = function (wrapper) {
	if (wrapper._explorer) return;

	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Event Explorer",
		single_column: true,
	});

	frappe.require(
		[
			"/assets/nce_events/js/hierarchy_explorer/config.js",
			"/assets/nce_events/js/hierarchy_explorer/store.js",
			"/assets/nce_events/js/hierarchy_explorer/ui.js",
			"/assets/nce_events/css/hierarchy_explorer.css",
		],
		function () {
			wrapper._explorer = new nce_events.hierarchy.Explorer(page);
		}
	);
};
