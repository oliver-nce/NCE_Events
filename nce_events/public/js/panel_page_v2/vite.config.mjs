// Vite lib build config producing panel_page_v2.js IIFE bundle into panel_page_v2_dist.
//
// code-index:begin
// {
//  "purpose": "Vite lib build config producing panel_page_v2.js IIFE bundle into panel_page_v2_dist.",
//  "read_when": "When changing panel page v2 build entry, outDir, or NCEPanelPageV2 IIFE output.",
//  "gotchas": [],
//  "keywords": ["vite.config.mjs", "defineConfig", "panel_page_v2_dist", "NCEPanelPageV2", "main.js", "iife", "@vitejs/plugin-vue"],
//  "format": 1
// }
// code-index:end

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
