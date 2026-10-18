# KPIs and monitoring: Labyrinthe 3D

Firebase project: (project id, free Spark plan, never upgraded to Blaze)
Android app: io.github.nhilaire.labyrinthe3d
Data collection: opt-in only (consent screen). Analytics data retention: 2 months. Google signals: off.

## Business KPIs

| KPI | Definition | Where to read it | Target |
|---|---|---|---|
| Daily active users | users with an engagement per day | Analytics > Reports > Engagement overview | |
| D1 / D7 retention | % of new users back on day 1 / day 7 | Analytics > Reports > Retention | |
| Average engagement time | per active user per day | Analytics > Engagement overview | |
| Games per session | `game_start` count / sessions | Analytics > Events > game_start | |
| Drop-off level | distribution of `level` on `game_over` | Analytics > Events > game_over (custom dimension `level`) | |
| Score distribution | `score` on `game_over` | custom metric `score` | |

## Technical KPIs

| KPI | Definition | Where to read it | Target |
|---|---|---|---|
| Crash-free users | % users without a fatal crash | Crashlytics > Dashboard | >= 99% |
| ANR rate | app not responding events | Crashlytics > Dashboard (filter ANR) | ~0 |
| Non-fatal errors | `reportError()` calls | Crashlytics > Non-fatals | low and stable |
| APK size | arm64 release APK size | docs/evidence/v*/REPORT.md | < 40 MB |
| Cold start | launch to home screen | evidence report (device check) | < 3 s |

## Custom definitions to register in Analytics

Analytics > Admin > Custom definitions (free, up to 50 dimensions / 50 metrics):

| Name | Scope | Param | Type |
|---|---|---|---|
| level | Event | level | dimension |
| score | Event | score | metric (standard) |
| duration_s | Event | duration_s | metric (seconds) |

## How to check that events arrive

1. Build with `firebase/google-services.json` present, accept the consent screen.
2. `adb shell setprop debug.firebase.analytics.app io.github.nhilaire.labyrinthe3d` then open Analytics > DebugView.
3. The factory's `verify.mjs --telemetry` captures the `Logging event` lines from logcat as evidence.
Standard reports update within ~24 h; DebugView is real time.
