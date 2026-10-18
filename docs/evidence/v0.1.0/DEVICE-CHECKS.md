# Device checks: Labyrinthe 3D v0.1.0

Checks that `verify.mjs` does not run, done on the emulator against the APK of the verified build.

- Commit: bf824e0 (same as REPORT.md)
- APK: labyrinthe-3d-0.1.0-universal.apk, SHA-256 `062f05530085e6a3c49f68c701704fe49330e2b0557b2fb2dcdfe389d8f48eb0`
- Target: emulator sdk_gphone64_x86_64, Android 16 (API 36); the phone checks come with `/release-apk`.

| Check | Command | Result | Raw output |
|---|---|---|---|
| Permissions: no AD_ID, no storage, no audio recording | `aapt2 dump permissions` | INTERNET, VIBRATE, ACCESS_NETWORK_STATE, WAKE_LOCK, MODIFY_AUDIO_SETTINGS only (0 AD_ID line) | `raw/device-permissions.txt` |
| Landscape only, testing scheme | `aapt2 dump xmltree ... AndroidManifest.xml` | `screenOrientation=0` (landscape), scheme `labyrinthe3d` (D4) | `raw/device-manifest.txt` |
| Installed version | `dumpsys package` | versionName 0.1.0, versionCode 100 | `raw/device-version.txt` |
| AC-31 maze ready time (« Jouer » with Grand, then two large mazes by deep link) | logcat `MAZE_READY_MS` | 33 ms, 61 ms, 23 ms (target < 1000 ms) | `raw/device-timing-and-frames.txt` |
| AC-30 frame stats, large maze walked to the exit (emulator, informative) | logcat `FRAME_STATS` | normal: fps_avg 58.8, slow frames 8 %; scary: fps_avg 59.0, slow frames 9 % | `raw/device-timing-and-frames.txt` |
| perf_sample sent after consent | logcat `Logging event` (telemetry flow) | `perf_sample` fps_avg 59.2, slow_frames_pct 6.5, size small | `raw/logcat-telemetry.txt` |

Before commit bf824e0 (PBR materials), the same large-maze walk gave fps_avg 48.8 with 37 % slow frames (normal) and
57.7 with 20.8 % (scary); Lambert materials fixed most of it. AC-30 is judged on the user's phone (release build,
arm64): the emulator translates OpenGL ES to the PC GPU and Maestro polls the UI during the walk, so the remaining
8-9 % slow frames here only flag a risk to check on the phone.
