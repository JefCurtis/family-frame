# Photo Frame Dashboard

A dashboard web app for a rooted Android photo frame. Read `docs/research.md` before changing
`dashboard/`.

## Target device

- Tested frame: Anna Bella PF1007L, Android 6.0.1, WebView 106, Allwinner A33, about 1 GB RAM,
  Mali-400 GPU and a 1280×800 landscape viewport at DPR 1 (details in `docs/frame.md`).
- Treat that device as the performance floor: quad-core Cortex-A7, weak GPU and slow storage.
- Don't use `oklch()`, `color-mix()`, CSS nesting, `:has()`, or 4/8-digit hex colours.
- Keep `build.target: 'chrome106'` and `cssTarget: 'chrome61'` in `dashboard/vite.config.js`.
- UI is Svelte 5 (no SvelteKit). Add a dependency only when it clearly earns its weight on this CPU.
- Render only the active tab (`{#if}`), not hidden views.

## Performance rules

- Measure with `?diag` (fps, jank, DOM count, image megapixels, heap) before and after a change.
- Animate only `transform` and `opacity`. Avoid `filter`, `backdrop-filter`, large blurs and large
  `box-shadow`s, which the Mali-400 struggles to paint.
- Serve images at display size. Never decode a full-resolution phone photo on the frame.
- No per-second timers when a per-minute one will do. Stop timers and animations for hidden views.

## Reference

`reference/photo-frame-dashboard/` is the upstream repo (gitignored). The device guides are in its
`docs/`. Our kiosk app is in `kiosk/` (upstream's is in its `dashboard/kiosk/`).

<!-- OPENWIKI:START -->

## OpenWiki

@AGENTS.md

<!-- OPENWIKI:END -->
