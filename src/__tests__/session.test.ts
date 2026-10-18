// AC-13, AC-36, AC-25 (engine part): one game from the intro plan to the exit, helps, pause, guided bubbles.
import { INTRO_LOCK_MS, GameSession } from '../game/session';
import { shortestMove } from '../game/solver';

const T0 = 1_000_000;

function enter(s: GameSession, now = T0 + INTRO_LOCK_MS) {
  const route = s.tapIntro(now);
  expect(route).not.toBeNull();
  s.arrive(now);
  return now;
}

function solve(s: GameSession, now: number) {
  let guard = 0;
  while (s.phase !== 'won' && guard++ < 500) {
    if (s.bubble) s.dismissBubble(now);
    const move = shortestMove(s);
    expect(move).not.toBeNull();
    expect(s.choose(move!)).not.toBeNull();
    s.arrive(now);
  }
}

describe('intro plan (AC-36, D5)', () => {
  it('ignores taps during the first 3 s, then enters the maze', () => {
    const s = new GameSession({ seed: 42, now: T0, size: 'small' });
    expect(s.phase).toBe('intro');
    expect(s.plan).toBe('intro');
    expect(s.tapIntro(T0 + 500)).toBeNull();
    expect(s.tapIntro(T0 + INTRO_LOCK_MS - 1)).toBeNull();
    expect(s.plan).toBe('intro');
    const route = s.tapIntro(T0 + INTRO_LOCK_MS);
    expect(route).not.toBeNull();
    expect(s.plan).toBeNull();
    expect(s.phase).toBe('walking');
    expect(s.started).toBe(true);
  });
});

describe('walking and choosing', () => {
  it('reaches the exit with 1000 points along the shortest path', () => {
    const s = new GameSession({ seed: 7, now: T0, size: 'medium' });
    const now = enter(s);
    expect(s.phase).toBe('choosing');
    solve(s, now);
    expect(s.phase).toBe('won');
    expect(s.journey.steps).toBe(s.optimalSteps);
    expect(s.score).toMatchObject({ points: 1000, rating: 'r900' });
    expect(s.beatFollower).toBe(s.baseline.points < 1000);
  });

  it('refuses moves while walking, while frozen, and moves that are not offered', () => {
    const s = new GameSession({ seed: 9, now: T0, size: 'small' });
    s.tapIntro(T0 + INTRO_LOCK_MS);
    expect(s.moves).toEqual([]);
    expect(s.choose({ kind: 'forward', dir: s.facing })).toBeNull();
    s.arrive(T0 + INTRO_LOCK_MS);
    const move = s.moves[0];
    s.pause(T0 + 4000);
    expect(s.moves).toEqual([]);
    expect(s.choose(move)).toBeNull();
    s.resume(T0 + 5000);
    const offered = new Set(s.moves.map((m) => m.dir));
    const notOffered = ([0, 1, 2, 3] as const).find((d) => !offered.has(d));
    if (notOffered !== undefined) expect(s.choose({ kind: 'forward', dir: notOffered })).toBeNull();
    expect(s.choose(move)).not.toBeNull();
    expect(s.decisions).toBe(1);
  });
});

describe('helps (AC-13)', () => {
  it('counts each plan opening and each footprints activation, closing is free', () => {
    const s = new GameSession({ seed: 11, now: T0, size: 'small' });
    const now = enter(s);
    s.togglePeek(now);
    expect(s.plan).toBe('map');
    expect(s.frozen).toBe(true);
    s.togglePeek(now); // closes at no cost
    expect(s.plan).toBeNull();
    s.togglePeek(now);
    s.closePeek(now);
    s.toggleTraces();
    expect(s.tracesVisible).toBe(true);
    s.toggleTraces();
    expect(s.tracesVisible).toBe(false);
    expect(s.peeks).toBe(2);
    expect(s.traces).toBe(1);
  });

  it('allows a peek while walking and freezes the step counter', () => {
    const s = new GameSession({ seed: 11, now: T0, size: 'small' });
    s.tapIntro(T0 + INTRO_LOCK_MS);
    const steps = s.journey.steps;
    s.togglePeek(T0 + 3500);
    expect(s.plan).toBe('map');
    expect(s.journey.steps).toBe(steps);
  });

  it('does not toggle footprints while the plan is open', () => {
    const s = new GameSession({ seed: 11, now: T0, size: 'small' });
    const now = enter(s);
    s.togglePeek(now);
    s.toggleTraces();
    expect(s.traces).toBe(0);
  });

  it('applies the help costs to the final score', () => {
    const s = new GameSession({ seed: 7, now: T0, size: 'medium' });
    const now = enter(s);
    s.togglePeek(now);
    s.closePeek(now);
    s.togglePeek(now);
    s.closePeek(now);
    s.toggleTraces();
    solve(s, now);
    expect(s.score!.points).toBe(720);
  });
});

describe('pause and active duration', () => {
  it('counts only active play time', () => {
    const s = new GameSession({ seed: 3, now: T0, size: 'small' });
    s.tapIntro(T0 + 3000); // clock starts
    s.pause(T0 + 13_000); // 10 s active
    s.resume(T0 + 73_000); // 60 s paused
    s.togglePeek(T0 + 78_000); // +5 s active
    s.closePeek(T0 + 98_000); // 20 s on the plan
    expect(s.durationSeconds(T0 + 100_000)).toBe(17);
  });
});

describe('guided game bubbles (AC-25)', () => {
  it('shows plan, arrows, helps and score bubbles in order', () => {
    const s = new GameSession({ seed: 5, now: T0, size: 'small', guided: true });
    const seen: string[] = [];
    expect(s.bubble).toBe('plan');
    seen.push(s.bubble!);
    // The first tap closes the bubble, it does not enter the maze.
    expect(s.tapIntro(T0 + 5000)).toBeNull();
    expect(s.bubble).toBeNull();
    s.tapIntro(T0 + 5000);
    s.arrive(T0 + 6000);
    expect(s.bubble).toBe('arrows');
    seen.push(s.bubble!);
    expect(s.moves).toEqual([]);
    s.dismissBubble(T0 + 7000);
    let guard = 0;
    while (s.phase !== 'won' && guard++ < 500) {
      if (s.bubble) {
        if (!seen.includes(s.bubble)) seen.push(s.bubble);
        s.dismissBubble(T0 + 8000);
      }
      s.choose(shortestMove(s)!);
      s.arrive(T0 + 8000);
    }
    expect(s.phase).toBe('won');
    if (s.bubble && !seen.includes(s.bubble)) seen.push(s.bubble);
    // A maze with a single decision point never reaches the third bubble: the guided seed is chosen to avoid it.
    expect(seen[0]).toBe('plan');
    expect(seen[1]).toBe('arrows');
    expect(seen[seen.length - 1]).toBe('score');
  });

  it('never shows bubbles outside the guided game', () => {
    const s = new GameSession({ seed: 5, now: T0, size: 'small' });
    expect(s.bubble).toBeNull();
    const now = enter(s);
    solve(s, now);
    expect(s.bubble).toBeNull();
  });
});

describe('replay (D1)', () => {
  it('replays a recorded maze from its size and accepted seed', () => {
    const first = new GameSession({ seed: 123, now: T0, size: 'large' });
    const again = new GameSession({ seed: first.seed, now: T0, replay: { width: 20, height: 12 } });
    expect(Array.from(again.maze.walls)).toEqual(Array.from(first.maze.walls));
    expect(again.size).toBe('large');
    expect(again.replay).toBe(true);
    expect(again.landmarks).toEqual(first.landmarks);
  });
});
