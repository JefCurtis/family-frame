---
type: data-pipeline
title: Weather and day/night theme
description: The Open-Meteo weather proxy and its compact response, and how the frame uses sunrise and sunset (or a pinned preference) to switch between the light and dark palettes and dim the clock screen at night.
tags: [weather, open-meteo, theme, dark-mode, sunrise, sunset]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-13T05:27:36.156Z
sources:
  - id: openwiki-source-e12fdae11ea7713285efd699
    resource: repo://dashboard/src/lib/format.js
  - id: openwiki-source-3a4039a222339b2ae26827c1
    resource: repo://dashboard/src/lib/state.svelte.js
  - id: openwiki-source-708fd2723f1c868a90846112
    resource: repo://dashboard/src/style.css
  - id: openwiki-source-0709ad466b2ea97742fcdea4
    resource: repo://dashboard/src/views/Ambient.svelte
  - id: openwiki-source-47e567cb98956edcb53bcbd3
    resource: repo://dashboard/worker/api.test.js
  - id: openwiki-source-cb5a2109e8a56015671f5cae
    resource: repo://dashboard/worker/weather.js
generated: { by: "claude-code", at: "2026-10-13T05:27:36.156Z" }
---

# Weather and day/night theme

Weather appears in the top bar, on Home and on the idle clock screen. Its sunrise and sunset times
also drive the dashboard's light/dark theme.

## Worker (`dashboard/worker/weather.js`)

`GET /api/weather` calls [Open-Meteo](https://open-meteo.com) (free, no key) for the configured
location: `WEATHER_LAT`, `WEATHER_LON` (secrets in this deployment; rounded coordinates) and
optional `WEATHER_UNIT` (`fahrenheit` by default, or `celsius`). Without coordinates it returns
`{error: 'Set WEATHER_LAT and WEATHER_LON'}`. The upstream request is edge-cached for 10 minutes.

`shape()` reduces Open-Meteo's response to what the screen shows:

```json
{ "unit": "F", "temp": 66, "feels": 65, "code": 0, "day": false,
  "days": [{ "date": "2026-10-12", "hi": 88, "lo": 55, "rain": 0, "code": 1,
             "sunrise": "2026-10-12T07:03", "sunset": "2026-10-12T18:24" }, …],
  "updated": "…" }
```

Five forecast days are requested with `timezone: auto`, so dates and sunrise/sunset are local
wall-clock times. `weatherInfo(code, day)` in `src/lib/format.js` maps WMO weather codes to a label,
a Lucide icon name and a tint (sun yellow or rain blue), with night variants for clear and partly
cloudy.

## Polling (`src/lib/state.svelte.js`)

`loadWeather()` runs every 15 minutes, keeps the last good copy in localStorage, and only updates
state (and re-applies the theme) when the response changed. See
[app shell](../frontend/app-shell-state-and-polling.md).

## Theme switching

`ui.themePref` is `auto`, `light` or `dark` (Settings → Appearance, stored as `frame-theme`; a
`?theme=` URL parameter also sets it, for setup over ADB). `applyTheme()`:

- with `light` or `dark`, uses that;
- with `auto`, is dark before today's sunrise or from sunset on, using the forecast day matching
  the local date, falling back to 7:00 and 19:00 until weather has loaded.

It sets `ui.theme` and the `data-theme` attribute on `<html>`. It runs every minute from the clock
tick (aligned to the minute boundary), when weather changes, and when the preference changes.
`src/style.css` defines the two palettes under `[data-theme="light"]` and `[data-theme="dark"]`
(iOS system colours), so a switch is a single attribute change with no re-render (see
[design system](../frontend/views-components-and-design-system.md)).

## Night on the clock screen

`Ambient.svelte` treats `ui.theme === 'dark'` as night: the clock text (in the Settings clock
colour) drops to 70% opacity and photos to 45%, and photos only show at night when Settings →
Photos at night is on (`photosVisible()`). See [photos and slideshow](./photos-and-slideshow.md).

## Tests

`worker/api.test.js` checks that `shape()` reduces an Open-Meteo response to the fields the screen
uses. See [tests](../testing/tests-and-verification.md).
