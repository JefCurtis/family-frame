---
type: component
title: Worker routing, auth and caching
description: How the Cloudflare Worker entry point (dashboard/worker/index.js) serves the page and assets, authenticates the frame and AI agents, dispatches every /api route to its feature module, sets cache headers, and handles errors and the cron.
tags: [cloudflare-workers, routing, auth, caching, api]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-13T05:27:36.156Z
sources:
  - id: openwiki-source-761c8b9c5f5e1234a74d94a4
    resource: repo://dashboard/worker/index.js
  - id: openwiki-source-0d4db84e2b7fee7556be759e
    resource: repo://dashboard/wrangler.jsonc
generated: { by: "claude-code", at: "2026-10-13T05:27:36.156Z" }
---

# Worker routing, auth and caching

`dashboard/worker/index.js` is the single entry point of the deployed Worker. It exports the
`fetch` handler (page, assets and API), the `scheduled` handler (calendar cron) and the
`MessageRoom` Durable Object class. Feature logic lives in sibling modules; `index.js` only
authenticates, dispatches and wraps responses.

## Page and assets

Requests outside `/api/` go to the static asset binding (`ASSETS`, the Vite build). `wrangler.jsonc`
sets `run_worker_first` for `/` and `/index.html` so the Worker sees the page request: any HTML
response is re-sent with `Cache-Control: no-store`, so the frame always gets the latest page
(and therefore the latest hashed bundle) on its next load. Hashed files under `/assets/*` are
cached for a year as immutable by `public/_headers`. See
[build and deploy](../operations/build-deploy-and-configuration.md).

## Credentials

| Credential | Who holds it | Accepted |
| --- | --- | --- |
| `DASHBOARD_KEY` | the frame (localStorage) | `Authorization: Bearer` on any `/api` route; or `?key=` on GET for routes an `<img>` or WebSocket must reach: `/api/photos/:id`, `/api/recipes/:id/image`, `/api/messages/live` |
| `AGENT_TOKEN` | AI agents (the kitchen-frame skills) | only `POST /api/messages` and `POST /api/recipes`; it can read nothing |
| none | | static assets |

The agent routes are checked before the frame key: `POST /api/messages` requires the agent token
(the frame key is rejected there), and `POST /api/recipes` with the agent token saves directly;
everything else falls through to `authorized()`, which returns 401 JSON on failure. If
`DASHBOARD_KEY` is unset (local development), the check is skipped.

## Route map

| Route | Module | Page |
| --- | --- | --- |
| `GET /api/calendar` (`?refresh`) | `calendar.js` + `updateCalendar` in `index.js` | [Calendar](../feeds/calendar.md) |
| `GET /api/weather` | `weather.js` | [Weather and theme](../feeds/weather-and-theme.md) |
| `GET/POST /api/lists/:list`, `POST /api/lists/:list/:id/done` | `todoist.js` | [Todoist lists](../feeds/todoist-lists.md) |
| `GET /api/photos`, `GET /api/photos/:id` | `photos.js` | [Photos](../feeds/photos-and-slideshow.md) |
| `/api/messages…` | `messages.js` (`MessageRoom`) | [Agent messages](../features/agent-messages.md) |
| `/api/recipes…` | `recipes.js` | [Recipes](../features/recipes.md) |

Optional features degrade gracefully when not configured: photos return an empty list with
"Add ALBUM_URL to show photos", lists return 503 "Add TODOIST_TOKEN…", weather returns an error
object without coordinates.

## Responses, caching and errors

`json(body, status, cache)` is the one JSON response helper and defaults to
`Cache-Control: no-store`, because most data changes and the frame manages its own freshness.
Exceptions are deliberate and local to their route: TheMealDB explore results are
`private, max-age=86400`; photo and recipe images are `private, max-age=604800, immutable` (their
URLs never change content). Message routes are answered by the Durable Object with `no-store`.

Upstream fetches use the edge cache where data is shared and slow-changing (Open-Meteo 10 min,
TheMealDB a day). KV is the durable cache for the calendar, album list, photo bytes and saved
recipes.

Any exception inside the API block is logged with its path and returned as
`502 {"error": "<message>"}`; unknown routes return `404 {"error": "not found"}`.

## Cron

`scheduled()` runs every 10 minutes (`triggers.crons`) and calls `updateCalendar`, which writes KV
only when the merged calendar changed or the stored copy is over an hour old, and logs the event
and error counts.
