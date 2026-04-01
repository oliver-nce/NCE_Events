# Dynamic Form Rendering: Frappe UI from Desk Form Schema

## Project Goal

Build a Vue-based presentation layer using **Frappe UI** components that dynamically renders entry forms. The form layout, field definitions, sections, columns, tabs, and field properties are read from the **saved Frappe Desk form view** (the DocType JSON schema + any Customize Form / Property Setter overrides). The Desk form definition acts as the single source of truth ("rules") for the Frappe UI form.

---

## Architecture Overview

```
┌─────────────────────────────────┐
│   Frappe Backend (Python)       │
│                                 │
│  DocType JSON ──► Property      │
│  (base schema)   Setters        │
│       │          (overrides)    │
│       ▼                         │
│  frappe.get_meta(doctype)       │
│  Returns merged metadata:       │
│  fields[], permissions[],       │
│  search_fields, title_field,    │
│  etc.                           │
└──────────┬──────────────────────┘
           │  REST API / call()
           ▼
┌─────────────────────────────────┐
│   Frappe UI Frontend (Vue)      │
│                                 │
│  1. Fetch DocType metadata      │
│  2. Parse field list into       │
│     layout tree (tabs →         │
│     sections → columns →        │
│     fields)                     │
│  3. Map Frappe fieldtypes to    │
│     Frappe UI Vue components    │
│  4. Render form dynamically     │
│  5. Save via REST API           │
└─────────────────────────────────┘
```

---

## Step 1: Fetching the DocType Schema

### API Endpoint

The recommended way to fetch the full DocType metadata (including all customizations applied):

```javascript
// Using frappe-ui's call() or createResource()
const meta = await call('frappe.client.get_doctype', {
  doctype: 'Your DocType'
})
```

This returns `meta.docs[0]` with the full DocType document including:

- `fields` — ordered array of all DocField objects
- `permissions` — array of DocPerm objects
- `search_fields`, `title_field`, `image_field`
- `sort_field`, `sort_order`
- `is_submittable`, `is_tree`, `istable`
- `links` — DocType Link actions
- `actions` — DocType Action buttons

### Alternative: Direct Field Fetch

```javascript
const fields = await call('frappe.client.get_list', {
  doctype: 'DocField',
  filters: { parent: 'Your DocType' },
  fields: ['*'],
  order_by: 'idx asc',
  limit_page_length: 0
})
```

### Fetching with Customizations Merged

`frappe.client.get_doctype` already returns metadata with **all customizations applied** (Custom Fields, Property Setters, Customize Form changes). This is because it internally calls `frappe.get_meta()` which merges:

