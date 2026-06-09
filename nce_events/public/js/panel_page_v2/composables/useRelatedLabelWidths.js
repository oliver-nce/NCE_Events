import { reactive, onUnmounted } from "vue";

export function useRelatedLabelWidths(props) {
	/** @type {Record<number, number>} */
	const relatedLabelColByTab = reactive({});
	let relResizeTabIndex = null;
	let relResizeStartX = 0;
	let relResizeStartW = 0;

	function relatedLabelStorageKey(ti) {
		return `nce_fd_rel_lblw:${(props.definitionName || "_").trim() || "_"}:${ti}`;
	}

	function readSavedRelatedLabelWidth(ti) {
		try {
			const raw = localStorage.getItem(relatedLabelStorageKey(ti));
			const n = parseInt(String(raw), 10);
			if (Number.isFinite(n) && n >= 72 && n <= 640) {
				return n;
			}
		} catch {
			/* ignore */
		}
		return null;
	}

	/** Default label column width from longest label / fieldname in that tab. */
	function defaultRelatedLabelWidthForTab(tab) {
		let maxChars = 8;
		for (const section of tab.sections || []) {
			for (const col of section.columns || []) {
				for (const f of col.fields || []) {
					const t = String(f.label || f.fieldname || "").length;
					if (t > maxChars) {
						maxChars = t;
					}
				}
			}
		}
		return Math.min(480, Math.max(120, Math.round(maxChars * 7.2 + 28)));
	}

	function syncRelatedLabelWidthsFromTabs() {
		const saved = readSavedRelatedLabelWidth(props.ti);
		if (saved != null) {
			relatedLabelColByTab[props.ti] = saved;
		} else if (props.tab.sections && props.tab.sections.length) {
			relatedLabelColByTab[props.ti] = defaultRelatedLabelWidthForTab(props.tab);
		} else {
			relatedLabelColByTab[props.ti] = 200;
		}
	}

	function relatedLabelColPx(ti) {
		const w = relatedLabelColByTab[ti];
		return typeof w === "number" && Number.isFinite(w) ? w : 200;
	}

	function onRelatedLabelResizeMove(ev) {
		if (relResizeTabIndex == null) {
			return;
		}
		const dx = ev.clientX - relResizeStartX;
		const w = Math.min(640, Math.max(72, relResizeStartW + dx));
		relatedLabelColByTab[relResizeTabIndex] = w;
	}

	function onRelatedLabelResizeUp() {
		if (relResizeTabIndex != null) {
			try {
				localStorage.setItem(
					relatedLabelStorageKey(relResizeTabIndex),
					String(relatedLabelColByTab[relResizeTabIndex]),
				);
			} catch {
				/* ignore quota */
			}
		}
		relResizeTabIndex = null;
		window.removeEventListener("mousemove", onRelatedLabelResizeMove);
		window.removeEventListener("mouseup", onRelatedLabelResizeUp);
	}

	function onRelatedLabelResizeDown(ti, ev) {
		relResizeTabIndex = ti;
		relResizeStartX = ev.clientX;
		relResizeStartW = relatedLabelColPx(ti);
		window.addEventListener("mousemove", onRelatedLabelResizeMove);
		window.addEventListener("mouseup", onRelatedLabelResizeUp);
	}

	onUnmounted(() => {
		window.removeEventListener("mousemove", onRelatedLabelResizeMove);
		window.removeEventListener("mouseup", onRelatedLabelResizeUp);
	});

	return {
		relatedLabelColByTab,
		syncRelatedLabelWidthsFromTabs,
		relatedLabelColPx,
		onRelatedLabelResizeDown,
	};
}
