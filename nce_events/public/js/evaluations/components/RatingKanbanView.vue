<template>
	<div class="rk-root">
		<div v-if="!shell.eventId" class="rk-hint">
			Open <code>/app/evaluations/&lt;event_id&gt;</code> to load players.
		</div>
		<div v-else-if="loading" class="rk-status">Loading…</div>
		<div v-else-if="error" class="rk-error" role="alert">
			{{ error }}
		</div>
		<div v-else class="rk-scroll">
			<div class="rk-grid">
				<div class="rk-corner" />
				<div
					v-for="lane in LANES"
					:key="lane"
					class="rk-lane-head"
				>
					{{ lane }}
				</div>

				<template v-for="row in rows" :key="row.name">
					<div
						class="rk-player"
						:style="{ color: genderColor(row.gender) }"
					>
						<span class="rk-name">{{ displayName(row) }}</span>
						<span v-if="row.position" class="rk-pos">{{
							row.position
						}}</span>
					</div>
					<div
						v-for="lane in LANES"
						:key="`${row.name}-${lane}`"
						class="rk-cell"
						:class="{ 'rk-cell--hit': row.rating === lane }"
					>
						<span
							v-if="row.rating === lane"
							class="rk-tile"
							:title="`Rating ${lane}`"
							>{{ lane }}</span
						>
					</div>
				</template>
			</div>
			<p v-if="rows.length === 0 && shell.eventId" class="rk-empty">
				No enrollments for this event.
			</p>
		</div>
	</div>
</template>

<script setup>
import { useEnrollments } from "../composables/useEnrollments.js";
import { useNceEvalShellStore } from "../stores/shell.js";

/** Navy / dark magenta per Evaluations spec */
const COLOR_MALE = "#1b2a60"; // theme-exempt: gender lane (evaluations spec)
const COLOR_FEMALE = "#7a0e5c"; // theme-exempt: gender lane (evaluations spec)
const COLOR_NEUTRAL = "#36414c"; // theme-exempt: gender lane (evaluations spec)

const LANES = [0, 1, 2, 3, 4, 5, 6, 7];

const shell = useNceEvalShellStore();
const { rows, loading, error } = useEnrollments();

function genderColor(gender) {
	const g = (gender || "").toLowerCase();
	if (g === "male" || g === "m") {
		return COLOR_MALE;
	}
	if (g === "female" || g === "f") {
		return COLOR_FEMALE;
	}
	return COLOR_NEUTRAL;
}

function displayName(row) {
	const first = (row.first_name || "").trim();
	const li = (row.last_initial || "").trim();
	if (first && li) {
		return `${first} ${li}.`;
	}
	return first || "—";
}
</script>

<style scoped>
.rk-root {
	min-height: 120px;
	padding: 0.5rem 0;
}

.rk-hint,
.rk-status,
.rk-error,
.rk-empty {
	padding: 0.75rem 1.25rem;
	font-size: 0.9375rem;
}

.rk-hint {
	color: var(--nce-color-muted, #74808b);
}

.rk-error {
	color: var(--nce-color-danger, #c0392b);
	white-space: pre-wrap;
}

.rk-scroll {
	overflow: auto;
	-webkit-overflow-scrolling: touch;
	padding: 0 0.5rem 1rem;
}

.rk-grid {
	display: grid;
	grid-template-columns:
		minmax(11rem, 1.2fr)
		repeat(8, minmax(2.25rem, 1fr));
	gap: 0.25rem 0.35rem;
	align-items: center;
	min-width: min(100%, 720px);
}

.rk-corner {
	min-height: 1.75rem;
}

.rk-lane-head {
	text-align: center;
	font-size: 0.7rem;
	font-weight: 600;
	color: var(--nce-color-muted, #74808b);
	border-bottom: 1px solid var(--nce-color-border, #e2e6ea);
	padding-bottom: 0.25rem;
}

.rk-player {
	font-size: 0.875rem;
	font-weight: 600;
	line-height: 1.3;
	padding: 0.35rem 0.25rem;
	border-bottom: 1px solid var(--nce-color-border, #eef1f2);
}

.rk-pos {
	display: block;
	font-size: 0.75rem;
	font-weight: 500;
	opacity: 0.95;
}

.rk-cell {
	min-height: 2.5rem;
	border-bottom: 1px solid var(--nce-color-border, #eef1f2);
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--nce-color-surface, #fafbfc);
}

.rk-cell--hit {
	background: rgba(27, 42, 96, 0.06);
}

.rk-tile {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 2.25rem;
	min-height: 2.25rem;
	border-radius: 6px;
	background: var(--nce-color-text, #36414c);
	color: var(--nce-color-surface, #ffffff);
	font-weight: 700;
	font-size: 0.875rem;
}

code {
	font-size: 0.8em;
	padding: 0.1em 0.35em;
	border-radius: 3px;
	background: var(--nce-color-surface, #f4f5f6);
}
</style>