1. Base DocType JSON (from the app's doctype directory)
2. Custom Fields (from `tabCustom Field`)
3. Property Setters (from `tabProperty Setter`)

No extra step is needed to get the customized version.

### REST API Alternative

```
GET /api/method/frappe.client.get_doctype?doctype=Your%20DocType
Authorization: token api_key:api_secret
```

---

## Step 2: Understanding the DocField Schema

Each field object in `meta.docs[0].fields` has these key properties:

### Core Properties

| Property       | Type    | Description |
|----------------|---------|-------------|
| `fieldname`    | string  | Unique identifier for the field (also the DB column name) |
| `fieldtype`    | string  | The type of field (Data, Link, Select, Section Break, etc.) |
| `label`        | string  | Human-readable label displayed on the form |
| `idx`          | int     | Order index (fields are already sorted by idx) |
| `options`      | string  | Context-dependent: for Link = target DocType, for Select = newline-separated options, for Table = child DocType |

### Display & Validation Properties

| Property         | Type    | Description |
|------------------|---------|-------------|
| `reqd`           | 0/1     | Field is mandatory |
| `read_only`      | 0/1     | Field is not editable |
| `hidden`         | 0/1     | Field is not visible |
| `default`        | string  | Default value |
| `description`    | string  | Help text shown below the field |
| `placeholder`    | string  | Placeholder text for input |
| `in_list_view`   | 0/1     | Show in list view columns |
| `in_standard_filter` | 0/1 | Show in standard filters |
| `bold`           | 0/1     | Show label in bold |
| `unique`         | 0/1     | Value must be unique |
| `no_copy`        | 0/1     | Don't copy value when duplicating |
| `allow_on_submit` | 0/1   | Editable after submit |
| `translatable`   | 0/1     | Value is translatable |
| `in_preview`     | 0/1     | Show in link preview popup |
| `length`         | int     | Max character length (for Data fields) |
| `precision`      | string  | Decimal precision (for Currency/Float) |

### Conditional Display Properties

| Property           | Type    | Description |
|--------------------|---------|-------------|
| `depends_on`       | string  | JS expression — field is visible only when this evaluates to truthy. Example: `eval:doc.status=='Open'` |
| `mandatory_depends_on` | string | JS expression — field is mandatory only when truthy |
| `read_only_depends_on` | string | JS expression — field is read-only when truthy |

### Fetch From Properties

| Property         | Type    | Description |
|------------------|---------|-------------|
| `fetch_from`     | string  | Auto-fetch value from a linked document. Format: `link_field.remote_field` |
| `fetch_if_empty` | 0/1     | Only auto-fetch if current value is empty |

### Layout-Only Field Types

These fieldtypes are not data fields — they define the form layout structure:

| Fieldtype        | Purpose |
|------------------|---------|
| `Tab Break`      | Starts a new tab. `label` = tab name |
| `Section Break`  | Starts a new section within a tab. `label` = section heading (optional). `collapsible` = 1 makes it collapsible |
| `Column Break`   | Starts a new column within a section |

---

## Step 3: All Frappe Fieldtypes

### Data Entry Fields

| Fieldtype       | Description | Frappe UI Component Suggestion |
|-----------------|-------------|-------------------------------|
| `Data`          | Single-line text | `TextInput` |
| `Small Text`    | Multi-line, 3-4 rows | `Textarea` (rows: 3) |
| `Text`          | Multi-line, 5+ rows | `Textarea` (rows: 5) |
| `Text Editor`   | Rich text (Quill-based in Desk) | `TextEditor` |
| `Code`          | Code with syntax highlighting | `Code` or `Textarea` with monospace |
| `HTML Editor`   | Raw HTML editing | `Textarea` with monospace |
| `Markdown Editor` | Markdown editing | `Textarea` with preview |
| `Int`           | Integer number | `TextInput` (type: number) |
| `Float`         | Decimal number | `TextInput` (type: number, step: any) |
| `Currency`      | Money amount | `TextInput` (type: number) with currency symbol |
| `Percent`       | 0-100 percentage | `TextInput` (type: number) with % |
| `Date`          | Date picker | `DatePicker` |
| `Datetime`      | Date + time picker | `DateTimePicker` |
| `Time`          | Time picker | `TextInput` (type: time) |
| `Duration`      | Time duration | Custom component |
| `Check`         | Boolean checkbox | `Checkbox` |
| `Select`        | Dropdown single-select | `Select` (options from field.options split by \n) |
| `Link`          | Foreign key to another DocType | `Link` (options = target doctype) |
| `Dynamic Link`  | Link where target DocType is determined by another field | `Link` (options comes from the field named in `options`) |
| `Password`      | Masked text | `TextInput` (type: password) |
| `Phone`         | Phone number | `TextInput` (type: tel) |
| `Rating`        | Star rating (0-1 scale) | `Rating` |
| `Color`         | Color picker | `ColorPicker` or native color input |
| `Attach`        | Single file upload | `FileUploader` |
| `Attach Image`  | Single image upload | `FileUploader` (accept: image/*) |
| `Signature`     | Signature pad | Custom canvas component |
| `Geolocation`   | Map coordinates | Custom map component |
| `Barcode`       | Barcode value | `TextInput` |
| `Read Only`     | Display-only computed field | Rendered as text/span |
| `Autocomplete`  | Text with autocomplete suggestions | `Autocomplete` |
| `Icon`          | Icon picker | Custom component |
| `JSON`          | JSON data | `Code` (language: json) |

### Relationship Fields

| Fieldtype      | Description | Notes |
|----------------|-------------|-------|
| `Table`        | Child table (one-to-many) | `options` = child DocType name. Renders as editable grid. Requires fetching child DocType schema separately. |
| `Table MultiSelect` | Multi-select via link table | `options` = child DocType. Renders as tag-style multi-select. |

### Layout Fields (No Data)

| Fieldtype        | Description |
|------------------|-------------|
| `Tab Break`      | New tab |
| `Section Break`  | New section (optional heading + collapsible) |
| `Column Break`   | New column within section |
| `Heading`        | Display-only heading text |
| `HTML`           | Static HTML content (from `options`) |
| `Image`          | Display image (from field named in `options`) |
| `Fold`           | Hides everything below in an "Other Details" section |
| `Button`         | Action button (triggers JS event) |

---

## Step 4: Layout Parsing Algorithm

The field list is flat but encodes a nested layout via the layout fieldtypes. Parse it into a tree:

```
Tabs[] → Sections[] → Columns[] → Fields[]
```

### Parsing Logic

```javascript
/**
 * Parse a flat Frappe field list into a nested layout tree.
 * 
 * @param {Array} fields - Array of DocField objects, sorted by idx
 * @returns {Array} Array of tab objects
 * 
 * Each tab:   { label: string, sections: Section[] }
 * Each section: { label: string, collapsible: bool, columns: Column[] }
 * Each column:  { fields: DocField[] }
 */
export function parseLayout(fields) {
  const tabs = []
  let currentTab = { label: 'Details', sections: [] }
  let currentSection = { label: '', collapsible: false, columns: [] }
  let currentColumn = { fields: [] }

  for (const field of fields) {
    // Skip hidden fields
    if (field.hidden) continue

    const ft = field.fieldtype

    if (ft === 'Tab Break') {
      // Flush current state
      currentSection.columns.push(currentColumn)
      currentTab.sections.push(currentSection)
      if (hasVisibleFields(currentTab)) {
        tabs.push(currentTab)
      }
      // Start fresh tab
      currentTab = { label: field.label || 'Details', sections: [] }
      currentSection = { label: '', collapsible: false, columns: [] }
      currentColumn = { fields: [] }
    }
    else if (ft === 'Section Break') {
      // Flush column into section, section into tab
      currentSection.columns.push(currentColumn)
      currentTab.sections.push(currentSection)
      // Start fresh section
      currentSection = {
        label: field.label || '',
        collapsible: !!field.collapsible,
        description: field.description || '',
        columns: []
      }
      currentColumn = { fields: [] }
    }
    else if (ft === 'Column Break') {
      // Flush column, start new one
      currentSection.columns.push(currentColumn)
      currentColumn = { fields: [] }
    }
    else {
      // Regular data or display field
      currentColumn.fields.push(field)
    }
  }

  // Flush remaining
  currentSection.columns.push(currentColumn)
  currentTab.sections.push(currentSection)
  if (hasVisibleFields(currentTab)) {
    tabs.push(currentTab)
  }

  return tabs
}

function hasVisibleFields(tab) {
  return tab.sections.some(s =>
    s.columns.some(c => c.fields.length > 0)
  )
}
```

### Output Structure Example

For a DocType with fields:
```
Tab Break "Details"
  Section Break "Customer Info"
    Data "customer_name"
    Column Break
    Link "territory"
  Section Break "Contact"
    Data "email"
    Data "phone"
Tab Break "Accounting"
  Section Break
    Currency "outstanding_amount"
```

The parser produces:
```json
[
  {
    "label": "Details",
    "sections": [
      {
        "label": "Customer Info",
        "collapsible": false,
        "columns": [
          { "fields": [{ "fieldname": "customer_name", "fieldtype": "Data", "label": "Customer Name" }] },
          { "fields": [{ "fieldname": "territory", "fieldtype": "Link", "label": "Territory", "options": "Territory" }] }
        ]
      },
      {
        "label": "Contact",
        "collapsible": false,
        "columns": [
          { "fields": [
            { "fieldname": "email", "fieldtype": "Data", "label": "Email" },
            { "fieldname": "phone", "fieldtype": "Data", "label": "Phone" }
          ]}
        ]
      }
    ]
  },
  {
    "label": "Accounting",
    "sections": [
      {
        "label": "",
        "collapsible": false,
        "columns": [
          { "fields": [{ "fieldname": "outstanding_amount", "fieldtype": "Currency", "label": "Outstanding Amount" }] }
        ]
      }
    ]
  }
]
```

---

## Step 5: Fieldtype to Frappe UI Component Mapping

```javascript
// fieldTypeMap.js

/**
 * Maps Frappe fieldtypes to Frappe UI component configurations.
 * 
 * Returns: { component: string, props: object } for data fields
 * Returns: { layout: string } for layout fields
 * Returns: null for fields that should not render
 */
export function getComponentConfig(field) {
  const map = {
    // Text inputs
    'Data':            { component: 'FormControl', props: { type: 'text' } },
    'Small Text':      { component: 'FormControl', props: { type: 'textarea', rows: 3 } },
    'Text':            { component: 'FormControl', props: { type: 'textarea', rows: 5 } },
    'Text Editor':     { component: 'TextEditor', props: {} },
    'Code':            { component: 'FormControl', props: { type: 'textarea', rows: 8 } },
    'HTML Editor':     { component: 'FormControl', props: { type: 'textarea', rows: 8 } },
    'Markdown Editor': { component: 'FormControl', props: { type: 'textarea', rows: 8 } },
    'JSON':            { component: 'FormControl', props: { type: 'textarea', rows: 8 } },

    // Numeric
    'Int':       { component: 'FormControl', props: { type: 'number', step: 1 } },
    'Float':     { component: 'FormControl', props: { type: 'number', step: 'any' } },
    'Currency':  { component: 'FormControl', props: { type: 'number', step: 'any' } },
    'Percent':   { component: 'FormControl', props: { type: 'number', min: 0, max: 100 } },

    // Date/Time
    'Date':      { component: 'DatePicker', props: {} },
    'Datetime':  { component: 'DateTimePicker', props: {} },
    'Time':      { component: 'FormControl', props: { type: 'time' } },
    'Duration':  { component: 'FormControl', props: { type: 'text', placeholder: 'e.g. 1h 30m' } },

    // Boolean
    'Check': { component: 'Checkbox', props: {} },

    // Selection
    'Select': { component: 'FormControl', props: { type: 'select' } },

    // Relationships
    'Link':         { component: 'Link', props: {} },
    'Dynamic Link': { component: 'Link', props: {} },
    'Table':        { layout: 'table' },
    'Table MultiSelect': { layout: 'table_multiselect' },

    // File
    'Attach':       { component: 'FileUploader', props: {} },
    'Attach Image': { component: 'FileUploader', props: { accept: 'image/*' } },

    // Specialized
    'Password':     { component: 'FormControl', props: { type: 'password' } },
    'Phone':        { component: 'FormControl', props: { type: 'tel' } },
    'Rating':       { component: 'Rating', props: {} },
    'Color':        { component: 'FormControl', props: { type: 'color' } },
    'Autocomplete': { component: 'Autocomplete', props: {} },
    'Barcode':      { component: 'FormControl', props: { type: 'text' } },
    'Read Only':    { component: 'ReadOnly', props: {} },
    'Signature':    { component: 'Signature', props: {} },
    'Geolocation':  { component: 'Geolocation', props: {} },
    'Icon':         { component: 'FormControl', props: { type: 'text' } },

    // Display-only
    'Heading':      { layout: 'heading' },
    'HTML':         { layout: 'html' },
    'Image':        { layout: 'image' },
    'Button':       { layout: 'button' },
    'Fold':         { layout: 'fold' },

    // Layout (handled by parser, should not appear as fields)
    'Tab Break':     { layout: 'tab' },
    'Section Break': { layout: 'section' },
    'Column Break':  { layout: 'column' },
  }

  return map[field.fieldtype] || { component: 'FormControl', props: { type: 'text' } }
}
```

---

## Step 6: Vue Component Implementation

### DynamicForm.vue — Main Form Component

```vue
<template>
  <div class="dynamic-form">
    <!-- Tab bar (only if multiple tabs) -->
    <Tabs
      v-if="tabs.length > 1"
      v-model="activeTab"
      :tabs="tabs.map(t => ({ label: t.label }))"
    />

    <!-- Tab content -->
    <div
      v-for="(tab, ti) in tabs"
      :key="ti"
      v-show="tabs.length === 1 || activeTab === ti"
    >
      <!-- Sections -->
      <div
        v-for="(section, si) in tab.sections"
        :key="si"
        class="form-section mb-6"
      >
        <!-- Section heading -->
        <div
          v-if="section.label"
          class="section-header cursor-pointer flex items-center gap-2 mb-3"
          @click="section.collapsible && toggleSection(ti, si)"
        >
          <ChevronRight
            v-if="section.collapsible"
            :class="['h-4 w-4 transition-transform', { 'rotate-90': !collapsedSections[`${ti}-${si}`] }]"
          />
          <h3 class="text-lg font-semibold text-gray-900">
            {{ section.label }}
          </h3>
        </div>
        <p v-if="section.description" class="text-sm text-gray-600 mb-3">
          {{ section.description }}
        </p>

        <!-- Section body (columns as CSS grid) -->
        <div
          v-show="!section.collapsible || !collapsedSections[`${ti}-${si}`]"
          class="grid gap-4"
          :style="{ gridTemplateColumns: `repeat(${section.columns.length}, 1fr)` }"
        >
          <!-- Each column -->
          <div v-for="(col, ci) in section.columns" :key="ci">
            <DynamicField
              v-for="field in col.fields"
              :key="field.fieldname"
              :field="field"
              :doc="formData"
              :doctype="doctype"
              class="mb-4"
              @change="onFieldChange"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex gap-2 mt-6">
      <Button variant="solid" @click="save" :loading="saving">
        {{ isNew ? 'Create' : 'Save' }}
      </Button>
      <Button v-if="meta?.is_submittable && !isNew" @click="submit">
        Submit
      </Button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Button, Tabs, call } from 'frappe-ui'
import { parseLayout } from './parseLayout'
import DynamicField from './DynamicField.vue'

const props = defineProps({
  doctype: { type: String, required: true },
  name: { type: String, default: null }  // null = new document
})

const emit = defineEmits(['saved', 'error'])

const meta = ref(null)
const tabs = ref([])
const activeTab = ref(0)
const formData = reactive({})
const collapsedSections = reactive({})
const saving = ref(false)
const isNew = computed(() => !props.name)

onMounted(async () => {
  // 1. Fetch DocType metadata (includes all customizations)
  const result = await call('frappe.client.get_doctype', {
    doctype: props.doctype
  })
  meta.value = result.docs[0]

  // 2. Parse flat field list into layout tree
  tabs.value = parseLayout(meta.value.fields)

  // 3. Initialize form data with defaults
  for (const field of meta.value.fields) {
    if (field.fieldname && !isLayoutField(field.fieldtype)) {
      formData[field.fieldname] = field.default || null
    }
  }

  // 4. If editing, load the existing document
  if (props.name) {
    const doc = await call('frappe.client.get', {
      doctype: props.doctype,
      name: props.name
    })
    Object.assign(formData, doc)
  }
})

function isLayoutField(fieldtype) {
  return ['Tab Break', 'Section Break', 'Column Break',
          'Heading', 'HTML', 'Image', 'Fold'].includes(fieldtype)
}

function toggleSection(tabIdx, sectionIdx) {
  const key = `${tabIdx}-${sectionIdx}`
  collapsedSections[key] = !collapsedSections[key]
}

function onFieldChange({ fieldname, value }) {
  formData[fieldname] = value
}

async function save() {
  saving.value = true
  try {
    const result = await call('frappe.client.save', {
      doc: { doctype: props.doctype, ...formData }
    })
    Object.assign(formData, result)
    emit('saved', result)
  } catch (error) {
    emit('error', error)
  } finally {
    saving.value = false
  }
}

async function submit() {
  formData.docstatus = 1
  await save()
}
</script>
```

### DynamicField.vue — Field Renderer

```vue
<template>
  <!-- Table fields -->
  <DynamicTable
    v-if="config?.layout === 'table'"
    :field="field"
    :rows="modelValue || []"
    @change="onChange"
  />

  <!-- Heading display -->
  <h4 v-else-if="config?.layout === 'heading'" class="text-base font-semibold">
    {{ field.label }}
  </h4>

  <!-- Static HTML display -->
  <div v-else-if="config?.layout === 'html'" v-html="field.options" />

  <!-- Button -->
  <Button
    v-else-if="config?.layout === 'button'"
    @click="$emit('button-click', field.fieldname)"
  >
    {{ field.label }}
  </Button>

  <!-- Data entry fields -->
  <div v-else-if="config?.component" :class="{ hidden: !isVisible }">

    <!-- Select field -->
    <FormControl
      v-if="field.fieldtype === 'Select'"
      :label="field.label"
      type="select"
      :options="selectOptions"
      :modelValue="modelValue"
      :required="isMandatory"
      :disabled="isReadOnly"
      @change="e => onChange(e.target.value)"
    />

    <!-- Link field -->
    <Link
      v-else-if="field.fieldtype === 'Link'"
      :label="field.label"
      :doctype="field.options"
      :modelValue="modelValue"
      :required="isMandatory"
      :disabled="isReadOnly"
      @change="onChange"
    />

    <!-- Check field -->
    <div v-else-if="field.fieldtype === 'Check'" class="flex items-center gap-2">
      <input
        type="checkbox"
        :checked="!!modelValue"
        :disabled="isReadOnly"
        @change="e => onChange(e.target.checked ? 1 : 0)"
      />
      <label class="text-sm">{{ field.label }}</label>
    </div>

    <!-- All other FormControl-based fields -->
    <FormControl
      v-else
      :label="field.label"
      :type="config.props?.type || 'text'"
      :modelValue="modelValue"
      :required="isMandatory"
      :disabled="isReadOnly"
      :placeholder="field.placeholder || ''"
      v-bind="config.props"
      @change="e => onChange(e.target?.value ?? e)"
    />

    <!-- Description / help text -->
    <p v-if="field.description" class="text-xs text-gray-500 mt-1">
      {{ field.description }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { FormControl, Button } from 'frappe-ui'
import { getComponentConfig } from './fieldTypeMap'
// import Link from './Link.vue'           // Your Link component
// import DynamicTable from './DynamicTable.vue'  // Your child table component

const props = defineProps({
  field: { type: Object, required: true },
  doc: { type: Object, required: true },
  doctype: { type: String, required: true }
})

const emit = defineEmits(['change', 'button-click'])

const config = computed(() => getComponentConfig(props.field))

const modelValue = computed(() => props.doc[props.field.fieldname])

const selectOptions = computed(() => {
  if (props.field.fieldtype === 'Select' && props.field.options) {
    return props.field.options.split('\n').map(o => ({
      label: o,
      value: o
    }))
  }
  return []
})

// --- Conditional property evaluation ---

const isVisible = computed(() => {
  if (props.field.hidden) return false
  if (!props.field.depends_on) return true
  return evaluateExpression(props.field.depends_on, props.doc)
})

const isMandatory = computed(() => {
  if (props.field.mandatory_depends_on) {
    return evaluateExpression(props.field.mandatory_depends_on, props.doc)
  }
  return !!props.field.reqd
})

const isReadOnly = computed(() => {
  if (props.field.read_only_depends_on) {
    return evaluateExpression(props.field.read_only_depends_on, props.doc)
  }
  return !!props.field.read_only
})

/**
 * Evaluate a Frappe depends_on expression.
 *
 * Formats:
 *   "eval:doc.status=='Open'"  — JS expression with doc in scope
 *   "fieldname"                 — truthy check on field value
 *   ""                          — always true
 */
function evaluateExpression(expr, doc) {
  if (!expr) return true
  if (expr.startsWith('eval:')) {
    try {
      const code = expr.slice(5)
      return new Function('doc', `return (${code})`)(doc)
    } catch {
      return true
    }
  }
  // Simple fieldname reference — truthy check
  return !!doc[expr]
}

function onChange(value) {
  emit('change', { fieldname: props.field.fieldname, value })
}
</script>
```

---

## Step 7: Handling Child Tables (fieldtype "Table")

Child tables require fetching a second DocType schema (the child DocType named in `field.options`) and rendering an editable grid.

```javascript
// Fetch child DocType metadata
const childMeta = await call('frappe.client.get_doctype', {
  doctype: field.options // e.g. "Quotation Item"
})

// The child's fields define the grid columns
// Filter to fields where in_list_view === 1 for the default visible columns
const gridColumns = childMeta.docs[0].fields.filter(f =>
  f.in_list_view && !isLayoutField(f.fieldtype)
)
```

Each row in the child table is a separate document in `formData[field.fieldname]` (an array of objects). When saving, Frappe expects the child rows nested inside the parent document.

---

## Step 8: Handling depends_on Expressions

Frappe uses three expression formats for conditional properties:

| Format | Example | Meaning |
|--------|---------|---------|
| `eval:...` | `eval:doc.status=='Open'` | JavaScript expression evaluated with `doc` in scope |
| `fieldname` | `status` | Truthy check on field value |
| Empty string | `""` | Always visible/not mandatory |

### Common Patterns

```javascript
// Visibility
"eval:doc.status=='Open'"
"eval:doc.grand_total > 1000"
"eval:doc.customer_type=='Company'"
"eval:in_list(['Open','Pending'], doc.status)"

// Compound
"eval:doc.is_active && doc.customer_name"
```

### Security Note

The `eval:` expressions use `new Function()` which is essentially `eval`. In a production Frappe UI app this is standard practice since the expressions come from the trusted DocType schema, not from user input. However, if you're building a public-facing form, consider sanitizing or using a safe expression evaluator.

---

## Step 9: Saving Documents

### Create New Document

```javascript
const doc = await call('frappe.client.insert', {
  doc: {
    doctype: 'Your DocType',
    field1: 'value1',
    field2: 'value2',
    // Child table as array
    items: [
      { item_code: 'ITEM-001', qty: 5 },
      { item_code: 'ITEM-002', qty: 3 }
    ]
  }
})
```

### Update Existing Document

```javascript
const doc = await call('frappe.client.save', {
  doc: {
    doctype: 'Your DocType',
    name: 'DOC-00001',
    field1: 'new value',
    // Include child table rows (must include 'name' for existing rows)
    items: [
      { name: 'row-abc', item_code: 'ITEM-001', qty: 10 },  // update existing
      { item_code: 'ITEM-003', qty: 1 }  // new row (no name)
    ]
  }
})
```

### REST API Alternative

```
POST /api/resource/Your DocType
Content-Type: application/json
Authorization: token api_key:api_secret

{
  "field1": "value1",
  "items": [{ "item_code": "ITEM-001", "qty": 5 }]
}
```

---

## Step 10: Form Validation

Before saving, validate all mandatory fields and run any custom validation:

```javascript
function validateForm(fields, formData) {
  const errors = []

  for (const field of fields) {
    // Skip layout and hidden fields
    if (isLayoutField(field.fieldtype)) continue
    if (field.hidden) continue

    // Check depends_on visibility (don't validate hidden-by-condition fields)
    if (field.depends_on && !evaluateExpression(field.depends_on, formData)) continue

    // Check mandatory
    const isMandatory = field.reqd ||
      (field.mandatory_depends_on && evaluateExpression(field.mandatory_depends_on, formData))

    if (isMandatory) {
      const value = formData[field.fieldname]
      if (value === null || value === undefined || value === '' || value === 0) {
        errors.push({
          fieldname: field.fieldname,
          label: field.label,
          message: `${field.label} is required`
        })
      }
    }

    // Check unique (would need server-side check)
    // Check length constraints
    if (field.length && formData[field.fieldname]) {
      if (String(formData[field.fieldname]).length > field.length) {
        errors.push({
          fieldname: field.fieldname,
          label: field.label,
          message: `${field.label} exceeds maximum length of ${field.length}`
        })
      }
    }
  }

  return errors
}
```

---

## Key Documentation Links (Frappe Framework)

| Topic | URL |
|-------|-----|
| Customizing DocTypes (Custom Fields, Property Setters, Customize Form) | https://docs.frappe.io/framework/v15/user/en/basics/doctypes/customize |
| Form Scripts & Form API (full frm API reference) | https://docs.frappe.io/framework/v15/user/en/api/form |
| Form & View Settings | https://docs.frappe.io/framework/v15/user/en/basics/doctypes/form_&_view_settings |
| Client Script (site-specific customization) | https://docs.frappe.io/framework/v15/user/en/desk/scripting/client-script |
| DocField (field definition schema) | https://docs.frappe.io/framework/v15/user/en/basics/doctypes/docfield |
| Field Types | https://docs.frappe.io/framework/v15/user/en/basics/doctypes/fieldtypes |
| Controls API (JS controls for each field type) | https://docs.frappe.io/framework/v15/user/en/api/controls |
| REST API | https://docs.frappe.io/framework/v15/user/en/api/rest |
| Desk overview (all views) | https://docs.frappe.io/framework/v15/user/en/desk |
| Frappe UI component library | https://frappeui.com |

---

## Step 11: Rendering the Form Inside a Frappe UI Dialog

A Frappe UI **Dialog** is the natural container for presenting the dynamically generated form as a popup/modal. The Dialog component provides slots for custom body content, built-in actions, and open/close state management.

### Dialog Component Reference

**Documentation:** https://ui.frappe.io/docs/components/dialog

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `modelValue` | boolean | Controls open/closed state (v-model) |
| `options` | DialogOptions | Config for title, message, size, icon, actions |
| `disableOutsideClickToClose` | boolean | Prevent closing on outside click |

**Slots:**

| Slot | Description |
|------|-------------|
| `body` | Full body override (replaces body-header + body-content) |
| `body-header` | Header inside the dialog body |
| `body-title` | Title section inside the header |
| `body-content` | Main content area — **this is where the dynamic form goes** |
| `actions` | Footer actions area; exposes `{ close }` |

**Events:**

| Event | Description |
|-------|-------------|
| `update:modelValue` | v-model sync |
| `close` | Fired when dialog closes |
| `after-leave` | Fired after close transition completes |

### FormDialog.vue — Complete Implementation

```vue
<template>
  <Dialog
    v-model="open"
    :options="{
      title: dialogTitle,
      size: dialogSize
    }"
    :disableOutsideClickToClose="formDirty"
  >
    <template #body-content>
      <div v-if="loading" class="flex items-center justify-center py-10">
        <LoadingIndicator class="w-6 h-6" />
      </div>

      <div v-else-if="tabs.length" class="dynamic-form-body">
        <!-- Tab bar (only if multiple tabs) -->
        <Tabs
          v-if="tabs.length > 1"
          v-model="activeTab"
          :tabs="tabs.map(t => ({ label: t.label }))"
          class="mb-4"
        />

        <!-- Tab content -->
        <div
          v-for="(tab, ti) in tabs"
          :key="ti"
          v-show="tabs.length === 1 || activeTab === ti"
        >
          <!-- Sections -->
          <div
            v-for="(section, si) in tab.sections"
            :key="si"
            class="form-section mb-5"
          >
            <h3
              v-if="section.label"
              class="text-base font-semibold text-gray-900 mb-2"
            >
              {{ section.label }}
            </h3>

            <!-- Columns as CSS grid -->
            <div
              class="grid gap-4"
              :style="{
                gridTemplateColumns: `repeat(${section.columns.length}, 1fr)`
              }"
            >
              <div v-for="(col, ci) in section.columns" :key="ci">
                <DynamicField
                  v-for="field in col.fields"
                  :key="field.fieldname"
                  :field="field"
                  :doc="formData"
                  :doctype="doctype"
                  class="mb-3"
                  @change="onFieldChange"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Validation errors -->
        <ErrorMessage
          v-if="validationError"
          :message="validationError"
          class="mt-3"
        />
      </div>
    </template>

    <template #actions="{ close }">
      <div class="flex justify-end gap-2">
        <Button @click="close">Cancel</Button>
        <Button
          variant="solid"
          :loading="saving"
          @click="save(close)"
        >
          {{ isNew ? 'Create' : 'Save' }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import {
  Dialog, Button, Tabs, ErrorMessage, LoadingIndicator, call
} from 'frappe-ui'
import { parseLayout } from './parseLayout'
import DynamicField from './DynamicField.vue'

const props = defineProps({
  doctype: { type: String, required: true },
  name: { type: String, default: null },
  // Dialog size: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  // Use larger sizes for DocTypes with many fields/columns
  size: { type: String, default: 'xl' }
})

const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['saved', 'error'])

