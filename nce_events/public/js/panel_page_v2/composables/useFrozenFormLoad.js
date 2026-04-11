import { unref, nextTick } from "vue";
import { frappeCall } from "../utils/frappeCall.js";
import { isLayoutField } from "../utils/frappeFieldExpr.js";
import { parseLayout } from "../utils/parseLayout.js";
import { isFdLoadDebugEnabled } from "../utils/formDialogLoadDebug.js";

/** @param {unknown} raw */
function normalizeHopChainForRelated(raw) {
	if (Array.isArray(raw)) {
		return raw;
	}
	if (raw == null || raw === "") {
		return [];
	}
	if (typeof raw === "string" && String(raw).trim()) {
		try {
			const p = JSON.parse(raw);
			return Array.isArray(p) ? p : [];
		} catch {
			return [];
		}
	}
	return [];
}

/**
 * Load sequence + reset + load for frozen Panel Form Dialog meta/doc.
 *
 * @param {object} ctx — refs/reactive from usePanelFormDialog
 */
export function createFrozenFormLoad(ctx) {
	const {
		definitionName,
		doctype,
		docName,
		definition,
		tabs,
		allFields,
		formData,
		originalData,
		loading,
		error,
		validationError,
		buttons,
		handleFetchFrom,
		syncingFromLoad,
		loadDebugLog,
	} = ctx;

	let loadSeq = 0;

	function pushDebug(step, ok, detail = "", errMsg = null) {
		if (!isFdLoadDebugEnabled() || !loadDebugLog) return;
		loadDebugLog.value.push({
			t: new Date().toISOString(),
			step,
			ok,
			detail: detail || "",
			err: errMsg ? String(errMsg) : null,
		});
	}

	function resetWhenClosed() {
		loadSeq += 1;
		syncingFromLoad.value = false;
		loading.value = false;
		error.value = null;
		validationError.value = null;
		tabs.value = [];
		allFields.value = [];
		definition.value = null;
		buttons.value = [];
		for (const key of Object.keys(formData)) {
			delete formData[key];
		}
		originalData.value = {};
		if (isFdLoadDebugEnabled() && loadDebugLog) {
			loadDebugLog.value = [];
		}
	}

	async function load() {
		const mySeq = ++loadSeq;
		loading.value = true;
		error.value = null;
		validationError.value = null;
		syncingFromLoad.value = false;

		const defnName = unref(definitionName);
		const dt = unref(doctype);
		const dn = unref(docName);

		if (isFdLoadDebugEnabled() && loadDebugLog) {
			loadDebugLog.value = [];
		}
		pushDebug(
			"start",
			true,
			`seq=${mySeq} doctype=${dt} docName=${dn ?? "(new)"} definition=${defnName}`,
		);

		try {
			let defn;
			try {
				defn = await frappeCall(
					"nce_events.api.form_dialog_api.get_form_dialog_definition",
					{ name: defnName },
				);
			} catch (e) {
				pushDebug("get_form_dialog_definition", false, defnName, e?.message || e);
				throw e;
			}
			if (mySeq !== loadSeq) {
				pushDebug("aborted", false, "stale seq after get_form_dialog_definition");
				return;
			}
			pushDebug(
				"get_form_dialog_definition",
				true,
				`ok dialog_size=${defn?.dialog_size ?? "?"}`,
			);

			definition.value = defn;
			buttons.value = defn.buttons || [];

			const fields = defn.frozen_meta?.fields || [];
			allFields.value = fields;
			tabs.value = parseLayout(fields);

			// Related DocType tabs: only from child rows; parse `info` JSON per row (try/catch).
			let relatedAdded = 0;
			try {
				const relatedDoctypes = defn.related_doctypes || [];
				for (const rel of relatedDoctypes) {
					try {
						if (!rel || typeof rel !== "object") continue;
						const dt = rel.doctype || rel.child_doctype;
						if (!dt) continue;
						let parsed = null;
						if (rel.info != null && String(rel.info).trim()) {
							try {
								parsed = typeof rel.info === "string" ? JSON.parse(rel.info) : rel.info;
							} catch {
								parsed = null;
							}
						}
						const label =
							(parsed && parsed.label) || rel.label || rel.tab_label || dt;
						const hop_chain = normalizeHopChainForRelated(rel.hop_chain);
						let sections = [];
						if (parsed && Array.isArray(parsed.fields) && parsed.fields.length) {
							try {
								const layoutTabs = parseLayout(parsed.fields);
								if (layoutTabs.length && layoutTabs[0].sections) {
									sections = layoutTabs[0].sections;
								}
							} catch {
								sections = [];
							}
						}
						tabs.value.push({
							label,
							sections,
							_related: {
								doctype: (parsed && parsed.doctype) || dt,
								link_field: (parsed && parsed.link_field) || rel.link_field || "",
								label,
								hop_chain,
								captureError: parsed && parsed.capture_error,
								hasLayout: sections.length > 0,
							},
						});
						relatedAdded += 1;
					} catch {
						/* skip broken row — main dialog still loads */
					}
				}
			} catch {
				/* ignore whole related block */
			}

			pushDebug(
				"parseLayout",
				true,
				`fields=${fields.length} tabs=${tabs.value.length} (incl ${relatedAdded} related)`,
			);

			syncingFromLoad.value = true;
			pushDebug("syncingFromLoad", true, "true (formData write + fetch_from)");

			for (const key of Object.keys(formData)) {
				delete formData[key];
			}
			for (const field of fields) {
				if (field.fieldname && !isLayoutField(field.fieldtype)) {
					formData[field.fieldname] = field.default || null;
				}
			}
			pushDebug("formData seed", true, `defaults from meta`);

			if (dn) {
				let doc;
				try {
					doc = await frappeCall("frappe.client.get", {
						doctype: dt,
						name: dn,
					});
				} catch (e) {
					pushDebug("frappe.client.get", false, `${dt}/${dn}`, e?.message || e);
					throw e;
				}
				if (mySeq !== loadSeq) {
					pushDebug("aborted", false, "stale seq after client.get");
					return;
				}
				Object.assign(formData, doc);
				pushDebug(
					"frappe.client.get",
					true,
					`${dt}/${dn} keys=${Object.keys(doc || {}).length}`,
				);
			} else {
				pushDebug("frappe.client.get", true, "(skipped — new doc)");
			}

			const linkFields = fields.filter(
				(f) => f.fieldtype === "Link" && f.options && formData[f.fieldname],
			);
			await Promise.all(
				linkFields.map((lf) => handleFetchFrom(lf.fieldname, formData[lf.fieldname])),
			);
			if (mySeq !== loadSeq) {
				pushDebug("aborted", false, "stale seq after fetch_from");
				return;
			}
			pushDebug("fetch_from batch", true, `${linkFields.length} link field(s)`);

			originalData.value = JSON.parse(JSON.stringify(formData));
			pushDebug("originalData snapshot", true, `keys=${Object.keys(formData).length}`);
		} catch (err) {
			if (mySeq !== loadSeq) {
				pushDebug("catch (ignored)", false, "stale seq", err?.message || err);
				return;
			}
			const msg = err?.message || err?.toString() || "Failed to load form";
			error.value = msg;
			pushDebug("load failed", false, "", msg);
		} finally {
			if (mySeq === loadSeq) {
				loading.value = false;
			}
			await nextTick();
			await nextTick();
			syncingFromLoad.value = false;
			pushDebug(
				"done",
				mySeq === loadSeq,
				mySeq === loadSeq
					? "loading=false syncingFromLoad=false"
					: "stale — skipped UI reset",
			);
		}
	}

	return { load, resetWhenClosed };
}
