/**
 * Desk navigation to another panel SPA without full reload.
 * Preserves each Frappe Page wrapper's mounted Vue app (wrapper._vue_app).
 *
 * @param {string} route — e.g. "/app/panel-page-mirrored"
 */
export function navigateToSpaPage(route) {
	const raw = String(route || "").trim();
	if (!raw) {
		return;
	}
	const slug = raw.replace(/^\/app\//, "").split("/")[0].trim();
	if (!slug) {
		window.location.assign(raw);
		return;
	}
	if (typeof frappe !== "undefined" && typeof frappe.set_route === "function") {
		frappe.set_route("page", slug);
		return;
	}
	window.location.assign(raw.startsWith("/") ? raw : `/app/${slug}`);
}
