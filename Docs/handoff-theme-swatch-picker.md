# Handoff — ThemeSwatchPicker (reusable theme-class picker)

**Date:** 2026-06-06  
**Repos:** Themes (`/Users/oliver2/Documents/_NCE_projects/Themes`) + NCE Events (this repo)  
**Spec:** `Docs/theme-swatch-picker.md` (mirrored in Themes `docs/theme-swatch-picker.md`)

---

## What this widget does

Lets a user pick one **shipping** theme utility class (`theme-{bg|text|border}-{role}-{shade}`) from a modal swatch grid and writes that string to a bound form field (e.g. future `Page Panel.header_color`).

- **Not** the hex `ColorPicker.vue` in `nce_events` (conditional formatting).
- **Not** the hex `SwatchPicker.vue` in Themes editor.
- Ships from **Themes app** as UMD/ES widget; loaded site-wide on Desk via `themes/hooks.py`.

---

## Current state

### Themes app — **implemented**

| Piece | Path |
|-------|------|
| DOM core | `frontend/src/widget/theme-swatch-picker-core.ts` |
| Desk adapter | `frontend/src/widget/adapters/desk-adapter.ts` |
| Standalone adapter | `frontend/src/widget/adapters/standalone-adapter.ts` |
| Blocked-open dialogs | `frontend/src/widget/blocked-dialog.ts` |
| Vue wrapper | `frontend/src/components/ThemeSwatchPicker.vue` |
| Build | `frontend/package.json` → `npm run build:widget` → `themes/public/dist/` (gitignored) |
| Desk assets | `themes/hooks.py` — `theme-swatch-picker.umd.js` + CSS |

**Desk API:**

```js
await frappe.ui.themeSwatchPicker.open({
  frm,
  themeField: "theme",        // Link → NCE Theme (doc name)
  valueField: "header_color", // receives e.g. theme-text-secondary-500
});
```

**Slug resolution (fixed):** `desk-adapter.ts` → `resolveNceThemeSlug()` looks up `slug` + `status` via `frappe.db.get_value("NCE Theme", …)`. Only **Active** themes with a slug open. Mirrors `nce_events/api/panel_api_pkg/panel_data.py` `_resolve_theme_slug()` (lines 101–116). Do **not** pass doc name to `data-nce-theme`.

**Open blocked without valid theme:** If Theme field is empty or theme is Inactive/no slug, picker does not open. User sees `frappe.msgprint` (or fallback overlay) via `blocked-dialog.ts` — friendly message, not silent failure.

**Theme fixed while modal open:** No reactive theme re-paint. Full-viewport backdrop (`z-index: 10000`) blocks clicks on the form behind the modal (including Theme field). No `read_only` / `disabled` field locking. `watchThemeSlug` removed from core and all adapters.

### NCE Events — **chrome slots wired (2026-06-06)**

| Item | Status |
|------|--------|
| Eight chrome `*_bg_class` fields on Page Panel | **Shipped** — `page_panel.json` |
| Desk Colours tab + ThemeSwatchPicker | **Shipped** — `page_panel.js` (`_render_colours_tab`) |
| API + V2 runtime | **Shipped** — `panel_data.py`, `panelChromeClasses.js`, PanelFloat/Table/FilterBar/FormDialog |
| `ThemeSwatchPicker` Vue embed in Form Dialog | Not used (Page Panel config is Desk-only) |
| Runtime palette on panels | **Shipped** — `theme_slug` → `PanelFloat` `data-nce-theme` |

Page Panel **configuration** is Desk-only today (`nce_events/nce_events/doctype/page_panel/page_panel.js`). Vue Form Dialog edits **row records**, not the Page Panel doc.

---

## Decisions (do not regress)

1. **Desk saves via `frm.set_value`** — dirty + Save work. No extra wiring.
2. **Vue Form Dialog MUST use `setField` → `formData`** — `ThemeSwatchPicker.vue` does not call `frm.set_value`. NCE Events saves via `usePanelFormDialog` → `saveFrozenFormDocument` (`{ ...formData }`). Without `:set-field` / `:get-field`, the pick **will not persist** and `isDirty` may stay false. Documented in:
   - `Docs/theme-swatch-picker.md` §8.1
   - `AGENTS.md` (Reusable Code table)
   - `Docs/theme-system/INDEX.md`
   - `nce_events/CODE_INDEX.json` `key_patterns`
   - Comment atop `ThemeSwatchPicker.vue`
3. **Empty theme** — picker stays closed; show dialog. Do not open against `:root` unless product decision changes.
4. **No theme switch while picker open** — backdrop only; do not re-add `watchThemeSlug` or field locking unless spec changes.

---

## Vue embed example (when implementing in Form Dialog)

```vue
<ThemeSwatchPicker
  theme-field="theme"
  value-field="header_color"
  v-model:open="pickerOpen"
  :get-field="(fn) => formData[fn]"
  :set-field="(fn, val) => { formData[fn] = val }"
/>
```

For `themeField` on Vue: value must be the **slug** for swatch preview (Desk adapter resolves Link → slug; Vue wrapper does **not** yet — may need `resolveNceThemeSlug` or a host `getField` that returns slug).

---

## Likely next tasks

1. **Add `header_color` Data field** to Page Panel DocType (if product wants per-panel header class).
2. **Desk:** button or custom field UI in `page_panel.js` → `frappe.ui.themeSwatchPicker.open({ frm, themeField: "theme", valueField: "header_color" })`.
3. **Consume picked class at runtime** — apply `header_color` class on `PanelFloat` / `PanelHeaderToolbar` (today headers use hardcoded `theme-bg-primary`).
4. **Deploy Themes widget** — run `npm run build:widget` in Themes `frontend/` before bench build; dist is gitignored.
5. **Spec §12 verification** — class existence grep, blocked theme dialog, backdrop blocks Theme field, round-trip save, etc.

---

## Key file references

| Concern | Location |
|---------|----------|
| Full spec | `Docs/theme-swatch-picker.md` |
| Class contract | `THEME_CLASS_CONTRACT.json` (root) |
| CSS emitter | `Themes/themes/utils/css_writer.py` — `CURATED_SHADES`, `_emit_role_shade_classes` |
| Panel theme slug | `nce_events/api/panel_api_pkg/panel_data.py:101–116` |
| Form Dialog save | `nce_events/public/js/panel_page_v2/composables/frozenFormSave.js` |
| Agent index | `AGENTS.md`, `Docs/theme-system/INDEX.md`, `nce_events/CODE_INDEX.json` |

---

## Prompt for next session (copy-paste)

```
Handoff: ThemeSwatchPicker — reusable theme-class picker.

Read Docs/handoff-theme-swatch-picker.md and Docs/theme-swatch-picker.md §8.

Themes widget is built (desk adapter resolves Link→slug, blocked dialog when no theme,
backdrop blocks form while open). NCE Events not wired: no header_color field, no page_panel.js button.

Task: [describe — e.g. add header_color to Page Panel + Desk picker button + apply class on PanelFloat]

Rules:
- Desk: frappe.ui.themeSwatchPicker.open({ frm, themeField, valueField })
- Vue Form Dialog: MUST pass :set-field/:get-field → formData or Save won't persist
- Do not re-add watchThemeSlug or read_only theme locking
- Widget source lives in Themes repo; run npm run build:widget on change
```
