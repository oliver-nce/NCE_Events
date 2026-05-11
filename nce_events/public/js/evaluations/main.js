import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);

window.NCEEvaluations = {
	/**
	 * @param {string} selector
	 */
	mount(selector) {
		return app.mount(selector);
	},
};
