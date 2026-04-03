/** localStorage key — set to "1" to show Panel Form Dialog load step debug overlay */
export const FD_LOAD_DEBUG_STORAGE_KEY = "nce_fd_load_debug";

export function isFdLoadDebugEnabled() {
	try {
		return localStorage.getItem(FD_LOAD_DEBUG_STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}
