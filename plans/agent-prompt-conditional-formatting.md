# Coding Agent Prompt — Conditional Formatting on Panel Columns

## Objective

Add a per-field conditional formatting rule to the Page Panel Display matrix. Each rule has a boolean SQL expression and a set of style overrides (color, font weight, italic, underline). When the rule evaluates true for a row, the styles are applied to that field's cell in the rendered panel.

**Design rules:**
- **One rule per field.** Any combination of style toggles is allowed (KISS — no priority, no overlap merging).
- **No `tab` prefix.** Author writes `event_name` (root) or `venues.location` (related DocType name). Backend resolves to qualified SQL.
- **Validate before save.** Editor has a Validate button that round-trips to the server, executes the expression with `LIMIT 1`, and refuses to save until the current text has been validated successfully.
- **Color picker** is the pre-OKLCH grid+hex+HSV picker from the peer Themes repo at commit `5cd16b4`, stripped down to single-color output (no shade strip).

---

## Files to modify / create

| # | Path | Action |
|---|---|---|
| 1 | `nce_events/nce_events/doctype/page_panel_format_rule/` | Create child DocType |
| 2 | `nce_events/nce_events/doctype/page_panel/page_panel.json` | Add `format_rules` Table field |
| 3 | `nce_events/public/js/panel_page_v2/components/ColorPicker.vue` | Port from Themes `5cd16b4:frontend/src/components/BrandColorPicker.vue`, strip shades |
| 4 | `nce_events/public/js/panel_page_v2/components/FormatRuleEditor.vue` | New — popover body |
| 5 | `nce_events/public/js/panel_page_v2/mount_format_rule_editor.js` | New — Vue island mount helper for Desk |
| 6 | `nce_events/nce_events/doctype/page_panel/page_panel.js` | Add Conditional Formatting column + edit-dialog wiring + sync |
| 7 | `nce_events/api/panel_api_pkg/format_rules.py` | New — `validate_format_rule` endpoint and reference resolver |
| 8 | `nce_events/api/panel_api_pkg/__init__.py` | Export new functions |
| 9 | `nce_events/api/panel_api_pkg/sql.py` | Emit `CASE WHEN (...) AS _fmt_<field>` columns |
| 10 | `nce_events/api/panel_api_pkg/panel_data.py` | Include `format_rules` in config dict |
| 11 | `nce_events/public/js/panel_page_v2/components/PanelTable.vue` | Apply rule styles in `cellStyle` |

**Do NOT touch** Form Dialog code, Card Definition code, tag system, WP readback, or any composable not listed. Scope is the Display tab + panel data + table cell rendering.

---

## Step 1 — Create child DocType `Page Panel Format Rule`

**Path:** `nce_events/nce_events/doctype/page_panel_format_rule/page_panel_format_rule.json`

```json
{
  "actions": [],
  "creation": "2026-06-05 00:00:00.000000",
  "doctype": "DocType",
  "engine": "InnoDB",
  "field_order": [
    "field_name",
    "condition_sql",
    "color",
    "font_weight",
    "italic",
    "underline",
    "last_validated_sql"
  ],
  "fields": [
    {
      "fieldname": "field_name",
      "fieldtype": "Data",
      "in_list_view": 1,
      "label": "Field Name",
      "reqd": 1,
      "description": "Column key this rule targets. Either a root field (event_name) or related-DocType field (venues.location)."
    },
    {
      "fieldname": "condition_sql",
      "fieldtype": "Small Text",
      "in_list_view": 1,
      "label": "Condition SQL",
      "reqd": 1,
      "description": "Boolean expression. Wrapped as CASE WHEN (<expr>) THEN 1 ELSE 0 END. No `tab` prefix needed. Use bare field names for root fields, <related_dt>.<field> for joined fields."
    },
    {
      "fieldname": "color",
      "fieldtype": "Data",
      "label": "Color",
      "description": "Hex color (#RRGGBB). Blank = do not override color."
    },
    {
      "fieldname": "font_weight",
      "fieldtype": "Select",
      "label": "Font Weight",
      "options": "\n200\n300\n400\n500\n600\n700\n800",
      "description": "Blank = do not override weight."
    },
    {
      "default": "0",
      "fieldname": "italic",
      "fieldtype": "Check",
      "label": "Italic"
    },
    {
      "default": "0",
      "fieldname": "underline",
      "fieldtype": "Check",
      "label": "Underline"
    },
    {
      "fieldname": "last_validated_sql",
      "fieldtype": "Small Text",
      "hidden": 1,
      "label": "Last Validated SQL",
      "description": "Resolved SQL captured by the Validate button. Used to verify save-time text matches what was validated."
    }
  ],
  "istable": 1,
  "modified": "2026-06-05 00:00:00.000000",
  "modified_by": "Administrator",
  "module": "NCE Events",
  "name": "Page Panel Format Rule",
  "owner": "Administrator",
  "permissions": [],
  "sort_field": "modified",
  "sort_order": "DESC",
  "states": [],
  "track_changes": 0
}
```

