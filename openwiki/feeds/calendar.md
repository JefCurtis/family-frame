---
type: data-pipeline
title: Calendar feed
description: How several iCal feeds (iCloud family calendar, Google holidays) are fetched, pre-filtered, expanded with ical.js, merged and stored in KV by the Worker cron, and how the frame indexes the result by day for its Home, Week, Month and clock screens.
tags: [calendar, ical, ical.js, kv, cron, timezones]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-13T05:27:36.156Z
sources:
  - id: openwiki-source-e12fdae11ea7713285efd699
    resource: repo://dashboard/src/lib/format.js
  - id: openwiki-source-51ad52cbd5c10d5789425706
    resource: repo://dashboard/src/views/Month.svelte
  - id: openwiki-source-b1a66f44fa52ae21cd5c82ec
    resource: repo://dashboard/src/views/Week.svelte
  - id: openwiki-source-47e567cb98956edcb53bcbd3
    resource: repo://dashboard/worker/api.test.js
  - id: openwiki-source-394f238f10df4406a597a196
    resource: repo://dashboard/worker/calendar.js
  - id: openwiki-source-7fc4ec3787abf1e07adb8d8f
    resource: repo://dashboard/worker/calendar.test.js
  - id: openwiki-source-761c8b9c5f5e1234a74d94a4
    resource: repo://dashboard/worker/index.js
generated: { by: "claude-code", at: "2026-10-13T05:27:36.156Z" }
---

# Calendar feed

The dashboard shows one merged calendar built from any number of iCal links (today: the iCloud
"Yeagley Family" calendar and Google's US holidays). The Worker does all parsing; the frame
receives a small sorted JSON list.

```text
cron */10 ─► updateCalendar ─► refresh: fetch each feed ─► expand (calendar.js) ─► merge
                                   │                                              │
                                   └── on failure: that feed's last good events ──┘
             └─► KV "calendar" (written only when changed, or hourly)
GET /api/calendar ─► KV copy (refresh in background if the cron fell behind) ─► frame
```

## Configuration

`CALENDAR_URLS` (a secret) holds the links separated by spaces, commas or newlines; `webcal://`
is rewritten to `https://`. Each link's position becomes the event's `cal` index, which the frame
maps to a colour. `DISPLAY_TZ` is the fallback zone for times with no TZID and no
`X-WR-TIMEZONE` (default UTC). The window is 40 days back (so the month view can show the whole
current month) to 70 days ahead (five weeks of week view and the month view through next month).

## Parsing (`dashboard/worker/calendar.js`)

`calendar.js` is pure functions with no Worker APIs, so it runs under `node --test`.

- **`prefilter`** exists because a Google feed contains every event ever created and full parsing
  was too slow for a cron run. It unfolds continuation lines and, with a cheap string scan, keeps
  only one-off events overlapping the window (±2 days), plus every recurring event, exception
  (`RECURRENCE-ID`) and `DURATION` event, and the feed's VTIMEZONE blocks and `X-WR-TIMEZONE`.
- **`expand`** parses the filtered text with ical.js, registers VTIMEZONEs, and emits events
  overlapping the window. Cancelled events are dropped. Exceptions replace the matching
  occurrence of their recurring master (tracked per uid). Recurrences are walked with a cap of
  20,000 occurrences.
- **`fastForward`** starts a recurrence walk at the last whole interval before the window instead
  of at DTSTART (DAILY/WEEKLY by days, MONTHLY/YEARLY by months), giving identical results without
  walking years of history. It is skipped for `COUNT` rules, multiple RRULEs and month days above
  28.
- **Time zones:** `utcMs` uses `Intl.DateTimeFormat` for IANA zones (current DST rules), the
  feed's VTIMEZONE for other zone names, and the TZID / `X-WR-TIMEZONE` / fallback for floating
  times. All-day events keep plain `YYYY-MM-DD` dates with an exclusive end so they land on their
  own day on the frame; timed events become ISO instants.
- **`merge`** flattens all feeds, drops duplicates with the same uid and start (the same invite on
  two calendars), sorts by start, then calendar, then title, and strips the internal sort keys.

Output events look like `{uid, cal, allDay, title, start, end, location?, holiday?}`.

## Refresh, storage and failure (`dashboard/worker/index.js`)

- `refresh(env, previous)` fetches all feeds in parallel. A feed whose URL contains "holiday" has
  its events marked `holiday: true` (the Week view leaves them out of its "more events ahead"
  count). If a feed fails, its last good events from the previous copy are reused and the error
  is listed in `errors`, so a blip never blanks the wall display.
- `updateCalendar` writes the result to KV key `calendar` only when the events or errors changed,
  or when the stored copy is over an hour old (`HEARTBEAT_MS`, keeping `updated` meaningful). The
  cron runs it every 10 minutes, so typical KV writes drop from 144 a day to about 24.
- `GET /api/calendar` answers from KV. With no copy, or with `?refresh` (used by Settings →
  Reload), it refreshes synchronously. If the copy is older than 75 minutes (`STALE_MS`, i.e. the
  cron fell behind) it answers with the copy and refreshes in the background via `waitUntil`.

## On the frame

`loadCalendar()` polls every 5 minutes and only replaces state when the response changed (see
[app shell](../frontend/app-shell-state-and-polling.md)); the last copy is kept in localStorage so the
frame boots with a calendar when offline, and Home/Week show "Offline · <time>" in that case.

`eventsOn(events, day)` in `src/lib/format.js` is the single way views ask for a day's events.
It builds a per-feed index (a `WeakMap` keyed by the events array) once per calendar copy:
timed events under their local start day, all-day events under every day from start to exclusive
end. Home, Week, Month and the idle clock screen call it for many days every minute, so this
replaced repeated full scans. The Month view also derives a day key from the minute clock so its
grid rebuilds only when the date changes (see
[views](../frontend/views-components-and-design-system.md)).

## Tests

`worker/calendar.test.js` uses `fixtures/google.ics` and `fixtures/icloud.ics` to cover EXDATE,
moved and cancelled instances, a daily event since 1995, multi-day all-day events, prefiltering,
folded lines/TZID/floating times, merge de-duplication, a DST change, and that fast-forwarded
monthly/yearly rules match a full walk. `worker/api.test.js` covers the stale-copy background
refresh, holiday marking, and that the cron writes KV only on change or hourly. See
[tests](../testing/tests-and-verification.md).
