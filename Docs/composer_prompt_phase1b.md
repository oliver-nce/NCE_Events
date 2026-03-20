# Composer Prompt — Phase 1b: Vue Components

**Paste this entire prompt into a new Composer session.**
**Prerequisite:** Phase 1a must be completed first (CSS, DocTypes, hooks).

---

## CONTEXT

Read these files FIRST before making any changes:
- `Docs/form_builder_design.md` — full architecture
- `Docs/project_reference.md` — codebase conventions
- `nce_events/public/js/panel_page_v2/App.vue` — existing root component
- `nce_events/public/js/panel_page_v2/composables/usePanel.js` — existing composable pattern
- `nce_events/public/js/panel_page_v2/components/PanelFloat.vue` — existing component pattern

You are building Vue 3 components for a card/form builder. Cards are modal
overlays that display Frappe DocType records. The card layout is defined
by a "Card Definition" DocType with child tables for each widget type.

## CONVENTIONS

- Vue 3 Composition API with `<script setup>`
- Import from `"vue"` (not from frappe-ui for now)
- Use `frappe.db.*` and `frappe.call()` for all server communication
  (these are globally available — no import needed)
- All CSS must use CSS variables from `theme_defaults.css`
  (e.g. `var(--bg-card)`, `var(--text-color)`, `var(--border-radius)`)
- No external dependencies — only Vue 3 core
- Files go in `nce_events/public/js/panel_page_v2/components/` or
  `nce_events/public/js/panel_page_v2/composables/`

---

## TASK 1: Create `useCardForm.js` composable

**Create:** `nce_events/public/js/panel_page_v2/composables/useCardForm.js`

Export a function `useCardForm(rootDoctype)` that returns reactive state
and methods for loading/managing a card form.

**State:**
- `cardDef` (shallowRef, null) — the Card Definition doc with all child tables
- `record` (ref, null) — the root DocType record from `frappe.db.get_doc`
- `meta` (ref, {}) — object keyed by doctype name, each value is the result
  of `frappe.call('frappe.client.get_doctype', {doctype})`
- `resolvedHops` (ref, {}) — object keyed by hop path string, value is resolved
- `loading` (ref, false)
- `error` (ref, null)

**Methods:**

`load(cardDefName, recordName)`:
1. Set loading=true, error=null
2. Fetch Card Definition: `frappe.db.get_doc('Card Definition', cardDefName)`
   This returns the doc with all child table arrays (tabs, fields_list,
   displays, portals, portal_columns, text_blocks, pivot_tables, graphics,
   videos, web_viewers, actions, scripts).
3. Store in cardDef
4. Fetch root DocType meta: `frappe.call('frappe.client.get_doctype', {doctype: rootDoctype})`
   Store in `meta[rootDoctype]`
5. Fetch record: `frappe.db.get_doc(rootDoctype, recordName)`. Store in record.
6. Pre-resolve hop paths: iterate all fields_list and displays rows. For any
   row where `path` contains a dot, call `resolveHopPath(path)` and store
   result in `resolvedHops[path]`.
7. Set loading=false. Catch errors → set error=String(e).

`resolveHopPath(path)`:
1. Split path by dots. If only 1 part, return `record.value[parts[0]]`.
2. For hop paths like `venue.venue_name`:
   - `parts[0]` = link field name on root doc (e.g. "venue")
   - Get the linked record name: `record.value[parts[0]]` (e.g. "VENUE-001")
   - If null, return null
   - Find the Link field in meta to get target doctype:
     `meta.value[rootDoctype].fields.find(f => f.fieldname === parts[0] && f.fieldtype === 'Link')`
   - Target doctype = field.options (e.g. "Venue")
   - Fetch the value: `frappe.db.get_value(targetDoctype, linkedName, parts[1])`
   - Return the value
3. For 3+ hops, chain the lookups (fetch intermediate docs as needed).

`saveField(fieldname, value)`:
1. `await frappe.db.set_value(rootDoctype, record.value.name, fieldname, value)`
2. Update local: `record.value[fieldname] = value`

`refresh()`:
1. Re-fetch record via `frappe.db.get_doc`
2. Re-resolve all hop paths

