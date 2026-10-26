# Verification report: Labyrinthe 3D v0.2.0

Overall: PASS
Commit: d5d8265
Date: 2026-10-26 14:31 UTC
Stack: expo
Target: emulator sdk_gphone64_x86_64, Android 16 (API 36, x86_64)
APK: labyrinthe-3d-0.2.0-universal.apk (92 MB)
SHA-256: 20b77563668f594ed35499ed6152d8e388574ca402cca60ad54e964ad56ad247

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | clean working tree | PASS | commit d5d8265 |
| 2 | typecheck | PASS | `tsc --noEmit` exit 0 |
| 3 | unit tests (Jest) | PASS | Tests:       312 passed, 312 total |
| 4 | expo-doctor | WARN | issues reported (see raw/expo-doctor.txt) |
| 5 | secrets & personal data scan | PASS | secret-scan (worktree): clean |
| 6 | release build | PASS | labyrinthe-3d-0.2.0-universal.apk, 92 MB, Firebase on |
| 7 | release signature | PASS | release signature valid; cert SHA-256 54da35e17c99b321... |
| 8 | install (adb) | PASS | Performing Streamed Install Success |
| 9 | launch, alive after 8 s, no fatal error | PASS | process alive, 0 fatal log lines |
| 10 | cold start time | PASS | median 948 ms of 1674 / 948 / 751 ms after a warm-up launch (target < 3000 ms) |
| 11 | Maestro E2E flows | PASS | 9/9 flows passed, 24 screenshots in screens/ |
| 12 | no crash during e2e flows | PASS | 0 fatal log lines (crash buffer + errors, raw/logcat-e2e.txt) |
| 13 | telemetry events after consent | PASS | seen in logcat: game_start, game_complete |

Screenshots: `screens/` (emulator only, no personal data). Raw logs: `raw/` (local, git-ignored).
