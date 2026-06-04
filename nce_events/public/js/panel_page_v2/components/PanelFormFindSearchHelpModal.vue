<template>
	<Teleport to="body">
		<div
			v-if="open"
			class="ppv2-find-help-backdrop"
			@mousedown.self="$emit('close')"
		>
			<div
				class="ppv2-find-help-dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby="ppv2-find-help-title"
				@click.stop
			>
				<div class="ppv2-find-help-header">
					<h2 id="ppv2-find-help-title" class="ppv2-find-help-title">
						<span class="ppv2-find-help-title-icon" aria-hidden="true">🔍</span>
						{{ titleText }}
					</h2>
					<button
						type="button"
						class="ppv2-find-help-close theme-text-muted"
						:aria-label="closeAria"
						@click="$emit('close')"
					>
						×
					</button>
				</div>
				<div class="ppv2-find-help-scroll">
					<table class="ppv2-find-help-table">
						<thead>
							<tr>
								<th>{{ colSymbol }}</th>
								<th>{{ colMeaning }}</th>
								<th>{{ colExample }}</th>
								<th>{{ colMatches }}</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(row, i) in rows" :key="i">
								<td><code>{{ row.symbol }}</code></td>
								<td>{{ row.meaning }}</td>
								<td><code>{{ row.example }}</code></td>
								<td>{{ row.matches }}</td>
							</tr>
						</tbody>
					</table>
					<p class="ppv2-find-help-footnote theme-text-muted">{{ footnote }}</p>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup>
import { computed } from "vue";

defineProps({
	open: { type: Boolean, default: false },
});

defineEmits(["close"]);

function tr(msg) {
	return typeof window.__ === "function" ? window.__(msg) : msg;
}

const titleText = computed(() => tr("Search Help"));
const closeAria = computed(() => tr("Close"));
const colSymbol = computed(() => tr("Symbol"));
const colMeaning = computed(() => tr("Meaning"));
const colExample = computed(() => tr("Example"));
const colMatches = computed(() => tr("Matches"));

const footnote = computed(() =>
	tr(
		"Plain text with no symbols matches fields that contain that substring. Comparisons (>, <, ≥, ≤, ≠, !=) apply only to numeric field types.",
	),
);

/** Matches ``nce_events.api.form_dialog.search._parse_find_term`` behavior. */
const rows = computed(() => [
	{
		symbol: "* …",
		meaning: tr("Wildcard pattern (SQL LIKE). Asterisk maps to SQL %."),
		example: "Jo*",
		matches: tr("John, Jones, Jo"),
	},
	{
		symbol: "% …",
		meaning: tr(
			"Wildcard pattern (SQL LIKE). Percent matches any sequence of characters.",
		),
		example: "Acme%Ltd",
		matches: tr("Acme Holdings Ltd, Acme Ltd"),
	},
	{
		symbol: "~",
		meaning: tr("Contains substring"),
		example: "~smith",
		matches: tr("Blacksmith, smithy"),
	},
	{
		symbol: ">",
		meaning: tr("Greater than (numeric fields only)"),
		example: ">100",
		matches: tr("101, 200"),
	},
	{
		symbol: "<",
		meaning: tr("Less than (numeric fields only)"),
		example: "<50",
		matches: tr("49, 10"),
	},
	{
		symbol: ">=",
		meaning: tr("Greater than or equal (numeric fields only)"),
		example: ">=2024",
		matches: tr("2024, 2025"),
	},
	{
		symbol: "<=",
		meaning: tr("Less than or equal (numeric fields only)"),
		example: "<=10",
		matches: tr("10, 5, 0"),
	},
	{
		symbol: "≠ / !=",
		meaning: tr("Not equal (numeric fields only)"),
		example: "≠10",
		matches: tr("Any numeric value except 10"),
	},
	{
		symbol: "=",
		meaning: tr("Empty or null (exact token, alone)"),
		example: "=",
		matches: tr("Blank fields"),
	},
	{
		symbol: "*",
		meaning: tr("Non-empty (exact token, alone)"),
		example: "*",
		matches: tr("Any non-blank value"),
	},
	{
		symbol: "= …",
		meaning: tr("Exact character match"),
		example: "=Active",
		matches: tr("Active only"),
	},
]);
</script>

<style scoped>
.ppv2-find-help-backdrop {
	position: fixed;
	inset: 0;
	z-index: 1200;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px;
	background: rgba(15, 23, 42, 0.45);
	box-sizing: border-box;
}

.ppv2-find-help-dialog {
	width: min(720px, 100%);
	max-height: min(90vh, 640px);
	display: flex;
	flex-direction: column;
	background: var(--bg-card, #fff);
	color: var(--text-color, #333);
	border-radius: var(--border-radius, 8px);
	box-shadow: var(--shadow, 0 12px 40px rgba(0, 0, 0, 0.2));
	border: 1px solid var(--border-color, #cfd8dc);
	font-family: var(--font-family, system-ui, sans-serif);
	font-size: var(--font-size-base, 13px);
}

.ppv2-find-help-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px 14px;
	border-bottom: 1px solid var(--border-color, #e2e8f0);
	background: var(--bg-surface, #f8fafc);
	border-radius: var(--border-radius, 8px) var(--border-radius, 8px) 0 0;
}

.ppv2-find-help-title {
	margin: 0;
	font-size: var(--font-size-lg, 16px);
	font-weight: var(--font-weight-bold, 600);
	display: flex;
	align-items: center;
	gap: 8px;
}

.ppv2-find-help-title-icon {
	font-size: 1.1em;
	line-height: 1;
}

.ppv2-find-help-close {
	border: none;
	background: transparent;
	font-size: 24px;
	line-height: 1;
	cursor: pointer;
	padding: 4px 8px;
	border-radius: var(--border-radius-sm, 4px);
}
.ppv2-find-help-close:hover {
	background: var(--row-hover-bg, #e8f0fe);
	color: var(--text-color, #333);
}

.ppv2-find-help-scroll {
	overflow: auto;
	padding: 14px 16px 16px;
}

.ppv2-find-help-table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size-base, 13px);
}

.ppv2-find-help-table th {
	text-align: left;
	padding: 8px 10px;
	background: var(--control-bg, #f1f5f9);
	border-bottom: 2px solid var(--border-color, #e2e8f0);
	font-weight: var(--font-weight-bold, 600);
	white-space: nowrap;
}

.ppv2-find-help-table td {
	padding: 8px 10px;
	border-bottom: 1px solid var(--border-color, #e8eef4);
	vertical-align: top;
}

.ppv2-find-help-table tbody tr:last-child td {
	border-bottom: none;
}

.ppv2-find-help-table code {
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	font-size: 0.95em;
	background: var(--control-bg, #f1f5f9);
	padding: 2px 6px;
	border-radius: 4px;
	border: 1px solid var(--border-color, #e2e8f0);
}

.ppv2-find-help-footnote {
	margin: 14px 0 0;
	font-size: var(--font-size-sm, 11px);
	line-height: 1.45;
}
</style>
