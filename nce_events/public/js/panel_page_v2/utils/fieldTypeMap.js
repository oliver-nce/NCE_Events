/**
 * Maps Frappe fieldtypes to component configurations.
 *
 * Returns: { component: string, props: object } for data fields
 * Returns: { layout: string } for layout-only fields
 * Returns: null for unknown fields (fallback to text input)
 */
export function getComponentConfig(field) {
  const map = {
    // Text inputs
    Data:            { component: "FormControl", props: { type: "text" } },
    "Small Text":    { component: "FormControl", props: { type: "textarea", rows: 3 } },
    Text:            { component: "FormControl", props: { type: "textarea", rows: 5 } },
    "Text Editor":   { component: "TextEditor", props: {} },
    Code:            { component: "FormControl", props: { type: "textarea", rows: 8 } },
    "HTML Editor":   { component: "FormControl", props: { type: "textarea", rows: 8 } },
    "Markdown Editor": { component: "FormControl", props: { type: "textarea", rows: 8 } },
    JSON:            { component: "FormControl", props: { type: "textarea", rows: 8 } },

    // Numeric
    Int:       { component: "FormControl", props: { type: "number", step: 1 } },
    Float:     { component: "FormControl", props: { type: "number", step: "any" } },
    Currency:  { component: "FormControl", props: { type: "number", step: "any" } },
    Percent:   { component: "FormControl", props: { type: "number", min: 0, max: 100 } },

    // Date/Time
    Date:      { component: "DatePicker", props: {} },
    Datetime:  { component: "DateTimePicker", props: {} },
    Time:      { component: "FormControl", props: { type: "time" } },
    Duration:  { component: "FormControl", props: { type: "text", placeholder: "e.g. 1h 30m" } },

    // Boolean
    Check: { component: "Checkbox", props: {} },

    // Selection
    Select: { component: "FormControl", props: { type: "select" } },

    // Relationships
    Link:         { component: "Link", props: {} },
    "Dynamic Link": { component: "Link", props: {} },
    Table:        { layout: "table" },
    "Table MultiSelect": { layout: "table_multiselect" },

    // File
    Attach:       { component: "FileUploader", props: {} },
    "Attach Image": { component: "FileUploader", props: { accept: "image/*" } },

    // Specialized
    Password:     { component: "FormControl", props: { type: "password" } },
    Phone:        { component: "FormControl", props: { type: "tel" } },
    Rating:       { component: "Rating", props: {} },
    Color:        { component: "FormControl", props: { type: "color" } },
    Autocomplete: { component: "Autocomplete", props: {} },
    Barcode:      { component: "FormControl", props: { type: "text" } },
    "Read Only":  { component: "ReadOnly", props: {} },
    Signature:    { component: "Signature", props: {} },
    Geolocation:  { component: "Geolocation", props: {} },
    Icon:         { component: "FormControl", props: { type: "text" } },

    // Display-only
    Heading:      { layout: "heading" },
    HTML:         { layout: "html" },
    Image:        { layout: "image" },
    Button:       { layout: "button" },
    Fold:         { layout: "fold" },

    // Layout (handled by parser, should not appear as fields)
    "Tab Break":     { layout: "tab" },
    "Section Break": { layout: "section" },
    "Column Break":  { layout: "column" },
  };

  return map[field.fieldtype] || { component: "FormControl", props: { type: "text" } };
}
