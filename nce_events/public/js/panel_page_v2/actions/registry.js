/**
 * Client-side handler registry for Panel Action rows of type "Client Script".
 *
 * Registry key is the first segment of `client_handler`: either `my_key` or
 * `my_key(arg1, arg2)`. Args are passed on ctx.args (see parseClientHandlerSpec).
 * Values are async factories: () => Promise<function(ctx)>
 */

export const clientHandlers = {
	show_dt: () => import("./handlers/showDt.js").then((m) => m.default),
};
