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
		emptyOutDir: false,
		lib: {
			entry: resolve(__dirname, "mount_format_rule_editor.js"),
			name: "nceMountFormatRuleEditor",
			fileName: () => "mount_format_rule_editor.js",
			formats: ["iife"],
		},
		rollupOptions: {
			external: [],
			output: {
				assetFileNames: (assetInfo) => {
					if (assetInfo.name && assetInfo.name.endsWith(".css")) {
						return "mount_format_rule_editor.css";
					}
					return assetInfo.name || "asset-[name][extname]";
				},
			},
		},
	},
});
