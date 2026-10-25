<!--
Modal map of enrolled people by family address for an Event record.

code-index:begin
{
 "purpose": "Modal map of enrolled people by family address for an Event record.",
 "read_when": "Changing event people map dialog, Google Maps load, or pin info windows.",
 "gotchas": [
  "Google Maps script is loaded once per page via data-nce-google-maps marker.",
  "api_key is used only in the script URL, never shown in dialog text."
 ],
 "keywords": ["PeopleMapDialog", "event map", "Google Maps", "get_event_people_map", "pins"],
 "format": 1
}
code-index:end
-->

<template>
	<div
		v-if="open"
		class="ppv2-people-map-backdrop"
		@click.self="emit('close')"
	>
		<div
			ref="panelRef"
			class="ppv2-people-map-panel"
			:style="panelStyle"
			@click.stop
		>
			<div class="ppv2-people-map-header" @mousedown="startDrag">
				<span class="ppv2-people-map-title">Map</span>
			</div>
			<div class="ppv2-people-map-body">
				<p v-if="loading" class="ppv2-people-map-message">Loading map…</p>
				<p v-else-if="error" class="ppv2-people-map-message ppv2-people-map-error">{{ error }}</p>
				<template v-else-if="emptyState">
					<p class="ppv2-people-map-message">No family addresses to show.</p>
					<p v-if="skippedNoAddress > 0" class="ppv2-people-map-message">
						{{ skippedNoAddress }} people have no family address.
					</p>
					<p v-if="geocodeFailed > 0" class="ppv2-people-map-message">
						{{ geocodeFailed }} addresses could not be located.
					</p>
				</template>
				<div
					v-show="showMapDiv"
					ref="mapElRef"
					class="ppv2-people-map-canvas"
				/>
				<p
					v-if="showMapDiv && (skippedNoAddress > 0 || geocodeFailed > 0)"
					class="ppv2-people-map-footnote"
				>
					<span v-if="skippedNoAddress > 0">{{ skippedNoAddress }} people have no family address.</span>
					<span v-if="skippedNoAddress > 0 && geocodeFailed > 0"> </span>
					<span v-if="geocodeFailed > 0">{{ geocodeFailed }} addresses could not be located.</span>
				</p>
			</div>
			<div class="ppv2-people-map-footer">
				<button
					type="button"
					class="ppv2-fd-tab-btn theme-bg-primary-100 theme-border"
					@click="emit('close')"
				>
					Close
				</button>
			</div>
			<div class="ppv2-people-map-resize" @mousedown.prevent="startResize" />
		</div>
	</div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from "vue";
import { frappeCall } from "../utils/frappeCall.js";
import { extractServerMessage } from "../composables/frozenFormSave.js";

const props = defineProps({
	open: { type: Boolean, default: false },
	eventId: { type: String, default: "" },
});

const emit = defineEmits(["close"]);

const loading = ref(false);
const error = ref("");
const emptyState = ref(false);
const skippedNoAddress = ref(0);
const geocodeFailed = ref(0);
const showMapDiv = ref(false);
const mapElRef = ref(null);
const panelRef = ref(null);
const dx = ref(0);
const dy = ref(0);
const dlgW = ref(null);
const dlgH = ref(null);

const panelStyle = computed(() => {
	const s = { transform: `translate3d(${dx.value}px, ${dy.value}px, 0)` };
	if (dlgW.value != null) s.width = `${dlgW.value}px`;
	if (dlgH.value != null) s.height = `${dlgH.value}px`;
	return s;
});

const PIN_PATH = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z";

let loadSeq = 0;
/** @type {Promise<void>|null} */
let mapsLoadPromise = null;
/** @type {google.maps.Map|null} */
let mapInstance = null;
/** @type {google.maps.InfoWindow|null} */
let infoWindow = null;
/** @type {google.maps.Marker[]} */
let markers = [];
/** @type {google.maps.LatLngBounds|null} */
let lastBounds = null;

