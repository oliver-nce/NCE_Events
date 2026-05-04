<template>
	<Teleport to="body">
		<div ref="backdropRef" class="card-modal-backdrop" @mousedown.self="onMouseDownSelf" @click.self="onClickSelf">
			<div class="card-modal">
				<CardForm
					:card-def-name="cardDefName"
					:doctype="doctype"
					:record-name="recordName"
					@open-card="(...a) => $emit('open-card', ...a)"
					@close="$emit('close')"
				/>
			</div>
		</div>
	</Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import CardForm from "./CardForm.vue";
import { useBackdropPointerDismiss } from "../composables/useBackdropPointerDismiss.js";

defineProps({
	cardDefName: { type: String, required: true },
	doctype: { type: String, required: true },
	recordName: { type: String, required: true },
});

const emit = defineEmits(["open-card", "close"]);

const backdropRef = ref(null);
const { onMouseDownSelf, onClickSelf } = useBackdropPointerDismiss(backdropRef, () => emit("close"));

function onKeyDown(e) {
	if (e.key === "Escape") emit("close");
}
onMounted(() => document.addEventListener("keydown", onKeyDown));
onUnmounted(() => document.removeEventListener("keydown", onKeyDown));
</script>

<style scoped>
.card-modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: flex-start;
	justify-content: center;
	padding-top: 60px;
	overflow-y: auto;
	z-index: 1000;
}
.card-modal {
	width: 90vw;
	max-width: 1200px;
	max-height: calc(100vh - 120px);
	overflow: hidden;
	border-radius: var(--border-radius);
	box-shadow: var(--shadow);
}
</style>
