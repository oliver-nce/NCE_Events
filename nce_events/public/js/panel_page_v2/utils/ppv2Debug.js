/** localStorage key — set to "1" to enable gated V2 debug console output
 *
 * code-index:begin
 * {
 *  "purpose": "Gated panel page v2 debug logging controlled by nce_ppv2_debug localStorage key.",
 *  "read_when": "When enabling ppv2DebugLog console output or checking isPpv2DebugEnabled gate.",
 *  "gotchas": [],
 *  "keywords": ["ppv2Debug", "isPpv2DebugEnabled", "PPV2_DEBUG_STORAGE_KEY", "nce_ppv2_debug", "ppv2DebugLog"],
 *  "format": 1
 * }
 * code-index:end
 */
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
