/**
 * Client-side handler registry for Panel Action rows of type "Client Script".
 *
 * Registry key is the first segment of `client_handler`: either `my_key` or
 * `my_key(arg1, arg2)`. Args are passed on ctx.args (see parseClientHandlerSpec).
 * Values are async factories: () => Promise<function(ctx)>
 *
 * code-index:begin
 * {
 *  "purpose": "Client-side handler registry mapping Panel Action Client Script keys to functions.",
 *  "read_when": "Registering a new panel client action handler or debugging action dispatch.",
 *  "gotchas": [],
 *  "keywords": ["registry", "Client Script", "Panel Action", "handler", "ctx"],
 *  "format": 1
 * }
 * code-index:end
 */

export const clientHandlers = {
	show_dt: () => import("./handlers/showDt.js").then((m) => m.default),
	switch_page: () => import("./handlers/switchPage.js").then((m) => m.default),
	cascade_panels: () => import("./handlers/cascadePanels.js").then((m) => m.default),
	close_all_panels: () => import("./handlers/closeAllPanels.js").then((m) => m.default),
};
