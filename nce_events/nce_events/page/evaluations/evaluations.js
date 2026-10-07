// Frappe Page boot script for Evaluations: mounts the NCEEvaluations Vue Kanban SPA.
//
// code-index:begin
// {
//  "purpose": "Frappe Page boot script for Evaluations: mounts the NCEEvaluations Vue Kanban SPA.",
//  "read_when": "Changing Evaluations desk page load, asset bundle, or eventId route parsing.",
//  "gotchas": [],
//  "keywords": ["evaluations", "NCEEvaluations", "on_page_show", "evaluations_dist", "eventId", "frappe.pages"],
//  "format": 1
// }
// code-index:end

frappe.pages["evaluations"].on_page_show = function (wrapper) {
	if (!wrapper._page_obj) {
		wrapper._page_obj = frappe.ui.make_app_page({
			parent: wrapper,
			title: "Evaluations",
			single_column: true,
		});
	}

	if (wrapper._vue_app) {
		return;
	}

	frappe.require(
		[
			"/assets/nce_events/js/evaluations_dist/evaluations.js",
			"/assets/nce_events/js/evaluations_dist/style.css",
		],
		function () {
			const mount_el = document.createElement("div");
			mount_el.id = "nce-evaluations-app";
			mount_el.style.cssText = "height:100%;width:100%;";
			wrapper._page_obj.main.append(mount_el);
			if (window.NCEEvaluations && window.NCEEvaluations.mount) {
				const route = frappe.get_route() || [];
				const eventId = route[1] ? String(route[1]) : "";
				wrapper._vue_app = window.NCEEvaluations.mount(
					"#nce-evaluations-app",
					{ eventId },
				);
			}
		}
	);
};
