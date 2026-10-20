---
type: design-system
title: Views, components and design system
description: The dashboard's screens and shared components, its flat iOS-widget design tokens, the generated Lucide icon set, and the WebView 106 rendering rules that constrain every style.
tags: [svelte, views, components, css, design-tokens, webview-106, icons, lucide]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-20T13:29:46.072Z
sources:
  - id: openwiki-source-a49bc3873fe9977f6676320a
    resource: repo://dashboard/scripts/icons.mjs
  - id: openwiki-source-262fee19998c22821ad4184a
    resource: repo://dashboard/src/App.svelte
  - id: openwiki-source-cb58fcd546033995bfd576fe
    resource: repo://dashboard/src/components/Avatar.svelte
  - id: openwiki-source-8019dc520c4e2a72df3ab441
    resource: repo://dashboard/src/components/EventRow.svelte
  - id: openwiki-source-f1dd99229f424fd284a9fc46
    resource: repo://dashboard/src/components/Icon.svelte
  - id: openwiki-source-81e5843e3f05d867bcedaa39
    resource: repo://dashboard/src/components/NowPlaying.svelte
  - id: openwiki-source-ca659ddfa04bafbd6bb2161a
    resource: repo://dashboard/src/components/Settings.svelte
  - id: openwiki-source-c4b38680680ad780caf9b87f
    resource: repo://dashboard/src/components/TaskRow.svelte
  - id: openwiki-source-e12fdae11ea7713285efd699
    resource: repo://dashboard/src/lib/format.js
  - id: openwiki-source-708fd2723f1c868a90846112
    resource: repo://dashboard/src/style.css
  - id: openwiki-source-0709ad466b2ea97742fcdea4
    resource: repo://dashboard/src/views/Ambient.svelte
  - id: openwiki-source-2dc3fe6d8316a9b6f04164fb
    resource: repo://dashboard/src/views/Home.svelte
  - id: openwiki-source-8bce032e91b723abad8258ba
    resource: repo://dashboard/src/views/List.svelte
  - id: openwiki-source-51ad52cbd5c10d5789425706
    resource: repo://dashboard/src/views/Month.svelte
  - id: openwiki-source-3d6f161fa50a397e804302b6
    resource: repo://dashboard/src/views/Music.svelte
  - id: openwiki-source-b71f48d25054178a3449df1f
    resource: repo://dashboard/src/views/Recipes.svelte
  - id: openwiki-source-b1a66f44fa52ae21cd5c82ec
    resource: repo://dashboard/src/views/Week.svelte
  - id: openwiki-source-e445b2c9ec766aa6a4917d15
    resource: repo://dashboard/vite.config.js
generated: { by: "openwiki/0.7.2", at: "2026-10-20T13:29:46.072Z" }
---

# Views, components and design system

The dashboard looks like "calm, flat iOS widgets": large type readable from across a kitchen, one accent per widget, and no decoration the frame's low-power GPU would have to paint. `DESIGN.md` and `.impeccable/design.json` are the full design record; this page covers how the code realises them.

## Hard platform rules

The frame runs Android WebView 106 on a Rockchip RK3326 with a Mali GPU (see `CLAUDE.md` and `PRODUCT.md`). Styles must:

- avoid `oklch()`, `color-mix()`, CSS nesting, `:has()` and 4/8-digit hex colours (use `rgba()` for tints);
- use flat fills only: no shadows, blurs or filters;
- lay out for a 1280 CSS px viewport (1280×720 on the 1920×1080 frame at 1.5×).

The build enforces part of this: `vite.config.js` targets `chrome106` for JS and `chrome61` for CSS, deliberately lower so the minifier never rewrites `rgba()` into 8-digit hex, which that WebView rejects.

## Tokens (`dashboard/src/style.css`)

All colours are CSS custom properties defined twice, under `:root, [data-theme="light"]` and `[data-theme="dark"]`, using the iOS system palette: ground, sheet, track and thumb surfaces; label/secondary/tertiary text; separators; blue/orange/red/yellow accents with separate `-text` variants that meet 4.5:1 on sheets; and four calendar colours (`--cal0`…`--cal3`, each with a `-tint`). `calVars(e)` in `dashboard/src/lib/format.js` maps an event's feed index to those variables. Switching theme is one attribute change on `<html>` (see [weather and theme](../feeds/weather-and-theme.md)).

Global rules: `box-sizing: border-box`, system font stack at 18px, no text selection or tap highlight, unstyled buttons, tabular numerals via `.num`, a visible focus outline, and `.sheet` — the widget primitive (white/dark card, 28px radius, 24×26px padding).

**The text-accent rule.** Use the `-text` accent tokens for coloured text (e.g. links, overdue labels); use the plain accents for fills, rings and icons.

## Icons

`dashboard/scripts/icons.mjs` generates `dashboard/src/lib/icons.js` from `lucide-static` for a fixed list of names (UI glyphs and weather states); run `node scripts/icons.mjs` after adding one. `Icon.svelte` renders them as 24px-grid SVGs with 2px round strokes using `currentColor`. Icons are never drawn by hand.

## App shell (`dashboard/src/App.svelte`)

The shell layers the screen:

- A top bar with a segmented tab control starting at the left edge: Home, Calendar, Groceries, Tasks, Recipes, and Music only when the frame has a Home Assistant URL and token.
- On the right: the current time (except on Home), weather icon and temperature, a play button that starts the slideshow immediately, and the Settings gear.
- Only the active view is mounted in `<main>`, and no dashboard view exists in the DOM while the clock screen is up. Hidden screens therefore do no per-minute work and keep memory small.
- Overlays are layered above the view in this order: Settings (hidden while idle), the idle `Ambient` clock screen, and agent messages over everything (held back in demo mode).

