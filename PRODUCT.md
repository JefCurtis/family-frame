# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Mostly the adults of one household. The frame hangs in the kitchen or hall; they glance at it in
passing and tap it to check off a grocery item or a to-do. Kids may glance at it but rarely use it.

## Product Purpose
A family dashboard on a cheap, rooted Android photo frame: the time, weather, the merged family
calendar, and the household's grocery and to-do lists, readable at a glance. Success is the
adults trusting it as the one place to see what's happening today, without opening their phones.

## Positioning
It reads the household's own sources (Google and iCloud calendars, Todoist) instead of asking the
family to move into a new app, and it runs on a $50 frame instead of a subscription device.

## Operating Context
- Kitchen or hall wall, viewed from a few meters and touched up close. Bright daylight by day,
  lamplight or darkness at night.
- Glance-first: most of the time nobody touches it. After 5 minutes untouched it shows an idle
  clock screen; a tap brings the dashboard back.
- Data: merged iCal feeds (Google secret address, iCloud public link), Open-Meteo weather,
  Todoist projects "Groceries" and "To-do" (names configurable).

## Capabilities and Constraints
- Tabs: Home, Calendar (7 days), Groceries, Tasks, Weather, Photos. Lists check off and add items in Todoist. Photos uses an iCloud Shared Album, newest first.
- Light and dark themes, switching at sunrise and sunset.
- Hardware floor: 1280×800 touchscreen at DPR 1, Android 6, WebView 106, 1 GB RAM, quad-core
  Cortex-A7, Mali-400 GPU. No shadows, blurs, filters or continuous animation; no `oklch()`,
  `color-mix()`, CSS nesting, `:has()`, or 4/8-digit hex colours.
- Stack: Svelte 5 + Vite, served with its API by one Cloudflare Worker.
- Undecided: the photo source for the idle slideshow.

## Brand Commitments
- Look and feel: Apple-like, in the manner of iOS widgets. Calm, like a well-made object in the
  home rather than a computer app. Less chrome: no boxes and pills where spacing and type can
  do the work.

## Evidence on Hand
- Real data sources are configured per deployment; none are committed. Test calendars live in
  `dashboard/worker/fixtures/` and are synthetic.

## Product Principles
- A glance answers "what's next today?" before anything else.
- Use the family's existing tools; the frame is a window onto them, not a new system.
- Quiet by default: nothing moves or demands attention unless something changed.
- Every pixel has to be cheap for a weak GPU to paint.
