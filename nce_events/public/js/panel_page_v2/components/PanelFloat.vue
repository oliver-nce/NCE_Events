<!--
Draggable resizable floating panel shell hosting header, find bar, and table content.

code-index:begin
{
 "purpose": "Draggable resizable floating panel shell hosting header, find bar, and table content.",
 "read_when": "Changing panel float drag/resize, z-order, or overlay performance during drag.",
 "gotchas": [
  "Grow when parent recomputes table min-width; never shrink (user may have resized wider).",
  "Full-screen overlay prevents expensive hit-testing on table DOM during drag/resize."
 ],
 "keywords": ["PanelFloat", "drag", "resize", "bringToFront", "ppv2-float", "overlay"],
 "format": 1
}
code-index:end
-->

<template>
	<div
		ref="floatEl"
		class="ppv2-float ppv2-chrome-rounded ppv2-chrome-shadow"
		:class="[frameBgClass, ...frameBorderClasses]"
		:style="floatStyle"
	>
		<div class="ppv2-float-header" @mousedown="startDrag">
			<slot
				name="header"
				:title-bg-classes="headerTitleBgClasses"
				:toolbar-bg-classes="headerToolbarBgClasses"
			/>
		</div>

		<div class="ppv2-float-body">
			<slot />
		</div>

		<div
			v-if="$slots.footer"
			class="ppv2-float-footer"
			:class="[footerBgClass, footerFgTextClass, footerFgExplicitClass]"
			@mousedown.prevent="startDrag"
		>
			<span><slot name="footer" /></span>
		</div>

		<div class="ppv2-resize-handle" @mousedown.prevent="startResize" />
	</div>
</template>

<script>
let _globalZ = 100;
function getNextZ() { return ++_globalZ; }
</script>

<script setup>
import { ref, computed, watch } from "vue";
import { PANEL_FLOAT_MAX_W } from "../utils/panelTableColWidths.js";
import {
	panelChromeBg,
	panelChromeExplicitFgClass,
	panelChromeFgTextClass,
	panelChromeFrameBorderClasses,
} from "../utils/panelChromeClasses.js";

const props = defineProps({
	initX: { type: Number, default: 40 },
	initY: { type: Number, default: 60 },
	initW: { type: Number, default: 900 },
	initH: { type: Number, default: 550 },
	/** Minimum Y (px); use negative values to allow dragging above .ppv2-root top. */
	minY: { type: Number, default: 0 },
	/** @deprecated Config chrome fields removed; helpers use fixed defaults. */
	chromeConfig: { type: Object, default: null },
	/** Fixed width; height sizes to content, capped so the float keeps `inset` px from the right/bottom edges. */
	autoSize: { type: Boolean, default: false },
	inset: { type: Number, default: 60 },
});

const frameBgClass = computed(() =>
	panelChromeBg(props.chromeConfig, "frame_bg_class")
);
const frameBorderClasses = computed(() =>
	panelChromeFrameBorderClasses(props.chromeConfig)
);
const headerTitleBgClasses = computed(() => {
	const bg = panelChromeBg(props.chromeConfig, "header_bg_class");
	const fg =
		panelChromeFgTextClass(props.chromeConfig, "header_bg_class") ||
		panelChromeExplicitFgClass(props.chromeConfig, "header_bg_class");
	return [bg, fg].filter(Boolean);
});
const headerToolbarBgClasses = computed(() => {
	const bg = panelChromeBg(props.chromeConfig, "header_toolbar_bg_class");
	const fg = panelChromeFgTextClass(props.chromeConfig, "header_toolbar_bg_class");
	return [bg, fg].filter(Boolean);
});
const footerBgClass = computed(() =>
	panelChromeBg(props.chromeConfig, "footer_bg_class")
);
const footerFgTextClass = computed(() =>
	panelChromeFgTextClass(props.chromeConfig, "footer_bg_class")
);
const footerFgExplicitClass = computed(() =>
	panelChromeExplicitFgClass(props.chromeConfig, "footer_bg_class")
);

const emit = defineEmits(["close", "brought-to-front"]);

const x = ref(props.initX);
const y = ref(props.initY);
const w = ref(props.initW);
const h = ref(props.initH);
const z = ref(getNextZ());
const floatEl = ref(null);

/** Grow when parent recomputes table min-width; never shrink (user may have resized wider). */
watch(
	() => props.initW,
	(nw) => {
		const n = Number(nw);
		if (!Number.isFinite(n) || n <= 0) return;
		const capped = Math.min(PANEL_FLOAT_MAX_W, n);
		if (capped > w.value) {
			w.value = capped;
		}
	}
);

watch(
	() => [props.initX, props.initY],
	([nx, ny]) => {
		const xn = Number(nx);
		const yn = Number(ny);
		if (Number.isFinite(xn)) x.value = xn;
		if (Number.isFinite(yn)) y.value = Math.max(props.minY, yn);
	}
);

