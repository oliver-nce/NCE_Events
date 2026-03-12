import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
	plugins: [vue()],
	build: {
		outDir: path.resolve(__dirname, "../../../assets/nce_events/js/panel_page_v2"),
		emptyOutDir: true,
		lib: {
			entry: path.resolve(__dirname, "main.js"),
			name: "NCEPanelPageV2",
			fileName: "panel_page_v2",
			formats: ["iife"],
		},
		rollupOptions: {
			external: [],
		},
	},
});
