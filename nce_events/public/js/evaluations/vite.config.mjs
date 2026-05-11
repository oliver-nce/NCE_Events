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
