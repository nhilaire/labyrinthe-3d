// AC-03: events sent only after consent, with the PRD params only; game_abandon only after game_start.
import { logEvent, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics';
import { setCrashlyticsCollectionEnabled } from '@react-native-firebase/crashlytics';

import { GameSession, INTRO_LOCK_MS } from '../game/session';
import { shortestMove } from '../game/solver';
import { FrameStats } from '../render/frameStats';
import { trackGameAbandon, trackGameComplete, trackGameStart } from '../telemetry/gameEvents';
import { applyConsent, track } from '../telemetry/telemetry';

const T0 = 1_000_000;
const names = () => (logEvent as jest.Mock).mock.calls.map((c) => c[1]);
const paramsOf = (name: string) => (logEvent as jest.Mock).mock.calls.find((c) => c[1] === name)?.[2];

function stats(frames = 400) {
  const s = new FrameStats();
  for (let i = 0; i < frames; i++) s.record(16.7);
  return s;
}

function play(guided = false) {
  const s = new GameSession({ seed: 21, now: T0, size: 'small', guided });
  if (guided) s.tapIntro(T0); // closes the plan bubble
  s.tapIntro(T0 + INTRO_LOCK_MS);
  trackGameStart(track, s, false);
  s.arrive(T0 + 4000);
  let guard = 0;
  while (s.phase !== 'won' && guard++ < 200) {
    if (s.bubble) s.dismissBubble(T0 + 4000);
    s.choose(shortestMove(s)!);
    s.arrive(T0 + 4000);
  }
  trackGameComplete(track, s, T0 + 63_000, stats(), false);
  return s;
}

beforeEach(() => jest.clearAllMocks());

describe('telemetry consent gating (AC-03)', () => {
  it('sends nothing and disables collection when consent is refused', async () => {
    await applyConsent(false);
    play();
    expect(logEvent).not.toHaveBeenCalled();
    expect(setAnalyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), false);
    expect(setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), false);
  });

  it('sends the PRD events with only the listed params after consent', async () => {
    await applyConsent(true);
    expect(setAnalyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), true);
    expect(setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), true);
    play();
    expect(names()).toEqual(['game_start', 'game_complete', 'perf_sample']);
    expect(paramsOf('game_start')).toEqual({ size: 'small', replay: 0, guided: 0, scary: 0 });
    expect(Object.keys(paramsOf('game_complete')).sort()).toEqual(
      ['beat_follower', 'duration_s', 'guided', 'peeks', 'points', 'size', 'steps_ratio', 'traces'].sort(),
    );
    // Active time stops at the exit (reached 1 s after entering), not when the event is sent.
    expect(paramsOf('game_complete')).toMatchObject({ points: 1000, steps_ratio: 1, duration_s: 1 });
    expect(paramsOf('perf_sample')).toEqual({ size: 'small', fps_avg: 59.9, slow_frames_pct: 0, scary: 0 });
  });

  it('ends the guided game with tutorial_end', async () => {
    await applyConsent(true);
    play(true);
    expect(paramsOf('tutorial_end')).toEqual({ skipped: 0 });
  });

  it('sends game_abandon only after game_start, and no perf_sample without enough frames', async () => {
    await applyConsent(true);
    const notStarted = new GameSession({ seed: 1, now: T0, size: 'medium' });
    trackGameAbandon(track, notStarted, T0 + 1000, stats(), false);
    expect(logEvent).not.toHaveBeenCalled();
    const started = new GameSession({ seed: 1, now: T0, size: 'medium' });
    started.tapIntro(T0 + INTRO_LOCK_MS);
    trackGameAbandon(track, started, T0 + 13_000, stats(10), true);
    expect(names()).toEqual(['game_abandon']);
    expect(paramsOf('game_abandon')).toEqual({ size: 'medium', guided: 0, duration_s: 10 });
  });

  it('marks a skipped guided game, even before it started', async () => {
    await applyConsent(true);
    const s = new GameSession({ seed: 1, now: T0, size: 'small', guided: true });
    trackGameAbandon(track, s, T0 + 1000, stats(), false);
    expect(names()).toEqual(['tutorial_end']);
    expect(paramsOf('tutorial_end')).toEqual({ skipped: 1 });
  });
});
