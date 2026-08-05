/** Mirror Desk ``form_dialog.js`` / server portal_fields for inline-child grids. */

import { metaReadOnlyFromField } from "./portalColumnEditable.js";

/** Child-table list view columns (Desk ``in_list_view``), including Button actions. */
const LIST_VIEW_SKIP = new Set([
	"Tab Break",
	"Section Break",
	"Column Break",
	"Heading",
	"HTML",
	"Image",
	"Fold",
	"Table",
]);

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

/** Mirror ``portal_fields._portal_meta_fields_for_editor``. */
export function metaFieldsForPortalEditor(metaFields, portalOpts = {}) {
	const eligible = (metaFields || []).filter(fieldEligible);
	if (eligible.some((f) => String(f.fieldname).trim() === "name")) {
		return eligible;
	}
	const nameFieldLabel = String(portalOpts.nameFieldLabel || "").trim();
	const label = nameFieldLabel || "name";
	return [
		{ fieldname: "name", label, fieldtype: "Data", read_only: 1 },
		...eligible,
	];
}

/** Same merge rules as ``form_dialog.js`` `_buildEditorRows`. */
export function buildPortalEditorRows(metaFields, portalEntries, portalOpts = {}) {
	const eligible = metaFieldsForPortalEditor(metaFields, portalOpts);
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
			editable: showB ? 1 : 0,
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
 * @param {object} [portalOpts] - ``{ nameFieldLabel }`` from frozen tab ``info``
 */
export function portalColumnsForGrid(metaFields, portalRaw, portalOpts = {}) {
	const portalEntries = parsePortalFieldConfigRaw(portalRaw);
	const editorRows = buildPortalEditorRows(metaFields, portalEntries, portalOpts);

	const byFn = {};
	for (const f of metaFieldsForPortalEditor(metaFields, portalOpts)) {
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
				label: String(metaName.label || "").trim() || "name",
				fieldtype: String(metaName.fieldtype || "Data"),
				options: String(metaName.options || "").trim(),
				read_only: metaReadOnlyFromField(metaName) || 1,
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
			read_only: metaReadOnlyFromField(metaF),
			reqd: cint(metaF.reqd),
		};
	});
}

function listViewFieldEligible(f) {
	const fn = ((f && f.fieldname) || "").trim();
	if (!fn) {
		return false;
	}
	if (cint(f.hidden)) {
		return false;
	}
	const ft = ((f && f.fieldtype) || "").trim();
	if (ft === "Button") {
		return cint(f.in_list_view) === 1;
	}
	if (LIST_VIEW_SKIP.has(ft)) {
		return false;
	}
	return cint(f.in_list_view) === 1;
}

function columnFromMetaField(f) {
	const fn = String(f.fieldname || "").trim();
	const ft = String(f.fieldtype || "").trim();
	return {
		fieldname: fn,
		label: String(f.label || "").trim() || fn,
		fieldtype: ft,
		options: String(f.options || "").trim(),
		read_only: metaReadOnlyFromField(f),
		reqd: cint(f.reqd),
		depends_on: f.depends_on,
		read_only_depends_on: f.read_only_depends_on,
		isActionButton: ft === "Button",
	};
}

/**
 * Grid columns from child DocType ``in_list_view`` (Desk child table is source of truth).
 * Falls back to portal config when no list-view fields are defined.
 */
export function listViewColumnsForGrid(metaFields, portalRaw, portalOpts = {}) {
	const listFields = (metaFields || []).filter(listViewFieldEligible);
	if (!listFields.length) {
		return portalColumnsForGrid(metaFields, portalRaw, portalOpts);
	}
	return listFields.map(columnFromMetaField);
}
