// Vue entry mounting NCEPanelPageV2 App with panelMode, pageSlug, and pageTitle injects.
//
// code-index:begin
// {
//  "purpose": "Vue entry mounting NCEPanelPageV2 App with panelMode, pageSlug, and pageTitle injects.",
//  "read_when": "When changing panel page v2 bootstrap mount options or global NCEPanelPageV2 export.",
//  "gotchas": [],
//  "keywords": ["NCEPanelPageV2", "createApp", "App.vue", "panelMode", "pageSlug", "pageTitle", "mount"],
//  "format": 1
// }
// code-index:end

import { createApp } from "vue";
import App from "./App.vue";

window.NCEPanelPageV2 = {
	mount(selector, opts = {}) {
		const app = createApp(App);
		app.provide("panelMode", opts.mode || null);
		app.provide("panelLabel", opts.label || "NCE Tables");
		app.provide("pageSlug", opts.pageSlug || null);
		app.provide("pageTitle", opts.pageTitle || opts.label || "");
		return app.mount(selector);
	},
};
