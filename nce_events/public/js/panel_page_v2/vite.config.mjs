import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [vue()],
	define: {
		"process.env.NODE_ENV": JSON.stringify("production"),
	},
	build: {
		outDir: resolve(__dirname, "../panel_page_v2_dist"),
		emptyOutDir: true,
		lib: {
			entry: resolve(__dirname, "main.js"),
			name: "NCEPanelPageV2",
			fileName: () => "panel_page_v2.js",
			formats: ["iife"],
		},
		rollupOptions: {
			external: [],
		},
	},
});