Return all state and methods.

Use the same `frappeCall` wrapper pattern from `usePanel.js`:
```js
function frappeCall(method, args) {
    return new Promise((resolve, reject) => {
        frappe.call({
            method, args,
            callback: (r) => (r.message ? resolve(r.message) : reject("Empty response")),
            error: reject,
        });
    });
}
```

For `frappe.db.*` calls, wrap them in Promises since they return thenables:
```js
const doc = await new Promise((resolve, reject) => {
    frappe.db.get_doc(doctype, name).then(resolve).catch(reject);
});
```

---

## TASK 2: Create `WidgetGrid.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/WidgetGrid.vue`

**Props:**
- `widgets` — Array of objects: `{type, x, y, w, h, config}` (required)
- `gridColumns` — Number (default: 12)
- `gridRows` — Number (default: 10)
- `cellSize` — Number (default: 50)
- `record` — Object (the current record)
- `meta` — Object (DocType meta cache)
- `resolvedHops` — Object (pre-resolved hop values)
- `scripts` — Array (Card Script rows, for action execution)

**Emits:** `save-field`, `open-card`

**Template:**
```vue
<div class="widget-grid" :style="gridStyle">
    <div
        v-for="widget in widgets"
        :key="widget.id || widget.type + '-' + widget.x + '-' + widget.y"
        class="widget-item"
        :style="widgetStyle(widget)"
    >
        <component
            :is="widgetMap[widget.type]"
            :config="widget.config"
            :record="record"
            :meta="meta"
            :resolved-hops="resolvedHops"
            :scripts="scripts"
            @save-field="(...args) => $emit('save-field', ...args)"
            @open-card="(...args) => $emit('open-card', ...args)"
        />
    </div>
</div>
```

**Script:**
Import FieldWidget and DisplayWidget (other widgets added in Phase 2).

```js
const widgetMap = {
    field: FieldWidget,
    display: DisplayWidget,
}
```

Computed `gridStyle`:
```js
const gridStyle = computed(() => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${props.gridColumns}, ${props.cellSize}px)`,
    gridTemplateRows: `repeat(${props.gridRows}, ${props.cellSize}px)`,
    gap: '4px',
}))
```

Function `widgetStyle(widget)`:
```js
function widgetStyle(w) {
    return {
        gridColumn: `${w.x + 1} / span ${w.w}`,
        gridRow: `${w.y + 1} / span ${w.h}`,
        overflow: 'hidden',
    }
}
```

**Style:** `.widget-grid` has `position: relative`. `.widget-item` has
`min-width: 0; min-height: 0;` (prevents grid blowout).

---

## TASK 3: Create `FieldWidget.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/FieldWidget.vue`

**Props:** `config` (Object), `record` (Object), `meta` (Object)
**Emits:** `save-field`

`config` has: `path` (string), `editable` (boolean).

**Script:**
1. Get the field's value: `record[config.path]` (only works for direct fields,
   not hop paths — those go through DisplayWidget)
2. Find field meta: search `meta[rootDoctype].fields` for matching `fieldname`
   (the root doctype is derived from `record.doctype`).
   `const fieldMeta = computed(() => meta?.[record?.doctype]?.fields?.find(f => f.fieldname === config.path))`
3. Local `localValue` ref initialized from record value, updated on record change
4. Map fieldtype to input type (see table below)
5. On blur or Enter: if value changed, emit `save-field` with `{fieldname: config.path, value: localValue.value}`

**Fieldtype mapping:**
- Data → `<input type="text">`
- Int → `<input type="number">`
- Float, Currency → `<input type="number" step="0.01">`
- Select → `<select>` with `<option>` for each value in `fieldMeta.options.split('\n')`
- Date → `<input type="date">`
- Check → `<input type="checkbox">`
- Small Text, Text, Text Editor → `<textarea>`
- Link → `<input type="text">` (Phase 2 replaces with LinkInput)
- Everything else → `<input type="text">`

**Template:**
```vue
<div class="field-widget">
    <label class="field-label" :class="{ required: fieldMeta?.reqd }">
        {{ fieldMeta?.label || config.path }}
    </label>
    <!-- render appropriate input based on fieldtype -->
    <input v-if="inputType === 'text'" type="text"
        v-model="localValue" :readonly="!config.editable"
        class="field-input" @blur="onSave" @keydown.enter="onSave" />
    <!-- ... similar for number, date, checkbox, textarea, select -->
