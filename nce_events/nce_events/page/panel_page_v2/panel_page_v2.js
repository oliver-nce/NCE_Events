frappe.pages["panel-page-v2"].on_page_show = function (wrapper) {
	if (!wrapper._page_obj) {
		wrapper._page_obj = frappe.ui.make_app_page({
			parent: wrapper,
			title: "NCE Events V2",
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
			mount_el.id = "panel-page-v2-app";
			mount_el.style.cssText = "height:100%;width:100%;";
			wrapper._page_obj.main.append(mount_el);
			if (window.NCEPanelPageV2 && window.NCEPanelPageV2.mount) {
				wrapper._vue_app = window.NCEPanelPageV2.mount("#panel-page-v2-app");
			}
		}
	);
};
