// Vite entry mounting the Evaluations Vue app with Pinia on a desk page element.
//
// code-index:begin
// {
//  "purpose": "Vite entry mounting the Evaluations Vue app with Pinia on a desk page element.",
//  "read_when": "Changing evaluations SPA bootstrap, mount target, or Pinia setup.",
//  "gotchas": [],
//  "keywords": ["evaluations", "main.js", "createApp", "Pinia", "mount"],
//  "format": 1
// }
// code-index:end

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { useNceEvalShellStore } from "./stores/shell.js";

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);

window.NCEEvaluations = {
	/**
	 * @param {string} selector
	 * @param {{ eventId?: string, activeView?: string }} [opts]
	 */
	mount(selector, opts = {}) {
		const shell = useNceEvalShellStore(pinia);
		shell.setEventId(opts.eventId);
		if (opts.activeView) {
			shell.setView(opts.activeView);
		}
		return app.mount(selector);
	},
};
