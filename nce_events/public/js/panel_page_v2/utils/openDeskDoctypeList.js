/**
 * Open standard Desk list view for a DocType in a new browser tab.
 * @param {string} doctype
 * @returns {boolean} false if doctype empty
 */
export function openDeskDoctypeListInNewTab(doctype) {
	const dt = String(doctype || "").trim();
	if (!dt) {
		return false;
	}
	let path = "";
	try {
		if (typeof frappe !== "undefined" && frappe.router && typeof frappe.router.make_url === "function") {
			path = frappe.router.make_url(["List", dt, "List"]);
		}
	} catch {
		path = "";
	}
	let url = "";
	if (path) {
		url = /^https?:/i.test(path) ? path : `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
	} else {
		const slug = dt.toLowerCase().replace(/ /g, "-");
		url = `${window.location.origin}/app/${slug}`;
	}
	window.open(url, "_blank", "noopener,noreferrer");
	return true;
}
