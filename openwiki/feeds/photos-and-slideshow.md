---
type: data-pipeline
title: Photos and idle slideshow
description: How photos from an iCloud shared album reach the frame's idle clock screen - anonymous CloudKit listing, a KV-cached album list and image cache proxied through the Worker (the frame can't trust Apple's servers), one-time resizing, and the frame's preloaded, paired slideshow.
tags: [photos, icloud, cloudkit, kv, slideshow, images-binding]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-13T05:27:36.156Z
sources:
  - id: openwiki-source-262fee19998c22821ad4184a
    resource: repo://dashboard/src/App.svelte
  - id: openwiki-source-34e00111e7d20c4cdac2b34c
    resource: repo://dashboard/src/lib/slides.js
  - id: openwiki-source-3a4039a222339b2ae26827c1
    resource: repo://dashboard/src/lib/state.svelte.js
  - id: openwiki-source-0709ad466b2ea97742fcdea4
    resource: repo://dashboard/src/views/Ambient.svelte
  - id: openwiki-source-47e567cb98956edcb53bcbd3
    resource: repo://dashboard/worker/api.test.js
  - id: openwiki-source-93f607093c26733ac1476b93
    resource: repo://dashboard/worker/images.js
  - id: openwiki-source-272749880eb665924bb98bdd
    resource: repo://dashboard/worker/photos.js
generated: { by: "claude-code", at: "2026-10-13T05:27:36.156Z" }
---

# Photos and idle slideshow

After a few minutes untouched (or the play button), the dashboard switches to a StandBy-style
clock screen with the family's iCloud shared album as a slideshow behind it.

```text
frame ── GET /api/photos ──────────► Worker ─ KV "photos" (album list, signed Apple URLs)
      ── GET /api/photos/:id?key= ─► Worker ─ KV "photo:<id>" ─(miss)─► iCloud ─► resize ─► KV
```

## Why everything goes through the Worker

The frame's Android 8.1 trust store lacks DigiCert Global Root G2, so it cannot fetch from Apple's
photo servers. The Worker lists the album and passes every image through, and Apple URLs never
reach the frame (the list it receives has ids and sizes only).

## Listing the album (`dashboard/worker/photos.js`)

`ALBUM_URL` (a secret) is a `photos.icloud.com/shared/album/<token>` link with "Public Website"
enabled. `fetchAlbum` makes the same anonymous CloudKit calls as the public web page: resolve the
share token to get `anonymousPublicAccess` (a short-lived token and partition), then page through
the shared zone's `CPLAssetAndMasterByAssetDateWithoutHiddenOrDeleted` records, newest first. This
is not a documented Apple API.

`toPhotos` picks one JPEG per asset, preferring the edited rendition on the asset, then the
master's medium JPEG, then a small original (≤2560 px, for saved images that have no medium
size). Videos and HEIC-only originals are skipped. Ids combine the record name with a short
fingerprint of the chosen file, so an edited photo gets a new id (and URL). At most 500 photos.

`getAlbum` caches `{fetched, photos}` in KV key `photos` for 30 minutes. When it's older, a request
gets the cached copy immediately and the album is re-listed in the background (`ctx.waitUntil`),
with one re-list per isolate at a time. If listing fails, the last good list is returned with an
`error`. New album photos therefore appear within about half an hour.

## Serving images

`photoResponse(env, id, ctx)`:

1. Returns bytes from KV `photo:<id>` if present (`X-Photo-Source: kv`).
2. Otherwise finds the photo in the album list and fetches its signed URL; if that fails (expired
   link or a brand-new photo), it force re-lists the album once and retries; still failing → 404.
3. Resizes once with the Images binding (`worker/images.js` `shrink`, shared with
   [recipes](../features/recipes.md)): 1920 px wide for landscapes, 960 px for portraits (shown in
   pairs), only for originals over 250 KB, kept only if smaller.
4. Stores the bytes in KV for 30 days and responds with
   `Cache-Control: private, max-age=604800, immutable` (ids never change content), so the frame
   also keeps them in its HTTP cache.

`<img>` can't send headers, so image URLs carry the frame key as `?key=` (built by `withKey()` in
`src/lib/api.js`; see [routing and auth](../worker/routing-auth-and-caching.md)).

## On the frame

### Loading the list

`loadPhotos()` (in `src/lib/state.svelte.js`) runs once at start, then every 5 minutes only while
the clock screen is up and able to show photos, plus on entering idle and on the play button. In
demo mode the list is always empty, so family photos are never shown. See
[app shell](../frontend/app-shell-state-and-polling.md) for the scheduler.

### Queue and preloading (`src/lib/slides.js`)

The frame's Wi-Fi can take seconds per photo, so the next slide is always downloaded and decoded
before it is needed:

- `noteAlbum(items)` runs when the album list changes: photos new since last time go to the front
  of the queue, removed photos leave it.
- `pick()` takes from a shuffled queue; a portrait is paired with another portrait (side by side
  fills the landscape screen), a landscape shows alone.
- `prepare()` loads and `decode()`s the next slide's images (one preload in flight at a time; a
  failed photo is skipped). `takeSlide()` returns the ready slide and starts preparing the next.
- `App.svelte` keeps one slide prepared in the background while the dashboard is up, but only 15 s
  after boot (so the first screen's data has the Wi-Fi to itself), not in demo mode, and only when
  photos would be shown.

### The clock screen (`src/views/Ambient.svelte`)

When `ui.idle` is set, `App.svelte` unmounts the dashboard views and shows `Ambient`: clock and
date in the Settings clock colour, weather, the next event, and now playing. Slides advance every
30 s with a 1.2 s cross-fade, keeping at most two layers in the DOM. Photos show by day, and at
night only when Settings → Photos at night is on (`photosVisible()`); at night text and photos are
dimmed (see [weather and theme](./weather-and-theme.md)). The slideshow pauses while an agent
message covers the screen. Any tap calls `exitIdle()`.

## Tests

`worker/api.test.js` covers anonymous album resolution, preferring edited versions, skipping
videos, proxying and KV caching of images, and the rules for small JPEG versus large or HEIC
originals. See [tests](../testing/tests-and-verification.md).
