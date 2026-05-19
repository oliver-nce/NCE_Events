/**
 * Boot a panel-page V2 SPA from SPA Page Definition (server config).
 */
frappe.provide("nce_events.spa_panel_page");

const _VUE_ASSETS = [
	"/assets/nce_events/js/panel_page_v2_dist/panel_page_v2.js",
	"/assets/nce_events/js/panel_page_v2_dist/style.css",
];

nce_events.spa_panel_page.boot = function (wrapper, pageSlug, mountElId) {
	if (wrapper._vue_app) return;

	frappe.call({
		method: "nce_events.api.spa_page.get_spa_page_config",
		args: { page_slug: pageSlug },
		callback: function (r) {
			if (r.exc || !r.message) {
				frappe.msgprint({
					title: __("SPA Page"),
					message: __("Could not load SPA Page Definition for {0}.", [pageSlug]),
					indicator: "red",
				});
				return;
			}

			const cfg = r.message;
			if (!wrapper._page_obj) {
				wrapper._page_obj = frappe.ui.make_app_page({
					parent: wrapper,
					title: "",
					single_column: true,
				});
			} else if (wrapper._page_obj.page && wrapper._page_obj.page.set_title) {
				wrapper._page_obj.page.set_title("");
			}

			const pageEl = wrapper.closest(".page");
			if (pageEl) pageEl.classList.add("spa-panel-page");
			if (!document.getElementById("spa-panel-page-style")) {
				const s = document.createElement("style");
				s.id = "spa-panel-page-style";
				/*
				 * Scoped strictly to .page.spa-panel-page — this class is only set on
				 * SPA pages booted via nce_events.spa_panel_page.boot(). Other desk
				 * pages (User list, Settings, etc.) render their own .page element
				 * without this class and are therefore unaffected.
				 */
				s.textContent = [
					".page.spa-panel-page > .page-head { display: none !important; }",
					".page.spa-panel-page > .page-body,",
					".page.spa-panel-page .page-content,",
					".page.spa-panel-page .layout-main-section-wrapper,",
					".page.spa-panel-page .layout-main-section {",
					"  padding-top: 0 !important;",
					"  margin-top: 0 !important;",
					"}",
				].join("\n");
				document.head.appendChild(s);
			}

			frappe.require(_VUE_ASSETS, function () {
				if (wrapper._vue_app) return;
				const mount_el = document.createElement("div");
				mount_el.id = mountElId;
				mount_el.style.cssText = "height:100%;width:100%;";
				wrapper._page_obj.main.append(mount_el);
				if (window.NCEPanelPageV2 && window.NCEPanelPageV2.mount) {
					wrapper._vue_app = window.NCEPanelPageV2.mount("#" + mountElId, {
						pageSlug: pageSlug,
						mode: cfg.doctype_source_mode || null,
						label: cfg.panel_header_text || "NCE Tables",
						pageTitle: cfg.page_title || cfg.panel_header_text || "",
					});
				}
			});
		},
	});
};
