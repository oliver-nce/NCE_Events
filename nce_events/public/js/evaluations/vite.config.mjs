// Vite build config for bundling the evaluations Vue desk SPA assets.
//
// code-index:begin
// {
//  "purpose": "Vite build config for bundling the evaluations Vue desk SPA assets.",
//  "read_when": "Changing evaluations build output paths or Vue plugin setup.",
//  "gotchas": [],
//  "keywords": ["vite.config", "evaluations", "plugin-vue", "build", "bundle"],
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
		outDir: resolve(__dirname, "../evaluations_dist"),
		emptyOutDir: true,
		lib: {
			entry: resolve(__dirname, "main.js"),
			name: "NCEEvaluations",
			fileName: () => "evaluations.js",
			formats: ["iife"],
		},
		rollupOptions: {
			external: [],
		},
	},
});
