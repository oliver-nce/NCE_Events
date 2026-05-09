/**
 * Client-side handler registry for Panel Action rows of type "Client Script".
 *
 * Keys must match the `client_handler` field on the Panel Action row.
 * Values are async factories: () => Promise<function(ctx)>
 */

export const clientHandlers = {
	// Example:
	// refresh_woo_categories: () => import("./handlers/refreshWooCategories.js").then((m) => m.default),
};
