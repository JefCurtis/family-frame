---
type: component
title: Kiosk app and the frame device
description: The Pastigio FRAME156 photo frame the dashboard runs on, and the small Gradle-free Android kiosk app (com.huntsyea.frame) that boots into the dashboard, retries through the frame's 2008 boot clock, and exposes a brightness bridge to the page.
tags: [kiosk, android, webview, device, adb, frame156]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-13T14:37:10.456Z
sources:
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-ca659ddfa04bafbd6bb2161a
    resource: repo://dashboard/src/components/Settings.svelte
  - id: openwiki-source-28fc9369ef5fcb7aea5d2dcd
    resource: repo://docs/frame.md
  - id: openwiki-source-d704bf92ab046c61656748c7
    resource: repo://kiosk/AndroidManifest.xml
  - id: openwiki-source-8db42e3412ccc1d4de62c0f6
    resource: repo://kiosk/build.sh
  - id: openwiki-source-b73a7f32e78736cbd3e31ddc
    resource: repo://kiosk/src/com/huntsyea/frame/MainActivity.java
generated: { by: "claude-code", at: "2026-10-13T14:37:10.456Z" }
---

# Kiosk app and the frame device

The dashboard runs on one physical device: a **Pastigio FRAME156** (15.6", Frameo firmware). The
frame boots straight into a tiny Android app in `kiosk/` that shows the dashboard full screen in a
WebView. Everything the family sees is the web app served by the Cloudflare Worker; the kiosk's
job is only to load it reliably, keep it full screen, and bridge a couple of device features.

## The device

`docs/frame.md` is the device record (identity read over ADB, every change made, and how to undo
it). The facts that shape the code:

| Property | Value | Consequence |
| --- | --- | --- |
| Android / WebView | 8.1 (API 27), WebView 106 | The web app targets Chrome 106 (no `oklch`, `color-mix`, CSS nesting, `:has`); see [views and design system](../frontend/views-components-and-design-system.md). |
| SoC / RAM | Rockchip RK3326, 32-bit, ~951 MB | Slow JS and image decoding; the app avoids big DOMs, shadows and blur. |
| Screen | 1920×1080 at 170 dpi | The page uses a 1280px-wide viewport, so it renders at 1280×720 CSS px at 1.5×. |
| Clock | No battery-backed RTC | Every power-up starts at 2008-12-31 until Wi-Fi time sync, so the first HTTPS load fails certificate checks. |
| Trust store | Lacks DigiCert Global Root G2 | The frame can't fetch Apple's photo servers directly; the Worker proxies photos (see [photos](../feeds/photos-and-slideshow.md)). |
| Root | `su` works without a prompt | Anything installed on the frame can get root; the Home Assistant token stored on it is therefore sensitive. |

Changes made to the frame (all reversible, nothing written to `/system`): the vendor OTA and
Rockchip updaters are disabled, Frameo is disabled, and the kiosk is installed and set as the Home
activity. ADB only works with Frameo's "Transfer from computer" turned off; the USB link drops
occasionally, so commands should be retried rather than assumed failed.

## The kiosk app

`kiosk/` is a single activity, `MainActivity`, built without Gradle by `kiosk/build.sh`
(`aapt2` link → `javac` → `d8` → `zipalign` → `apksigner` with the debug keystore, min SDK 23,
target 27). The script checks the SDK tools exist first and works from paths containing spaces;
CI builds the same APK on every pull request. Install with `adb install -r kiosk/build/frame.apk`.

### Boot and URL

The manifest registers the activity for `MAIN` with the `LAUNCHER`, `HOME` and `DEFAULT`
categories, `singleTask`, so after `set-home-activity` the frame boots into it and pressing Back
does nothing (`onBackPressed` is empty: a Home app has nowhere to go back to).

The dashboard URL (including `?key=<DASHBOARD_KEY>`) is set once over ADB with
`am start -n com.huntsyea.frame/.MainActivity -d '<url>'`. `handleIntent` saves it to the `kiosk`
SharedPreferences, so it survives reboots; `onNewIntent` loads a newly sent URL immediately. With
no URL saved, the app shows a short black page explaining the ADB command.

### Surviving the 2008 clock and flaky Wi-Fi

Loading never gives up:

- `onReceivedError` (main frame only) and `onReceivedSslError` both schedule a retry after
  `RETRY_MS` (10 s). SSL errors are **cancelled, never bypassed**: the app just waits for the clock
  to sync and tries again.
- A watchdog reloads every `WATCHDOG_MS` (30 s) until a page has finished loading once.
  `onPageFinished` only counts a real page with a title, because WebView's built-in error page
  also "finishes".

The web page has its own second line of defence: `index.html` shows a "Starting…" placeholder and
reloads itself after 10 s unless the app has booted (see
[app shell](../frontend/app-shell-state-and-polling.md)).

### WebView settings

JavaScript and DOM storage are on (the dashboard keeps its key, settings and last-good data in
localStorage). Wide viewport is honoured so `<meta name="viewport" content="width=1280">` works,
zoom is off, links stay inside the kiosk, and the screen is kept on. Mixed content is always
allowed because the https dashboard talks to Home Assistant on the LAN over plain `ws://` (see
[Home Assistant](../integrations/home-assistant-music-and-speech.md)). Immersive sticky mode hides
the system bars whenever the window regains focus.

### Brightness bridge

`window.FrameKiosk` (`Bridge`) exposes `setBrightness(level)` and `getBrightness()`. The level is
saved in SharedPreferences and applied as the window brightness at app start, before the page
loads, clamped to 0.02–1; a negative value hands control back to Android's own setting. The web
app's Settings sheet calls it, and hides the control when the bridge is absent (a normal browser).

### Debugging and the escape hatch

Remote debugging (`chrome://inspect`) is enabled only when the activity is launched with
`--ez debug true`; any normal launch turns it off again. Holding two fingers still on the screen
for 2 s opens a dialog with "Reload dashboard" and "Android settings"; every touch still reaches
the page. `adb logcat -s FrameKiosk` shows loads, retries and SSL/network errors.

## Operating rules

- Prefer verifying UI changes in a headless browser at 1280×720 over scripted taps on the frame,
  which may be in use (see [tests and verification](../testing/tests-and-verification.md)).
- Don't reboot or power-cycle the frame without asking its owner.
- New web builds reach the frame on its next page load (Settings → Reload); kiosk changes need a
  rebuilt APK installed over USB. See [build and deploy](../operations/build-deploy-and-configuration.md).
