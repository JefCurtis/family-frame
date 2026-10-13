---
type: architecture
title: System architecture
description: End-to-end view of the family photo-frame dashboard - an Android kiosk WebView on the frame, a Svelte app and API served by one Cloudflare Worker that proxies calendars, weather, Todoist, iCloud photos and TheMealDB and hosts the agent message room, plus a direct LAN link to Home Assistant - and the device limits that shape it.
tags: [architecture, overview, cloudflare-workers, svelte, android, kiosk]
sources:
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-262fee19998c22821ad4184a
    resource: repo://dashboard/src/App.svelte
  - id: openwiki-source-81909880e1b8359442697bb1
    resource: repo://dashboard/src/lib/ha.svelte.js
  - id: openwiki-source-761c8b9c5f5e1234a74d94a4
    resource: repo://dashboard/worker/index.js
  - id: openwiki-source-fd5601bf85cef5c591f92e95
    resource: repo://dashboard/worker/todoist.js
  - id: openwiki-source-0d4db84e2b7fee7556be759e
    resource: repo://dashboard/wrangler.jsonc
  - id: openwiki-source-d704bf92ab046c61656748c7
    resource: repo://kiosk/AndroidManifest.xml
  - id: openwiki-source-b73a7f32e78736cbd3e31ddc
    resource: repo://kiosk/src/com/huntsyea/frame/MainActivity.java
generated: { by: "claude-code", at: "2026-10-13T13:37:37.830Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-13T13:37:37.830Z
---

# System architecture

The project turns a cheap rooted Android photo frame (a Pastigio FRAME156) into a kitchen wall
dashboard for one household: clock, weather, the merged family calendar, Todoist tasks and
groceries, recipes, music control, agent messages, and a photo slideshow when idle. It began from
[wesbos/photo-frame-dashboard](https://github.com/wesbos/photo-frame-dashboard)
(`docs/research.md` records what was learned from it) but is a separate implementation.

## The pieces

```text
┌──────────── Frame (Android 8.1, WebView 106) ────────────┐
│ kiosk app com.huntsyea.frame (HOME launcher, WebView)     │
│   └─ Svelte app (dashboard/src) ──────────────┐           │
│        │ https + key           │ ws:// on LAN  │           │
└────────┼───────────────────────┼───────────────┘           
         ▼                       ▼
 Cloudflare Worker          Home Assistant (+ Music Assistant, Piper TTS)
 (dashboard/worker)
   ├─ static assets (the Svelte build)
   ├─ /api/calendar  ── iCal feeds (iCloud, Google holidays)   ┐
   ├─ /api/weather   ── Open-Meteo                             │ cached in
   ├─ /api/lists     ── Todoist API v1                         │ KV "CALENDAR"
   ├─ /api/photos    ── iCloud shared album (CloudKit)         │ (+ Images
   ├─ /api/recipes   ── TheMealDB + saved recipes              │  resizing)
   └─ /api/messages  ── MessageRoom Durable Object ◄── AI agents (AGENT_TOKEN)
```

| Part | Where | Page |
| --- | --- | --- |
| Kiosk app and device | `kiosk/`, `docs/frame.md` | [Kiosk app and the frame](../device/kiosk-app-and-frame.md) |
| Worker entry, auth, caching | `dashboard/worker/index.js` | [Routing, auth and caching](../worker/routing-auth-and-caching.md) |
| Feeds | `dashboard/worker/*.js` | [Calendar](../feeds/calendar.md), [weather](../feeds/weather-and-theme.md), [Todoist](../feeds/todoist-lists.md), [photos](../feeds/photos-and-slideshow.md) |
| Features | | [Agent messages](../features/agent-messages.md), [recipes](../features/recipes.md) |
| Frontend | `dashboard/src/` | [App shell and polling](../frontend/app-shell-state-and-polling.md), [views and design system](../frontend/views-components-and-design-system.md) |
| Home Assistant | `dashboard/src/lib/ha.svelte.js` | [Music and speech](../integrations/home-assistant-music-and-speech.md) |
| Build and deploy | `dashboard/wrangler.jsonc`, `package.json` | [Build, deploy and configuration](../operations/build-deploy-and-configuration.md) |
| Tests | `dashboard/worker/*.test.js` | [Tests and verification](../testing/tests-and-verification.md) |

## Design principles

**The Worker owns every secret and every third-party call.** Calendar links, the Todoist token,
the album link and API quirks stay server-side; the frame only knows its own `DASHBOARD_KEY`.
Agents get a separate `AGENT_TOKEN` that can post messages and save recipes but read nothing.
Home Assistant is the one exception: it lives on the home network, so the frame talks to it
directly with credentials kept only in its localStorage.

**Work around the device instead of fighting it.** The frame has an RK3326, under 1 GB of RAM, a
weak Mali GPU, Wi-Fi around 1 Mbit/s, no battery-backed clock and an old certificate store. That
is why:

- the UI is a small Svelte 5 bundle with flat CSS, built for Chrome 106, laid out at 1280 CSS px
  (1280×720 at 1.5×), mounting only the visible view;
- photos are proxied, cached in KV and resized once for the screen, and the next slide is decoded
  ahead of time;
- the kiosk keeps retrying through the 2008 boot clock and the page reloads itself if it fails
  to start;
- every feed is polled only while visible, one request at a time, and unchanged data doesn't
  re-render; messages are pushed over a WebSocket instead of polled.

`CLAUDE.md` gives the actual frame's numbers (FRAME156, Android 8.1, RK3326, 1280×720 CSS px at
DPR 1.5, ~1 Mbit/s Wi-Fi) alongside the older floor inherited from upstream (Android 6, Mali-400,
1280×800 at DPR 1) that the code should still respect, plus the performance rules; the full device
record is in `docs/frame.md`.

**Keep showing something.** Each feed's last good copy is kept in KV on the Worker and in
localStorage on the frame; a failing calendar feed falls back to its previous events; the photo
list falls back to the last listing. The wall display should never go blank because one upstream
blipped.

## Data flow at a glance

1. The kiosk loads `https://…workers.dev/?key=…`; the Worker serves the page `no-store` and the
   hashed assets from the asset store.
2. The app boots from localStorage, then `start()` begins the pollers and opens the message socket;
   `connectHA()` connects to Home Assistant.
3. The cron refreshes the calendar into KV every 10 minutes; other feeds are fetched on request and
   cached at the edge or in KV.
4. Taps write back through the Worker (complete/add Todoist items, save/remove recipes, dismiss
   messages) or straight to Home Assistant (music controls).
5. After the idle timeout the app unmounts the dashboard and shows the clock screen and slideshow.
