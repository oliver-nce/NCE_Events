# Drag Performance Issue — V2 Panel

## Problem
Dragging a panel with 20k rows has ~6 second delay on mousedown. Small datasets are instant.

## What we've tried (V2 only — V1 is obsolete)

1. **Removed `bringToFront()` from mousedown** — deferred to mouseup on click only (<10px movement)
2. **Removed Vue reactive `isDragging` ref** — now using `el.classList.add/remove` directly on DOM

Neither fixed it. Something else runs on mousedown that scales with row count.

## Current drag code location
`NCE_Events/nce_events/public/js/panel_page_v2/components/PanelFloat.vue`

### Key functions:
- `onMouseDown(e)` — L63-70: checks for header click, calls `startDrag`
- `startDrag(e)` — L72-98: adds class to DOM, sets up mousemove/mouseup listeners, uses `transform: translate3d()` for GPU movement

### Current startDrag implementation:
```javascript
function startDrag(e) {
    const sx = e.clientX, sy = e.clientY;
    const ox = x.value, oy = y.value;
    const el = floatEl.value;
    el.classList.add("ppv2-float--dragging");

    function onMove(ev) {
        const nx = ox + ev.clientX - sx;
        const ny = Math.max(0, oy + ev.clientY - sy);
        el.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
    }
    function onUp(ev) {
        el.classList.remove("ppv2-float--dragging");
        // ... position finalization
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
}
```

## Hypothesis
The `classList.add("ppv2-float--dragging")` triggers a CSS rule:
```css
.ppv2-float--dragging > .ppv2-float-body {
    pointer-events: none;
}
```
This forces browser to recalculate styles for all 20k rows.

## Next steps to try
1. Remove the `pointer-events: none` rule entirely — see if drag becomes instant
2. If that works, find alternative way to disable pointer events that doesn't trigger style recalc (maybe `visibility: hidden` on a overlay div instead)
3. Or: don't add any class at all during drag — just let the transform happen

## Related files
- `PanelFloat.vue` — drag logic + CSS
- `PanelTable.vue` — the 20k row table inside the float
- `usePanel.js` — data loading composable (not involved in drag)

## Build process
After editing Vue files:
```bash
cd NCE_Events/nce_events/public/js/panel_page_v2
npm run build
```
Then on server: `bench build --app nce_events`