Also create `__init__.py` (empty) and `page_panel_format_rule.py` with a stub controller:

```python
import frappe
from frappe.model.document import Document

class PagePanelFormatRule(Document):
    pass
```

---

## Step 2 — Add `format_rules` table field to Page Panel

**File:** `nce_events/nce_events/doctype/page_panel/page_panel.json`

In `field_order` (lines 8–37), insert `"format_rules"` after `"unstored_calculation_fields"`:

```json
"unstored_calculation_fields",
"format_rules",
"column_order",
```

In the `fields` array, immediately after the `unstored_calculation_fields` block (currently lines 73–79), insert:

```json
{
  "description": "Per-column conditional formatting rules (managed by Display tab).",
  "fieldname": "format_rules",
  "fieldtype": "Table",
  "label": "Conditional Formatting Rules",
  "options": "Page Panel Format Rule"
},
```

Do not change any other field. Do not change `modified` date — Frappe will bump it on migrate.

---

## Step 3 — Port the color picker

**Source:** Themes repo, commit `5cd16b4`, path `frontend/src/components/BrandColorPicker.vue`.

Retrieve content with:

```bash
git -C /Users/oliver2/Documents/_NCE_projects/Themes show 5cd16b4:frontend/src/components/BrandColorPicker.vue
```

**Destination:** `nce_events/public/js/panel_page_v2/components/ColorPicker.vue`.

**Strip these pieces** from the ported file:
- The `<div v-if="showShades && shades.length" ...>` block in the template (the shade strip below the trigger).
- `showShades` prop in `defineProps` and its `withDefaults`.
- The `shades` computed and the `import { generateShades } from "@/utils/color-shades"` line.

**Keep:** the trigger button, grid (anchor row + gray row + tinted rows), hex input with copy + EyeDropper, H/S/V sliders + numeric inputs, Apply button, Teleport-to-body popover and backdrop dismiss.

**Convert TS → JS** if the rest of the panel_page_v2 code uses `<script setup>` without TypeScript (verify by checking other components — if they use `<script setup>`, drop `lang="ts"` and the type annotations; if they use `lang="ts"`, keep as-is).

**Final API:** `<ColorPicker v-model="hex" label="Color" />`. Emits `update:modelValue` with `#RRGGBB`.

---

## Step 4 — Build the rule editor component

**File:** `nce_events/public/js/panel_page_v2/components/FormatRuleEditor.vue`

Props:
- `rootDoctype: String` — the panel's root DocType, needed for the validate call.
- `fieldName: String` — read-only, displayed at top.
- `rule: Object` — `{ condition_sql, color, font_weight, italic, underline, last_validated_sql }`.

Emits:
- `update:rule` (rule object) — on every internal change.
- `validated` (resolved SQL string) — after a successful Validate.
- `apply` — when the user clicks Apply (the Frappe dialog closes on this).
- `clear` — when the user clicks Clear Rule (host clears the row).

Layout:

