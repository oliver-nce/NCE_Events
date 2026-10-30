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

// page-view is an alias of the panel-page-mirrored SPA: same definition, title and nav highlight.
frappe.provide("nce_events.spa_panel_page");

frappe.pages["page-view"].on_page_show = function (wrapper) {
	frappe.require(["/assets/nce_events/js/spa_panel_page_boot.js"], function () {
		nce_events.spa_panel_page.boot(wrapper, "panel-page-mirrored", "page-view-v2-app");
	});
};

frappe.pages["page-view"].on_page_hide = function (wrapper) {
	frappe.require(["/assets/nce_events/js/spa_panel_page_boot.js"], function () {
		if (nce_events.spa_panel_page.clearLayoutScope) {
			nce_events.spa_panel_page.clearLayoutScope(wrapper);
		}
	});
};
