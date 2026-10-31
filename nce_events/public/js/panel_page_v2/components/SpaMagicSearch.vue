<!--
Inline Awesome Bar search for SPA title row (Desk-style, opens results in new tab).

code-index:begin
{
 "purpose": "Inline Awesome Bar search for SPA title row; opens Desk routes in a new browser tab.",
 "read_when": "Changing SPA magic search placement, AwesomeBar wiring, or new-tab navigation.",
 "gotchas": [
  "Do not call AwesomeBar.setup or setup_search_modal; those bind the desk modal.",
  "Set frappe.open_in_new_tab before set_route so router opens Desk in a new tab."
 ],
 "keywords": ["SpaMagicSearch", "AwesomeBar", "Awesomplete", "canSeeWorkspace", "awesomebar"],
 "format": 1
}
code-index:end
-->

<template>
	<div v-if="showSearch" class="ppv2-spa-magic-search">
		<input
			ref="inputRef"
			type="text"
			class="ppv2-spa-magic-search-input theme-bg-card theme-border theme-rounded-sm theme-text-primary"
			autocomplete="off"
			:placeholder="placeholder"
		/>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { canSeeWorkspace } from "../utils/canSeeWorkspace.js";

const showSearch = computed(() => canSeeWorkspace());

const placeholder = computed(() => {
	const __ = window.__;
	return typeof __ === "function" ? __("Search or type a command") : "Search or type a command";
});

const inputRef = ref(null);

let $input = null;
let awesomplete = null;
let bar = null;
let onInputHandler = null;

function firstRoute(route) {
	return Array.isArray(route) ? route[0] : route;
}

function isExternalUrl(route) {
	const first = firstRoute(route);
	return (
		typeof first === "string" && (first.startsWith("https://") || first.startsWith("http://"))
	);
}

function isInAppPath(route) {
	const first = firstRoute(route);
	return typeof first === "string" && first.startsWith("/") && !first.startsWith("//");
}

function openChoice(item) {
	const frappe = window.frappe;
	if (item.onclick) {
		item.onclick(item.match);
		return;
	}
	const first = firstRoute(item.route);
	if (typeof first === "string" && (first.startsWith("https://") || first.startsWith("http://"))) {
		window.open(first, "_blank", "noopener");
		return;
	}
	if (typeof first === "string" && first.startsWith("/") && !first.startsWith("//")) {
		window.open(first, "_blank", "noopener");
		return;
	}
	if (!item.route) return;
	if (item.route_options) frappe.route_options = item.route_options;
	frappe.open_in_new_tab = true;
	frappe.set_route(item.route);
	// set_route copies route_options into localStorage before it returns.
	// Drop them here so the next navigation inside this SPA does not inherit them.
	frappe.route_options = null;
}

