import { ref } from "vue";
import { frappeCall } from "../utils/frappeCall.js";
import { clientHandlers } from "../actions/registry.js";

/**
 * @param {{
 *   openFormDialogStandalone: (args: object) => boolean;
 *   refreshPanelByDoctype: (doctype: string) => void;
 * }} deps
 */
export function usePanelActions({ openFormDialogStandalone, refreshPanelByDoctype }) {
	const actions = ref([]);
	const loading = ref(false);
	const error = ref(null);

	async function loadActions() {
		loading.value = true;
		error.value = null;
		try {
			const list = await frappeCall("nce_events.api.panel_actions.get_panel_actions");
			actions.value = Array.isArray(list) ? list : [];
		} catch (e) {
			error.value = String(e);
			actions.value = [];
		} finally {
			loading.value = false;
		}
	}

	function _ctx() {
		return {
			frappe,
			frappeCall,
			openPanelFormDialog: openFormDialogStandalone,
			msgprint: (opts) => frappe.msgprint(opts),
			showAlert: (opts) => frappe.show_alert(opts),
			confirm: (msg) =>
				new Promise((resolve) => {
					frappe.confirm(msg, () => resolve(true), () => resolve(false));
				}),
			refreshPanel: refreshPanelByDoctype,
		};
	}

	async function _resolveFormDialogDocName(action) {
		if (action.record_mode === "New") {
			return null;
		}
		const resolved = await frappeCall("nce_events.api.panel_actions.resolve_panel_action_doc_name", {
			doctype: action.target_doctype,
			record_mode: action.record_mode,
			record_name: action.record_name || "",
		});
		return resolved?.doc_name ?? null;
	}

	async function executeAction(action) {
		if (!action) return;
		try {
			if (action.action_type === "Form Dialog") {
				let docName = null;
				if (action.record_mode === "New") {
					docName = null;
				} else {
					docName = await _resolveFormDialogDocName(action);
					if (action.record_mode === "Singleton" && !docName) {
						frappe.msgprint({
							title: __("Error"),
							message: `${__("No document found for singleton")} ${action.target_doctype || ""}`,
							indicator: "red",
						});
						return;
					}
				}
				openFormDialogStandalone({
					formDialog: action.action_id || action.name,
					doctype: action.target_doctype,
					docName,
					requiredFields: [],
					definitionSource: "panel_action",
				});
				return;
			}
			if (action.action_type === "Client Script") {
				const key = action.client_handler;
				const entry = clientHandlers[key];
				if (!entry) {
					console.warn(`[PanelAction] No handler registered for "${key}"`);
					frappe.msgprint({
						title: __("Action unavailable"),
						message: `${__("No handler registered for")} "${key}"`,
						indicator: "orange",
					});
					return;
				}
				const modOrFn = typeof entry === "function" ? await entry() : entry;
				const fn = typeof modOrFn === "function" ? modOrFn : modOrFn?.default;
				if (typeof fn !== "function") {
					console.warn(`[PanelAction] Handler "${key}" is not a function`);
					return;
				}
				await fn(_ctx());
				return;
			}
			console.warn(`[PanelAction] Unknown action_type: ${action.action_type}`);
		} catch (e) {
			frappe.msgprint({
				title: __("Action failed"),
				message: String(e?.message || e),
				indicator: "red",
			});
		}
	}

	return { actions, loading, error, loadActions, executeAction };
}
