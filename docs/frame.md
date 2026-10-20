# Tested frame: Anna Bella PF1007L

The current deployment runs on an Anna Bella PF1007L. Serial numbers, MAC addresses, IP addresses,
credentials and dashboard URLs are deliberately excluded from this repository.

## Hardware and software

| | |
| --- | --- |
| Model | Anna Bella `PF1007L` |
| SoC | Allwinner A33 (`sun8i`) |
| Android | 6.0.1, API 23 |
| Stock build | `astar_m86_8723cs-eng`, test keys |
| Display target | 1280×800 CSS pixels |
| WebView | LineageOS WebView 106.0.5249.126 |
| Storage | 16 GB eMMC |
| USB | Stock `1f3a:1000`; persistent ADB `1f3a:1002` |

This firmware does not expose ADB over stock USB. Temporary root Wi-Fi ADB was used to enable the
persistent `mass_storage,adb` USB mode. The exact root path depends on the firmware and is outside
this repository.

## Safety first

Make and verify a complete eMMC backup before writing to `/system`, changing boot files or flashing
anything. Keep backups and device identifiers outside Git. The tested frame has a verified full
backup, but that image is private and cannot restore another unit safely.

The stock WebView was too old for the dashboard. It was replaced with WebView 106 and its required
ARM libraries only after the backup was verified. The original `/system/app/webview` tree remains on
the device for rollback.

## Installed components

- The kiosk APK from `kiosk/` is the default Home application.
- Rootless Launcher provides a conventional Android launcher when leaving the kiosk.
- A two-finger hold opens dashboard reload and Android settings controls.
- An accessibility service provides movable **Back** and **Dashboard** buttons outside the kiosk.
- The service has `WRITE_SECURE_SETTINGS` only so the kiosk can restore that navigation service.
- The vendor remote-control application, updater and factory test application are disabled for the
  primary user. They are not deleted.

These changes are specific to the tested frame. Package names and recovery commands can differ on
other firmware builds.

## Build and install the kiosk

The build requires JDK 17, Android platform 34 and build tools 34.0.0:

```sh
./kiosk/build.sh
adb install -r kiosk/build/frame.apk
```

Set or change the dashboard URL:

```sh
adb shell am start -n com.huntsyea.frame/.MainActivity \
  -d 'https://your-worker.workers.dev/?key=<DASHBOARD_KEY>'
```

The URL is stored in the kiosk application preferences. It is not compiled into the APK or stored in
this repository.

Grant the narrow permission needed to restore the navigation service:

```sh
adb shell pm grant com.huntsyea.frame android.permission.WRITE_SECURE_SETTINGS
```

To remove the kiosk:

```sh
adb uninstall com.huntsyea.frame
```

Restore another Home application before removal if the kiosk is currently the default Home app.

## Day-to-day controls

- Hold two fingers still for two seconds to reload the dashboard or open Android settings.
- Use the floating **Back** and **Dashboard** buttons while another application is open.
- Launch with `--ez debug true` to enable remote WebView debugging temporarily.
- Run `adb logcat -s FrameKiosk` to inspect startup, network and certificate errors.
- Send a normal launch intent to disable remote debugging again.

The frame can start before Wi-Fi and network time are ready. The kiosk never bypasses certificate
checks. It retries the HTTPS dashboard until the clock and connection recover.

## Home Assistant

Home Assistant is optional. Its URL and long-lived token live only in the frame's local storage and
are loaded from an ignored `.frame.vars` file. They are never bundled into the dashboard or kiosk.
Use a dedicated non-admin Home Assistant user because applications on a rooted frame can read local
storage.
