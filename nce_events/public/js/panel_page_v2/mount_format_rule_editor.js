// Mounts FormatRuleEditor Vue widget for panel format rules with nceMountFormatRuleEditor global.
//
// code-index:begin
// {
//  "purpose": "Mounts FormatRuleEditor Vue widget for panel format rules with nceMountFormatRuleEditor global.",
//  "read_when": "When changing format rule editor mount options or last_validated_sql callback wiring.",
//  "gotchas": [],
//  "keywords": ["mountFormatRuleEditor", "FormatRuleEditor", "nceMountFormatRuleEditor", "rootDoctype", "allowedFields", "last_validated_sql"],
//  "format": 1
// }
// code-index:end

import { createApp, h } from "vue";

import FormatRuleEditor from "./components/FormatRuleEditor.vue";

export function mountFormatRuleEditor(containerEl, options) {
	const rule = options.rule || {};
	const app = createApp({
		setup() {
			return () =>
				h(FormatRuleEditor, {
					rootDoctype: options.rootDoctype,
					fieldName: options.fieldName,
					rule,
					allowedFields: options.allowedFields || [],
					"onUpdate:rule": (r) => {
						Object.assign(rule, r);
						options.onUpdate?.(r);
					},
					onValidated: (sql) => {
						rule.last_validated_sql = sql;
					},
					onApply: (appliedRule) => options.onApply?.(appliedRule),
					onClear: () => options.onClear?.(),
					onCancel: () => options.onCancel?.(),
				});
		},
	});
	app.mount(containerEl);
	return app;
}

if (typeof window !== "undefined") {
	window.nceMountFormatRuleEditor = window.nceMountFormatRuleEditor || {};
	window.nceMountFormatRuleEditor.mountFormatRuleEditor = mountFormatRuleEditor;
}
