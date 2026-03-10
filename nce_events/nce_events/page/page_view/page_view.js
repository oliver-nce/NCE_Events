frappe.pages["page-view"].on_page_show = function (wrapper) {
	if (!wrapper._page_obj) {
		wrapper._page_obj = frappe.ui.make_app_page({
			parent: wrapper,
			title: "NCE Events",
			single_column: true,
		});
	}

	const page = wrapper._page_obj;

	if (wrapper._explorer) {
		wrapper._explorer.destroy();
		wrapper._explorer = null;
	}
	if (wrapper._route_cleanup) {
		wrapper._route_cleanup();
		wrapper._route_cleanup = null;
	}

	frappe.require(
		[
			"/assets/nce_events/js/panel_page/store.js",
			"/assets/nce_events/js/panel_page/ai_tools.js",
			"/assets/nce_events/js/panel_page/sms_dialog.js",
			"/assets/nce_events/js/panel_page/email_dialog.js",
			"/assets/nce_events/js/panel_page/ui.js",
			"/assets/nce_events/css/panel_page.css",
		],
		function () {
			wrapper._explorer = new nce_events.panel_page.Explorer(page);

			// When user navigates away (e.g. clicks logo), close floating panels
			const on_route_change = function () {
				const route = frappe.get_route();
				if (route[0] !== "page-view") {
					if (wrapper._explorer) {
						wrapper._explorer.destroy();
						wrapper._explorer = null;
					}
					if (wrapper._route_cleanup) {
						wrapper._route_cleanup();
						wrapper._route_cleanup = null;
					}
				}
			};
			frappe.router.on("change", on_route_change);
			wrapper._route_cleanup = function () {
				if (frappe.router.off) {
					frappe.router.off("change", on_route_change);
				}
				wrapper._route_cleanup = null;
			};
		}
	);
};
