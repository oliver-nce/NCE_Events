/** Mirror Desk ``form_dialog.js`` / server portal_fields for inline-child grids. */

const SKIP_TYPES = new Set([
	"Tab Break",
	"Section Break",
	"Column Break",
	"Heading",
	"HTML",
	"Image",
	"Fold",
	"Table",
	"Button",
]);

function cint(v) {
	const n = parseInt(v, 10);
	return Number.isNaN(n) ? 0 : n;
}

export function parsePortalFieldConfigRaw(raw) {
	if (!raw || !String(raw).trim()) {
		return [];
	}
	try {
		const data = JSON.parse(raw);
		return Array.isArray(data) ? data.filter((x) => x && typeof x === "object") : [];
	} catch {
		return [];
	}
}

function fieldEligible(f) {
	const fn = ((f && f.fieldname) || "").trim();
	if (!fn) {
		return false;
	}
	if (cint(f.hidden)) {
		return false;
	}
	const ft = ((f && f.fieldtype) || "").trim();
	return !SKIP_TYPES.has(ft);
}

/** Same merge rules as ``form_dialog.js`` `_buildEditorRows`. */
export function buildPortalEditorRows(metaFields, portalEntries) {
	const eligible = (metaFields || []).filter(fieldEligible);
	const byFn = {};
	eligible.forEach(function (f) {
		byFn[String(f.fieldname).trim()] = f;
	});

	const out = [];
	const seen = new Set();

	(portalEntries || []).forEach(function (entry) {
		const fn = String(entry.fieldname || "").trim();
		if (!fn || !byFn[fn] || seen.has(fn)) {
			return;
		}
		seen.add(fn);
		const f = byFn[fn];
		const showB = cint(entry.show) ? 1 : 0;
		const rowOut = {
			fieldname: fn,
			label: (String(f.label || "").trim() || fn),
			fieldtype: String(f.fieldtype || ""),
			show: showB,
			editable: cint(entry.editable) ? 1 : 0,
		};
		let sr = cint(entry.sort_rank);
		if (!showB) {
			sr = 0;
		}
		let sd = String(entry.sort_dir || "").trim().toLowerCase();
		if (sd !== "asc" && sd !== "desc") {
			sd = "asc";
		}
		if (sr > 0 && showB) {
			rowOut.sort_rank = sr;
			rowOut.sort_dir = sd;
		}
		out.push(rowOut);
	});

	eligible.forEach(function (f) {
		const fn = String(f.fieldname).trim();
		if (seen.has(fn)) {
			return;
		}
		seen.add(fn);
		out.push({
			fieldname: fn,
			label: (String(f.label || "").trim() || fn),
			fieldtype: String(f.fieldtype || ""),
			show: 0,
			editable: 0,
		});
	});
	return out;
}

/**
 * Columns for an editable/read-only grid (show=1 only), matching related-tab shape.
 */
export function portalColumnsForGrid(metaFields, portalRaw) {
	const portalEntries = parsePortalFieldConfigRaw(portalRaw);
	const editorRows = buildPortalEditorRows(metaFields, portalEntries);

	const byFn = {};
	for (const f of metaFields || []) {
		if (!f || typeof f !== "object") {
			continue;
		}
		const fn0 = String(f.fieldname || "").trim();
		if (fn0) {
			byFn[fn0] = f;
		}
	}

	const shown = editorRows.filter((r) => cint(r.show) === 1);
	if (!shown.length) {
		const metaName = byFn.name || {};
		return [
			{
				fieldname: "name",
				label: "ID",
				fieldtype: String(metaName.fieldtype || "Data"),
				options: String(metaName.options || "").trim(),
				editable: 0,
				reqd: cint(metaName.reqd),
			},
		];
	}

	return shown.map(function (r) {
		const fn = String(r.fieldname || "").trim();
		const metaF = byFn[fn] || {};
		const ft = String(r.fieldtype || "").trim() || String(metaF.fieldtype || "").trim();
		return {
			fieldname: fn,
			label: String(r.label || "").trim() || fn,
			fieldtype: ft,
			options: String(metaF.options || "").trim(),
			editable: cint(r.editable),
			reqd: cint(metaF.reqd),
		};
	});
}