```
┌──────────────────────────────────────────────────────────┐
│ Field: event_name                              [Clear]   │
├──────────────────────────────────────────────────────────┤
│ Condition (SQL):                                         │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ status = 'Cancelled' AND price > 0                   │ │
│ └──────────────────────────────────────────────────────┘ │
│ Reference any column. Bare = root; <dt>.<field> = related│
│ [Validate]   ✓ Valid    or    ✗ <mysql error>            │
├──────────────────────────────────────────────────────────┤
│ Styles (any combination):                                │
│ [✓] Color           <ColorPicker v-model="rule.color"/>  │
│ [✓] Font Weight     <select 200..800/>                   │
│ [✓] Italic                                               │
│ [✓] Underline                                            │
├──────────────────────────────────────────────────────────┤
│                                  [Cancel]  [Apply]       │
└──────────────────────────────────────────────────────────┘
```

Behavior:
- Apply button is **disabled** unless `rule.last_validated_sql` is set AND the current `condition_sql` (trimmed) was the input that produced it. Track via a local `validatedFor` ref holding the exact text last sent to validate.
- Validate button calls `frappe.call('nce_events.api.panel_api_pkg.format_rules.validate_format_rule', {root_doctype, field_name, condition_sql})`. On `{ok:true}` set `rule.last_validated_sql` to the returned `resolved_sql` and emit `validated`. On `{ok:false}` show `error` inline.
- The four "apply X" toggles in this editor are implicit: a color is "applied" iff `rule.color` is non-empty; same for `font_weight`. Italic/underline are direct booleans. Display the color picker / weight select **only** when their checkbox is on; clearing the checkbox sets the value to null.

---

## Step 5 — Vue island mount helper

**File:** `nce_events/public/js/panel_page_v2/mount_format_rule_editor.js`

Exports a single function:

```js
export function mountFormatRuleEditor(containerEl, options) {
    // options: { rootDoctype, fieldName, rule, onApply, onClear, onUpdate }
    // Creates a Vue 3 app, mounts FormatRuleEditor into containerEl,
    // wires emits to the callbacks, returns the app instance so caller can unmount.
}
```

This is needed because the Display matrix lives in `page_panel.js` (Frappe Desk jQuery world), not the Vue SPA. The host opens a Frappe `Dialog` with an HTML field, then mounts a one-component Vue island into that HTML field's DOM node.

Build the bundle so the file is exposed at `/assets/nce_events/js/panel_page_v2/mount_format_rule_editor.js` and add an `app_include_js` entry in `hooks.py` (or wire via existing panel_page_v2 build output — verify the existing build pipeline before adding a new entry).

---

## Step 6 — Display matrix UI changes

**File:** `nce_events/nce_events/doctype/page_panel/page_panel.js`

**6a. New column in `_build_field_matrix` (currently lines 845–934).**

In the header section around line 862, after the `Tint` `<th>` and before the optional `Title` `<th>`, insert:

```javascript
html += `<th ${th_style} style="text-align:center;padding:4px 8px;border-bottom:2px solid #d1d8dd;color:#6c7680;white-space:normal;line-height:1.1;min-width:90px;">Conditional<br>Formatting</th>`;
```

In the per-row section around line 925 (after the tint cell, before the title cell), insert:

```javascript
const fmtRule = (saved.format_rules || {})[key];
const fmtHasRule = !!(fmtRule && (fmtRule.condition_sql || "").trim());
const fmtIcon = fmtHasRule
    ? '<span style="color:#4198F0;">●</span>'
    : '<span style="color:#b7babe;">○</span>';
html += `<td ${td}><button class="btn btn-xs pp-fmt-edit" data-key="${esc_key}" style="padding:0 6px;font-size:11px;">${fmtIcon} Edit</button></td>`;
```

**6b. Saved-state plumbing.**

The existing matrix code (search for `saved.bold`, `saved.search`, etc. around lines 530–620) builds a `saved` object from `frm.doc` CSV fields. Add a parallel `saved.format_rules`:

- On load: read `frm.doc.format_rules` (the child table). Build `saved.format_rules` as `{ [field_name]: {condition_sql, color, font_weight, italic, underline, last_validated_sql} }`.
- On sync (the `_sync_all` block around line 361): rebuild the child table from `saved.format_rules` whenever a rule changes:
  ```javascript
  frm.clear_table("format_rules");
  Object.entries(saved.format_rules || {}).forEach(([fn, r]) => {
      if (!(r.condition_sql || "").trim()) return;  // skip empties
      const row = frm.add_child("format_rules");
      row.field_name = fn;
      row.condition_sql = r.condition_sql;
      row.color = r.color || "";
      row.font_weight = r.font_weight || "";
      row.italic = r.italic ? 1 : 0;
      row.underline = r.underline ? 1 : 0;
      row.last_validated_sql = r.last_validated_sql || "";
  });
  frm.refresh_field("format_rules");
  ```