/*
 * Position via transform: translate3d() — this is composited on the GPU
 * and does NOT trigger layout or repaint of siblings during drag.
 * Width/height still need layout but only change during resize, not drag.
 */
const userSized = ref(false);
const floatStyle = computed(() => {
	const base = {
		transform: `translate3d(${x.value}px, ${y.value}px, 0)`,
		zIndex: z.value,
	};
	if (props.autoSize && !userSized.value) {
		return {
			...base,
			width: w.value + "px",
			height: "max-content",
			maxWidth: `calc(100% - ${x.value + props.inset}px)`,
			maxHeight: `calc(100% - ${y.value + props.inset}px)`,
		};
	}
	return { ...base, width: w.value + "px", height: h.value + "px" };
});

function bringToFront() {
	z.value = getNextZ();
	emit("brought-to-front");
}

function setPosition(nx, ny) {
	const xn = Number(nx);
	const yn = Number(ny);
	if (Number.isFinite(xn)) x.value = xn;
	if (Number.isFinite(yn)) y.value = Math.max(props.minY, yn);
}

defineExpose({
	setPosition,
	bringToFront,
	getZ: () => z.value,
});

// Full-screen overlay prevents expensive hit-testing on table DOM during drag/resize
function _addOverlay(cursor) {
	const overlay = document.createElement("div");
	overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;cursor:${cursor};`;
	document.body.appendChild(overlay);
	return overlay;
}

function startDrag(e) {
	// Buttons/inputs live in the header slot — do not steal their clicks for drag.
	if (
		e.target.closest(
			"button, input, select, textarea, a, [role='button'], .ppv2-header-controls, .ppv2-header-right"
		)
	) {
		return;
	}
	e.preventDefault();
	const sx = e.clientX, sy = e.clientY;
	const ox = x.value, oy = y.value;
	const el = floatEl.value;
	const overlay = _addOverlay("move");

	function onMove(ev) {
		// Write directly to the DOM — bypasses Vue reactivity entirely
		// so the table never re-renders during drag
		const nx = ox + ev.clientX - sx;
		const ny = Math.max(props.minY, oy + ev.clientY - sy);
		el.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
	}
	function onUp(ev) {
		document.body.removeChild(overlay);
		const dx = Math.abs(ev.clientX - sx);
		const dy = Math.abs(ev.clientY - sy);
		// Click (<10px movement) — bring to front
		if (dx < 10 && dy < 10) {
			bringToFront();
		}
		// Now write back to Vue refs once so it knows the final position
		x.value = ox + ev.clientX - sx;
		y.value = Math.max(props.minY, oy + ev.clientY - sy);
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onUp);
	}
	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onUp);
}

function startResize(e) {
	bringToFront();
	if (props.autoSize && !userSized.value) {
		const r = floatEl.value.getBoundingClientRect();
		h.value = Math.round(r.height);
		userSized.value = true;
	}
	const sx = e.clientX, sy = e.clientY;
	const ow = w.value, oh = h.value;
	const el = floatEl.value;
	const overlay = _addOverlay("nwse-resize");

	// Create outline div that shows target size during resize
	const rect = el.getBoundingClientRect();
	const outline = document.createElement("div");
	outline.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${ow}px;height:${oh}px;border:1px solid var(--blue-500, #4a5568);z-index:999998;pointer-events:none;box-sizing:border-box;`;
	document.body.appendChild(outline);

	function onMove(ev) {
		// Only update the lightweight outline — no Vue reactivity, no table redraw
		outline.style.width = Math.max(300, ow + ev.clientX - sx) + "px";
		outline.style.height = Math.max(200, oh + ev.clientY - sy) + "px";
	}
	function onUp(ev) {
		document.body.removeChild(overlay);
		document.body.removeChild(outline);
		// Snap to final size — single redraw
		w.value = Math.max(300, ow + ev.clientX - sx);
		h.value = Math.max(200, oh + ev.clientY - sy);
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onUp);
	}
	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onUp);
}
</script>

<style scoped>
.ppv2-float {
	/*
	 * position: absolute inside .ppv2-root so Y offsets sit below the Frappe page
	 * title (NCE Events Manager). translate3d() keeps drag on the GPU.
	 */
	position: absolute;
	left: 0;
	top: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;

	/* GPU layer promotion — avoids repaint of siblings during drag */
	will-change: transform;

	/* Scope layout/paint/style to this subtree */
	contain: layout style;
}

.ppv2-float-header {
	flex-shrink: 0;
	padding: 0;
	display: flex;
	align-items: stretch;
	justify-content: space-between;
	cursor: move;
	user-select: none;
}

/* ── Header slot content (rendered by App.vue) ── */

.ppv2-float-header :deep(.ppv2-title) {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-lg);
	flex: 1 1 auto;
	min-width: 0;
	line-height: 1.25;
	padding: 5px 8px;
	padding-right: var(--spacing-sm);
	display: flex;
	align-items: center;
}

/* Hint + icon cluster — stays right; avoids sandwiching hint between long title and buttons */
.ppv2-float-header :deep(.ppv2-header-right) {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	flex-shrink: 0;
	padding: 5px 8px;
}

