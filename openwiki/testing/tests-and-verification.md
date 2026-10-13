---
type: testing
title: Tests and verification
description: The Worker's node:test suites - how they fake fetch, KV and the message Durable Object, what each test protects - and how frontend changes are verified in a production build and a headless browser at the frame's 1280x720 size without touching the physical frame.
tags: [testing, node-test, mocks, fixtures, verification, headless-browser]
sources:
  - id: openwiki-source-51dca17ef0b6465be67eaf89
    resource: repo://dashboard/package.json
  - id: openwiki-source-47e567cb98956edcb53bcbd3
    resource: repo://dashboard/worker/api.test.js
  - id: openwiki-source-7fc4ec3787abf1e07adb8d8f
    resource: repo://dashboard/worker/calendar.test.js
generated: { by: "claude-code", at: "2026-10-13T05:27:36.156Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-13T14:37:10.456Z
---

# Tests and verification

## Running

From `dashboard/`: `npm test` runs `node --test worker/*.test.js`. There is no test framework, no
Worker runtime and no network: the Worker's `fetch`/`scheduled` handlers are imported directly and
called with fake bindings. Everything in `worker/` is written to run under plain Node for this
reason (for example `calendar.js` is pure functions, and `MessageRoom` only touches Durable Object
APIs through its `ctx`).

There are no automated frontend tests; UI changes are verified by building and looking (below).

## `worker/calendar.test.js`

Pure parser tests at a fixed "now" (2026-10-12) against two real-shaped fixtures,
`worker/fixtures/google.ics` and `worker/fixtures/icloud.ics`:

- weekly recurrence with EXDATE, moved and cancelled instances;
- a daily event since 1995 expands only inside the window;
- multi-day all-day events keep plain dates with an exclusive end;
- old one-off events are dropped by the prefilter before parsing;
- iCloud specifics: folded lines, TZID, floating times, all-day;
- merging two calendars sorts them and drops the shared-invite duplicate;
- a DST change keeps wall-clock time;
- fast-forwarded monthly and yearly rules give the same occurrences as a full walk.

See [calendar](../feeds/calendar.md).

## `worker/api.test.js`

End-to-end through `worker.fetch(new Request(…), env, ctx)` with:

- **a fake Todoist API** installed on `globalThis.fetch` before each test: two pages of projects,
  tasks with subtasks, due dates, sections and collaborators;
- **in-memory KV objects** per test (`get`/`put`/`getWithMetadata`/`delete`);
- **`fakeRoom()`**, which constructs the real `MessageRoom` with a stand-in `ctx` (storage map,
  alarm log, socket list, no-op auto-response) and wraps it in a fake namespace;
- per-test `fetch` replacements for iCal feeds, CloudKit, TheMealDB and image hosts.

| Area | What's protected |
| --- | --- |
| Auth | API calls need the key; assets don't; the agent token posts messages and saves recipes but reads nothing. |
| Todoist | Project lookup across pages, Todoist order for groceries, subtasks hidden, dated to-dos first with overdue on top, add and complete, unknown list and missing token, description `note`. |
| Weather | `shape()` keeps only what the screen uses. |
| Calendar | Stale copy served now and refreshed in the background; holiday-feed events marked; cron writes KV only on change or hourly. |
| Photos | Anonymous album resolution, edited version preferred, videos skipped, images proxied and cached; small-JPEG vs large/HEIC original rules. |
| Messages | Validation and limits, dismissal, 20-message cap, push to connected sockets on post/dismiss, expiry alarm, `/live` needs the key and an upgrade. |
| Recipes | TheMealDB normalisation and sized thumbnails, saving via agent and frame, image storage, `ref` de-duplication, bulk grocery add with descriptions, vegetarian/vegan exclusion. |

When behaviour changes intentionally, update the test that encodes it (for example the stale
calendar threshold) rather than deleting it.

## Verifying frontend changes

The physical frame is a family device that may be in use, so UI changes are checked away from it:

1. `npm test`, then `npm run build` (catches Svelte warnings and errors), then deploy if needed
   (see [build and deploy](../operations/build-deploy-and-configuration.md)); after a deploy, wait
   until the live page references the new hashed bundle before checking.
2. Open the page in a headless browser at **1280×720** (the frame's CSS viewport) with `?key=…`,
   usually with `frame-demo=on` in localStorage so nothing real (Todoist, photos, messages) is
   touched, and screenshot the affected screens in light and dark.
3. For performance questions, throttle the CPU (e.g. 8×) and time interactions, or use the
   `?diag` overlay; the real frame is slower still.

Avoid scripted taps, reloads or reboots on the actual frame unless its owner agrees (see
[kiosk and device](../device/kiosk-app-and-frame.md)).
