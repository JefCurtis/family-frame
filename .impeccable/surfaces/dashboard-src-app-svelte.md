---
version: 1
slug: "dashboard-src-app-svelte"
primary_target: "dashboard/src/App.svelte"
related_targets: ["dashboard/src/views/Home.svelte","dashboard/src/views/Week.svelte","dashboard/src/views/List.svelte","dashboard/src/views/Ambient.svelte"]
---

# Dashboard (all tabs + idle)

Scope: the frame's whole app, `dashboard/src/` (App shell, Home, Calendar, Groceries, Tasks, Weather, Photos, idle). Mode: Operate.
Audience and job: adults in the kitchen/hall glancing for what's next and checking off list items.
Constraints: see PRODUCT.md (1280×800, WebView 106, Mali-400: flat fills only).
Idle photos: an iCloud Shared Album in normal use and bundled generic images in Demo mode.

## Direction contract

THESIS: The frame is a set of iOS widgets on a wall: one calm sheet per tab, content first, refusing the "dashboard of boxes, pills and coloured borders" the first build shipped.

OWN-WORLD: iOS system palette and grouped-list language. Day: #F2F2F7 ground, white widgets. Night: black ground, #1C1C1E widgets. System sans, 28px continuous-feel radii, hairline separators, calendar colours as dots, systemBlue/orange/red only for state and selection. No borders, no shadows.

STORY: From across the room: time, next event, weather. Up close: a segmented control to switch tabs and Reminders-style rows to tick off.

FIRST VIEWPORT: Top: centred segmented control (Home · Calendar · Groceries · Tasks · Weather · Photos), temperature right. Home: lock-screen date and huge clock top-left with the weather widget below; Up Next calendar widget centre; Tasks Reminders widget right. Weather expands into current conditions, the next 12 hours, and seven compact forecast days. Photos is a newest-first grid with a full-screen viewer.

FORM: Apple canon, user-pinned (iOS widgets), so no concept roll was run (a pinned direction beats the roll); signature move: StandBy idle screen, red at night; theme follows sunrise/sunset. seed: none (user-pinned direction, no roll)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