const meta = ref(null)
const tabs = ref([])
const activeTab = ref(0)
const formData = reactive({})
const loading = ref(false)
const saving = ref(false)
const formDirty = ref(false)
const validationError = ref(null)

const isNew = computed(() => !props.name)
const dialogTitle = computed(() => {
  if (isNew.value) return `New ${props.doctype}`
  return `Edit ${props.doctype}: ${props.name}`
})
const dialogSize = computed(() => props.size)

// Load metadata + document when dialog opens
watch(open, async (isOpen) => {
  if (!isOpen) return
  loading.value = true
  validationError.value = null
  formDirty.value = false

  try {
    // 1. Fetch DocType metadata
    const result = await call('frappe.client.get_doctype', {
      doctype: props.doctype
    })
    meta.value = result.docs[0]

    // 2. Parse layout
    tabs.value = parseLayout(meta.value.fields)

    // 3. Initialize defaults
    for (const field of meta.value.fields) {
      if (field.fieldname && !isLayoutField(field.fieldtype)) {
        formData[field.fieldname] = field.default || null
      }
    }

    // 4. Load existing document if editing
    if (props.name) {
      const doc = await call('frappe.client.get', {
        doctype: props.doctype,
        name: props.name
      })
      Object.assign(formData, doc)
    }
  } catch (err) {
    validationError.value = err.messages?.[0] || 'Failed to load form'
  } finally {
    loading.value = false
  }
})

