<template>
	<Teleport to="body">
		<div
			v-if="modelValue"
			class="ppv2-sync-err-backdrop"
			role="presentation"
			@mousedown.self="$emit('update:modelValue', false)"
		>
			<div
				class="ppv2-sync-err-dialog theme-bg-surface theme-border theme-rounded theme-shadow"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="titleId"
				@click.stop
			>
				<div class="ppv2-sync-err-header">
					<h2 :id="titleId" class="ppv2-sync-err-title">{{ titleText }}</h2>
					<button
						type="button"
						class="ppv2-sync-err-close theme-text-muted"
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
					<p v-if="!summary && !detail" class="theme-text-muted">{{ emptyText }}</p>
				</div>
				<div class="ppv2-sync-err-footer">
					<button
						type="button"
						class="ppv2-sync-err-ok theme-bg-primary theme-rounded-sm"
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
	padding-top: calc(var(--nce-spacing-base, 1rem) * 2);
	background-color: color-mix(
		in srgb,
		var(--nce-color-text, var(--nce-color-ink)) 40%,
		transparent
	);
	box-sizing: border-box;
}
.ppv2-sync-err-dialog {
	width: min(36rem, calc(100vw - 2rem));
	max-height: calc(100vh - 4rem);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	color: var(--nce-color-text);
	font-family: var(--nce-font-family, var(--font-family));
	font-size: var(--nce-font-size, var(--font-size-base));
}
.ppv2-sync-err-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--nce-spacing-base, 1rem);
	padding: calc(var(--nce-spacing-base, 1rem) * 0.75) var(--nce-spacing-base, 1rem);
	border-bottom: var(--nce-border-width, 1px) solid var(--nce-color-border);
}
.ppv2-sync-err-title {
	margin: 0;
	font-size: calc(var(--nce-font-size, 1rem) * 1.125);
	font-weight: var(--nce-font-weight-bold, 600);
}
.ppv2-sync-err-close {
	border: none;
	background: transparent;
	font-size: calc(var(--nce-font-size, 1rem) * 1.75);
	line-height: 1;
	cursor: pointer;
	padding: 0 calc(var(--nce-spacing-base, 1rem) * 0.25);
}
.ppv2-sync-err-body {
	padding: var(--nce-spacing-base, 1rem);
	overflow: auto;
	flex: 1;
}
.ppv2-sync-err-status {
	margin: 0 0 calc(var(--nce-spacing-base, 1rem) * 0.75);
}
.ppv2-sync-err-pre {
	margin: 0 0 calc(var(--nce-spacing-base, 1rem) * 0.75);
	white-space: pre-wrap;
	word-break: break-word;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	font-size: calc(var(--nce-font-size, 1rem) * 0.875);
}
.ppv2-sync-err-footer {
	display: flex;
	justify-content: flex-end;
	padding: calc(var(--nce-spacing-base, 1rem) * 0.75) var(--nce-spacing-base, 1rem);
	border-top: var(--nce-border-width, 1px) solid var(--nce-color-border);
}
.ppv2-sync-err-ok {
	border: none;
	cursor: pointer;
	padding: calc(var(--nce-spacing-base, 1rem) * 0.4)
		calc(var(--nce-spacing-base, 1rem) * 0.9);
	font: inherit;
}
</style>