</div>
```

**Style:** `.field-widget` with `display: flex; flex-direction: column; height: 100%;`
`.field-label` with `font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 2px;`
`.field-label.required::after` with `content: ' *'; color: red;`
`.field-input` with `flex: 1; border: 1px solid var(--input-border); border-radius: var(--border-radius-sm); padding: 4px 8px; font-size: var(--font-size-base);`
`.field-input:focus` with `border-color: var(--input-focus-border); outline: none;`
`.field-input[readonly]` with `background: var(--bg-surface); cursor: default;`

---

## TASK 4: Create `DisplayWidget.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/DisplayWidget.vue`

**Props:** `config` (Object), `record` (Object), `resolvedHops` (Object)

`config` has: `path` (string), `label` (string, optional).

**Script:**
```js
const displayValue = computed(() => {
    if (props.config.path.includes('.')) {
        return props.resolvedHops?.[props.config.path] ?? ''
    }
    return props.record?.[props.config.path] ?? ''
})

const displayLabel = computed(() => {
    if (props.config.label) return props.config.label
    const parts = props.config.path.split('.')
    const last = parts[parts.length - 1]
    return last.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
})
```

**Template:**
```vue
<div class="display-widget">
    <label class="display-label">{{ displayLabel }}</label>
    <span class="display-value">{{ displayValue }}</span>
</div>
```

**Style:** Same layout as FieldWidget but value is plain text with
`background: var(--bg-surface); padding: 4px 8px; border-radius: var(--border-radius-sm);`

---

## TASK 5: Create `ActionsPanel.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/ActionsPanel.vue`

**Props:**
- `actions` — Array (Card Action rows, sorted by sort_order)
- `scripts` — Array (Card Script rows)
- `record` — Object

**Emits:** `open-card`, `refresh`

**Script:**
```js
function findScript(actionScriptName) {
    return props.scripts.find(s => s.script_name === actionScriptName)
}

function resolveTokens(str) {
    if (!str || !props.record) return str
    return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => props.record[key] || '')
}

async function executeAction(action) {
    const script = findScript(action.action_script)
    if (!script) {
        frappe.msgprint(`Script "${action.action_script}" not found`)
        return
    }
    switch (script.script_type) {
        case 'server':
            await frappe.call({
                method: script.method,
                args: { name: props.record.name },
                callback() {
                    frappe.show_alert({ message: `${action.label} completed`, indicator: 'green' })
                    emit('refresh')
                }
            })
            break
        case 'open_url':
            window.open(resolveTokens(script.method), '_blank')
            break
        case 'open_card':
            emit('open-card', {
                cardDefName: script.method,
                doctype: props.record.doctype,
                name: props.record.name
            })
            break
        case 'frappe_action':
            if (script.method === 'print') {
                // Open Frappe print dialog
                window.open(`/printview?doctype=${props.record.doctype}&name=${props.record.name}`, '_blank')
            }
            break
        default:
            console.warn('Unknown script type:', script.script_type)
    }
}
```

**Template:**
```vue
<div class="actions-panel">
    <button
        v-for="action in sortedActions"
        :key="action.name || action.label"
        class="action-btn"
        @click="executeAction(action)"
    >
        {{ action.label }}
    </button>
