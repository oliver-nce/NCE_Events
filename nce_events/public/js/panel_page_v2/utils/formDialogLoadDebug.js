/** localStorage key — set to "1" to show Panel Form Dialog load step debug overlay
 *
 * code-index:begin
 * {
 *  "purpose": "localStorage gate and key for Panel Form Dialog load step debug overlay.",
 *  "read_when": "When enabling or checking form dialog load debug via nce_fd_load_debug storage.",
 *  "gotchas": [],
 *  "keywords": ["isFdLoadDebugEnabled", "FD_LOAD_DEBUG_STORAGE_KEY", "nce_fd_load_debug", "load debug overlay"],
 *  "format": 1
 * }
 * code-index:end
 */
export const FD_LOAD_DEBUG_STORAGE_KEY = "nce_fd_load_debug";

export function isFdLoadDebugEnabled() {
	try {
		return localStorage.getItem(FD_LOAD_DEBUG_STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}
