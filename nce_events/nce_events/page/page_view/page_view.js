// Frappe Page boot script for page-view: mounts the NCEPanelPageV2 multi-panel SPA.
//
// code-index:begin
// {
//  "purpose": "Frappe Page boot script for page-view: mounts the NCEPanelPageV2 multi-panel SPA.",
//  "read_when": "Changing page-view desk route, panel_page_v2_dist assets, or Vue mount target.",
//  "gotchas": [],
//  "keywords": ["page-view", "NCEPanelPageV2", "panel_page_v2_dist", "on_page_show", "page-view-v2-app"],
//  "format": 1
// }
// code-index:end

frappe.pages["page-view"].on_page_show = function (wrapper) {
	if (!wrapper._page_obj) {
		wrapper._page_obj = frappe.ui.make_app_page({
			parent: wrapper,
			title: "NCE Events",
			single_column: true,
		});
	}

	if (wrapper._vue_app) return;

	frappe.require(
		[
			"/assets/nce_events/js/panel_page_v2_dist/panel_page_v2.js",
			"/assets/nce_events/js/panel_page_v2_dist/style.css",
		],
		function () {
			const mount_el = document.createElement("div");
			mount_el.id = "page-view-v2-app";
			mount_el.style.cssText = "height:100%;width:100%;";
			wrapper._page_obj.main.append(mount_el);
			if (window.NCEPanelPageV2 && window.NCEPanelPageV2.mount) {
				wrapper._vue_app = window.NCEPanelPageV2.mount("#page-view-v2-app");
			}
		},
	);
};