**6c. Click handler.**

In the matrix event-wiring block (around lines 695–815 where existing handlers like Show/Search-Only are wired), add:

```javascript
m.$matrix.on("click", ".pp-fmt-edit", function () {
    const key = $(this).data("key");
    _open_format_rule_dialog(frm, saved, key, _sync_all);
});
```

**6d. `_open_format_rule_dialog` helper.**

Append a new function to `page_panel.js`:

```javascript
function _open_format_rule_dialog(frm, saved, fieldKey, _sync_all) {
    const rule = Object.assign(
        { condition_sql: "", color: "", font_weight: "", italic: 0, underline: 0, last_validated_sql: "" },
        saved.format_rules[fieldKey] || {}
    );
    const d = new frappe.ui.Dialog({
        title: __("Conditional Formatting — {0}", [fieldKey]),
        size: "large",
        fields: [{ fieldtype: "HTML", fieldname: "host" }],
    });
    d.show();
    const host = d.fields_dict.host.$wrapper[0];

    // Mount the Vue island
    import("/assets/nce_events/js/panel_page_v2/mount_format_rule_editor.js").then((mod) => {
        const app = mod.mountFormatRuleEditor(host, {
            rootDoctype: frm.doc.root_doctype,
            fieldName: fieldKey,
            rule: rule,
            onUpdate: (r) => Object.assign(rule, r),
            onApply: () => {
                saved.format_rules[fieldKey] = { ...rule };
                _sync_all();
                app.unmount();
                d.hide();
            },
            onClear: () => {
                delete saved.format_rules[fieldKey];
                _sync_all();
                app.unmount();
                d.hide();
            },
        });
        d.$wrapper.on("hidden.bs.modal", () => app.unmount());
    });
}
```

---

## Step 7 — Reference resolver + validate endpoint

**File:** `nce_events/api/panel_api_pkg/format_rules.py` (new)

