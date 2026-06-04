[PLAN OVERVIEW]
Plan: `plans/plan-v2-full-contract-classes.md`
Status: **Implemented** (Phases A–G in working tree; Phase H = comment-only — aliases still required by V1 + unmigrated V2 files)

[CURRENT PHASE: complete]

## Done in this session

- **A** `PanelFloat.vue` — `bg-surface border rounded shadow-theme`; footer `bg-primary text-primary-fg-tonal`
- **B** `PanelFindActionBar.vue` — `bg-primary-100`; buttons `bg-card border rounded-sm`; primary `bg-primary border-primary`
- **C** `PanelTable.vue` — zebra `bg-surface` / `bg-row-alt`; hover `bg-primary-100`; selected `bg-primary-200`; row actions + links + loading
- **D** `PanelHeaderToolbar.vue` + `PanelFloat` deep — `text-primary-fg-tonal`, `text-secondary` when refreshing
- **E** `PanelTableFilterBar.vue` — filter strip `bg-primary-100`; active op `bg-primary border-primary`
- **F** `text-danger` on required asterisks (`PanelFormField`, `RelatedTab`, `InlineChildTab`, `FieldWidget`)
- **G** `TabBar`, `PanelFormDialogBody` validation banner, `PanelFindRow`

## Before deploy

Run `npm run build` in `nce_events/public/js/panel_page_v2/`.

## Manual smoke

Families — Found panel: zebra, hover, selected, find bar, footer/header, filter ops.
