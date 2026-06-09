/** localStorage key — set to "1" to enable gated V2 debug console output */
export const PPV2_DEBUG_STORAGE_KEY = "nce_ppv2_debug";

export function isPpv2DebugEnabled() {
	try {
		return localStorage.getItem(PPV2_DEBUG_STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}

export function ppv2DebugLog(...args) {
	if (isPpv2DebugEnabled() && typeof console !== "undefined" && console.log) {
		console.log(...args);
	}
}

export function ppv2DebugWarn(...args) {
	if (isPpv2DebugEnabled() && typeof console !== "undefined" && console.warn) {
		console.warn(...args);
	}
}
