import { createApp } from "vue";
import App from "./App.vue";

const FONT_MAP = {
	Inter: "'Inter', sans-serif",
	"Source Sans 3": "'Source Sans 3', sans-serif",
	Arial: "Arial, sans-serif",
	Helvetica: "Helvetica, Arial, sans-serif",
	Georgia: "Georgia, serif",
	Verdana: "Verdana, sans-serif",
	Tahoma: "Tahoma, sans-serif",
	"System Default": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

async function applyTheme() {
	try {
		// Prefer Settings (replaces Display Settings per migration); fallback to Display Settings
		let doc = await new Promise((resolve) => {
			frappe.call({
				method: "frappe.client.get",
				args: { doctype: "Settings", name: "Settings" },
				callback: (r) => resolve(r.message || {}),
				error: () => resolve({}),
			});
		});
		if (!doc || (!doc.text_color && !doc.muted_text_color && !doc.font_family)) {
			doc = await new Promise((resolve) => {
				frappe.call({
					method: "frappe.client.get",
					args: { doctype: "Display Settings", name: "Display Settings" },
					callback: (r) => resolve(r.message || {}),
					error: () => resolve({}),
				});
			});
		}
		if (!doc) return;

		// Apply font + colors (same source as V1)
		const font = FONT_MAP[doc.font_family] || FONT_MAP.Inter;
		const weight = parseInt(doc.font_weight) || 400;
		const size = doc.font_size || "13px";
		const textColor = doc.text_color || "#333333";
		const mutedColor = doc.muted_text_color || "#555555";

		document.documentElement.style.setProperty("--font-family", font);
		document.documentElement.style.setProperty("--font-size-base", size);
		document.documentElement.style.setProperty("--font-weight-bold", String(weight > 400 ? weight : 600));
		document.documentElement.style.setProperty("--text-color", textColor);
		document.documentElement.style.setProperty("--text-muted", mutedColor);

		// Also apply theme_json if present (Display Settings has this)
		if (doc.theme_json) {
			const vars = JSON.parse(doc.theme_json);
			for (const [key, value] of Object.entries(vars)) {
				if (key.startsWith("--") && value) {
					document.documentElement.style.setProperty(key, value);
				}
			}
		}
	} catch (e) {
		console.warn("applyTheme failed:", e);
	}
}

const app = createApp(App);

window.NCEPanelPageV2 = {
	async mount(selector) {
		await applyTheme();
		return app.mount(selector);
	},
};
