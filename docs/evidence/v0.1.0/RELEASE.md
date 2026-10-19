# Release: Labyrinthe 3D v0.1.0

Phone install: PASS
User acceptance: pending
Date: 2026-10-18
Commit: b84e630
APK: labyrinthe-3d-0.1.0-arm64-v8a.apk (38.8 MB, arm64-v8a)
SHA-256: 0fb1493f043d25dc05e710a32b614033ab5fe1b308e913f5cb47834dce5fc26f
Signature: release signature valid
Phone: Android 11 (API 30, arm64-v8a)
Launch check: alive after 10 s, no fatal error

## Notes from the user test

Phone test 1 (2026-10-18, commit b84e630):
- No sound at all. Cause: the WAV files had no "data" chunk id (generator bug); ExoPlayer failed with EOFException.
  Fixed in scripts/generate-sfx.mjs, files regenerated, header test added (sfxFiles.test.ts), load/play traces in logcat.
- Smoothness measured in logcat while the user played (small and medium mazes): fps_avg 59.9, slow frames 0.4-0.8 %.
- Request: in scary mode, ghostly shadows, spiders, cobwebs and candles that dim, frequent (every 10-20 s), decor
  only. PRD amendment (new acceptance criteria) before the next phone test.

Phone test 2 (2026-10-19, demo build of commit c107ae2 with apparitions every 2-3 s lasting 8 s, not committed):
- The user found the scary-mode apparitions good ("ça a l'air bien cette fois-ci").
- Logcat during the play: sounds playing (steps, turn, click, victory), APPARITION lines, FRAME_STATS medium maze in
  scary mode fps_avg 59.8, slow frames 2.6 %.
- Also fixed since test 1: painted textures were upside down (emblem plaques inverted compared with the plan).