function escapeHtml(text) {
	return String(text ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function pinInfoHtml(pin) {
	const name = escapeHtml(pin.person_name);
	const position = escapeHtml(pin.position);
	const rating = escapeHtml(pin.rating);
	return `<div><strong>${name}</strong><br>Position: ${position}<br>Rating: ${rating}</div>`;
}

function teardownMap() {
	for (const m of markers) {
		m.setMap(null);
	}
	markers = [];
	if (infoWindow) {
		infoWindow.close();
		infoWindow = null;
	}
	mapInstance = null;
	lastBounds = null;
	showMapDiv.value = false;
}

function smallPinIcon() {
	return {
		path: PIN_PATH,
		fillColor: "#e53935",
		fillOpacity: 1,
		strokeColor: "#7f1d1d",
		strokeWeight: 0.6,
		scale: 0.55,
		anchor: new google.maps.Point(12, 22),
	};
}

function fitPins() {
	if (!mapInstance || !lastBounds) return;
	google.maps.event.trigger(mapInstance, "resize");
	const ne = lastBounds.getNorthEast();
	const sw = lastBounds.getSouthWest();
	if (ne.lat() === sw.lat() && ne.lng() === sw.lng()) {
		mapInstance.setCenter(ne);
		mapInstance.setZoom(14);
		return;
	}
	mapInstance.fitBounds(lastBounds, 20);
}

function addDragOverlay(cursor) {
	const overlay = document.createElement("div");
	overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:100001;cursor:${cursor};`;
	document.body.appendChild(overlay);
	return overlay;
}

function startDrag(e) {
	if (e.button !== 0) return;
	e.preventDefault();
	const sx = e.clientX;
	const sy = e.clientY;
	const odx = dx.value;
	const ody = dy.value;
	const el = panelRef.value;
	if (!el) return;
	const overlay = addDragOverlay("move");
	function onMove(ev) {
		el.style.transform = `translate3d(${odx + ev.clientX - sx}px, ${ody + ev.clientY - sy}px, 0)`;
	}
	function onUp(ev) {
		overlay.remove();
		dx.value = odx + ev.clientX - sx;
		dy.value = ody + ev.clientY - sy;
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onUp);
	}
	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onUp);
}

function startResize(e) {
	if (e.button !== 0) return;
	const el = panelRef.value;
	if (!el) return;
	const rect = el.getBoundingClientRect();
	const sx = e.clientX;
	const sy = e.clientY;
	const ow = dlgW.value != null ? dlgW.value : rect.width;
	const oh = dlgH.value != null ? dlgH.value : rect.height;
	const overlay = addDragOverlay("nwse-resize");
	const maxW = Math.floor(window.innerWidth * 0.95);
	const maxH = Math.floor(window.innerHeight * 0.95);
	const minW = 480;
	const minH = 360;
	function onMove(ev) {
		dlgW.value = Math.min(maxW, Math.max(minW, ow + ev.clientX - sx));
		dlgH.value = Math.min(maxH, Math.max(minH, oh + ev.clientY - sy));
	}
	function onUp() {
		overlay.remove();
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onUp);
		nextTick(() => requestAnimationFrame(fitPins));
	}
	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onUp);
}

function resetState() {
	loading.value = false;
	error.value = "";
	emptyState.value = false;
	skippedNoAddress.value = 0;
	geocodeFailed.value = 0;
	teardownMap();
}

function waitForGoogleMaps(timeoutMs) {
	const start = Date.now();
	return new Promise((resolve, reject) => {
		function tick() {
			if (window.google?.maps?.Map) {
				resolve();
				return;
			}
			if (Date.now() - start >= timeoutMs) {
				reject(new Error("Google Maps did not load in time"));
				return;
			}
			setTimeout(tick, 50);
		}
		tick();
	});
}

function loadGoogleMapsScript(apiKey) {
	if (window.google?.maps?.Map) {
		return Promise.resolve();
	}
	if (mapsLoadPromise) return mapsLoadPromise;
	const existing = document.querySelector('script[data-nce-google-maps="1"]');
	if (existing) {
		mapsLoadPromise = waitForGoogleMaps(8000);
		return mapsLoadPromise;
	}
	mapsLoadPromise = new Promise((resolve, reject) => {
		const callbackName = "__nceGoogleMapsReady";
		const timer = setTimeout(() => {
			mapsLoadPromise = null;
			reject(new Error("Google Maps did not load in time"));
		}, 8000);
		window[callbackName] = () => {
			clearTimeout(timer);
			resolve();
		};
		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}`;
		script.async = true;
		script.setAttribute("data-nce-google-maps", "1");
		script.onerror = () => {
			clearTimeout(timer);
			mapsLoadPromise = null;
			reject(new Error("Failed to load Google Maps"));
		};
		document.head.appendChild(script);
	});
	return mapsLoadPromise;
}

