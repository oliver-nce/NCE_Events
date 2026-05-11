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