</div>
```

Where `sortedActions = computed(() => [...props.actions].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))`.

**Style:** `.actions-panel` with `width: 140px; flex-shrink: 0; display: flex; flex-direction: column; gap: var(--spacing-sm); padding: var(--spacing-sm);`
`.action-btn` styled with CSS variables: `background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); padding: var(--spacing-sm) var(--spacing-md); cursor: pointer; font-size: var(--font-size-sm); text-align: left;`
`.action-btn:hover` with `background: var(--primary-light);`

---

## TASK 6: Create `TabBar.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/TabBar.vue`

**Props:**
- `tabs` — Array (Card Tab rows, sorted by sort_order)
- `activeTab` — String (current tab label)

**Emits:** `update:activeTab`

**Script:**
```js
const sortedTabs = computed(() =>
    [...props.tabs].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
)
const showBar = computed(() => {
    if (sortedTabs.value.length <= 1 && sortedTabs.value[0]?.hide_bar) return false
    return sortedTabs.value.length > 1
})
```

**Template:**
```vue
<div v-if="showBar" class="tab-bar">
    <button
        v-for="tab in sortedTabs"
        :key="tab.label"
        :class="['tab-btn', { active: activeTab === tab.label }]"
        @click="$emit('update:activeTab', tab.label)"
    >
        {{ tab.label }}
    </button>
</div>
```

**Style:** `.tab-bar` with `display: flex; gap: 0; border-bottom: 1px solid var(--border-color); margin-bottom: var(--spacing-md);`
`.tab-btn` with `padding: var(--spacing-sm) var(--spacing-lg); border: none; background: none; cursor: pointer; font-size: var(--font-size-base); color: var(--text-muted); border-bottom: 2px solid transparent;`
`.tab-btn.active` with `color: var(--text-color); border-bottom-color: var(--tab-active-border); font-weight: var(--font-weight-bold);`
`.tab-btn:hover` with `color: var(--text-color);`

---

## TASK 7: Create `CardForm.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/CardForm.vue`

This is the main card renderer that composes all other components.

**Props:** `cardDefName` (String), `doctype` (String), `recordName` (String)
**Emits:** `open-card`, `close`

**Script:**
1. Import and use `useCardForm(doctype)` composable
2. On mount, call `cardForm.load(cardDefName, recordName)`
3. Track `activeTab` ref — initialized to the first tab's label after load
4. Compute `activeWidgets`: collect ALL widget rows from the Card Definition's
   child tables (fields_list, displays, text_blocks, portals, pivot_tables,
   graphics, videos, web_viewers) that have `tab === activeTab.value`.
   Normalize each into `{type, id, x, y, w, h, config: {...}}` format:
   - fields_list rows → `{type: 'field', config: {path: row.path, editable: row.editable}}`
   - displays rows → `{type: 'display', config: {path: row.path, label: row.label}}`
   - (Other widget types will be added in Phase 2, for now just field + display)
5. Compute `cardStyles`: parse `cardDef.styles_json` if present
6. Handle `onSaveField({fieldname, value})` → call `cardForm.saveField(fieldname, value)`

**Template:**
```vue
<div class="card-form" :style="cardStyles">
    <div class="card-form-header">
        <span class="card-title">{{ cardDef?.title || doctype }}</span>
        <span class="card-record-name">{{ recordName }}</span>
        <button class="card-close-btn" @click="$emit('close')">&times;</button>
    </div>
    <div v-if="loading" class="card-loading">Loading…</div>
    <div v-else-if="error" class="card-error">{{ error }}</div>
    <div v-else class="card-form-body">
        <ActionsPanel
            v-if="cardDef?.actions?.length"
            :actions="cardDef.actions"
            :scripts="cardDef.scripts || []"
            :record="record"
            @open-card="(...a) => $emit('open-card', ...a)"
            @refresh="onRefresh"
        />
        <div class="card-form-content">
            <TabBar
                v-if="cardDef?.tabs?.length"
                :tabs="cardDef.tabs"
                v-model:active-tab="activeTab"
            />
            <WidgetGrid
                :widgets="activeWidgets"
                :grid-columns="cardDef?.grid_columns || 12"
                :grid-rows="cardDef?.grid_rows || 10"
                :cell-size="cardDef?.grid_cell_size || 50"
                :record="record"
                :meta="meta"
                :resolved-hops="resolvedHops"
                :scripts="cardDef?.scripts || []"
                @save-field="onSaveField"
                @open-card="(...a) => $emit('open-card', ...a)"
            />
        </div>
    </div>
