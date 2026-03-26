# NCE Events — TODO / Backlog

## Security
- [ ] **npm audit**: 6 moderate + 1 high vulnerability — run `npm audit fix` and review remaining issues

## Deferred / Future
- [ ] **Live drag tracking for PanelFloat**: Expose current (dragged) x/y from `PanelFloat.vue` via `defineExpose()` or emitted events so child panels and TagFinder open relative to the panel's *current* position, not its initial spawn position