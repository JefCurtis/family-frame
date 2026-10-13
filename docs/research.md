# Research notes

Sources: [wesbos/photo-frame-dashboard](https://github.com/wesbos/photo-frame-dashboard) (cloned to
`reference/`) and the video [Taking over Android photo frames](https://youtu.be/ZLycoUMltNI).

## How the upstream project works

1. **Get control of the frame.** Get ADB (recovery mode with the reset pin, or a hidden tap
   sequence), back up the flash, root it (many ship a SuperSU `su`), and disable the vendor
   photo app and its OTA updater.
2. **Upgrade the browser engine.** Replace the stock system WebView (often 44) with WebView 106,
   the last Chromium that supports Android 6 (API 23).
3. **Tune memory.** Raise zram swap from 128 MB to 512 MB with 4 compression streams
   (`scripts/biuframe-su.d-50zram`, run at boot from `install-recovery.sh`).
4. **Kiosk app.** A tiny Java app (`dashboard/kiosk/`, built without Gradle) holds one full-screen
   WebView: immersive mode, screen kept on, it retries failed loads when it boots before Wi-Fi is
   up, and a two-finger hold opens launcher, settings and reload.
5. **Dashboard.** Plain JS and CSS built with Vite, hosted on Cloudflare Workers static assets. Views:
   Today, Calendar, Chores, Shopping, Photos, Home control, Agents, plus ambient (photo slideshow)
   and night (dim red clock) idle modes. Data is mocked in `js/data.js`.

The "agentic backend" in the video (school email → calendar, reminders, worksheets) is **not** in
the repo.

## Hardware the dashboard has to run on

Measured on the BIUFRAME from the video (Rockchip RK3126). Treat these as the floor.

| | |
| --- | --- |
| SoC | Quad-core Cortex-A7 (RK3126) or Allwinner A33 on the PF1007L variant |
| GPU | Mali-400 (GLES 2, weak fill rate) |
| RAM | 1 GB. Android takes about 150–200 MB; Firefox used about 370 MB on a heavy site |
| Display | 800×1280 panel shown as 1280×800 landscape, DPR 1 |
| OS / engine | Android 6.0.1, WebView 106 at best (stock WebView is often 44) |
| Sensors | PIR motion on a GPIO (used for dim/dark), accelerometer |

The same Amazon listing can ship different boards. Check Settings → About first.

## WebView 106 constraints

- No `oklch()`, `color-mix()`, CSS nesting or `:has()`. Tailwind v4 colours break.
- 4/8-digit hex colours were rejected on-device, so set `cssTarget: 'chrome61'` (already in
  `dashboard/vite.config.js`).
- Container queries, grid and flexbox work.
- The trust store lacks ISRG Root X1 on some units, so Let's Encrypt HTTPS fails until you add the
  root certificate. Hosting on Cloudflare (Workers) avoids this.

## Performance techniques from upstream

- `dashboard/js/diag.js`: an on-device overlay (`?diag`) for fps, jank frames over 50 ms,
  tap-to-click delay, per-view JS, layout and paint time, DOM count, decoded image megapixels and
  heap. It also has A/B kill switches (`?diag&exp=font,shadow,img,has,scale`) to find which
  feature costs the most. Ported in a smaller form to `dashboard/src/diag.js`.
- Fixed 1280 px viewport (`<meta name="viewport" content="width=1280">`), so the layout matches the
  panel 1:1.
- Images are requested at roughly display size (the slideshow asks for 800–1600 px variants), and
  slides are swapped only after the next image has loaded.
- Ambient and night modes are a `data-mode` attribute on the stage that toggles `display`, not
  new pages.
- A reload watchdog in `index.html` reloads the page if the bundle hasn't started within 10 s.

## Open questions for when the frame arrives

- Which board (RK3126 BIUFRAME, A33 PF1007L, or something else)?
- The real viewport and DPR, measured with `?diag`.
- Baseline fps and heap for the starter page, then for each feature as it lands.
