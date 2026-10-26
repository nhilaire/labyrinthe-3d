# Device checks: Labyrinthe 3D v0.2.0

Checks that `verify.mjs` does not run, done on 2026-10-26 on the emulator against the APK of the verified build.

- Commit: d5d8265 (same as REPORT.md)
- APK: labyrinthe-3d-0.2.0-universal.apk, SHA-256 `20b77563668f594ed35499ed6152d8e388574ca402cca60ad54e964ad56ad247`
- Target: emulator sdk_gphone64_x86_64, Android 16 (API 36), system language en-US; the phone checks are in RELEASE.md.

| Check | Command | Result | Raw output |
|---|---|---|---|
| Permissions: no AD_ID, no storage, no audio recording | `aapt2 dump permissions` | INTERNET, VIBRATE, ACCESS_NETWORK_STATE, WAKE_LOCK, MODIFY_AUDIO_SETTINGS and the app's own DYNAMIC_RECEIVER permission (0 AD_ID, RECORD_AUDIO or STORAGE line; expo-localization adds none) | `raw/device-permissions.txt` |
| Landscape only, testing scheme | `aapt2 dump xmltree ... AndroidManifest.xml` | `screenOrientation=0` (landscape), scheme `labyrinthe3d` (D4) | `raw/device-manifest.txt` |
| Installed version | `dumpsys package` | versionName 0.2.0, versionCode 200 | `raw/device-version.txt` |
| AC-44 launcher name per language | `aapt2 dump badging` / `dump resources` | `application-label:'3D Maze'`, `-en:'3D Maze'`, `-fr:'Labyrinthe 3D'`; `string/app_name` () / (en) « 3D Maze », (fr) « Labyrinthe 3D » | `raw/device-label.txt` |
| AC-01 consent in French at first launch on a French setting | `pm clear`, `cmd locale set-app-locales <pkg> --locales fr-FR` (per-app language, system stays en-US; get-app-locales -> `[fr-FR]`), Maestro `fr-first-launch.yaml` | « Statistiques anonymes », « Accepter », « Refuser », then « Jouer » and « Labyrinthe 3D »: 11 steps COMPLETED, 0 FAILED; app language reset afterwards (`[]`) | `raw/device-fr-first-launch.txt`, `screens/device-fr-consent.png`, `screens/device-fr-home.png` |
| AC-31 maze ready time, large | logcat `MAZE_READY_MS` while replaying flows 02 and 05 and a run choosing « Grand » then « Jouer », then a large maze by deep link | `size=large`: 34 ms and 211 ms (target < 1000 ms) | `raw/device-timing-and-frames.txt` |
| AC-28 sound files load on Android | logcat `SOUND_LOADED` (same run) | 17 of 17 sounds loaded, no `SOUND_ERROR` | `raw/device-timing-and-frames.txt` |

Not re-measured on the emulator this time: apparitions in a scary walk (AC-37, logcat `APPARITION`) and frame stats
(AC-30 / AC-41, `FRAME_STATS`): the replayed flows do not walk long enough in scary mode to trigger them. The
rendering, apparition and sound code is unchanged since v0.1.0 (`git diff --stat 5f9e6d5 d5d8265 -- src/render
src/game src/feedback` is empty); AC-37 stays proven by its unit tests, AC-30 and AC-41 are judged on the user's phone
during the release test.
