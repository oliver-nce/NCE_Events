import { ref } from "vue";
import { frappeCall } from "../utils/frappeCall.js";

/**
 * Active SPA pages for the header nav bar (SPA Page Definition, is_active=1).
 */
export function useSpaPageNav() {
	const pages = ref([]);
	const loading = ref(false);

	async function loadPages() {
		loading.value = true;
		try {
			const list = await frappeCall("nce_events.api.spa_page.list_spa_pages_for_ui");
			pages.value = Array.isArray(list) ? list : [];
		} catch {
			pages.value = [];
		} finally {
			loading.value = false;
		}
	}

	async function switchTo(page) {
		if (!page?.page_slug) return;
		try {
			const cfg = await frappeCall("nce_events.api.spa_page.resolve_spa_switch", {
				target_spa: page.page_slug,
			});
			if (cfg?.route) {
				window.location.assign(cfg.route);
			}
		} catch (e) {
			const title =
				typeof window.__ === "function" ? window.__("Switch Page") : "Switch Page";
			frappe.msgprint({
				title,
				message: String(e?.message || e),
				indicator: "red",
			});
		}
	}

	return { pages, loading, loadPages, switchTo };
}
