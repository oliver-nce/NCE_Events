# Panel Page Spec Rules

## JSON Spec Format

The JSON spec is the contract between the Panel Page definition and the renderer.
It is generated via the **Copy JSON Spec** button on the Panel Page form.

## Field Reference Convention

All field references in `hidden_fields`, `bold_fields`, `filter_fields`, and `card_fields`
use the **SQL result column name** — i.e. the name as it appears in the query result set.

- If the query uses `AS alias`, the alias is the reference name.
- If no alias, the bare column name is the reference name.
- Table prefixes (e.g. `fm.gender`) are automatically stripped when matching — the renderer
  ignores everything before and including the dot. So `fm.gender` and `gender` are equivalent.
  This avoids cleanup when copying field names from SQL tools like Navicat.

## Column Header Display Priority

1. **Explicit `AS` alias** — if the SQL query uses `AS SomeAlias`, that alias is the display header exactly as written.
2. **Frappe DocType label** — if no alias, look up the field's label from the source DocType.
3. **Title-cased fallback** — if no Frappe label is found, title-case the field name (e.g. `player_count` → "Player Count").

## Cross-Panel References

Dependent panels reference selected rows from earlier panels using `p{N}.fieldname` syntax
(unquoted in SQL). Example: `WHERE r.product_id = p1.name`

The server substitutes these with parameterized placeholders at execution time.

## Buttons & Cards

- Buttons (`button_1_name`/`button_2_name`) are accessed via the card popover, not shown inline.
- If buttons are defined, `card_fields` must contain at least one field.

## Row Interaction

- **Single click** — shows card popover (if `card_fields` defined).
- **Double click** — loads the next panel, passing the selected row as context.

## Gender Color-Coding

`male_hex` and `female_hex` on the parent spec color-code rows based on a `gender` column
in the result set. Leave empty for no color-coding.

## Extensibility

The JSON spec can include ad-hoc fields beyond what the DocType defines.
The renderer code is updated directly in JS to handle new features.
The DocType captures common fields; the JSON + JS handle edge cases.