function isLayoutField(ft) {
  return ['Tab Break', 'Section Break', 'Column Break',
          'Heading', 'HTML', 'Image', 'Fold'].includes(ft)
}

function onFieldChange({ fieldname, value }) {
  formData[fieldname] = value
  formDirty.value = true
}

async function save(closeFn) {
  validationError.value = null
  saving.value = true

  try {
    const method = isNew.value
      ? 'frappe.client.insert'
      : 'frappe.client.save'

    const result = await call(method, {
      doc: { doctype: props.doctype, ...formData }
    })

    Object.assign(formData, result)
    emit('saved', result)
    closeFn()  // Close the dialog on success
  } catch (err) {
    validationError.value = err.messages?.[0] || 'Failed to save'
    emit('error', err)
  } finally {
    saving.value = false
  }
}
</script>
```

### Usage Examples

```vue
<!-- Parent component: open a dialog for creating a new Customer -->
<template>
  <Button @click="showDialog = true">New Customer</Button>

  <FormDialog
    v-model="showDialog"
    doctype="Customer"
    @saved="onCustomerSaved"
  />
</template>

<script setup>
import { ref } from 'vue'
import FormDialog from './FormDialog.vue'

const showDialog = ref(false)

function onCustomerSaved(doc) {
  console.log('Created:', doc.name)
}
</script>
```

```vue
<!-- Edit an existing document -->
<FormDialog
  v-model="showEdit"
  doctype="Sales Order"
  name="SO-00042"
  size="3xl"
  @saved="onOrderUpdated"
