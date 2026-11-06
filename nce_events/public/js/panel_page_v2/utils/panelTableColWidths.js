/**
 * Panel table column sizing (shared by PanelTable.vue and App.vue pre-layout).
 *
 * Width per column: max of (a) longest whitespace-separated word in the header
 * label and (b) the longest of the first 20 non-empty cell values, capped at 40
 * characters, plus one character so proportional type fits. Blank cells, cells
 * that are only spaces, and numeric zero are not part of that sample. No
 * shrink-to-fit and no slack distribution.
 *
 * code-index:begin
 * {
 *  "purpose": "Panel table column widths from longest title word plus the first 20 non-empty values per column (cap 40 chars, plus 1); float width; no shrink-to-fit.",
 *  "read_when": "When changing column width rules, PANEL_FLOAT_DEFAULT_W, or preparePanelTableLayout first paint.",
 *  "gotchas": [],
 *  "keywords": ["panelTableColWidths", "columnMetrics", "calcColWidths", "PANEL_FLOAT_DEFAULT_W", "panelFloatWidthFromTableMin", "preparePanelTableLayout", "no shrink-to-fit"],
 *  "format": 1
 * }
 * code-index:end
 */

export const PANEL_FLOAT_DEFAULT_W = 1200;
export const PANEL_FLOAT_MAX_W = 1600;
export const PANEL_FLOAT_CHROME_PX = 40;

const ACTION_BTN_SLOT_PX = 38;
const ACTION_CELL_PAD_PX = 12;
const TABLE_RESERVE_PX = 16;

const SAMPLE_ROWS = 20;
const CHAR_PX = 7.2;
const CELL_PAD_PX = 24;
const NUMERIC_FIELDTYPES = new Set(["int", "float", "currency", "percent", "duration"]);

export function panelRowVal(row, key) {
	if (!key) return null;
	return row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()] ?? null;
}

export function actionColumnWidthFromConfig(config = {}) {
	const email = String(config.email_field || "").trim();
	const sms = String(config.sms_field || "").trim();
	const wp =
		!!config.show_wp_switch && String(config.wp_family_id_field || "").trim();
	let n = 0;
	if (email) n += 1;
	if (sms) n += 2;
	if (wp) n += 1;
	if (!n) return 0;
	return ACTION_CELL_PAD_PX + n * ACTION_BTN_SLOT_PX;
}

/** Default 1200px; grow for wide tables up to 1600px (and viewport). */
export function panelFloatWidthFromTableMin(tableMinWidth) {
	const viewport =
		typeof window !== "undefined"
			? Math.max(400, window.innerWidth - 24)
			: PANEL_FLOAT_MAX_W;
	const need = Number(tableMinWidth) + PANEL_FLOAT_CHROME_PX;
	if (!Number.isFinite(need) || need <= 0) return PANEL_FLOAT_DEFAULT_W;
	return Math.min(
		PANEL_FLOAT_MAX_W,
		viewport,
		Math.max(PANEL_FLOAT_DEFAULT_W, need)
	);
}

function px(n) {
	return Math.ceil(n * CHAR_PX) + CELL_PAD_PX;
}

/** Blank, whitespace-only, or numeric zero (including 0.00 on numeric fields). */
function isSkippedWidthValue(raw, fieldtype) {
	if (raw == null) return true;
	if (typeof raw === "number") return raw === 0;
	const s = String(raw);
	if (!s.trim()) return true;
	const ft = String(fieldtype || "").toLowerCase();
	if (!NUMERIC_FIELDTYPES.has(ft)) return false;
	const n = Number(s.trim());
	return n === 0;
}

/**
 * Per-column max string length from the first SAMPLE_ROWS non-empty values,
 * and longest title token length (chars). Blank, whitespace-only, and numeric
 * zero cells are skipped.
 */
function columnMetrics(columns, rows) {
	const list = rows || [];
	return columns.map((col) => {
		let maxLen = 0;
		let seen = 0;
		for (let i = 0; i < list.length && seen < SAMPLE_ROWS; i++) {
			const raw = panelRowVal(list[i], col.fieldname);
			if (isSkippedWidthValue(raw, col.fieldtype)) continue;
			const s = String(raw);
			seen += 1;
			if (s.length > maxLen) maxLen = s.length;
		}
		const label = String(col.label || col.fieldname || "").trim();
		const tokens = label ? label.split(/\s+/).filter(Boolean) : [];
		const longestWordChars = tokens.length
			? tokens.reduce((m, t) => Math.max(m, t.length), 0)
			: 1;
		return { maxLen, longestWordChars };
	});
}

/** Whether a column is the Page Panel `title_field` (supports dotted fieldnames). */
export function isTitleFieldColumn(col, titleField) {
	const tf = String(titleField || "").trim();
	if (!tf || !col) return false;
	const bare = tf.includes(".") ? tf.split(".").pop() : tf;
	const fn = String(col.fieldname || "");
	return (
		fn === tf ||
		fn === bare ||
		fn.toLowerCase() === tf.toLowerCase() ||
		fn.toLowerCase() === bare.toLowerCase()
	);
}

/**
 * @param {number} _containerWidth - ignored; kept for callers passing panel width
 * @param {string} [_titleField] - ignored; kept for callers passing Page Panel title_field
 */
export function calcColWidths(
	columns,
	rows,
	_containerWidth,
	actionColWidth = 0,
	_titleField = ""
) {
	const reserved = Math.max(0, actionColWidth) + TABLE_RESERVE_PX;
	if (!columns?.length) {
		return { widths: [], tableMinWidth: reserved };
	}
	const metrics = columnMetrics(columns, rows || []);
	const widths = metrics.map((m) => {
		const titleW = px(m.longestWordChars);
		const sampleW = m.maxLen > 0 ? px(Math.min(m.maxLen, 40) + 1) : 0;
		return Math.max(titleW, sampleW);
	});
	const tableMinWidth = widths.reduce((a, b) => a + b, 0) + reserved;
	return { widths, tableMinWidth };
}

/**
 * Run before PanelFloat mounts: float width (1200–1600) + column px widths for first paint.
 */
export function preparePanelTableLayout(columns, rows, config = {}) {
	const actionW = actionColumnWidthFromConfig(config);
	if (!columns?.length) {
		return {
			floatInitW: PANEL_FLOAT_DEFAULT_W,
			initialColWidths: null,
			tableMinWidth: 0,
		};
	}
	const list = rows || [];
	const titleField = String(config.title_field || "").trim();
	const { widths, tableMinWidth } = calcColWidths(columns, list, 0, actionW, titleField);
	const floatInitW = panelFloatWidthFromTableMin(tableMinWidth);
	return { floatInitW, initialColWidths: widths, tableMinWidth };
}
