/**
 * Boot a panel-page V2 SPA from SPA Page Definition (server config).
 */
frappe.provide("nce_events.spa_panel_page");

const _VUE_ASSETS = [
	"/assets/nce_events/js/panel_page_v2_dist/panel_page_v2.js",
	"/assets/nce_events/js/panel_page_v2_dist/style.css",
];

nce_events.spa_panel_page.renderDeskNav = function (wrapper, currentSlug) {
	frappe.call({
		method: "nce_events.api.spa_page.list_spa_pages_for_ui",
		callback: function (r) {
			const pages = r.message || [];
			if (!pages.length) return;

			const head = wrapper.querySelector(".page-head");
			if (!head) return;

			let nav = head.querySelector(".nce-spa-desk-nav");
			if (!nav) {
				nav = document.createElement("div");
				nav.className = "nce-spa-desk-nav";
				const titleEl =
					head.querySelector(".page-title") ||
					head.querySelector("h3") ||
					head.querySelector(".title-text");
				if (titleEl && titleEl.parentNode) {
					titleEl.insertAdjacentElement("afterend", nav);
				} else {
					head.appendChild(nav);
				}
			}

			nav.innerHTML = "";
			pages.forEach(function (p) {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "btn btn-default btn-sm nce-spa-desk-nav-btn";
				btn.textContent = p.page_title;
				if (p.page_slug === currentSlug) {
					btn.disabled = true;
					btn.classList.add("disabled");
				} else {
					btn.addEventListener("click", function () {
						frappe.call({
							method: "nce_events.api.spa_page.resolve_spa_switch",
							args: { target_spa: p.page_slug },
							callback: function (res) {
								if (!res.exc && res.message && res.message.route) {
									window.location.assign(res.message.route);
								}
							},
						});
					});
				}
				nav.appendChild(btn);
			});
		},
	});
};

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
					title: cfg.page_title,
					single_column: true,
				});
			} else if (wrapper._page_obj.page && wrapper._page_obj.page.set_title) {
				wrapper._page_obj.page.set_title(cfg.page_title);
			}

			nce_events.spa_panel_page.renderDeskNav(wrapper, pageSlug);

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
					});
				}
			});
		},
	});
};
