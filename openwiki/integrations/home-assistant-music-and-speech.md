---
type: integration
title: "Home Assistant: music and speech"
description: How the frame talks directly to Home Assistant on the home network over its WebSocket API to show and control Music Assistant speakers, show a now-playing card, and read agent messages aloud with text-to-speech.
tags: [home-assistant, music-assistant, websocket, tts, music, lan]
sources:
  - id: openwiki-source-81e5843e3f05d867bcedaa39
    resource: repo://dashboard/src/components/NowPlaying.svelte
  - id: openwiki-source-81909880e1b8359442697bb1
    resource: repo://dashboard/src/lib/ha.svelte.js
  - id: openwiki-source-3d6f161fa50a397e804302b6
    resource: repo://dashboard/src/views/Music.svelte
  - id: openwiki-source-28fc9369ef5fcb7aea5d2dcd
    resource: repo://docs/frame.md
generated: { by: "claude-code", at: "2026-10-13T05:27:36.156Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-13T14:37:10.456Z
---

# Home Assistant: music and speech

The Music tab, the now-playing card and spoken messages all come from Home Assistant (HA) on the
home network. Unlike every other integration, this one does **not** go through the Cloudflare
Worker: the frame connects to HA directly.

## Why direct, and where the credentials live

HA's REST API refuses cross-origin requests from the dashboard's origin, but its WebSocket API
accepts them, so `src/lib/ha.svelte.js` uses only the WebSocket. The https page reaching a plain
`ws://` LAN address works because the kiosk allows mixed content (see
[kiosk](../device/kiosk-app-and-frame.md)).

The HA URL and long-lived token are stored only in the frame's localStorage (`frame-ha-url`,
`frame-ha-token`), pushed over ADB/DevTools from the gitignored `dashboard/.frame.vars`. They are
never in the deployed site, the repository or Cloudflare. Without them `haConfigured()` is false,
the Music tab is hidden, and everything else works. `docs/frame.md` records that the current token
belongs to an admin HA user and recommends replacing it with a non-admin one, because any app on
the rooted frame could read it.

## Connection (`src/lib/ha.svelte.js`)

- `connectHA()` opens `<ha-url>/api/websocket`, answers `auth_required` with the token, and on
  `auth_ok` subscribes. On close it reconnects with exponential backoff (1 s up to 30 s), except
  after `auth_invalid`, when it stops and shows "Home Assistant rejected the frame's token" rather
  than hammering HA.
- `send()` wraps request/response messages in promises keyed by id; pending ones are rejected on
  disconnect. `callService(domain, service, data, target)` is the one way to act.
- `subscribe()` reads all states once to find `tts.*` engines and `media_player.*` entities, then
  `subscribe_entities` for just the media players. `applyDiff()` applies HA's compact diffs
  (`a` added, `c` changed with `+`/`-`, `r` removed).
- `publish()` builds `ha.players`: drops unavailable players; when any Music Assistant player
  exists (attributes starting `mass_` or `app_id: music_assistant`), shows only those (TVs and
  duplicate entities are noise); labels duplicates by room derived from the entity id
  ("Echo Spot · Hunter's Bedroom"); sorts playing first, then by label.

## Music tab (`src/views/Music.svelte`)

- The chosen speaker is remembered (`frame-music-player`); otherwise the playing one, else the
  first.
- Artwork (`entity_picture`, resolved with `haUrl()` against the HA base URL), title, artist,
  album, previous / play-pause / next, and a progress bar extrapolated from
  `media_position` and `media_position_updated_at`. The one-second progress timer runs only while
  the selected player is playing with a known position.
- Volume follows HA unless the slider is being dragged and sends `volume_set` at most every
  250 ms while dragging.
- When another speaker is playing, "Play here" calls Music Assistant's `transfer_queue` to move
  the queue to the selected speaker.

## Now playing (`nowPlaying()` and `components/NowPlaying.svelte`)

`nowPlaying()` returns the speaker currently playing something with a title. With `hold: true`
(Home) it keeps returning the last speaker that played after a pause — including across page
reloads, via localStorage — until another speaker plays, its track disappears, or 30 minutes pass
(some speakers report `idle` rather than `paused` soon after pausing). The card opens the Music
tab; its button toggles play/pause without leaving Home. The clock screen shows the card without
the hold.

## Speech (`announce()`)

`announce(text, entity_id)` calls `tts.speak` on the speaker with `cache: false`, preferring the
local Piper engine (`tts.piper`) over any other TTS entity. Music Assistant speakers pause music
for the announcement and resume afterwards. It is used to read agent messages aloud; the rules
for when that happens (quiet hours, freshness, demo mode, the Settings speaker choice) are on
[agent messages](../features/agent-messages.md).
