import { createApp } from "vue";
import App from "./App.vue";

window.NCEPanelPageV2 = {
	mount(selector, opts = {}) {
		const app = createApp(App);
		app.provide("panelMode", opts.mode || null);
		app.provide("panelLabel", opts.label || "NCE Tables");
		return app.mount(selector);
	},
};
