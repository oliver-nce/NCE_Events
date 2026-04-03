import { reactive } from "vue";

/**
 * Stacked Card modals (Card Definition + record). Panel page wires drill → openCardModal;
 * CardForm can nest another card via onOpenCard.
 */
export function useNceCardStack() {
	const cardStack = reactive([]);
	let cardCounter = 0;

	function openCardModal(cardDefName, doctype, recordName) {
		cardStack.push({
			id: ++cardCounter,
			cardDefName,
			doctype,
			recordName,
		});
	}

	function closeTopCard() {
		cardStack.pop();
	}

	/** Payload from WidgetGrid / ActionsPanel: { cardDefName, doctype, name } */
	function onOpenCard(cfg) {
		openCardModal(cfg.cardDefName, cfg.doctype, cfg.name);
	}

	return {
		cardStack,
		openCardModal,
		closeTopCard,
		onOpenCard,
	};
}

/**
 * Normalize opts for window._nce_open_card (camelCase or snake_case keys).
 * @returns {{ cardDefName: string, doctype: string, recordName: string } | null}
 */
export function parseOpenCardOpts(opts) {
	if (!opts || typeof opts !== "object") return null;
	const cardDefName = opts.cardDefName ?? opts.card_def_name;
	const doctype = opts.doctype;
	const recordName = opts.recordName ?? opts.record_name ?? opts.name;
	if (!cardDefName || !doctype || !recordName) return null;
	return { cardDefName, doctype, recordName };
}
