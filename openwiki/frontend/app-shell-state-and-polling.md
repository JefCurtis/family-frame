---
type: architecture
title: App shell, state and polling
description: How the Svelte 5 dashboard boots on the frame, how App.svelte layers tabs, the clock screen, settings and messages, and how state.svelte.js and api.js poll each feed only when needed, deduplicate requests and skip unchanged data.
tags: [svelte, state, polling, localstorage, idle, demo-mode, boot]
sources:
  - id: openwiki-source-1749acaa35a5ed1522bc474a
    resource: repo://dashboard/index.html
  - id: openwiki-source-262fee19998c22821ad4184a
    resource: repo://dashboard/src/App.svelte
  - id: openwiki-source-ca659ddfa04bafbd6bb2161a
    resource: repo://dashboard/src/components/Settings.svelte
  - id: openwiki-source-136e4998beec00d02c60296f
    resource: repo://dashboard/src/lib/api.js
  - id: openwiki-source-3a4039a222339b2ae26827c1
    resource: repo://dashboard/src/lib/state.svelte.js
  - id: openwiki-source-74255eeb4097b4c275c2f7c4
    resource: repo://dashboard/src/main.js
generated: { by: "claude-code", at: "2026-10-13T05:27:36.156Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-13T14:37:10.456Z
---

# App shell, state and polling

The frontend in `dashboard/src/` is a single Svelte 5 app (runes, no SvelteKit) built by Vite and
served by the Worker. It is designed to run unattended 24/7 on a slow device: it boots even when
offline, heals itself if the bundle fails, polls only what is on screen, and avoids re-rendering
when nothing changed.

## Boot

- `index.html` sets the viewport to 1280 CSS px (the 1920×1080 frame shows it at 1.5×; no
  `initial-scale`, which would make Android WebView lay out at full panel width). It shows a
  "Starting…" placeholder, prints any script error or unhandled rejection on screen (so the frame
  can be diagnosed without a cable), and reloads the page after 10 s unless the app has booted.
- `src/main.js` clears the placeholder, mounts `App`, starts the optional perf overlay
  (`src/diag.js`, enabled with `?diag`, remembered), and sets `window.__booted`.
- `src/lib/api.js` stores the frame key from `?key=` in localStorage on first open; every API call
  then sends it as a bearer token, and `withKey()` appends it to image/WebSocket URLs.

The kiosk app adds its own retry and watchdog around the page load (see
[kiosk](../device/kiosk-app-and-frame.md)).

## Layout (`src/App.svelte`)

- A top bar with a segmented tab control starting at the left edge (Home, Calendar, Groceries,
  Tasks, Recipes, and Music when a Home Assistant token is present) and, on the right, the time
  (except on Home), weather, a play button (start the slideshow now) and the Settings gear.
- Only the active view is mounted, and none while the clock screen is up, so hidden screens do no
  per-minute work.
- Overlays in order: Settings (not while idle), the idle `Ambient` clock screen, and agent
  messages over everything (held back in demo mode).
- On mount: `start()` (pollers), `connectHA()` (Home Assistant), and after 15 s background
  preloading of the next slideshow slide. Opening Groceries or Tasks loads that list immediately.

## Shared state (`src/lib/state.svelte.js`)

`ui` holds the tab, idle flag, theme and the persisted settings (`themePref`, `idleMinutes`,
`nightPhotos`, `demo`, `clockColor`, `announceOn`, each stored as `frame-<name>` in localStorage).
Feed state (`calendar`, `weather`, `photos`, `lists`, `recipes`, `messages`, `clock`) is
`$state`, seeded at boot from the last good copy in localStorage so the frame shows data offline.
`setSetting()` is the single place settings change and persist.

### Three mechanisms every feed uses

| Mechanism | Where | What it does |
| --- | --- | --- |
| `every(ms, fn, when)` | `state.svelte.js` | Runs `fn` now and then every `ms`, but schedules the next run only after the previous finishes (slow requests never stack up), and skips runs while `when()` is false. |
| `single(key, fn)` | `state.svelte.js` | One request per feed at a time: a poll, a wake-up refresh and a tap share the request in flight. |
| `changed(key, value)` | `api.js` | Compares the new JSON with the last copy (seeded from localStorage) and returns false when unchanged, so the loader skips both the state assignment (nothing re-renders) and the localStorage write. `remember()` records local edits; `forget()` forces the next comparison to report a change. |

### What polls, and when

| Feed | Interval | Only while |
| --- | --- | --- |
| Clock + theme | every minute, aligned to the boundary | always |
| Calendar | 5 min | always |
| Weather | 15 min | always |
| Tasks | 1 min | dashboard up (Home shows them) |
| Groceries | 1 min | Groceries tab open |
| Photos list | 5 min (plus once at start) | clock screen up and photos visible |
| Messages | pushed over a WebSocket; 1 min HTTP fallback | socket down |

Saved recipes load when the Recipes tab or Saved opens. Details are on each feed's page:
[calendar](../feeds/calendar.md), [weather](../feeds/weather-and-theme.md),
[Todoist](../feeds/todoist-lists.md), [photos](../feeds/photos-and-slideshow.md),
[messages](../features/agent-messages.md), [recipes](../features/recipes.md).

## Idle

A `pointerdown` listener re-arms a timer for `idleMinutes` (default 5; 0 = never). When it fires,
or the play button is pressed, the app returns to Home, closes Settings, loads photos and sets
`ui.idle`. Tapping the clock screen (`exitIdle`) leaves idle and refreshes Tasks.

## Demo mode

Settings → Demo mode swaps in invented data from `src/lib/demo.js` (calendar, task board with
sections and assignees, grocery aisles), shows no photos, holds agent messages back and never
writes to Todoist. Data is built relative to today. Switching it on rebuilds the demo lists;
switching it off calls `forget()` so the real calendar, lists and photos redraw even though they
match what was cached before demo mode.

## Settings and reload

`components/Settings.svelte` edits the persisted settings (appearance, clock colour, clock screen
delay, photos at night, brightness through the kiosk bridge, read-aloud speaker, demo mode). Its
Reload button forces a calendar refresh from the feeds (`/api/calendar?refresh`) and then reloads
the page, which is also how the frame picks up a newly deployed build.
