# KPIs and monitoring: Labyrinthe 3D

Firebase project: labyrinthe-3d (exact project id: Firebase console > Project settings > General; free Spark plan,
never upgraded to Blaze)
Android app: io.github.nhilaire.labyrinthe3d
Data collection: opt-in only (consent screen). Analytics data retention: 2 months. Google signals: off.

Source of truth: `docs/PRD.md` sections "Telemetry events" and "KPIs". The typed catalog in
`src/telemetry/events.ts` must declare exactly the PRD events.

## Events (sent only after consent)

Booleans are sent as 0/1 (Analytics has no boolean type). `size` ∈ `small`, `medium`, `large`.

| Event | When | Params |
|---|---|---|
| game_start | the player enters a maze (intro plan closed) | size, replay, guided, scary |
| game_complete | exit reached | size, guided, points, steps_ratio, peeks, traces, beat_follower, duration_s |
| game_abandon | Pause > Abandonner, or « Passer » in the guided game, only after a game_start of the same game | size, guided, duration_s |
| perf_sample | with game_complete / game_abandon, if >= 300 frames were drawn while walking | size, fps_avg, slow_frames_pct, scary |
| tutorial_end | guided victory screen shown, or guided game skipped | skipped |
| settings_change | « Mode frisson » toggled | setting (`scary`), value (`on`, `off`) |

`beat_follower` = 1 when points > the wall-follower's points on the same maze (a tie is not a win).
`steps_ratio` = steps / optimal steps, 2 decimals. `duration_s` excludes pauses and open plans.

## Business KPIs

| KPI | Definition | Where to read it | Target |
|---|---|---|---|
| Completion rate per size | `game_complete` / `game_start` with guided = 0, by `size` | Analytics > Explore (free form), dimensions `size`, `guided` | >= 70 % small, >= 50 % large |
| Score vs wall-follower | share of `game_complete` (guided = 0) with `beat_follower` = 1 | Explore, dimension `beat_follower` | >= 50 % |
| Score distribution | `points` on `game_complete`, by `size` | custom metric `points` | tracked |
| Help usage | mean `peeks`, `traces` on `game_complete`, by `size` | custom metrics `peeks`, `traces` | tracked |
| Tutorial completion | `tutorial_end` by `skipped` | custom dimension `skipped` | tracked |
| D1 / D7 retention | % of new users back on day 1 / day 7 | Analytics > Reports > Retention | D1 >= 30 % |
| Scary mode adoption | share of `game_start` with `scary` = 1; `settings_change` by `value` | custom dimensions `scary`, `value` | tracked |

## Technical KPIs

| KPI | Definition | Where to read it | Target |
|---|---|---|---|
| Smoothness | mean `fps_avg` and `slow_frames_pct` on `perf_sample`, by `size` and `scary` | custom metrics `fps_avg`, `slow_frames_pct` | fps_avg >= 55, slow_frames_pct <= 5 % |
| Crash-free users | % users without a fatal crash | Crashlytics > Dashboard | >= 99 % |
| ANR rate | app not responding events | Crashlytics > Dashboard (filter ANR) | < 0.5 % |
| Non-fatal errors | `reportError()` calls | Crashlytics > Non-fatals | low and stable |
| APK size | arm64 release APK size | docs/evidence/v*/REPORT.md | < 40 MB |
| Cold start | launch to first frame | evidence report (device check) | < 3 s |
| Maze ready time | « Jouer » to intro plan, large maze | evidence report (device check, AC-31) | < 1 s |

## Custom definitions to register in Analytics

Analytics > Admin > Custom definitions (free, up to 50 dimensions / 50 metrics):

| Name | Scope | Param | Type |
|---|---|---|---|
| size | Event | size | dimension |
| guided | Event | guided | dimension |
| replay | Event | replay | dimension |
| scary | Event | scary | dimension |
| beat_follower | Event | beat_follower | dimension |
| skipped | Event | skipped | dimension |
| setting | Event | setting | dimension |
| value | Event | value | dimension |
| points | Event | points | metric (standard) |
| steps_ratio | Event | steps_ratio | metric (standard) |
| peeks | Event | peeks | metric (standard) |
| traces | Event | traces | metric (standard) |
| duration_s | Event | duration_s | metric (seconds) |
| fps_avg | Event | fps_avg | metric (standard) |
| slow_frames_pct | Event | slow_frames_pct | metric (standard) |

## How to check that events arrive

1. Build with `firebase/google-services.json` present, accept the consent screen.
2. `adb shell setprop debug.firebase.analytics.app io.github.nhilaire.labyrinthe3d` then open Analytics > DebugView.
3. The factory's `verify.mjs --telemetry` captures the `Logging event` lines from logcat as evidence.
Standard reports update within ~24 h; DebugView is real time.