On mount the shell starts pollers, connects Home Assistant, and after 15 seconds enables background photo preloading. Opening Groceries or Tasks immediately loads that list, because those tabs are not polled while closed.

See [app shell, state and polling](./app-shell-state-and-polling.md) for boot, polling and state details.

## Screens (`dashboard/src/views/`)

| View | What it shows |
| --- | --- |
| `Home` | Date and large clock; Today's events (finished ones drop off) and Upcoming for the rest of the week; weather with forecast; Tasks; now playing when music is on. |
| `Week` / `Month` | Calendar tab with a Week/Month switch (remembered). Week pages through five weeks with tap-to-expand events and a "more ahead" count that ignores holidays; Month is an iPhone-style grid of dots beside the selected day's events, for this month and next. |
| `List` | Groceries (one card, items in columns under aisle headings) and Tasks (a board of section cards). See [Todoist lists](../feeds/todoist-lists.md). |
| `Recipes` / `RecipePage` | Explore and Saved grids and the recipe page. See [recipes](../features/recipes.md). |
| `Music` | Speaker picker, artwork, transport, progress and volume. See [Home Assistant](../integrations/home-assistant-music-and-speech.md). |
| `Ambient` | The idle clock screen and slideshow. See [photos](../feeds/photos-and-slideshow.md). |

All calendar views ask for a day's events through `eventsOn()`, which uses a per-feed day index built once per calendar copy.

### Home

`Home.svelte` is a 3-column grid (`412px 1fr 1fr`, 20px gap). The first column holds the date, 156px clock, optional `NowPlaying` card, and the weather sheet at the foot. The other two columns are scrollable sheets: calendar (Today + Upcoming) and Tasks. Footer actions stay visible while content scrolls inside the sheet.

### Calendar

`Week.svelte` fills the remaining height with a single sheet divided into seven equal day columns (`repeat(7, 1fr)`). Each column has its own scrollable event list, a weekday label and a date disc (the current day is a red disc). Events are source-tinted rounded blocks; past events lose the tint and become secondary text. Tapping an event expands its full title, time range and location. A header pager switches to `Month.svelte`, remembers the choice in `localStorage`, and pages forward or back; the next-page badge counts only non-holiday events further out.

`Month.svelte` is a 2-column layout: a 7×n dot grid on the left and a selected-day event list on the right. The selected day defaults to today in the current month, otherwise the 1st; the grid is rebuilt only when the date changes, not every minute.

### Lists

`List.svelte` is parameterised for Groceries (`board=false`) and Tasks (`board=true`). It groups items by Todoist section, preserves Todoist section order, and puts unsectioned items first. Groceries renders one flow card with items in up to three columns under their aisle headings. Tasks renders unsectioned loose tasks in a full-width multi-column card above a horizontal board of section cards; the board keeps empty section cards so it mirrors Todoist. The add form appears only after tapping Add, stays open for several items, and disables the Add button while saving.

### Recipes

`Recipes.svelte` shows Explore (from TheMealDB) and Saved recipes. Explore lists categories as a stretched row of chips, then a 5-column photo grid. Each card is square with the photo filling the card and the title on a dark gradient at the bottom. Images load lazily, decode asynchronously, and fade in once loaded. Explore/Saved panes are hidden with `visibility: hidden` while a recipe page is open so scroll position and decoded images are preserved.

`RecipePage.svelte` is the detail view: a narrow side sheet with the photo and metadata, an ingredients sheet where you can tap items you already have, and a steps sheet. Saved recipes can be removed; explore recipes can be saved or added (minus the "have" items) to Groceries.

### Music

`Music.svelte` shows the chosen Home Assistant / Music Assistant speaker. The top area is a square artwork on the left and a now-playing details sheet on the right. It extrapolates playback progress once a second while visible, throttles volume slider changes to at most every 250 ms, and shows transport controls. Below that is a horizontally scrollable row of speaker buttons; a live playing speaker can transfer its queue to the chosen one.

### Ambient

`Ambient.svelte` is the full-screen black idle stage. Its clock, date, weather, next event and now-playing text use the clock colour chosen in Settings. When photos are available and visible, it fills the screen with the iCloud album slideshow, aligns the clock to the bottom over a gradient scrim, and cross-fades between slides. The slideshow pauses while an agent message covers the screen, and at night the text and photos are dimmed (or photos are turned off, per Settings).

## Components (`dashboard/src/components/`)

- `TaskRow` — check ring, text, small grey line (due, section, note) and optional `Avatar`. Tapping fills the ring, then calls completion after 350 ms; failure restores the item.
- `EventRow` — calendar-coloured event with time range (optionally its day) and a "Now" marker for current events.
- `Avatar` — initials badge for a Todoist assignee, coloured deterministically from the assignee id.
- `NowPlaying` — compact card for Home and the clock screen; tapping opens Music, the play/pause button toggles without leaving Home.
- `Message` — full-screen agent message overlay; shows the oldest message, its sender and time, and a dismiss button. See [agent messages](../features/agent-messages.md).
- `Settings` — the settings sheet: theme, clock colour, idle timeout, night photos, brightness (via the kiosk app), read-aloud speaker, demo mode and a manual reload. See [app shell](./app-shell-state-and-polling.md).
- `Icon` — Lucide glyphs.

## Performance habits in views

- Only the active view is mounted; hidden panes inside Recipes use `visibility: hidden` rather than being rebuilt.
- Long grids use lazy images with async decoding and `content-visibility: auto`.
- Views derive from the minute clock sparingly (the Month grid rebuilds only when the date changes).
- All clocks, temperatures, dates, times and counts use tabular numerals via `.num`.