function initMap(pins) {
	const el = mapElRef.value;
	if (!el || !window.google?.maps?.Map) return;

	mapInstance = new google.maps.Map(el, {
		center: { lat: pins[0].lat, lng: pins[0].lng },
		zoom: 10,
	});
	infoWindow = new google.maps.InfoWindow();

	const bounds = new google.maps.LatLngBounds();
	for (const pin of pins) {
		const pos = { lat: Number(pin.lat), lng: Number(pin.lng) };
		const marker = new google.maps.Marker({
			position: pos,
			map: mapInstance,
			icon: smallPinIcon(),
		});
		markers.push(marker);
		bounds.extend(pos);

		marker.addListener("mouseover", () => {
			if (!infoWindow || !mapInstance) return;
			infoWindow.setContent(pinInfoHtml(pin));
			infoWindow.open({ map: mapInstance, anchor: marker });
		});
		marker.addListener("mouseout", () => {
			infoWindow?.close();
		});
	}

	lastBounds = bounds;
	requestAnimationFrame(() => {
		fitPins();
		if (!mapInstance) return;
		google.maps.event.addListenerOnce(mapInstance, "idle", fitPins);
	});
}

async function loadMapData(eventId) {
	const seq = ++loadSeq;
	resetState();
	loading.value = true;
	try {
		const payload = await frappeCall("nce_events.api.event_people_map.get_event_people_map", {
			event_id: eventId,
		});
		if (seq !== loadSeq || !props.open) return;
		const pins = Array.isArray(payload?.pins) ? payload.pins : [];
		skippedNoAddress.value = Number(payload?.skipped_no_address) || 0;
		geocodeFailed.value = Number(payload?.geocode_failed) || 0;

		loading.value = false;

		if (!pins.length) {
			emptyState.value = true;
			return;
		}

		const apiKey = String(payload?.api_key || "").trim();
		if (!apiKey) {
			error.value = "Map is not configured.";
			return;
		}

		await loadGoogleMapsScript(apiKey);
		if (seq !== loadSeq || !props.open) return;
		showMapDiv.value = true;
		await nextTick();
		initMap(pins);
	} catch (e) {
		if (seq !== loadSeq || !props.open) return;
		loading.value = false;
		const msg = extractServerMessage(e);
		error.value = msg && msg !== "Failed to save" ? msg : "Could not load map.";
	}
}

watch(
	() => [props.open, props.eventId],
	([open, eventId]) => {
		if (!open || !String(eventId || "").trim()) {
			loadSeq += 1;
			resetState();
			return;
		}
		dx.value = 0;
		dy.value = 0;
		dlgW.value = null;
		dlgH.value = null;
		loadMapData(String(eventId).trim());
	},
	{ immediate: true },
);
</script>

<style scoped>
.ppv2-people-map-backdrop {
	position: fixed;
	inset: 0;
	z-index: 100000;
	background: rgba(0, 0, 0, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	box-sizing: border-box;
}
.ppv2-people-map-panel {
	width: 984px;
	height: 656px;
	max-width: 94vw;
	max-height: 94vh;
	background: var(--nce-color-surface);
	border: var(--nce-border-width, 1px) solid var(--nce-color-border);
	border-radius: var(--border-radius);
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	overflow: hidden;
	position: relative;
}
.ppv2-people-map-header {
	padding: 12px 16px;
	border-bottom: var(--nce-border-width, 1px) solid var(--nce-color-border);
	flex-shrink: 0;
	cursor: move;
	user-select: none;
}
.ppv2-people-map-title {
	font-size: var(--font-size-lg, 16px);
	font-weight: var(--font-weight-bold, 600);
}
.ppv2-people-map-body {
	padding: 16px;
	flex: 1;
	min-height: 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}
.ppv2-people-map-message {
	margin: 0 0 8px;
	font-size: var(--font-size-base, 14px);
}
.ppv2-people-map-error {
	color: var(--nce-color-danger, #c62828);
}
.ppv2-people-map-canvas {
	width: 100%;
	min-width: 0;
	flex: 1;
	min-height: 0;
	border: var(--nce-border-width, 1px) solid var(--nce-color-border);
	border-radius: var(--border-radius-sm, 4px);
	box-sizing: border-box;
}
.ppv2-people-map-resize {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 16px;
	height: 16px;
	cursor: nwse-resize;
	background: linear-gradient(135deg, transparent 50%, var(--nce-color-border) 50%);
	border-radius: 0 0 var(--border-radius) 0;
	z-index: 5;
}
.ppv2-people-map-footnote {
	margin: 10px 0 0;
	font-size: var(--font-size-sm, 12px);
	color: var(--nce-color-text-muted, #666);
}
.ppv2-people-map-footer {
	padding: 10px 16px;
	border-top: var(--nce-border-width, 1px) solid var(--nce-color-border);
	display: flex;
	justify-content: flex-end;
	flex-shrink: 0;
}
.ppv2-people-map-footer .ppv2-fd-tab-btn {
	padding: 6px 14px;
	border-radius: var(--border-radius-sm, 4px);
	font-size: var(--font-size-base, 14px);
	font-weight: var(--font-weight-bold, 600);
	cursor: pointer;
}
</style>
