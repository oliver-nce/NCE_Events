frappe.pages["panel-page-v2"].on_page_show = function (wrapper) {
	frappe.require(["/assets/nce_events/js/spa_panel_page_boot.js"], function () {
		nce_events.spa_panel_page.boot(wrapper, "panel-page-v2", "panel-page-v2-app");
	});
};
