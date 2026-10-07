/**
 * Parse Panel Action `client_handler`: bare key or key(args).
 * Examples: `refresh_x`, `show_dt(error-log)`, `show_dt("Error Log")`
 * @param {string} raw
 * @returns {{ key: string; args: string[] }}
 *
 * code-index:begin
 * {
 *  "purpose": "Parses Panel Action client_handler strings into handler key and parenthesized args.",
 *  "read_when": "When adding client_handler keys or parsing show_dt style action specs.",
 *  "gotchas": [],
 *  "keywords": ["parseClientHandlerSpec", "client_handler", "Panel Action", "refresh_x", "show_dt", "handler key"],
 *  "format": 1
 * }
 * code-index:end
 */
export function parseClientHandlerSpec(raw) {
	const s = String(raw || "").trim();
	if (!s) {
		return { key: "", args: [] };
	}
	const open = s.indexOf("(");
	if (open === -1) {
		const key = (s.match(/^[\w]+/) || [""])[0];
		return { key, args: [] };
	}
	const key = s.slice(0, open).trim();
	if (!/^[\w]+$/.test(key)) {
		return { key: (s.match(/^[\w]+/) || [""])[0], args: [] };
	}
	const close = s.lastIndexOf(")");
	if (close <= open) {
		return { key, args: [] };
	}
	const inner = s.slice(open + 1, close).trim();
	if (!inner) {
		return { key, args: [] };
	}
	const args = [];
	let i = 0;
	while (i < inner.length) {
		while (i < inner.length && /\s/.test(inner[i])) {
			i++;
		}
		if (i >= inner.length) {
			break;
		}
		if (inner[i] === '"' || inner[i] === "'") {
			const q = inner[i];
			i++;
			let buf = "";
			while (i < inner.length && inner[i] !== q) {
				if (inner[i] === "\\" && i + 1 < inner.length) {
					i++;
					buf += inner[i++];
					continue;
				}
				buf += inner[i++];
			}
			if (inner[i] === q) {
				i++;
			}
			args.push(buf);
			while (i < inner.length && /\s/.test(inner[i])) {
				i++;
			}
			if (inner[i] === ",") {
				i++;
			}
			continue;
		}
		let j = i;
		while (j < inner.length && inner[j] !== ",") {
			j++;
		}
		const tok = inner.slice(i, j).trim();
		if (tok) {
			args.push(tok);
		}
		i = j + 1;
	}
	return { key, args };
}