onMounted(() => {
	if (!showSearch.value) return;
	const input = inputRef.value;
	if (!input) return;

	if (!window.Awesomplete || !window.frappe?.search?.AwesomeBar) return;

	const frappe = window.frappe;
	const $ = window.jQuery || window.$;
	if (!$) return;

	bar = new frappe.search.AwesomeBar();
	bar.options = [];
	bar.global_results = [];
	bar.search_modal = {
		find() {
			return { toggleClass() {} };
		},
	};

	awesomplete = new window.Awesomplete(input, {
		minChars: 0,
		maxItems: 99,
		autoFirst: true,
		list: [],
		filter: function () {
			return true;
		},
		data: function (item) {
			return {
				label: item.index || "",
				value: item.value,
			};
		},
		item: function (item) {
			const d = this.get_item(item.value);
			let target = "#";
			if (isExternalUrl(d.route) || isInAppPath(d.route)) {
				target = firstRoute(d.route);
			} else if (d.route) {
				target = frappe.router.make_url(
					frappe.router.convert_from_standard_route(
						frappe.router.get_route_from_arguments(
							typeof d.route === "string" ? [d.route] : d.route
						)
					)
				);
			}
			const __ = typeof window.__ === "function" ? window.__ : (s) => s;
			let html = `<span>${__(d.label || d.value)}</span>`;
			if (d.description && d.value !== d.description) {
				html +=
					'<br><span class="text-muted ellipsis">' + __(d.description) + "</span>";
			}
			const li = $("<li></li>")
				.data("item.autocomplete", d)
				.html(`<a style="font-weight:normal" href="${target}">${html}</a>`);
			// Left click is handled by awesomplete-select (new tab). Block the anchor
			// so the SPA does not also navigate. Middle-click still uses href.
			li.find("a").on("click", (ev) => ev.preventDefault());
			return li.get(0);
		},
		sort: function (a, b) {
			return b.label - a.label;
		},
	});

	bar.awesomplete = awesomplete;
	input.awesomplete = awesomplete;

	$input = $(input);
	const me = bar;

	onInputHandler = frappe.utils.debounce(function (e) {
		var value = e.target.value;
		var txt = value.trim().replace(/\s\s+/g, " ");
		var last_space = txt.lastIndexOf(" ");
		me.global_results = [];
		me._hook_search_seq = (me._hook_search_seq || 0) + 1;

		me.options = [];

		if (txt && txt.length > 1) {
			if (last_space !== -1) {
				me.set_specifics(txt.slice(0, last_space), txt.slice(last_space + 1));
			}
			me.add_defaults(txt);
			me.options = me.options.concat(me.build_options(txt));
			me.options = me.options.concat(me.global_results);
			if (frappe.boot.has_awesomebar_search) {
				me.fetch_hook_results(txt, me._hook_search_seq);
			}
		} else {
			me.options = me.options.concat(
				me.deduplicate(frappe.search.utils.get_recent_pages(txt || ""))
			);
			me.options = me.options.concat(frappe.search.utils.get_frequent_links());
		}

		awesomplete.list = me.deduplicate(me.options);

		$(awesomplete.ul).toggleClass("p-0 m-0", !me.options?.length);
	}, 100);

	const openRecent = function () {
		if (!me.autocomplete_open) {
			$(this).trigger("input");
		}
	};

	const onOpen = function (e) {
		me.autocomplete_open = e.target;
	};

	const onClose = function () {
		me.autocomplete_open = false;
	};

	const onSelect = function (e) {
		e.preventDefault();
		var o = e.originalEvent;
		var value = o.text.value;
		var item = awesomplete.get_item(value);
		if (item) openChoice(item);
		$input.val("");
		$input.trigger("blur");
	};

	const onSelectComplete = function () {
		$input.val("");
	};

	const onKeydown = (e) => {
		if (e.key === "Escape") {
			$input.trigger("blur");
		}
	};

	$input.on("input", onInputHandler);
	$input.on("focus", openRecent);
	$input.on("awesomplete-open", onOpen);
	$input.on("awesomplete-close", onClose);
	$input.on("awesomplete-select", onSelect);
	$input.on("awesomplete-selectcomplete", onSelectComplete);
	$input.on("keydown", onKeydown);

	input._ppv2MagicSearchCleanup = () => {
		$input.off("input", onInputHandler);
		$input.off("focus", openRecent);
		$input.off("awesomplete-open", onOpen);
		$input.off("awesomplete-close", onClose);
		$input.off("awesomplete-select", onSelect);
		$input.off("awesomplete-selectcomplete", onSelectComplete);
		$input.off("keydown", onKeydown);
	};
});

onUnmounted(() => {
	const input = inputRef.value;
	if (input && input._ppv2MagicSearchCleanup) {
		input._ppv2MagicSearchCleanup();
	}
	if (awesomplete && typeof awesomplete.destroy === "function") {
		awesomplete.destroy();
	}
	$input = null;
	awesomplete = null;
	bar = null;
});
</script>

<style scoped>
.ppv2-spa-magic-search {
	margin-left: auto;
	padding-right: 16px;
	position: relative;
	z-index: 40;
	flex-shrink: 0;
}

.ppv2-spa-magic-search-input {
	width: 320px;
	box-sizing: border-box;
	padding: 8px 12px;
	font-size: var(--font-size-sm, 13px);
	font-family: var(--font-family);
}
</style>