</div>
```

**Style:**
`.card-form` with `display: flex; flex-direction: column; height: 100%; background: var(--bg-card); color: var(--text-color); font-family: var(--font-family);`
`.card-form-header` with `display: flex; align-items: center; padding: var(--spacing-sm) var(--spacing-md); background: var(--bg-header); color: var(--text-header); border-radius: var(--border-radius) var(--border-radius) 0 0;`
`.card-title` with `font-weight: var(--font-weight-bold); font-size: var(--font-size-lg); flex: 1;`
`.card-record-name` with `font-size: var(--font-size-sm); opacity: 0.8; margin-right: var(--spacing-md);`
`.card-close-btn` with `background: none; border: none; color: var(--text-header); font-size: 20px; cursor: pointer; opacity: 0.8;` and `:hover` opacity: 1
`.card-form-body` with `flex: 1; display: flex; overflow: hidden;`
`.card-form-content` with `flex: 1; overflow: auto; padding: var(--spacing-md);`
`.card-loading, .card-error` with `padding: var(--spacing-lg); text-align: center;`
`.card-error` with `color: red;`

---

## TASK 8: Create `CardModal.vue`

**Create:** `nce_events/public/js/panel_page_v2/components/CardModal.vue`

**Props:** `cardDefName` (String), `doctype` (String), `recordName` (String)
**Emits:** `open-card`, `close`

**Template:**
```vue
<Teleport to="body">
    <div class="card-modal-backdrop" @click.self="$emit('close')">
        <div class="card-modal">
            <CardForm
                :card-def-name="cardDefName"
                :doctype="doctype"
                :record-name="recordName"
                @open-card="(...a) => $emit('open-card', ...a)"
                @close="$emit('close')"
            />
        </div>
    </div>
</Teleport>
```

**Script:**
Add Escape key listener:
```js
import { onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['open-card', 'close'])

function onKeyDown(e) {
    if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeyDown))
onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
```

**Style:**
```css
.card-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 60px;
    overflow-y: auto;
    z-index: 1000;
}
.card-modal {
    width: 90vw;
    max-width: 1200px;
    max-height: calc(100vh - 120px);
    overflow: hidden;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
}
```

---

## TASK 9: Integrate CardModal into App.vue

**Modify:** `nce_events/public/js/panel_page_v2/App.vue`

Make these specific changes:

1. Add import at top of `<script setup>`:
   ```js
   import CardModal from "./components/CardModal.vue";
   ```

2. Add after `const tagFinderDoctype = ref("");`:
   ```js
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

   function onOpenCard(cfg) {
       openCardModal(cfg.cardDefName, cfg.doctype, cfg.name);
   }
   ```

3. In the template, add BEFORE the closing `</div>` of `.ppv2-root`:
   ```vue
   <CardModal
       v-for="(card, i) in cardStack"
       :key="'card-' + card.id"
       :card-def-name="card.cardDefName"
       :doctype="card.doctype"
       :record-name="card.recordName"
       :style="{ zIndex: 1000 + i }"
       @open-card="onOpenCard"
       @close="closeTopCard"
   />
   ```

4. Modify the existing `onDrill` function. Replace the ENTIRE function with:
   ```js
   async function onDrill(ev, parentPanel) {
       const filter = {};
       if (ev.linkField && ev.rowName) {
           filter[ev.linkField] = ev.rowName;
       }
       try {
           const r = await new Promise((resolve) => {
               frappe.db.get_value(
                   'Card Definition',
                   { root_doctype: ev.doctype, is_default: 1 },
                   'name'
               ).then(res => resolve(res.message?.name || null)).catch(() => resolve(null));
           });
           if (r && ev.rowName) {
               openCardModal(r, ev.doctype, ev.rowName);
               return;
           }
       } catch (e) { /* fall through to panel */ }
       openPanel(ev.doctype, filter);
   }
   ```

Do NOT modify any other functions in App.vue.

---

## IMPORTANT NOTES

- Do NOT install any npm packages
- Do NOT modify `package.json` or `vite.config.js`
- All `frappe.db.*` calls are globally available — do NOT import them
- All CSS must use `var(--xxx)` variables, never hardcoded hex colors
- Use `<script setup>` for all new components
- Use `defineProps`, `defineEmits`, `computed`, `ref`, `onMounted` from "vue"
- After all tasks, list the files you created/modified
- Do NOT run build commands — the user will build manually
