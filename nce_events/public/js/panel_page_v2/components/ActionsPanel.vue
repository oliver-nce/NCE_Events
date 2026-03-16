<template>
	<div class="actions-panel">
		<button
			v-for="action in sortedActions"
			:key="action.name || action.label"
			class="action-btn"
			@click="executeAction(action)"
		>
			{{ action.label }}
		</button>
	</div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
	actions: { type: Array, default: () => [] },
	scripts: { type: Array, default: () => [] },
	record: { type: Object, default: null },
});

const emit = defineEmits(["open-card", "refresh"]);

const sortedActions = computed(() =>
	[...(props.actions || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
);

function findScript(actionScriptName) {
	return (props.scripts || []).find((s) => s.script_name === actionScriptName);
}

function resolveTokens(str) {
	if (!str || !props.record) return str;
	return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => props.record[key] || "");
}

async function executeAction(action) {
	const script = findScript(action.action_script);
	if (!script) {
		frappe.msgprint(`Script "${action.action_script}" not found`);
		return;
	}
	switch (script.script_type) {
		case "server":
			await new Promise((resolve, reject) => {
				frappe.call({
					method: script.method,
					args: { name: props.record.name },
					callback: () => {
						frappe.show_alert({ message: `${action.label} completed`, indicator: "green" });
						emit("refresh");
						resolve();
					},
					error: reject,
				});
			});
			break;
		case "open_url":
			window.open(resolveTokens(script.method), "_blank");
			break;
		case "open_card":
			emit("open-card", {
				cardDefName: script.method,
				doctype: props.record.doctype,
				name: props.record.name,
			});
			break;
		case "frappe_action":
			if (script.method === "print") {
				window.open(
					`/printview?doctype=${props.record.doctype}&name=${props.record.name}`,
					"_blank"
				);
			}
			break;
		default:
			console.warn("Unknown script type:", script.script_type);
	}
}
</script>

<style scoped>
.actions-panel {
	width: 140px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
	padding: var(--spacing-sm);
}
.action-btn {
	background: var(--bg-surface);
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius-sm);
	padding: var(--spacing-sm) var(--spacing-md);
	cursor: pointer;
	font-size: var(--font-size-sm);
	text-align: left;
}
.action-btn:hover {
	background: var(--primary-light);
}
</style>
