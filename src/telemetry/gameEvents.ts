// Builds the PRD telemetry events of a game from its session. Pure: the screen passes `track` and the time.
// Rules: game_start when the player enters the maze; game_abandon only after a game_start of the same game;
// perf_sample with game_complete / game_abandon when enough walking frames were drawn.
import type { GameSession } from '../game/session';
import type { FrameStats } from '../render/frameStats';
import type { EventName, TelemetryEvents } from './events';

type Track = <N extends EventName>(name: N, params: TelemetryEvents[N]) => void;

export function trackGameStart(track: Track, s: GameSession, scary: boolean): void {
  track('game_start', { size: s.size, replay: s.replay, guided: s.guided, scary });
}

function trackPerf(track: Track, s: GameSession, stats: FrameStats, scary: boolean): void {
  if (!stats.enough) return;
  track('perf_sample', { size: s.size, fps_avg: stats.fpsAvg, slow_frames_pct: stats.slowPct, scary });
}

export function trackGameComplete(track: Track, s: GameSession, now: number, stats: FrameStats, scary: boolean): void {
  if (!s.score) return;
  track('game_complete', {
    size: s.size,
    guided: s.guided,
    points: s.score.points,
    steps_ratio: Math.round((s.journey.steps / s.optimalSteps) * 100) / 100,
    peeks: s.peeks,
    traces: s.traces,
    beat_follower: s.beatFollower,
    duration_s: s.durationSeconds(now),
  });
  trackPerf(track, s, stats, scary);
  if (s.guided) track('tutorial_end', { skipped: false });
}

// Pause > Abandonner, or « Passer » in the guided game.
export function trackGameAbandon(track: Track, s: GameSession, now: number, stats: FrameStats, scary: boolean): void {
  if (s.started && s.phase !== 'won') {
    track('game_abandon', { size: s.size, guided: s.guided, duration_s: s.durationSeconds(now) });
    trackPerf(track, s, stats, scary);
  }
  if (s.guided && s.phase !== 'won') track('tutorial_end', { skipped: true });
}