/>
```

```vue
<!-- Triggered from a list view row action -->
<FormDialog
  v-model="editDialogOpen"
  :doctype="currentDoctype"
  :name="selectedRow"
  @saved="listResource.reload()"
/>
```

---

## Step 12: Using Document Resource Instead of Raw call()

For a cleaner reactive approach, use Frappe UI's **`createDocumentResource`** instead of manual `call()` for loading and saving documents.

**Documentation:** https://ui.frappe.io/docs/data-fetching/document-resource

### Key Advantages

- **Reactive `doc` object** — automatically updates the template when data loads
- **Built-in `setValue`** — set field values with automatic save
- **Built-in `setValueDebounced`** — debounced save (useful for live-editing)
- **Built-in `delete`** — delete with one call
- **Whitelisted methods** — call custom server methods as resources with loading states

### Document Resource in the Form Dialog

```javascript
import { createDocumentResource } from 'frappe-ui'

// For editing an existing document
const todo = createDocumentResource({
  doctype: 'ToDo',
  name: 'TODO-001',
  onSuccess(doc) {
    // doc is loaded, populate formData
    Object.assign(formData, doc)
  },
  onError(error) {
    console.error('Load failed:', error)
  }
})

// Reactive access
// todo.doc          — the loaded document object
// todo.get.loading  — true while fetching
// todo.get.error    — error from fetch

