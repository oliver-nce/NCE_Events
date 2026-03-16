import { ref, shallowRef } from "vue";

function frappeCall(method, args) {
	return new Promise((resolve, reject) => {
		frappe.call({
			method,
			args,
			callback: (r) => (r.message ? resolve(r.message) : reject("Empty response")),
			error: reject,
		});
	});
}

function getDoc(doctype, name) {
	return new Promise((resolve, reject) => {
		frappe.db.get_doc(doctype, name).then(resolve).catch(reject);
	});
}

export function useCardForm(rootDoctype) {
	const cardDef = shallowRef(null);
	const record = ref(null);
	const meta = ref({});
	const resolvedHops = ref({});
	const loading = ref(false);
	const error = ref(null);

	async function resolveHopPath(path, rec, rootDt, metaCache) {
		const parts = path.split(".");
		if (parts.length === 1) {
			return rec?.[parts[0]] ?? null;
		}
		let current = rec;
		let currentDoctype = rootDt;
		for (let i = 0; i < parts.length - 1; i++) {
			const linkField = parts[i];
			const linkedName = current?.[linkField];
			if (!linkedName) return null;
			const fieldMeta = metaCache?.[currentDoctype]?.fields?.find(
				(f) => f.fieldname === linkField && f.fieldtype === "Link"
			);
			if (!fieldMeta?.options) return null;
			const nextDoc = await getDoc(fieldMeta.options, linkedName);
			current = nextDoc;
			currentDoctype = fieldMeta.options;
		}
		return current?.[parts[parts.length - 1]] ?? null;
	}

	async function load(cardDefName, recordName) {
		loading.value = true;
		error.value = null;
		try {
			const doc = await getDoc("Card Definition", cardDefName);
			cardDef.value = doc;

			const rootDt = doc.root_doctype;
			const metaRes = await frappeCall("frappe.client.get_doctype", { doctype: rootDt });
			meta.value = { ...meta.value, [rootDt]: metaRes };

			const rec = await getDoc(rootDt, recordName);
			record.value = rec;

			const hops = {};
			const paths = new Set();
			for (const row of doc.fields_list || []) {
				if (row.path?.includes(".")) paths.add(row.path);
			}
			for (const row of doc.displays || []) {
				if (row.path?.includes(".")) paths.add(row.path);
			}
			for (const path of paths) {
				hops[path] = await resolveHopPath(path, rec, rootDt, meta.value);
			}
			resolvedHops.value = hops;
		} catch (e) {
			error.value = String(e);
		} finally {
			loading.value = false;
		}
	}

	async function saveField(fieldname, value) {
		const rootDt = cardDef.value?.root_doctype;
		const rec = record.value;
		if (!rootDt || !rec?.name) return;
		await frappe.db.set_value(rootDt, rec.name, fieldname, value);
		record.value = { ...record.value, [fieldname]: value };
	}

	async function refresh() {
		const rec = record.value;
		const rootDt = cardDef.value?.root_doctype;
		if (!rec?.name || !rootDt) return;
		const doc = await getDoc(rootDt, rec.name);
		record.value = doc;
		const hops = {};
		const paths = new Set();
		for (const row of cardDef.value.fields_list || []) {
			if (row.path?.includes(".")) paths.add(row.path);
		}
		for (const row of cardDef.value.displays || []) {
			if (row.path?.includes(".")) paths.add(row.path);
		}
		for (const path of paths) {
			hops[path] = await resolveHopPath(path, doc, rootDt, meta.value);
		}
		resolvedHops.value = hops;
	}

	return {
		cardDef,
		record,
		meta,
		resolvedHops,
		loading,
		error,
		load,
		saveField,
		refresh,
	};
}