```python
from __future__ import annotations
import re
import frappe
from frappe import _


_TOKEN_RE = re.compile(r"\b([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?\b")


def _build_resolution_maps(root_doctype: str) -> tuple[dict, dict, set]:
    """Returns (root_fields, related_lookup, sql_keywords) for resolving references.

    - root_fields: { fieldname_lower: actual_fieldname } from root meta
    - related_lookup: { related_dt_lower: (link_fieldname, related_dt_name) }
      Only populated when exactly one link points to that DocType.
    """
    meta = frappe.get_meta(root_doctype)
    root_fields = {f.fieldname.lower(): f.fieldname for f in meta.fields if f.fieldname}
    root_fields["name"] = "name"

    by_target: dict[str, list[str]] = {}
    for f in meta.fields:
        if f.fieldtype == "Link" and f.options:
            by_target.setdefault(f.options, []).append(f.fieldname)

    related_lookup: dict = {}
    for target_dt, link_fields in by_target.items():
        if len(link_fields) == 1:
            related_lookup[target_dt.lower()] = (link_fields[0], target_dt)

    sql_keywords = {
        "and", "or", "not", "null", "is", "in", "between", "like", "true", "false",
        "case", "when", "then", "else", "end", "if", "exists", "any", "all",
    }
    return root_fields, related_lookup, sql_keywords


def _resolve_references(condition_sql: str, root_doctype: str) -> str:
    """Translate user-friendly references into qualified SQL.

    - bare `fieldname` → `` `tabRoot`.`fieldname` `` if it's a root field
    - `related_dt.fieldname` → `` `tabRelated`.`fieldname` ``

    Anything not matching is left alone (keywords, literals, function calls).
    """
    root_fields, related_lookup, keywords = _build_resolution_maps(root_doctype)
    root_table = f"`tab{root_doctype}`"

    def repl(m: re.Match) -> str:
        left = m.group(1)
        right = m.group(2)
        left_l = left.lower()

        if right is None:
            # Bare token — only qualify if it's a root field. Skip keywords & literals.
            if left_l in keywords:
                return m.group(0)
            if left_l in root_fields:
                return f"{root_table}.`{root_fields[left_l]}`"
            return m.group(0)

        # Dotted form
        if left_l in related_lookup:
            _, target_dt = related_lookup[left_l]
            return f"`tab{target_dt}`.`{right}`"

        # If `left` looks like a link fieldname on the root (legacy form), allow it too.
        if left_l in root_fields:
            meta = frappe.get_meta(root_doctype)
            for f in meta.fields:
                if f.fieldname.lower() == left_l and f.fieldtype == "Link" and f.options:
                    return f"`tab{f.options}`.`{right}`"

        return m.group(0)

    return _TOKEN_RE.sub(repl, condition_sql)


@frappe.whitelist()
def validate_format_rule(root_doctype: str, field_name: str, condition_sql: str) -> dict:
    """Resolve references and execute the expression against the root table with LIMIT 1.

    Returns {ok: True, resolved_sql} or {ok: False, error}.
    """
    if not frappe.has_permission("Page Panel", "write"):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    condition_sql = (condition_sql or "").strip()
    if not condition_sql:
        return {"ok": False, "error": "Expression is empty."}

    try:
        resolved = _resolve_references(condition_sql, root_doctype)
    except Exception as e:
        return {"ok": False, "error": f"Reference resolution failed: {e}"}

    root_table = f"`tab{root_doctype}`"

    # Build join list for any related tables referenced
    join_clauses: list[str] = []
    seen: set = set()
    root_fields, related_lookup, _ = _build_resolution_maps(root_doctype)
    for related_lower, (link_fn, target_dt) in related_lookup.items():
        if f"`tab{target_dt}`" in resolved and target_dt not in seen:
            join_clauses.append(
                f"LEFT JOIN `tab{target_dt}` ON {root_table}.`{link_fn}` = `tab{target_dt}`.`name`"
            )
            seen.add(target_dt)

    probe = (
        f"SELECT CASE WHEN ({resolved}) THEN 1 ELSE 0 END AS _fmt "
        f"FROM {root_table} {' '.join(join_clauses)} LIMIT 1"
    )
    try:
        frappe.db.sql(probe)
        return {"ok": True, "resolved_sql": resolved}
    except Exception as e:
        return {"ok": False, "error": str(e)}
```

**Export in `nce_events/api/panel_api_pkg/__init__.py`:** add `from .format_rules import validate_format_rule` and append `"validate_format_rule"` to `__all__`.

---

## Step 8 — Emit format-rule columns in panel SQL

**File:** `nce_events/api/panel_api_pkg/sql.py` — modify `_build_panel_sql` (lines 14–133).

After `select_parts` is assembled (whether in the linked-fields branch line 104 or the simple branch line 128), append one synthetic column per format rule:

```python
from nce_events.api.panel_api_pkg.format_rules import _resolve_references

format_rules = config.get("format_rules") or []
extra_joins: list[str] = []
for idx, rule in enumerate(format_rules):
    expr = (rule.get("condition_sql") or "").strip()
    if not expr:
        continue
    try:
        resolved = _resolve_references(expr, root_doctype)
    except Exception:
        continue  # skip broken rules silently in SQL build; UI shows errors
    flag = f"_fmt_{rule['field_name'].replace('.', '__')}"
    select_parts.append(f"CASE WHEN ({resolved}) THEN 1 ELSE 0 END AS `{flag}`")

    # Auto-join related tables referenced by the resolved SQL
    for link_fn, target_dt in link_targets.items():
        if f"`tab{target_dt}`" in resolved:
            join_key = f"_fmt_{target_dt}"
            if join_key not in seen_joins:
                join_clauses.append(
                    f"LEFT JOIN `tab{target_dt}` ON {root_table}.`{link_fn}` = `tab{target_dt}`.`name`"
                )
                seen_joins.add(join_key)
```

