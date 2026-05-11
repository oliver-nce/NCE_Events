<template>
	<div class="nce-eval-root">
		<header class="nce-eval-header">
			<h1 class="nce-eval-title">Evaluations</h1>
			<div class="nce-eval-actions" aria-label="Actions (reserved)" />
		</header>
		<main class="nce-eval-main" />
	</div>
</template>

<script setup></script>

<style scoped>
.nce-eval-root {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	box-sizing: border-box;
}

.nce-eval-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-shrink: 0;
	min-height: 3rem;
	padding: 0.5rem 1rem;
	border-bottom: 1px solid var(--border-color, #e2e6ea);
	gap: 0.75rem;
}

.nce-eval-title {
	margin: 0;
	font-size: 1.125rem;
	font-weight: 600;
}

.nce-eval-actions {
	min-height: 2.25rem;
	min-width: 4rem;
}

.nce-eval-main {
	flex: 1;
	min-height: 0;
	overflow: hidden;
}
</style>
