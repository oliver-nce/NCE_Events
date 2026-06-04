/**
 * Panel table column sizing (shared by PanelTable.vue and App.vue pre-layout).
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
const LONG_MAX_PX = 280;
const LONG_SHRINK_FLOOR_PX = 96;
const LONG_WEIGHT_CAP_CHARS = 28;
const RESIZE_MIN_PX = 40;
/** Page Panel title_field: keep at least this fraction of the longest sample value visible. */
const TITLE_VISIBLE_RATIO = 0.6;

const LONG_FIELDTYPES = new Set([
	"text",
	"text editor",
	"small text",
	"long text",
	"html",
	"markdown editor",
	"code",
	"json",
]);

const SHORT_MAX_BY_FIELDTYPE = {
	Check: 72,
	Int: 88,
	Float: 96,
	Currency: 104,
	Percent: 88,
	Date: 116,
	Datetime: 168,
	Time: 100,
	Link: 160,
	"Dynamic Link": 180,
	Select: 140,
};

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

function columnMetrics(columns, rows) {
	const sample = rows.slice(0, SAMPLE_ROWS);
	return columns.map((col) => {
		let total = 0;
		let maxLen = 0;
		sample.forEach((row) => {
			const s = String(panelRowVal(row, col.fieldname) ?? "");
			total += s.length;
			if (s.length > maxLen) maxLen = s.length;
		});
		const headerLen = String(col.label || col.fieldname || "").length;
		const avg = sample.length > 0 ? total / sample.length : headerLen;
		const fieldtype = String(col.fieldtype || "").trim();
		return { headerLen, avg, maxLen, fieldtype };
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

function findTitleColumnIndex(columns, titleField) {
	if (!titleField || !columns?.length) return -1;
	for (let i = 0; i < columns.length; i++) {
		if (isTitleFieldColumn(columns[i], titleField)) return i;
	}
	return -1;
}

/** Min width so at least 60% of the longest sample value stays visible (ellipsis after). */
function titleColumnMinPx(m) {
	const longest = Math.max(m.maxLen, m.headerLen, 1);
	const visibleChars = Math.max(m.headerLen, Math.ceil(longest * TITLE_VISIBLE_RATIO));
	return Math.ceil(visibleChars * CHAR_PX) + CELL_PAD_PX;
}

function isLongContentColumn(m) {
	const ft = m.fieldtype.toLowerCase();
	if (LONG_FIELDTYPES.has(ft)) return true;
	if (m.avg > 24 || m.maxLen > 36) return true;
	return false;
}

function headerMinPx(m) {
	return Math.ceil(m.headerLen * CHAR_PX) + CELL_PAD_PX;
}

function shortMaxPx(m) {
	if (SHORT_MAX_BY_FIELDTYPE[m.fieldtype]) return SHORT_MAX_BY_FIELDTYPE[m.fieldtype];
	return Math.min(160, Math.ceil(Math.min(m.maxLen, 20) * CHAR_PX) + CELL_PAD_PX);
}

function idealWidthPx(m, isLong, isTitle) {
	const headerMin = headerMinPx(m);
	if (isTitle) {
		const titleMin = titleColumnMinPx(m);
		const weight = Math.min(m.avg, LONG_WEIGHT_CAP_CHARS);
		const pref = Math.ceil(weight * CHAR_PX) + CELL_PAD_PX;
		const longIdeal = Math.max(headerMin, Math.min(LONG_MAX_PX, Math.max(pref, 120)));
		return Math.max(titleMin, longIdeal);
	}
	if (isLong) {
		const weight = Math.min(m.avg, LONG_WEIGHT_CAP_CHARS);
		const pref = Math.ceil(weight * CHAR_PX) + CELL_PAD_PX;
		return Math.max(headerMin, Math.min(LONG_MAX_PX, Math.max(pref, 120)));
	}
	const content = Math.ceil(Math.min(m.maxLen, 22) * CHAR_PX) + CELL_PAD_PX;
	return Math.max(headerMin, Math.min(shortMaxPx(m), content));
}

function columnShrinkFloor(i, isLong, titleIdx, titleMinPx, headerMins) {
	if (titleIdx >= 0 && i === titleIdx) {
		return Math.max(headerMins[i], titleMinPx);
	}
	if (isLong[i]) {
		return Math.max(headerMins[i], LONG_SHRINK_FLOOR_PX);
	}
	return headerMins[i];
}

function distributeSlack(widths, isLong, slack, caps) {
	if (slack <= 0) return widths;
	const out = [...widths];
	const longIdx = isLong.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
	if (!longIdx.length) return out;
	let room = 0;
	longIdx.forEach((i) => {
		room += Math.max(0, caps[i] - out[i]);
	});
	if (room <= 0) return out;
	const take = Math.min(slack, room);
	longIdx.forEach((i) => {
		const share = (Math.max(0, caps[i] - out[i]) / room) * take;
		out[i] = Math.min(caps[i], Math.floor(out[i] + share));
	});
	return out;
}

function shrinkWidthsToFit(widths, isLong, headerMins, caps, available, titleIdx, titleMinPx) {
	let w = [...widths];
	const sum = () => w.reduce((a, b) => a + b, 0);
	if (sum() <= available) {
		return distributeSlack(w, isLong, available - sum(), caps);
	}

	let deficit = sum() - available;

	// Shrink non-title long columns first; title_field column keeps TITLE_VISIBLE_RATIO floor.
	const longIdx = isLong
		.map((x, i) => (x ? i : -1))
		.filter((i) => i >= 0 && i !== titleIdx);
	const longReducible = longIdx
		.map((i) => ({
			i,
			amount: Math.max(
				0,
				w[i] - columnShrinkFloor(i, isLong, titleIdx, titleMinPx, headerMins)
			),
		}))
		.filter((r) => r.amount > 0);
	const longTotal = longReducible.reduce((s, r) => s + r.amount, 0);
	if (longTotal > 0) {
		const take = Math.min(deficit, longTotal);
		longReducible.forEach((r) => {
			w[r.i] -= Math.floor((r.amount / longTotal) * take);
		});
		deficit = sum() - available;
	}

	if (deficit > 0) {
		const floors = w.map((_, i) =>
			columnShrinkFloor(i, isLong, titleIdx, titleMinPx, headerMins)
		);
		const flex = w.map((wi, i) => Math.max(0, wi - floors[i]));
		const flexTotal = flex.reduce((a, b) => a + b, 0);
		if (flexTotal > 0) {
			const take = Math.min(deficit, flexTotal);
			for (let i = 0; i < w.length; i++) {
				w[i] -= Math.floor((flex[i] / flexTotal) * take);
			}
		} else if (sum() > 0) {
			const scale = available / sum();
			w = w.map((wi, i) =>
				Math.max(columnShrinkFloor(i, isLong, titleIdx, titleMinPx, headerMins), Math.floor(wi * scale))
			);
		}
	}

	for (let i = 0; i < w.length; i++) {
		const floor = columnShrinkFloor(i, isLong, titleIdx, titleMinPx, headerMins);
		w[i] = Math.max(floor, Math.min(caps[i], w[i]));
	}
	return w;
}

/**
 * @param {number} containerWidth - panel body width in px; 0 = ideal widths only
 * @param {string} [titleField] - Page Panel `title_field`; when set and visible, keeps 60% of longest value visible
 */
export function calcColWidths(columns, rows, containerWidth, actionColWidth = 0, titleField = "") {
	const reserved = Math.max(0, actionColWidth) + TABLE_RESERVE_PX;
	const metrics = columnMetrics(columns, rows || []);
	const titleIdx = findTitleColumnIndex(columns, titleField);
	const titleMinPx = titleIdx >= 0 ? titleColumnMinPx(metrics[titleIdx]) : 0;
	const isLong = metrics.map((m, i) => isLongContentColumn(m) || i === titleIdx);
	const headerMins = metrics.map(headerMinPx);
	const ideal = metrics.map((m, i) => idealWidthPx(m, isLong[i], i === titleIdx));
	const idealSum = ideal.reduce((s, w) => s + w, 0);
	const tableMinWidth = idealSum + reserved;

	const container = containerWidth > 0 ? containerWidth : 0;
	const available =
		container > 0
			? Math.max(200, container - reserved)
			: Math.max(200, idealSum);

	const caps = ideal.map((w, i) => (isLong[i] ? LONG_MAX_PX : w));
	const widths =
		idealSum <= available
			? distributeSlack(ideal, isLong, available - idealSum, caps)
			: shrinkWidthsToFit(
					ideal,
					isLong,
					headerMins,
					caps,
					available,
					titleIdx,
					titleMinPx
				);

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
	const { tableMinWidth } = calcColWidths(columns, list, 0, actionW, titleField);
	const floatInitW = panelFloatWidthFromTableMin(tableMinWidth);
	const { widths } = calcColWidths(columns, list, floatInitW, actionW, titleField);
	return { floatInitW, initialColWidths: widths, tableMinWidth };
}