**Important:** the simple-branch (no `linked_fields`) currently builds `select_parts` without joins. If a format rule references a related table, the simple branch must promote itself to the linked-fields path. Easiest: always run the linked-fields branch when `format_rules` is non-empty AND any rule's resolved SQL contains a `` `tab... ` `` not equal to `root_table`. Refactor the branch condition accordingly.

---

## Step 9 — Expose format rules in config dict

**File:** `nce_events/api/panel_api_pkg/panel_data.py` — modify `_panel_config_from_doc` (lines 70–193).

Around the existing `tint_by_gender` block (line 151), add:

```python
format_rules = []
for r in (doc.format_rules or []):
    fn = (r.field_name or "").strip()
    if not fn or not (r.condition_sql or "").strip():
        continue
    format_rules.append({
        "field_name": fn,
        "condition_sql": r.condition_sql,
        "color": (r.color or "").strip() or None,
        "font_weight": (r.font_weight or "").strip() or None,
        "italic": bool(r.italic),
        "underline": bool(r.underline),
        "flag_key": f"_fmt_{fn.replace('.', '__')}",
    })
```

Add `"format_rules": format_rules,` to the returned dict (around line 193). Also add `"format_rules": [],` to the empty-panel fallback in `get_panel_config` (lines 197–232).

---

## Step 10 — Apply rules in the table cell

**File:** `nce_events/public/js/panel_page_v2/components/PanelTable.vue` — modify `cellStyle` (lines 545–552).

```javascript
const formatRulesByCol = computed(() => {
    const m = {};
    (props.config.format_rules || []).forEach((r) => {
        m[r.field_name.toLowerCase()] = r;
    });
    return m;
});

function cellStyle(row, col) {
    const style = { color: genderColor(row, col) || "var(--nce-color-text)" };
    if (isBoldColumn(col)) style.fontWeight = "700";

    // Conditional formatting overlay
    const rule = formatRulesByCol.value[String(col.fieldname).toLowerCase()];
    if (rule && row[rule.flag_key] === 1) {
        if (rule.color) style.color = rule.color;
        if (rule.font_weight) style.fontWeight = rule.font_weight;
        if (rule.italic) style.fontStyle = "italic";
        if (rule.underline) style.textDecoration = "underline";
    }
    return style;
}
```

`formatRulesByCol` lives at the same scope as `genderTintSet` (around line 462).

The `_fmt_*` columns ride along on each row object because they're in the SELECT list; no other consumer cares about them, so no further changes needed.

---

## Acceptance criteria

1. The Display matrix in the Page Panel form (Display Config → Events / Event Types / Venues sub-tabs) shows a new "Conditional Formatting" column with a wrapped header. Each row has an Edit button.
2. Clicking Edit opens a Frappe Dialog containing the Vue editor with: field name (read-only), condition textarea, Validate button, four style toggles (Color picker, Font Weight 200–800 select, Italic, Underline), Cancel / Apply buttons, plus a Clear button to remove the rule.
3. **Validate** correctly resolves `event_name` → `` `tabEvents`.`event_name` `` and `venues.location` → `` `tabVenues`.`location` ``. Invalid SQL returns the MySQL error inline.
4. Apply is disabled until the current `condition_sql` text has just been validated successfully.
5. Saving the Page Panel persists rules into the `format_rules` child table. Reopening the form shows the existing rules.
6. The generated `panel_sql` (visible on the Query tab) includes one extra `CASE WHEN ... AS _fmt_<field>` column per active rule, plus any required `LEFT JOIN` for related references.
7. In the rendered panel (Vue SPA), cells whose row has `_fmt_<field> = 1` show the configured color / weight / italic / underline. Cells with `0` show default styles. Combining multiple style toggles in one rule works.
8. Removing all style toggles (color blank, weight blank, italic off, underline off) but keeping the condition still renders the cell unchanged — the rule effectively does nothing, no error.
9. Deleting a rule via the Clear button removes the corresponding child row on next save.

## Out of scope

- Multiple rules per field (single rule per field is final spec).
- Cell background color (foreground only for v1).
- Rule expressions referencing computed columns (computed columns are SELECT aliases; v1 documents this as a non-feature).
- Animations, hover states, or any cross-cell conditional styling.
- Migration of existing `bold_fields` / `gender_color_fields` into the new rule system — those keep working as-is.
