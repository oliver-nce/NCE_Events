<template>
	<div class="nce-eval-placeholder">
		<p class="nce-eval-placeholder-line">
			<strong>View:</strong> {{ shell.activeView }} (placeholder)
		</p>
		<p v-if="shell.eventId" class="nce-eval-placeholder-line">
			<strong>Event:</strong> {{ shell.eventId }}
		</p>
		<p v-else class="nce-eval-placeholder-note">
			No event in URL. Open
			<code>/app/evaluations/&lt;event_id&gt;</code>.
		</p>
	</div>
</template>

<script setup>
import { useNceEvalShellStore } from "../stores/shell.js";

const shell = useNceEvalShellStore();
</script>

<style scoped>
.nce-eval-placeholder {
	padding: 1rem 1.25rem;
	font-size: 0.9375rem;
	line-height: 1.5;
	color: var(--text-color, #36414c);
}

.nce-eval-placeholder-line {
	margin: 0 0 0.5rem;
}

.nce-eval-placeholder-note {
	margin: 0;
	color: var(--text-muted, #74808b);
}

code {
	font-size: 0.875em;
	padding: 0.1em 0.35em;
	border-radius: 3px;
	background: var(--control-bg, #f4f5f6);
}
</style>
