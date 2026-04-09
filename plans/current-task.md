# Current Task: Related-Tables Checkbox Picker

## Status: PLANNED — awaiting approval

## What this task delivers
A checkbox picker dialog shown during Form Dialog **create** and **rebuild** that lets the user select which one-to-many related DocTypes to include. The selection is persisted on the Form Dialog doc. This is groundwork — the actual tab rendering comes next.

## Execution steps (in order)

1. **Add `related_doctypes` field to Form Dialog DocType** — `form_dialog.json`
2. **Update `capture_form_dialog_from_desk`** — accept + store `related_doctypes`
3. **Update `rebuild_form_dialog`** — accept + store (or preserve) `related_doctypes`
4. **Update `get_form_dialog_definition`** — return `related_doctypes` in response
5. **Add `_show_related_picker()` helper** — in `page_panel.js`
6. **Wire picker into Create flow** — between title prompt and capture call
7. **Wire picker into Rebuild flow** — between confirm and rebuild call
8. **Test** — create new dialog (verify picker appears, selection saved), rebuild existing (verify pre-population)
