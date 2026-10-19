# Device checks: Labyrinthe 3D v0.1.0

Checks that `verify.mjs` does not run, done on the emulator against the APK of the verified build.

- Commit: adee663 (same as REPORT.md)
- APK: labyrinthe-3d-0.1.0-universal.apk, SHA-256 `2833f923dd12df8517f59dd1df5c4c693353b44ffc07e30d47dae01f336a0514`
- Target: emulator sdk_gphone64_x86_64, Android 16 (API 36); the phone checks are in RELEASE.md.

| Check | Command | Result | Raw output |
|---|---|---|---|
| Permissions: no AD_ID, no storage, no audio recording | `aapt2 dump permissions` | INTERNET, VIBRATE, ACCESS_NETWORK_STATE, WAKE_LOCK, MODIFY_AUDIO_SETTINGS only (0 AD_ID line) | `raw/device-permissions.txt` |
| Landscape only, testing scheme | `aapt2 dump xmltree ... AndroidManifest.xml` | `screenOrientation=0` (landscape), scheme `labyrinthe3d` (D4) | `raw/device-manifest.txt` |
| Installed version | `dumpsys package` | versionName 0.1.0, versionCode 100 | `raw/device-version.txt` |
| AC-31 maze ready time (« Jouer » with Grand, then two large mazes by deep link) | logcat `MAZE_READY_MS` | 44 ms, 153 ms, 35 ms (target < 1000 ms) | `raw/device-timing-and-frames.txt` |
| AC-28 sound files load on Android | logcat `SOUND_LOADED` | 17 of 17 sounds loaded, no `SOUND_ERROR` (phone test 1 had none: WAV header bug, fixed in d060d0c) | `raw/device-timing-and-frames.txt` |
| AC-37 apparitions start in scary mode | logcat `APPARITION` (large maze walked in scary mode) | candle x2, spider x1 during the scary walk; none during the manor walk | `raw/device-timing-and-frames.txt` |
| AC-30 / AC-41 frame stats, large maze walked to the exit (emulator, informative) | logcat `FRAME_STATS` | normal: fps_avg 57.5, slow frames 16.2 %; scary: fps_avg 48.7, slow frames 30.8 % | `raw/device-timing-and-frames.txt` |

The emulator frame stats vary a lot from run to run (bf824e0 gave 58.8 / 8 % and 59.0 / 9 % on the same walk) and
are taken while Maestro polls the UI; they only flag a risk. AC-30 and AC-41 are judged on the user's phone: phone
test 1 gave fps_avg 59.9 with 0.4 % slow frames (manor), phone test 2 gave 59.8 with 2.6 % (scary mode with frequent
apparitions), see RELEASE.md.
