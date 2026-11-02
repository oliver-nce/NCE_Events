<!--
Modal dialog showing ppv2-sync-err status, summary, and detail for sync failures.

code-index:begin
{
 "purpose": "Modal dialog showing ppv2-sync-err status, summary, and detail for sync failures.",
 "read_when": "Changing sync error dialog layout or status/summary/detail display.",
 "gotchas": [],
 "keywords": ["ppv2-sync-err", "Sync error", "modelValue", "status", "summary"],
 "format": 1
}
code-index:end
-->

<template>
	<Teleport to="body">
		<div
			v-if="modelValue"
			class="ppv2-sync-err-backdrop"
			role="presentation"
			@mousedown.self="$emit('update:modelValue', false)"
		>
			<div
				class="ppv2-sync-err-dialog"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="titleId"
				@click.stop
			>
				<div class="ppv2-sync-err-header">
					<h2 :id="titleId" class="ppv2-sync-err-title">{{ titleText }}</h2>
					<button
						type="button"
						class="ppv2-sync-err-close"
						:aria-label="closeLabel"
						@click="$emit('update:modelValue', false)"
					>
						×
					</button>
				</div>
				<div class="ppv2-sync-err-body">
					<p v-if="status" class="ppv2-sync-err-status">
						<strong>{{ statusLabel }}:</strong> {{ status }}
					</p>
					<pre v-if="summary" class="ppv2-sync-err-pre">{{ summary }}</pre>
					<pre
						v-if="detail && detail !== summary"
						class="ppv2-sync-err-pre"
					>{{ detail }}</pre>
					<p v-if="!summary && !detail" class="ppv2-sync-err-empty">{{ emptyText }}</p>
				</div>
				<div class="ppv2-sync-err-footer">
					<button
						type="button"
						class="ppv2-sync-err-ok"
						@click="$emit('update:modelValue', false)"
					>
						{{ closeLabel }}
					</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
	modelValue: { type: Boolean, default: false },
	title: { type: String, default: "" },
	status: { type: String, default: "" },
	summary: { type: String, default: "" },
	detail: { type: String, default: "" },
});

defineEmits(["update:modelValue"]);

function tr(msg) {
	return typeof window.__ === "function" ? window.__(msg) : msg;
}

const titleId = "ppv2-sync-err-title";
const titleText = computed(() => props.title || tr("Sync error"));
const closeLabel = computed(() => tr("Close"));
const statusLabel = computed(() => tr("Status"));
const emptyText = computed(() => tr("No error detail stored for this table."));
</script>

<style scoped>
.ppv2-sync-err-backdrop {
	position: fixed;
	inset: 0;
	z-index: 1200;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	padding-top: 2rem;
	background-color: color-mix(in srgb, var(--text-color, #36414c) 40%, transparent);
	box-sizing: border-box;
}
.ppv2-sync-err-dialog {
	width: min(36rem, calc(100vw - 2rem));
	max-height: calc(100vh - 4rem);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background: var(--fg-color, #fff);
	border: 1px solid var(--border-color, #d1d8dd);
	border-radius: var(--border-radius, 6px);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
	color: var(--text-color, #36414c);
	font-family: var(--font-family, inherit);
	font-size: var(--font-size-base, 14px);
}
.ppv2-sync-err-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.75rem 1rem;
	border-bottom: 1px solid var(--border-color, #d1d8dd);
}
.ppv2-sync-err-title {
	margin: 0;
	font-size: calc(var(--font-size-base, 14px) * 1.125);
	font-weight: 600;
}
.ppv2-sync-err-close {
	border: none;
	background: transparent;
	font-size: calc(var(--font-size-base, 14px) * 1.75);
	line-height: 1;
	cursor: pointer;
	padding: 0 0.25rem;
	color: var(--gray-600);
}
.ppv2-sync-err-body {
	padding: 1rem;
	overflow: auto;
	flex: 1;
}
.ppv2-sync-err-empty {
	margin: 0;
	color: var(--gray-600);
}
.ppv2-sync-err-status {
	margin: 0 0 0.75rem;
}
.ppv2-sync-err-pre {
	margin: 0 0 0.75rem;
	white-space: pre-wrap;
	word-break: break-word;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	font-size: calc(var(--font-size-base, 14px) * 0.875);
}
.ppv2-sync-err-footer {
	display: flex;
	justify-content: flex-end;
	padding: 0.75rem 1rem;
	border-top: 1px solid var(--border-color, #d1d8dd);
}
.ppv2-sync-err-ok {
	border: none;
	cursor: pointer;
	padding: 0.4rem 0.9rem;
	font: inherit;
	background: var(--blue-500);
	color: #fff;
	border-radius: var(--border-radius-sm, 4px);
}
</style>
