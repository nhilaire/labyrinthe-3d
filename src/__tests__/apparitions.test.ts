// AC-37 to AC-40: scary-mode apparitions - timing, placement in sight, cobwebs by seed, no effect on the game.
import {
  APPARITION_KINDS,
  ApparitionKind,
  ApparitionScheduler,
  MAX_GAP_MS,
  MIN_GAP_MS,
  cellsInSight,
  pickCobwebs,
  placeGhost,
  placeSpider,
  segmentClear,
} from '../game/apparitions';
import { SIZE_ORDER, newMaze } from '../game/config';
import { DIRS, makeRng, rightOf } from '../game/maze';
import { GameSession, INTRO_LOCK_MS } from '../game/session';
import { shortestMove } from '../game/solver';

describe('apparition timing (AC-37)', () => {
  it('fires every 10 to 20 s of active time, all kinds, scary mode only, never while frozen', () => {
    const s = new ApparitionScheduler(makeRng(1));
    const fired: { at: number; kind: ApparitionKind }[] = [];
    let t = 0;
    for (let i = 0; i < 60 * 60 * 10; i++) {
      t += 16;
      const k = s.update(16, { scary: true, frozen: false });
      if (k) fired.push({ at: t, kind: k });
    }
    expect(fired.length).toBeGreaterThan(20);
    for (let i = 1; i < fired.length; i++) {
      const gap = fired[i].at - fired[i - 1].at;
      expect(gap).toBeGreaterThanOrEqual(MIN_GAP_MS);
      expect(gap).toBeLessThanOrEqual(MAX_GAP_MS + 16);
    }
    expect(new Set(fired.map((f) => f.kind))).toEqual(new Set(APPARITION_KINDS));
  });

  it('never fires in the manor mood or while a plan, the pause or a bubble is shown', () => {
    const s = new ApparitionScheduler(makeRng(2));
    for (let i = 0; i < 10_000; i++) {
      expect(s.update(16, { scary: false, frozen: false })).toBeNull();
      expect(s.update(16, { scary: true, frozen: true })).toBeNull();
    }
  });

  it('does not count a long background gap as play time', () => {
    const s = new ApparitionScheduler(makeRng(3));
    expect(s.update(60_000, { scary: true, frozen: false })).toBeNull();
  });
});

describe('placement in sight (AC-38)', () => {
  it('puts ghosts and spiders in open cells in front of the player, never through a wall, 200 seeds', () => {
    const rng = makeRng(9);
    let placed = 0;
    for (let i = 0; i < 200; i++) {
      const size = SIZE_ORDER[i % 3];
      const s = new GameSession({ seed: i * 131 + 7, now: 0, size });
      s.tapIntro(INTRO_LOCK_MS);
      s.arrive(INTRO_LOCK_MS);
      let guard = 0;
      while (s.phase === 'choosing' && guard++ < 300) {
        const { maze, pos, facing } = s;
        const ghost = placeGhost(maze, pos, facing, rng);
        const spider = placeSpider(maze, pos, facing, rng);
        for (const p of [ghost?.from, ghost?.to, spider]) {
          if (!p) continue;
          expect(maze.inside(Math.floor(p.x), Math.floor(p.y))).toBe(true);
          // In sight: no wall between the player's cell centre and the apparition.
          expect(segmentClear(maze, { x: pos.x + 0.5, y: pos.y + 0.5 }, p)).toBe(true);
        }
        if (ghost) {
          expect(segmentClear(maze, ghost.from, ghost.to)).toBe(true);
          placed++;
        }
        s.choose(shortestMove(s)!);
        s.arrive(INTRO_LOCK_MS);
      }
    }
    expect(placed).toBeGreaterThan(500);
  });

  it('lists the cells in sight up to the first wall', () => {
    const { maze } = newMaze('medium', 4);
    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        for (let d = 0; d < 4; d++) {
          const cells = cellsInSight(maze, { x, y }, d as 0);
          let prev = { x, y };
          for (const c of cells) {
            expect(c).toEqual({ x: prev.x + DIRS[d].dx, y: prev.y + DIRS[d].dy });
            prev = c;
          }
        }
      }
    }
  });
});

describe('cobwebs (AC-39)', () => {
  it('hang in about 15 % of corner and dead-end cells, in a corner touching two walls, the same for a seed', () => {
    for (const size of SIZE_ORDER) {
      for (let seed = 1; seed <= 30; seed++) {
        const { maze, seed: accepted } = newMaze(size, seed);
        const webs = pickCobwebs(maze, accepted);
        expect(pickCobwebs(maze, accepted)).toEqual(webs);
        let candidates = 0;
        for (let y = 0; y < maze.height; y++) {
          for (let x = 0; x < maze.width; x++) {
            const walls = [0, 1, 2, 3].filter((d) => maze.hasWall(x, y, d as 0));
            const corner = walls.some((d) => walls.includes(rightOf(d as 0)));
            if (walls.length >= 2 && walls.length <= 3 && corner) candidates++;
          }
        }
        expect(webs.length / candidates).toBeGreaterThanOrEqual(0.1);
        expect(webs.length / candidates).toBeLessThanOrEqual(0.2);
        for (const w of webs) {
          expect(maze.hasWall(w.x, w.y, w.walls[0])).toBe(true);
          expect(maze.hasWall(w.x, w.y, w.walls[1])).toBe(true);
          expect(w.walls[1]).toBe(rightOf(w.walls[0]));
        }
      }
    }
  });
});

describe('decor only (AC-40)', () => {
  it('leaves steps, moves and score unchanged when apparitions run during the game', () => {
    const play = (withApparitions: boolean) => {
      const s = new GameSession({ seed: 77, now: 0, size: 'large' });
      const sched = new ApparitionScheduler(makeRng(5));
      const rng = makeRng(6);
      const moves: string[] = [];
      s.tapIntro(INTRO_LOCK_MS);
      s.arrive(INTRO_LOCK_MS);
      let guard = 0;
      while (s.phase !== 'won' && guard++ < 500) {
        if (withApparitions) {
          for (let i = 0; i < 200; i++) {
            const kind = sched.update(16, { scary: true, frozen: s.frozen });
            if (kind === 'ghost') placeGhost(s.maze, s.pos, s.facing, rng);
            if (kind === 'spider') placeSpider(s.maze, s.pos, s.facing, rng);
          }
          pickCobwebs(s.maze, s.seed);
        }
        moves.push(s.moves.map((m) => m.kind).join(','));
        s.choose(shortestMove(s)!);
        s.arrive(INTRO_LOCK_MS);
      }
      return { steps: s.journey.steps, moves, score: s.score };
    };
    expect(play(true)).toEqual(play(false));
  });
});
