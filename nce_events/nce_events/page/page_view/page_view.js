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

	frappe.require(
		[
			"/assets/nce_events/js/panel_page/store.js",
			"/assets/nce_events/js/panel_page/sms_dialog.js",
			"/assets/nce_events/js/panel_page/email_dialog.js",
			"/assets/nce_events/js/panel_page/ui.js",
			"/assets/nce_events/css/panel_page.css",
		],
		function () {
			wrapper._explorer = new nce_events.panel_page.Explorer(page);
		}
	);
};
