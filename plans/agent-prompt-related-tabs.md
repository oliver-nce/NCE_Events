# Coding Agent Prompt — Show Related-DocType Tabs in Form Dialog

## Objective

After the frozen-schema tabs are parsed, append one extra tab for each entry in `related_doctypes` (saved on the Form Dialog definition). These tabs appear at the right of the existing tab bar. They have no content yet — just a placeholder message. This is Vue-side only; no Desk changes.

**Scope**: append empty placeholder tabs. Do NOT build data-fetching, panel tables, or any other content inside them.

---

## Files to modify (2 files only)

1. `nce_events/public/js/panel_page_v2/composables/useFrozenFormLoad.js`
2. `nce_events/public/js/panel_page_v2/components/PanelFormDialogBody.vue`

**Do NOT modify**: `parseLayout.js`, `usePanelFormDialog.js`, `PanelFormDialog.vue`, `form_dialog_api.py`, or any other file.

---

## How tabs work today

1. `useFrozenFormLoad.js` → `load()` calls `get_form_dialog_definition` which returns `defn`.
2. `defn.frozen_meta.fields` is parsed by `parseLayout(fields)` into a tabs array.
3. Each tab object has shape: `{ label: string, sections: Section[] }`.
4. `tabs.value = parseLayout(fields)` (line 101) sets the reactive ref.
5. `PanelFormDialogBody.vue` receives `tabs` as a prop and renders a tab-bar button for each, plus a tab-panel with sections/columns/fields.

The definition now also includes `defn.related_doctypes` — an array like:
```json
[
  { "doctype": "Event Session", "link_field": "event", "label": "Event Sessions" },
  { "doctype": "Enrollment", "link_field": "event", "label": "Enrollments" }
]
```

---

## Step 1 — Append related tabs in `useFrozenFormLoad.js`

**File**: `nce_events/public/js/panel_page_v2/composables/useFrozenFormLoad.js`

After line 101 (`tabs.value = parseLayout(fields);`), add code to append one tab per related doctype:

```js
tabs.value = parseLayout(fields);

// Append placeholder tabs for related DocTypes
const relatedDoctypes = defn.related_doctypes || [];
for (const rel of relatedDoctypes) {
    tabs.value.push({
        label: rel.label || rel.doctype,
        sections: [],
        _related: rel,   // marker for PanelFormDialogBody to identify these tabs
    });
}
```

The `_related` property is a simple marker object that `PanelFormDialogBody` can check to render placeholder content instead of the normal sections/columns/fields layout. It carries `{ doctype, link_field, label }` for future use when we add actual content.

Update the debug line that follows to reflect the new count:

```js
pushDebug("parseLayout", true, `fields=${fields.length} tabs=${tabs.value.length} (incl ${relatedDoctypes.length} related)`);
```

**That is the only change to this file.**

---

## Step 2 — Render placeholder content for related tabs in `PanelFormDialogBody.vue`

**File**: `nce_events/public/js/panel_page_v2/components/PanelFormDialogBody.vue`

Inside the tab-panel rendering loop, add a branch for related tabs. Currently the template has (lines 19–57):

```html
<div class="ppv2-fd-tab-panels">
    <div
        v-for="(tab, ti) in tabs"
        :key="ti"
        class="ppv2-fd-tab-panel"
        :class="{ 'ppv2-fd-tab-panel-active': tabs.length === 1 || activeTab === ti }"
    >
        <div
            v-for="(section, si) in tab.sections"
            :key="si"
            class="ppv2-fd-section"
        >
            <!-- ... section/column/field rendering ... -->
        </div>
    </div>
</div>
```

Change the **inner content** of each tab-panel `<div>` to conditionally check for `tab._related`:

```html
<div class="ppv2-fd-tab-panels">
    <div
        v-for="(tab, ti) in tabs"
        :key="ti"
        class="ppv2-fd-tab-panel"
        :class="{ 'ppv2-fd-tab-panel-active': tabs.length === 1 || activeTab === ti }"
    >
        <!-- Related-DocType placeholder tab -->
        <div v-if="tab._related" class="ppv2-fd-related-placeholder">
            <p class="ppv2-fd-related-placeholder-text">
                {{ tab._related.label || tab._related.doctype }} — coming soon
            </p>
        </div>

        <!-- Normal frozen-schema tab -->
        <template v-else>
            <div
                v-for="(section, si) in tab.sections"
                :key="si"
                class="ppv2-fd-section"
            >
                <h3 v-if="section.label" class="ppv2-fd-section-label">
                    {{ section.label }}
                </h3>
                <p v-if="section.description" class="ppv2-fd-section-desc">
                    {{ section.description }}
                </p>

                <div
                    class="ppv2-fd-columns"
                    :style="{ gridTemplateColumns: 'repeat(' + section.columns.length + ', 1fr)' }"
                >
                    <div v-for="(col, ci) in section.columns" :key="ci">
                        <PanelFormField
                            v-for="field in col.fields"
                            :key="field.fieldname"
                            :field="field"
                            :model-value="formData[field.fieldname]"
                            :visible="isFieldVisible(field)"
                            :mandatory="isFieldMandatory(field)"
                            :read-only="isFieldReadOnly(field)"
                            @change="(p) => $emit('field-change', p)"
                            @link-change="(p) => $emit('link-change', p)"
                        />
                    </div>
                </div>
            </div>
        </template>
    </div>
</div>
```

Add minimal styling for the placeholder in the `<style scoped>` section:

```css
.ppv2-fd-related-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    color: var(--text-muted);
}
.ppv2-fd-related-placeholder-text {
    font-size: var(--font-size-base);
    font-style: italic;
}
```

---

## What NOT to do

- Do NOT modify `parseLayout.js` — the related tabs are appended after it runs
- Do NOT modify `usePanelFormDialog.js` or `PanelFormDialog.vue` — no changes needed there
- Do NOT modify any backend files — the API already returns `related_doctypes`
- Do NOT add data fetching, panel tables, or any real content to the related tabs
- Do NOT change the tab bar rendering logic — it already works with any array of `{ label }` objects

---

## Expected result

When a Form Dialog has `related_doctypes` saved (e.g. "Event Sessions" and "Enrollments"), the dialog tab bar should show:

```
[ Details ] [ Sku ] [ Eligibility ] [ Sessions ] [ 2 ] [ Event Sessions ] [ Enrollments ]
```

Clicking "Event Sessions" or "Enrollments" shows a centered italic placeholder: "Event Sessions — coming soon".

---

## Testing checklist

1. **Dialog with related_doctypes saved**: Open a Form Dialog that has related_doctypes (from the previous task). Verify the extra tabs appear at the right end of the tab bar.

2. **Tab switching works**: Click a related tab — it should show the placeholder. Click back to a normal tab — the form fields should still render correctly.

3. **Dialog with no related_doctypes**: Open a Form Dialog that has no related_doctypes (or null). Verify no extra tabs appear — behavior is identical to before.

4. **Tab count in debug overlay**: If `localStorage nce_fd_load_debug=1`, the debug log should show the updated count including related tabs.

5. **Row navigation**: Use prev/next arrows to navigate between records. Verify the related tabs still appear for each record (they come from the definition, not the doc).
