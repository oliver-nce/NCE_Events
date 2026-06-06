# ThemeSwatchPicker — Spec

A reusable picker that lets a user select a theme-aware Tailwind class (e.g. `theme-bg-secondary-500`) by clicking a colored swatch, and writes that class string to a bound form field.

Ships from the **Themes app** as a versioned artifact. Consumed by `nce_events`, by Frappe Desk forms in any installed app, and by standalone pages.

---

## 1. Purpose & non-goals

**Purpose.**
- Let a non-technical user pick a theme class for an attribute slot like `Page Panel.header_color`.
- Make the choice visually grounded: every swatch paints with the actual color the user will see at render time.
- Constrain the choice to classes that actually exist in shipped `nce_theme.css` (no silent fall-throughs to var-only stops).

**Non-goals.**
- Does **not** edit the theme. (Use the theme editor SPA for that.)
- Does **not** emit raw hex or inline styles. Output is always a single utility class string.
- Does **not** pick custom (off-palette) colors. The theme defines the palette; this widget selects from it.

---

## 2. Visual layout

Single modal. Two vertical radio columns on the left, live swatch strip on the right, status lines below, theme label centered at the bottom.

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   Kind          Role             Swatches                  │
│   ○ Bg          ○ Primary        [ Text Text Text Text     │
│   ● Text        ● Secondary        Text Text Text ]        │
│   ○ Border      ○ Accent          ↑ overlay on Pri/Sec only│
│                 ○ Success                                  │
│                 ○ Info           Selected:                 │
│                 ○ Warning        theme-text-secondary-500  │
│                 ○ Danger                                   │
│                                                            │
│   // Gray row stubbed — enable when grayscale role lands   │
│                                                            │
│                  Theme: dawn   ← centered footer label     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Defaults on open:**
- Kind = Bg
- Role = Primary
- If the bound `valueField` already holds a parseable class (e.g. `theme-text-secondary-500`), the radios initialize to match it.

**No buttons in the modal.** Click a swatch to commit. Click backdrop or press Esc to cancel.

---

## 3. Inputs (embedder-provided config)

| Prop | Required | Description |
|---|---|---|
| `themeField` | yes | Name of the form field on the host that holds the **NCE Theme link** (doc name, e.g. Page Panel `theme`). Desk adapter resolves this to the theme **slug** for `data-nce-theme`. Standalone/Vue hosts must pass a slug literal if not using the Desk adapter. |
| `valueField` | yes | Name of the form field that receives the chosen class string (e.g. `"header_color"`). |

That is the entire public API. No default-value prop, no static slug prop, no kind/role restrictions — the spec is intentionally minimal.

---

## 4. Behavior

**On open:**
1. Read `themeField` value. **Desk:** the field is typically Link → NCE Theme (doc name); the Desk adapter resolves it to the theme **`slug`** via `frappe.db.get_value` (Active themes only — same rule as `nce_events` `_resolve_theme_slug`). **Standalone/Vue:** the field value must already be the slug literal. Then render the modal inside `<div data-nce-theme="{slug}">`.
2. Read `valueField` value. If it parses as `theme-{kind}-{role}-{shade}` with valid components, set the radios to match. Otherwise default (Bg / Primary).
3. Render the swatch strip for the currently-selected role.

**On radio change (Kind or Role):**
- Re-render the swatch strip for the new role (Role change) or re-render the "Selected" line (Kind change).
- Both update synchronously — no animation delay.