// Save field changes
todo.setValue.submit({
  status: 'Closed',
  description: 'Updated via Frappe UI dialog'
})

// Debounced save (useful for text fields with live updates)
todo.setValueDebounced.submit({
  description: 'Typing...'
})

// Reload from server
todo.reload()

// Delete
todo.delete.submit()
```

### Hybrid Pattern: Document Resource + Dynamic Form

```vue
<script setup>
import { ref, reactive, watch } from 'vue'
import { createDocumentResource, call } from 'frappe-ui'
import { parseLayout } from './parseLayout'

const props = defineProps({
  doctype: String,
  name: String  // null for new documents
})

const meta = ref(null)
const tabs = ref([])
const formData = reactive({})

// Use Document Resource for existing docs
const docResource = props.name
  ? createDocumentResource({
      doctype: props.doctype,
      name: props.name,
      onSuccess(doc) {
        Object.assign(formData, doc)
      }
    })
  : null

// Fetch metadata separately (Document Resource doesn't provide this)
async function loadMeta() {
  const result = await call('frappe.client.get_doctype', {
    doctype: props.doctype
  })
  meta.value = result.docs[0]
  tabs.value = parseLayout(meta.value.fields)
}

// Save using Document Resource (existing) or insert (new)
async function save() {
  if (docResource) {
    // Update existing — only send changed fields
    await docResource.setValue.submit(formData)
  } else {
    // Insert new
    await call('frappe.client.insert', {
      doc: { doctype: props.doctype, ...formData }
    })
  }
}
</script>
```

---

## Frappe UI Component Reference

**Documentation site:** https://ui.frappe.io/docs/getting-started

### All Available Built-in Components

| Component | Doc URL | Use In Dynamic Form |
|-----------|---------|---------------------|
| Alert | https://ui.frappe.io/docs/components/alert | Validation messages |
| Avatar | https://ui.frappe.io/docs/components/avatar | User fields |
| Badge | https://ui.frappe.io/docs/components/badge | Status indicators |
| Breadcrumbs | https://ui.frappe.io/docs/components/breadcrumbs | Navigation |
| Button | https://ui.frappe.io/docs/components/button | Save/Cancel/Submit actions |
| Calendar | https://ui.frappe.io/docs/components/calendar | Date-related views |
| Charts | https://ui.frappe.io/docs/components/charts | Dashboard widgets |
| Checkbox | https://ui.frappe.io/docs/components/checkbox | Check fieldtype |
| Combobox | https://ui.frappe.io/docs/components/combobox | Autocomplete fieldtype |
| DatePicker | https://ui.frappe.io/docs/components/datepicker | Date fieldtype |
| **Dialog** | https://ui.frappe.io/docs/components/dialog | **Form container** |
| Dropdown | https://ui.frappe.io/docs/components/dropdown | Context menus |
| ErrorMessage | https://ui.frappe.io/docs/components/errormessage | Validation errors |
| FileUploader | https://ui.frappe.io/docs/components/fileuploader | Attach/Attach Image |
| ListView | https://ui.frappe.io/docs/components/listview | Child table grids |
| MonthPicker | https://ui.frappe.io/docs/components/monthpicker | Date ranges |
| MultiSelect | https://ui.frappe.io/docs/components/multiselect | Table MultiSelect |
| Password | https://ui.frappe.io/docs/components/password | Password fieldtype |
| Popover | https://ui.frappe.io/docs/components/popover | Tooltips/previews |
| Progress | https://ui.frappe.io/docs/components/progress | Percent fieldtype |
| Rating | https://ui.frappe.io/docs/components/rating | Rating fieldtype |
| Select | https://ui.frappe.io/docs/components/select | Select fieldtype |
| Sidebar | https://ui.frappe.io/docs/components/sidebar | Page layout |
| Slider | https://ui.frappe.io/docs/components/slider | Numeric ranges |
| Switch | https://ui.frappe.io/docs/components/switch | Check fieldtype (alt) |
| Tabs | https://ui.frappe.io/docs/components/tabs | Tab Break layout |
| TextEditor | https://ui.frappe.io/docs/components/texteditor | Text Editor fieldtype |
| TextInput | https://ui.frappe.io/docs/components/textinput | Data/Int/Float/etc |
| Textarea | https://ui.frappe.io/docs/components/textarea | Text/Small Text |
| TimePicker | https://ui.frappe.io/docs/components/timepicker | Time fieldtype |
| Tooltip | https://ui.frappe.io/docs/components/tooltip | Field descriptions |
| Tree | https://ui.frappe.io/docs/components/tree | Tree DocTypes |

### Data Fetching Utilities

| Utility | Doc URL | Purpose |
|---------|---------|---------|
| Resource | https://ui.frappe.io/docs/data-fetching/resource | Generic server call wrapper |
| List Resource | https://ui.frappe.io/docs/data-fetching/list-resource | Fetch document lists |
| **Document Resource** | https://ui.frappe.io/docs/data-fetching/document-resource | **Load/save single documents** |

### Other Resources

| Resource | URL |
|----------|-----|
| GitHub repo | https://github.com/frappe/frappe-ui |
| Starter boilerplate | https://github.com/netchampfaris/frappe-ui-starter |
| npm package | https://www.npmjs.com/package/frappe-ui |
| Espresso design system (Figma) | https://www.figma.com/community/file/1407648399328528443 |

---

## Summary

1. **Fetch** the DocType schema via `frappe.client.get_doctype` — this returns the merged metadata with all customizations already applied.
2. **Parse** the flat `fields` array into a nested tree of Tabs → Sections → Columns → Fields using the layout parser.
3. **Map** each Frappe fieldtype to a Frappe UI Vue component using the fieldtype map.
4. **Render** the form dynamically, respecting `depends_on`, `mandatory_depends_on`, and `read_only_depends_on` expressions for conditional behavior.
5. **Save** via `frappe.client.save` or `frappe.client.insert`, sending the form data (including child table arrays) back to the server.

The Desk form definition is the single source of truth. Any changes made via Customize Form, Custom Fields, or Property Setters are automatically reflected in your Frappe UI frontend without code changes.
