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

const CLASSIC_HEADER_BG = "#126BC4";
const CLASSIC_HEADER_TEXT = "#ffffff";

async function applyTheme() {
	try {
		const [settingsDoc, displayDoc] = await Promise.all([
			new Promise((resolve) => {
				frappe.call({
					method: "frappe.client.get",
					args: { doctype: "Settings", name: "Settings" },
					callback: (r) => resolve(r.message || {}),
					error: () => resolve({}),
				});
			}),
			new Promise((resolve) => {
				frappe.call({
					method: "frappe.client.get",
					args: { doctype: "Display Settings", name: "Display Settings" },
					callback: (r) => resolve(r.message || {}),
					error: () => resolve({}),
				});
			}),
		]);

		// If theme_json has full implementation, use it and we're done
		const themeJson = (displayDoc && displayDoc.theme_json) || (settingsDoc && settingsDoc.theme_json);
		if (themeJson && themeJson.trim()) {
			try {
				const vars = JSON.parse(themeJson);
				for (const [key, value] of Object.entries(vars)) {
					if (key.startsWith("--") && value != null && value !== "") {
						document.documentElement.style.setProperty(key, String(value));
					}
				}
				return;
			} catch {
				// Invalid JSON, fall through to old way
			}
		}

		// Fallback: old way — direct font/color fields + classic blue header
		const doc = settingsDoc && (settingsDoc.text_color || settingsDoc.muted_text_color || settingsDoc.font_family)
			? settingsDoc
			: displayDoc || settingsDoc;
		if (!doc) return;

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
		document.documentElement.style.setProperty("--bg-header", CLASSIC_HEADER_BG);
		document.documentElement.style.setProperty("--text-header", CLASSIC_HEADER_TEXT);
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