**On swatch hover:**
- The "Selected" line updates to show the class that would be written if the user clicked.
- (Optional polish, not required v1: dim back to the field's current value when the cursor leaves the strip.)

**On swatch click:**
1. Compose `theme-{kind}-{role}-{shade}` from the two radio selections + the clicked shade.
2. Write that string to `valueField` on the host form.
3. Close the modal.

**On backdrop click / Esc:**
- Close the modal. No write.

**On `themeField` change while modal is open:**
- **Desk:** re-resolve Link → slug, then update `data-nce-theme` on the wrapper → swatches and Text overlay foreground colors re-paint automatically (pure CSS).
- Update the footer `Theme: <slug>` label.

---

## 5. Swatch painting strategy

The widget does **zero color math**. All colors come from `nce_theme.css`.

- The modal wraps its content in `<div data-nce-theme="{slug}">`. Per `THEME_CLASS_CONTRACT.json` → `palette_scoping`, this scopes the `--nce-*` variables to that theme's palette.
- Each swatch element is rendered with the literal class `theme-bg-{role}-{shade}` regardless of the current Kind radio.
- Because the swatch sits inside the `data-nce-theme` wrapper, the CSS resolves to that theme's color — what the user sees is exactly what real rendered elements with that class will show on the host page when the host page is also scoped to that theme.

**Why bg even when Kind=Text or Kind=Border:** the swatch is a preview tile, not a sample of the output kind. A border-only swatch (1px ring) would be too small to read; a text-only swatch would render as a tiny letter on white. Using bg consistently keeps the swatch visually meaningful across all three Kind choices. The Kind radio only affects the *emitted class string*, not the swatch paint method.

**Requirement:** `nce_theme.css` must be loaded on the host page. This is true on Desk (the Themes app emits it via the asset pipeline) and on panel pages (which consume Desk's bundle).

---

## 6. "Text" overlay rule (Primary / Secondary only)

For Role = Primary or Role = Secondary, each swatch renders a centered `<span class="theme-text-{role}-{shade}-fg">Text</span>` over the bg.

- The `-fg` class is the mono foreground from `pick_fg_mono()` in `themes/utils/theme_color_utils.py`, emitted for every curated shade by `themes/utils/css_writer.py` (line 241 in current source).
- This is the same auto-contrast logic the rest of the system uses, so the overlay shows real-world readability.
- For Role ∈ { Accent, Success, Info, Warning, Danger }, swatches render bare (no overlay).

**Rationale.** Primary and Secondary are the two roles brand-critical enough that text-on-color contrast checking matters at pick time. The other five roles are typically used for icons, badges, borders, and decorative accents rather than large text surfaces. If a future use case calls for it, the overlay rule can be widened to all 7 roles by removing the role gate — see §10.

---

## 7. Output contract

Output is always exactly one space-free class string with the shape:

```
theme-{kind}-{role}-{shade}
```

| Component | Allowed values | Source of truth |
|---|---|---|
| `kind` | `bg`, `text`, `border` | Kind radio |
| `role` | `primary`, `secondary`, `accent`, `success`, `info`, `warning`, `danger` | `SHADE_SCALE_FIELDS` in `themes/utils/css_writer.py` |
| `shade` | `100`, `200`, `300`, `500`, `600`, `700`, `900` | `CURATED_SHADES` in `themes/utils/css_writer.py` |

Total combinations: **3 × 7 × 7 = 147**.

All 147 are real shipping classes in `nce_theme.css` — verified against the emitter loop at `css_writer.py:307-316` which writes `.theme-bg-{role}-{shade}`, `.theme-text-{role}-{shade}`, and `.theme-border-{role}-{shade}` (the three kinds the picker emits) for every curated shade of every role in `SHADE_SCALE_FIELDS`. The same loop also emits `.theme-text-{role}-{shade}-fg` and `.theme-text-{role}-{shade}-fg-tonal`, which the picker uses for the overlay (§6) but does not itself emit as output.

**Non-curated shades (50, 400, 800, 950)** are *not* surfaced in the picker. The underlying `--nce-color-{role}-{shade}` CSS variables exist for those stops, but no Tailwind class is emitted — clicking one would write a class that doesn't paint. The picker hides them entirely.

---

## 8. Embed targets

Three host contexts, one shared core.

### 8.1 Vue (`panel_page_v2` and other Vue apps)

```vue
<ThemeSwatchPicker
  theme-field="theme"
  value-field="header_color"
  v-model:open="pickerOpen"
/>
```

Component: `Themes/frontend/src/components/ThemeSwatchPicker.vue`.

### 8.2 Frappe Desk forms (any app)

In a Client Script or `form.js`:

```js
frappe.ui.themeSwatchPicker.open({
  frm,
  themeField: "theme",       // Link → NCE Theme doc name; resolved to slug
  valueField: "header_color",
});
// Returns Promise<boolean> — await or .then()
```

The `frappe.ui.themeSwatchPicker` object is exposed by the UMD bundle. The init function reads the current values from `frm.doc`, **resolves `themeField` (Link → NCE Theme doc name) to the theme's `slug` via `frappe.db.get_value`**, opens the modal, and on swatch click calls `frm.set_value(valueField, "<chosen-class>")` so Frappe's standard dirty-tracking and save flow handle the rest.

### 8.3 Standalone HTML page

```html
<script src="/assets/themes/dist/theme-swatch-picker.umd.js"></script>
<input id="theme" value="dawn">
<input id="header_color" value="">
<button id="pick">Pick color</button>
<script>
  document.getElementById("pick").addEventListener("click", () => {
    window.themeSwatchPicker.open({
      themeFieldEl: document.getElementById("theme"),
      valueFieldEl: document.getElementById("header_color"),
    });
  });
</script>
```

The three embed targets are thin adapters over a **framework-agnostic core** (§9).

---

## 9. Source layout & build

All source lives in the **Themes app**.

```
Themes/
├─ frontend/src/
│  ├─ components/
│  │  └─ ThemeSwatchPicker.vue              ← Vue 3 SFC (~150 LOC est.)
│  └─ widget/
│     ├─ theme-swatch-picker-core.ts        ← framework-agnostic DOM core
│     │                                       exports: { open(opts), close() }
│     └─ adapters/
│        ├─ desk-adapter.ts                 ← Frappe Desk wrapper
│        └─ standalone-adapter.ts           ← plain-DOM wrapper
├─ frontend/vite.widget.config.js           ← Vite library mode, separate from SPA build
└─ themes/public/dist/
   ├─ theme-swatch-picker.es.js             ← ES module for Vue/ESM consumers
   ├─ theme-swatch-picker.umd.js            ← UMD for Desk + standalone consumers
   └─ theme-swatch-picker.css               ← scoped styles
```

**Build.**
- Vite library mode, separate config from the existing editor SPA build (`vite.config.js`).
- Output goes to `themes/public/dist/`, served by Frappe at `/assets/themes/dist/`.
- Add an `npm run build:widget` script in `frontend/package.json`.
- Frappe `hooks.py` lists the UMD bundle in `app_include_js` so it's available everywhere on Desk without each consumer having to opt in.

**Why library mode and not just dropping the Vue component into nce_events.** See §10 in the design rationale.

---

## 10. Design rationale

**Why ship from Themes, not nce_events.**

1. **Code lives in the app whose domain it serves.** This widget's only purpose is to pick a theme-aware class. The contract it emits against (`THEME_CLASS_CONTRACT.json`), the CSS variables it depends on (`--nce-color-*`), and the utility classes it paints with are all owned by Themes. Putting the picker anywhere else means its correctness depends on a file in another repo.
2. **Avoid dependency inversion.** `nce_events` depends on Themes. If the picker lived in `nce_events`, every other app wanting the picker would have to depend on `nce_events`, turning it into a horizontal utility library it isn't. Themes already *is* that horizontal utility everyone depends on.
3. **Lockstep versioning.** When Gray becomes a real role, the edit to `SHADE_SCALE_FIELDS` in `css_writer.py` and the un-stubbing of the Gray row in the widget go in the same commit, same PR. Cross-repo coordination is avoided.

**Why no buttons in the modal.**
- The theme already defines the palette. There is no "default" to restore — every swatch is equally valid.
- A custom hex doesn't map to a theme class, so an "Other" escape hatch contradicts the output contract.
- A Cancel button is redundant when backdrop-click and Esc already cancel.

**Why no Kind=Text/Border preview as a text or border swatch.**
- A border-only swatch is too narrow to read at swatch size.
- A text-only swatch renders as a single letter on white.
- Using `theme-bg-*` for the swatch tile in all three Kind modes keeps the visual signal constant. The radio choice still controls what gets emitted; the swatch is just the color reference.

**Why hide non-curated shades instead of falling back to the nearest curated one.**
- Falling back silently turns a click on shade 400 into shade 500 without telling the user. The picker would be lying about what it just wrote.
- Hiding makes the constraint visible: "these are the shades available." No confusion.

---

## 11. Future extension points

### 11.1 Gray as a real theme role

When `themes/utils/css_writer.py` is extended to include `gray_color` in `SHADE_SCALE_FIELDS` (with a base hex picker and a warmth tuning control in the editor):

- Uncomment the Gray-row stub in `theme-swatch-picker-core.ts` (single marked location).
- Gray gets the Text overlay rule: opt-in by adding `"gray"` to the overlay-allowed list.
- No other widget changes required — the core reads the role list from a constant that mirrors `SHADE_SCALE_FIELDS`.

### 11.2 Dynamic role list

If a future use case needs to restrict which roles a particular field can pick from (e.g. a "success_color" field that should only allow Success/Info/Warning roles):

Add an optional `roles` prop accepting an allowlist. Core filters the Role radio column.

### 11.3 Overlay role list

The "Text" overlay rule (Primary/Secondary only) lives as a single constant in the core. To widen it (e.g. all 7 roles for an editorial site), edit that constant. No layout changes required.

### 11.4 Selected-line dimming

For polish: when the cursor leaves the swatch strip, dim the "Selected:" line back to the field's current value rather than the last-hovered preview. Small CSS-only change.

---

## 12. Verification plan

After implementation, before merging:

1. **Class existence.** For every (kind, role, shade) ∈ {3 × 7 × 7}, grep `themes/public/css/nce_theme.css` (after `bench` publish) and confirm the literal class string is present. Should match 147 hits across the three kind variants.
2. **Reactive theme switch.** Open the picker on a Page Panel form. While the modal is open, change the Theme link field. Swatches re-paint, footer label updates, no scroll-jump.
3. **Persisted value round-trip.** Pick `theme-text-secondary-500`. Save the form. Reload. Re-open picker. Confirm Kind=Text and Role=Secondary radios initialize correctly.
4. **Three host targets.** Open the picker successfully from a `panel_page_v2` form, a vanilla Desk form (any DocType with a Custom Field bound via Client Script), and a standalone test page. Same artifact, three different mount paths.
5. **Hidden-shade audit.** Inspect the rendered DOM with React/Vue devtools. Confirm only 7 swatches per role row (no 50/400/800/950).
6. **Foreground overlay.** Switch to a theme whose Primary is a light pastel. Confirm the overlay "Text" word is dark on the light-shade swatches and light on the dark-shade swatches — i.e. the `-fg` class behaves as `pick_fg_mono` intended.
7. **Output sanity.** Click swatches across all Kind/Role/Shade combinations. Confirm `valueField` receives exactly `theme-{kind}-{role}-{shade}`, no whitespace, no double prefix.

---

## 13. Source-of-truth references

| Thing | File | Symbol |
|---|---|---|
| Roles with shade ramps | `themes/utils/css_writer.py` | `SHADE_SCALE_FIELDS` (line 76) |
| Curated shade stops | `themes/utils/css_writer.py` | `CURATED_SHADES = (100, 200, 300, 500, 600, 700, 900)` (line 51) |
| Class emitter | `themes/utils/css_writer.py` | `_emit_role_shade_classes` (line 300) |
| Foreground picker | `themes/utils/theme_color_utils.py` | `pick_fg_mono` |
| Public class contract | `THEME_CLASS_CONTRACT.json` (project root) | `color_roles` |
| Existing hex-picker for reference | `Themes/frontend/src/components/SwatchPicker.vue` | full file |

When any of those change, this spec and the widget implementation must be updated in lockstep.

---

## 14. Open items / questions for follow-up

None at sign-off time. If implementation discovers an issue — e.g. a Desk-side dirty-tracking edge case when `frm.set_value` is called from outside the form's event loop, or a Vite library-mode quirk with CSS extraction — log it as a TODO comment in the widget core and surface it back in the PR description.
