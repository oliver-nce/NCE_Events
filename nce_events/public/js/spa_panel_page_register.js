/**
 * Register a Frappe Page route to boot the panel SPA from SPA Page Definition.
 */
frappe.provide("nce_events.spa_panel_page");

nce_events.spa_panel_page.register = function (pageSlug) {
	const mountElId = pageSlug + "-app";

	// Must run synchronously when the Page script loads — before on_page_show fires.
	frappe.pages[pageSlug] = frappe.pages[pageSlug] || {};
	frappe.pages[pageSlug].on_page_show = function (wrapper) {
		frappe.require(["/assets/nce_events/js/spa_panel_page_boot.js"], function () {
			nce_events.spa_panel_page.boot(wrapper, pageSlug, mountElId);
		});
	};
	frappe.pages[pageSlug].on_page_hide = function (wrapper) {
		frappe.require(["/assets/nce_events/js/spa_panel_page_boot.js"], function () {
			if (nce_events.spa_panel_page.clearLayoutScope) {
				nce_events.spa_panel_page.clearLayoutScope(wrapper);
			}
		});
	};
};
