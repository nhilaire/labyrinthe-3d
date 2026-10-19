# Release: Labyrinthe 3D v0.1.0

Phone install: PASS
User acceptance: confirmed (2026-10-19)
Date: 2026-10-19
Commit: cc52c64
APK: labyrinthe-3d-0.1.0-arm64-v8a.apk (38.8 MB, arm64-v8a)
SHA-256: 16ff6f265e9d8e890077982110d0ce89beac6c92f260ee34690283cb776d47fe
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

Phone test 3 (2026-10-19, release build of commit cc52c64, apparitions at the normal 10-20 s pace):
- The user confirmed: sound OK (ambience, steps, turns, clicks, chime, exit chord; silence with « Son » off), smooth
  play in a large maze in normal and scary mode, manor mood fine for children and scary mode with ghosts, spiders,
  cobwebs and the dimming candle, back from the background shows the pause and « Reprendre » resumes in place.
- Logcat (large maze, scary mode): FRAME_STATS fps_avg 59.6, slow frames 3.1 % over 3600 frames (AC-30, AC-41).
- The user accepted v0.1.0.
