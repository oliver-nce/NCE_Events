import { createApp } from "vue";
import App from "./App.vue";

const app = createApp(App);

window.NCEPanelPageV2 = {
	mount(selector) {
		return app.mount(selector);
	},
};
