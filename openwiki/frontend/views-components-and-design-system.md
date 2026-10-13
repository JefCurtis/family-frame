---
type: design-system
title: Views, components and design system
description: The dashboard's screens and shared components, its flat iOS-widget design tokens with light and dark palettes, the generated Lucide icon set, and the WebView 106 and low-power GPU rules every style must follow.
tags: [svelte, views, components, css, design-tokens, webview-106, icons]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-13T05:27:36.156Z
sources:
  - id: openwiki-source-a49bc3873fe9977f6676320a
    resource: repo://dashboard/scripts/icons.mjs
  - id: openwiki-source-cb58fcd546033995bfd576fe
    resource: repo://dashboard/src/components/Avatar.svelte
  - id: openwiki-source-f1dd99229f424fd284a9fc46
    resource: repo://dashboard/src/components/Icon.svelte
  - id: openwiki-source-e12fdae11ea7713285efd699
    resource: repo://dashboard/src/lib/format.js
  - id: openwiki-source-708fd2723f1c868a90846112
    resource: repo://dashboard/src/style.css
  - id: openwiki-source-2dc3fe6d8316a9b6f04164fb
    resource: repo://dashboard/src/views/Home.svelte
  - id: openwiki-source-b1a66f44fa52ae21cd5c82ec
    resource: repo://dashboard/src/views/Week.svelte
  - id: openwiki-source-e445b2c9ec766aa6a4917d15
    resource: repo://dashboard/vite.config.js
generated: { by: "claude-code", at: "2026-10-13T05:27:36.156Z" }
---

# Views, components and design system

The look is "calm, flat iOS widgets": large type readable from across a kitchen, one accent per
widget, and no decoration the frame's GPU would have to paint. `DESIGN.md` (with
`.impeccable/design.json`) is the full design record and `PRODUCT.md` the product brief; this page
covers how the code realises them.

## Hard platform rules

The frame runs Android WebView 106 on an RK3326 with a Mali GPU (see
[kiosk and device](../device/kiosk-app-and-frame.md)). Styles must:

- avoid `oklch()`, `color-mix()`, CSS nesting, `:has()` and 4/8-digit hex colours (use `rgba()`
  for tints);
- use flat fills only: no shadows, blurs or filters;
- lay out for a 1280 CSS px viewport (1280×720 on the frame at 1.5×).

The build enforces part of this: `vite.config.js` targets `chrome106` for JS and `chrome61` for
CSS, deliberately lower so the minifier never rewrites `rgba()` into 8-digit hex, which that
WebView rejects.

## Tokens (`src/style.css`)

All colours are CSS custom properties defined twice, under `:root, [data-theme="light"]` and
`[data-theme="dark"]`, using the iOS system palette: ground, sheet, track and thumb surfaces;
label/secondary/tertiary text; separators; blue/orange/red/yellow accents with separate `-text`
variants that meet 4.5:1 on sheets; and four calendar colours (`--cal0`…`--cal3`, each with a
`-tint`). `calVars(e)` in `src/lib/format.js` maps an event's feed index to those variables.
Switching theme is one attribute change on `<html>` (see [weather and theme](../feeds/weather-and-theme.md)).

Global rules: `box-sizing: border-box`, system font stack at 18px, no text selection or tap
highlight, unstyled buttons, tabular numerals via `.num`, a visible focus outline, and `.sheet` —
the widget primitive (white/dark card, 28px radius, 24×26px padding).

## Icons

`scripts/icons.mjs` generates `src/lib/icons.js` from `lucide-static` for a fixed list of names
(UI glyphs and weather states); run `node scripts/icons.mjs` after adding one. `Icon.svelte`
renders them as 24px-grid SVGs with 2px round strokes using `currentColor`. Icons are never drawn
by hand.

## Screens (`src/views/`)

| View | What it shows |
| --- | --- |
| `Home` | Date and large clock; Today's events (finished ones drop off) and Upcoming for the rest of the week; weather with forecast; Tasks; now playing when music is on. |
| `Week` / `Month` | Calendar tab with a Week/Month switch (remembered). Week pages through five weeks with tap-to-expand events and a "more ahead" count that ignores holidays; Month is an iPhone-style grid of dots beside the selected day's events, for this month and next. |
| `List` | Groceries (one card, items in columns under aisle headings) and Tasks (a board of section cards). See [Todoist lists](../feeds/todoist-lists.md). |
| `Recipes` / `RecipePage` | Explore and Saved grids and the recipe page. See [recipes](../features/recipes.md). |
| `Music` | Speaker picker, artwork, transport, progress and volume. See [Home Assistant](../integrations/home-assistant-music-and-speech.md). |
| `Ambient` | The idle clock screen and slideshow. See [photos](../feeds/photos-and-slideshow.md). |

All calendar views ask for a day's events through `eventsOn()`, which uses a per-feed day index
(see [calendar](../feeds/calendar.md)).

## Components (`src/components/`)

- `TaskRow` — check ring, text, small grey line (due, section, note) and `Avatar` (initials on a
  colour derived from the assignee id).
- `EventRow` — calendar-coloured event with time range (optionally its day).
- `NowPlaying` — compact now-playing card for Home and the clock screen.
- `Message` — full-screen agent message (see [agent messages](../features/agent-messages.md)).
- `Settings` — the settings sheet (see [app shell](./app-shell-state-and-polling.md)).
- `Icon` — Lucide glyphs.

## Performance habits in views

- Only the active view is mounted; hidden panes inside Recipes use `visibility: hidden` rather
  than being rebuilt.
- Long grids use lazy images with async decoding and `content-visibility: auto`.
- Views derive from the minute clock sparingly (the Month grid rebuilds only when the date
  changes).
