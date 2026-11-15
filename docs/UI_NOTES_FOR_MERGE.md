# UI Notes for Merge (ui-polish branch → main)

## What changed

### Design system
- **Color palette**: replaced blue-slate dark (`#0F1115`) + Claude-orange (`#D9622B`) with warm-grey darks (`#100E0D`) + Martian ochre (`#B07D4A`). All colors now live as CSS custom properties in `styles.css :root`.
- **Font**: IBM Plex Sans self-hosted in `src/vendor/fonts/` (OFL-1.1). `--font` token defined in `:root`.
- **Buttons**: three classes — `.btn-primary`, `.btn-secondary`, `.btn-ghost`. Old inconsistent inline styles removed.
- **CSS tokens**: added `--r` (4px radius), `--t-xs` through `--t-hero` type scale, `--mars-sky-*` environment colors.

### New files
- `src/vendor/fonts/` — IBM Plex Sans woff2 static files (5 weights)
- `docs/UI_NOTES_FOR_MERGE.md` — this file

### Modified files
- `src/css/styles.css` — full palette swap, font-faces, button system, rad-badge repositioned (bottom-right), `#left-panel` padding, attribution text size, small-screen notice CSS, layer-opacity-row CSS
- `src/css/hud.css` — full redesign: thin-line aerospace instrument look, clamp() font sizes, no border-radius "app cards", right-column overflow fix
- `src/css/tidy.css` — hardcoded hex → CSS variables
- `src/css/charts.css` — hardcoded hex → CSS variables
- `src/css/app.css` — hardcoded hex → CSS variables; welcome card 440px, border-left accent
- `src/index.html` — inline SVG sprite (18 `<symbol>` icons), small-screen notice overlay, EVA abbreviation tooltips, removed `style="margin-top:12px"` attributes
- `src/js/state.js` — added `getThemeTokens()` at bottom
- `src/js/marsclock.js` — both-hemisphere season label, canvas color tokens, sun chart LMST axis label
- `src/js/profile.js` — canvas color tokens, y-axis "m" unit, x-axis "km" label, steep-segment shading, turn-back marker, temperature chart improvements (°C, season swatches, larger title)
- `src/js/ui.js` — "spacewalk" → "EVA" in one description, radiation `~${int} μGy` format, shared `_openModal()` helper (role=dialog, aria-modal, Esc, focus trap) for all three modals
- `src/js/routecard.js` — "h spacewalk" → "h EVA" in verdict text
- `src/js/map.js` — study-area outline reads `--accent` from CSS; `initRouteAnimation()` MutationObserver plays stroke-dashoffset animation when new route polyline appears
- `src/js/main.js` — auto-routes first target on load after grids ready
- `src/js/terrain3d.js` — `T3D_ORANGE` updated to `#B07D4A` (new accent)
- `src/js/walk3d.js` — sky horizon/zenith updated to match CSS tokens; EVA BASE pin updated to new accent
- `src/js/tour.js` — step timing 5200 → 4800ms
- `src/js/app.js` — small-screen notice dismiss handler

## Notes for teammate

### HTML elements added (your JS may need to know)
- `#small-screen-notice` / `#btn-small-screen-dismiss` — new overlay div in `<body>`, z-index 9000. Pure CSS shows it at <900px. Dismiss hides it for session.
- Inline SVG sprite at top of `<body>` with ids: `#icon-info`, `#icon-warning`, `#icon-check`, `#icon-search`, `#icon-close`, `#icon-layers`, `#icon-clock`, `#icon-camera`, `#icon-map-pin`, `#icon-chevron-right`, `#icon-chevron-down`, `#icon-arrow-left`, `#icon-download`, `#icon-eye`, `#icon-menu`, `#icon-radiation`, `#icon-route`, `#icon-target`. Use via `<use href="#icon-name">`.

### CSS classes renamed
- None renamed. Only added new classes.

### `getThemeTokens()` in state.js
Call `getThemeTokens()` from canvas or Three.js code to get the current CSS palette as a plain object. Keys: `bg, panel, border, text, muted, accent, route, pass, caution, danger, skyHorizon, skyZenith, ground`.

### Modal pattern changed
All three modals now opened via `_openModal(modal)` instead of `modal.style.display = 'flex'` directly. The helper sets ARIA attributes, traps Tab focus, and closes on Esc. If you add a new modal, call `_openModal(modal)` instead of showing it manually.

### Auto-route on load
`main.js` calls `selectTarget(0)` with an 800ms delay after all data loads. If the route is already set (e.g., restored from URL state), `!STATE.selectedTarget` prevents double-routing.

## Known issues / still to do
- Phase 7 (3D rover primitives, astronaut pair, shadows) not yet implemented — rover and camp are from the previous session.
- Favicon/manifest icons (Phase 5e) not yet updated.
- Route card collapse toggle (Phase 2b) is already in `charts.css` via `.rc-min` class; the button in `routecard.js` calls `updateSummaryCard()` to toggle — should work but needs a manual test.
- If the merge causes any `getThemeTokens is not defined` errors, verify `state.js` loads before `profile.js` and `marsclock.js` in `index.html`. The load order should be fine (state.js is first).