.ppv2-float-header :deep(.ppv2-click-hint) {
	font-size: calc(var(--font-size-sm) + 1pt);
	font-style: italic;
	white-space: nowrap;
}

.ppv2-float-header :deep(.ppv2-header-controls) {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
}

.ppv2-float-header :deep(.ppv2-hdr-btn) {
	background: none;
	border: none;
	font-size: calc(var(--font-size-base) * 1.35);
	cursor: pointer;
	padding: 0 4px;
	line-height: 1;
	opacity: 0.9;
}
.ppv2-float-header :deep(.ppv2-hdr-btn:hover) { opacity: 1; }

.ppv2-float-header :deep(.ppv2-hdr-btn--new) {
	font-weight: 700;
	font-size: calc(var(--font-size-base) * 1.65);
	opacity: 1;
}
.ppv2-float-header :deep(.ppv2-hdr-btn--new:hover) {
	opacity: 1;
}

.ppv2-float-header :deep(.ppv2-hdr-btn--refreshing) {
	opacity: 1;
}
.ppv2-float-header :deep(.ppv2-hdr-btn--refreshing .fa-refresh) {
	animation: ppv2-spin 0.8s linear infinite;
}
@keyframes ppv2-spin {
	from { transform: rotate(0deg); }
	to   { transform: rotate(360deg); }
}

.ppv2-float-header :deep(.ppv2-count) {
	opacity: 1;
}

.ppv2-float-header :deep(.ppv2-close-btn) {
	font-size: calc(var(--font-size-base) * 1.5);
}

.ppv2-float-body {
	flex: 1;
	min-height: 0;
	overflow: auto;
	/* auto (not thin) lets the WebKit thumb paint. Desk sets thin on every element. */
	scrollbar-width: auto !important;
	scrollbar-color: auto !important;
}
.ppv2-float-body::-webkit-scrollbar {
	/* Desk's :not(#id *) rule beats a class. important keeps the 16px classic bar. */
	-webkit-appearance: none !important;
	width: 16px !important;
	height: 16px !important;
}
.ppv2-float-body::-webkit-scrollbar-thumb {
	background-color: #c4c4c4 !important;
	border: 3px solid #f4f4f4;
	border-radius: 8px;
	min-height: 32px;
	min-width: 32px;
}
.ppv2-float-body::-webkit-scrollbar-thumb:hover {
	background-color: #a3a3a3;
}
.ppv2-float-body::-webkit-scrollbar-track,
.ppv2-float-body::-webkit-scrollbar-corner {
	background: #f4f4f4;
}
.ppv2-float-body::-webkit-scrollbar-button:single-button {
	display: block !important;
	background-color: #f7f7f7;
	background-repeat: no-repeat;
	background-position: center;
	background-size: 16px 16px;
}
.ppv2-float-body::-webkit-scrollbar-button:single-button:vertical:decrement {
	height: 16px !important;
	border-bottom: 1px solid #e4e4e4;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M4 10l4-4 4 4' fill='none' stroke='%23666' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
.ppv2-float-body::-webkit-scrollbar-button:single-button:vertical:increment {
	height: 16px !important;
	border-top: 1px solid #e4e4e4;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' fill='none' stroke='%23666' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
.ppv2-float-body::-webkit-scrollbar-button:single-button:horizontal:decrement {
	width: 16px !important;
	border-right: 1px solid #e4e4e4;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M10 4l-4 4 4 4' fill='none' stroke='%23666' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}
.ppv2-float-body::-webkit-scrollbar-button:single-button:horizontal:increment {
	width: 16px !important;
	border-left: 1px solid #e4e4e4;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M6 4l4 4-4 4' fill='none' stroke='%23666' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}

.ppv2-float-footer {
	flex-shrink: 0;
	padding: 4px 12px;
	cursor: move;
	user-select: none;
	text-align: center;
}

.ppv2-resize-handle {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 16px;
	height: 16px;
	cursor: nwse-resize;
	background: linear-gradient(135deg, transparent 50%, var(--border-color) 50%);
	border-radius: 0 0 var(--border-radius) 0;
}

.ppv2-chrome-surface {
	background: var(--fg-color, #fff);
	color: var(--text-color);
}
.ppv2-chrome-header,
.ppv2-chrome-header-toolbar,
.ppv2-float-header :deep(.ppv2-chrome-header),
.ppv2-float-header :deep(.ppv2-chrome-header-toolbar) {
	background: var(--blue-600);
	color: #fff;
}
.ppv2-chrome-footer {
	background: var(--blue-500);
	color: #fff;
}
.ppv2-chrome-fg-on-primary,
.ppv2-float-header :deep(.ppv2-chrome-fg-on-primary) {
	color: #fff;
}
.ppv2-chrome-border {
	border: 1px solid var(--border-color);
}
.ppv2-chrome-rounded {
	border-radius: var(--border-radius, 6px);
}
.ppv2-chrome-shadow {
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}
</style>
