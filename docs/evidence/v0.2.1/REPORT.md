# Verification report: Labyrinthe 3D v0.2.1

Overall: PASS
Commit: 569f799
Date: 2026-11-08 18:25 UTC
Stack: expo
Target: emulator sdk_gphone64_x86_64, Android 16 (API 36, x86_64)
APK: labyrinthe-3d-0.2.1-universal.apk (92 MB)
SHA-256: 019845c27430c93759dbf01ca912f8f0950b251b0e84b690a85254e681cc89db

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | clean working tree | PASS | commit 569f799 |
| 2 | typecheck | PASS | `tsc --noEmit` exit 0 |
| 3 | lint | WARN | no "lint" script in package.json (app scaffolded before ESLint was part of the overlay) |
| 4 | unit tests (Jest) | PASS | Tests:       324 passed, 324 total |
| 5 | expo-doctor | WARN | issues reported (see raw/expo-doctor.txt) |
| 6 | secrets & personal data scan | PASS | secret-scan (worktree): clean |
| 7 | release build | PASS | labyrinthe-3d-0.2.1-universal.apk, 92 MB, Firebase on |
| 8 | release signature | PASS | release signature valid; cert SHA-256 54da35e17c99b321... |
| 9 | install (adb) | PASS | Performing Streamed Install Success |
| 10 | launch, alive after 8 s, no fatal error | PASS | process alive, 0 fatal log lines |
| 11 | cold start time | PASS | median 1067 ms of 1067 / 1180 / 849 ms after a warm-up launch (target < 3000 ms) |
| 12 | Maestro E2E flows | PASS | 9/9 flows passed, 21 screenshots in screens/ |
| 13 | no crash during e2e flows | PASS | 0 fatal log lines (crash buffer + errors, raw/logcat-e2e.txt) |
| 14 | telemetry events after consent | PASS | seen in logcat: game_start, game_complete |

Screenshots: `screens/` (emulator only, no personal data). Raw logs: `raw/` (local, git-ignored).
