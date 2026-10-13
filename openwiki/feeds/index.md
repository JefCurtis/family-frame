# Files

- [Calendar feed](calendar.md) - How several iCal feeds (iCloud family calendar, Google holidays) are fetched, pre-filtered, expanded with ical.js, merged and stored in KV by the Worker cron, and how the frame indexes the result by day for its Home, Week, Month and clock screens.
- [Photos and idle slideshow](photos-and-slideshow.md) - How photos from an iCloud shared album reach the frame's idle clock screen - anonymous CloudKit listing, a KV-cached album list and image cache proxied through the Worker (the frame can't trust Apple's servers), one-time resizing, and the frame's preloaded, paired slideshow.
- [Todoist lists (Tasks and Groceries)](todoist-lists.md) - How the Worker proxies two Todoist projects (Household tasks and the Grocery List) with sections, assignees and description notes, and how the frame polls, renders and optimistically edits them.
- [Weather and day/night theme](weather-and-theme.md) - The Open-Meteo weather proxy and its compact response, and how the frame uses sunrise and sunset (or a pinned preference) to switch between the light and dark palettes and dim the clock screen at night.
