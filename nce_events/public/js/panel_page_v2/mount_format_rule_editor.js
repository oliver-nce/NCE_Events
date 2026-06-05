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
