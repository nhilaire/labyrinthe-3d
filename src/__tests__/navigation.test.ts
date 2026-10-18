// AC-07, AC-08, AC-09: landmarks, offered moves, routes to the next decision point, journey history.
import { SIZE_ORDER, newMaze } from '../game/config';
import { pickLandmarks } from '../game/landmarks';
import { DIRS, Dir, E, Maze, N, S, W, leftOf, opposite, rightOf } from '../game/maze';
import { Journey, availableMoves, isPassable, outsideOf, planRoute } from '../game/navigation';

const SEEDS = Array.from({ length: 50 }, (_, i) => (i * 97 + 5) >>> 0);

// A hand-made 3 x 2 maze: entrance west of (0,0), exit east of (2,1).
//   (0,0) - (1,0) - (2,0)
//             |
//   (0,1)   (1,1) - (2,1) ->
function tinyMaze(): Maze {
  const m = new Maze(3, 2);
  m.carve(0, 0, E);
  m.carve(1, 0, E);
  m.carve(1, 0, S);
  m.carve(1, 1, E);
  m.carve(0, 1, E);
  m.entrance = { x: 0, y: 0, dir: W };
  m.exit = { x: 2, y: 1, dir: E };
  m.walls[m.index(0, 0)] &= ~(1 << W);
  m.walls[m.index(2, 1)] &= ~(1 << E);
  return m;
}

describe('landmarks (AC-07)', () => {
  it.each([
    ['small', 3],
    ['medium', 5],
    ['large', 9],
  ] as const)('%s mazes get %i emblems, never on the entrance or exit, each on a wall of its cell', (size, count) => {
    for (const seed of SEEDS) {
      const { maze, seed: accepted } = newMaze(size, seed);
      const marks = pickLandmarks(maze, accepted);
      expect(marks).toHaveLength(count);
      for (const m of marks) {
        expect(m.x === maze.entrance.x && m.y === maze.entrance.y).toBe(false);
        expect(m.x === maze.exit.x && m.y === maze.exit.y).toBe(false);
        expect(maze.hasWall(m.x, m.y, m.dir)).toBe(true);
      }
      expect(new Set(marks.map((m) => m.emblem)).size).toBe(count);
    }
  });
});

describe('available moves (AC-08)', () => {
  it('offers forward/left/right exactly when passable, U-turn only when nothing else is', () => {
    for (const size of SIZE_ORDER) {
      for (const seed of SEEDS.slice(0, 10)) {
        const { maze } = newMaze(size, seed);
        for (let y = 0; y < maze.height; y++) {
          for (let x = 0; x < maze.width; x++) {
            for (let f = 0 as Dir; f < 4; f = (f + 1) as Dir) {
              const p = { x, y };
              const kinds = availableMoves(maze, p, f).map((m) => m.kind).sort();
              const expected: string[] = [];
              if (isPassable(maze, p, f)) expected.push('forward');
              if (isPassable(maze, p, leftOf(f))) expected.push('left');
              if (isPassable(maze, p, rightOf(f))) expected.push('right');
              if (expected.length === 0 && isPassable(maze, p, opposite(f))) expected.push('back');
              expect(kinds).toEqual(expected.sort());
            }
          }
        }
      }
    }
  });

  it('offers only the way in from outside the entrance', () => {
    const m = tinyMaze();
    expect(availableMoves(m, outsideOf(m.entrance), E)).toEqual([{ kind: 'forward', dir: E }]);
  });

  it('offers the U-turn in a dead end', () => {
    const m = tinyMaze();
    expect(availableMoves(m, { x: 2, y: 0 }, E)).toEqual([{ kind: 'back', dir: W }]);
  });
});

describe('routes (AC-09)', () => {
  it('stops at the first junction', () => {
    const m = tinyMaze();
    const r = planRoute(m, outsideOf(m.entrance), E);
    expect(r.cells).toEqual([{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }]);
    expect(r.exited).toBe(false);
    expect(r.deadEnd).toBe(false);
  });

  it('follows corners and crosses the exit', () => {
    const m = tinyMaze();
    const r = planRoute(m, { x: 1, y: 0 }, S);
    expect(r.cells).toEqual([{ x: 1, y: 0 }, { x: 1, y: 1 }]);
    const r2 = planRoute(m, { x: 1, y: 1 }, E);
    expect(r2.cells).toEqual([{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }]);
    expect(r2.exited).toBe(true);
  });

  it('turns corners inside a corridor and stops in a dead end', () => {
    const m = tinyMaze();
    // From (1,1) going west: (0,1) is a dead end.
    const r = planRoute(m, { x: 1, y: 1 }, W);
    expect(r.cells).toEqual([{ x: 1, y: 1 }, { x: 0, y: 1 }]);
    expect(r.deadEnd).toBe(true);
    expect(r.endDir).toBe(W);
  });

  it('every route of real mazes ends on a decision point, the exit, or a dead end', () => {
    for (const seed of SEEDS) {
      const { maze } = newMaze('medium', seed);
      for (let y = 0; y < maze.height; y++) {
        for (let x = 0; x < maze.width; x++) {
          for (const d of maze.openDirs(x, y)) {
            const r = planRoute(maze, { x, y }, d);
            const end = r.cells[r.cells.length - 1];
            for (let i = 1; i < r.cells.length; i++) {
              const a = r.cells[i - 1];
              const b = r.cells[i];
              expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(1);
            }
            if (maze.inside(end.x, end.y)) {
              const onward = maze.openDirs(end.x, end.y).filter((o) => o !== opposite(r.endDir)).length;
              expect(onward === 0 ? r.deadEnd : onward >= 2).toBe(true);
            }
          }
        }
      }
    }
  });

  it('the journey counts one step per cell entered and keeps per-segment visits', () => {
    const m = tinyMaze();
    const j = new Journey(outsideOf(m.entrance));
    const r1 = planRoute(m, outsideOf(m.entrance), E);
    j.record(r1.cells);
    expect(j.steps).toBe(2);
    const r2 = planRoute(m, { x: 1, y: 0 }, E); // to the dead end (2,0)
    j.record(r2.cells);
    const r3 = planRoute(m, { x: 2, y: 0 }, W); // back to (1,0)
    j.record(r3.cells);
    expect(j.steps).toBe(4);
    expect(j.edgeCount({ x: 1, y: 0 }, { x: 2, y: 0 })).toBe(2);
    expect(j.maxEdgeVisits).toBe(2);
    expect(j.cellCount({ x: 1, y: 0 })).toBe(2);
    expect(j.segments().find((s) => s.count === 2)).toBeDefined();
  });

  it('direction vectors match the N/E/S/W convention', () => {
    expect(DIRS[N]).toEqual({ dx: 0, dy: -1 });
    expect(DIRS[E]).toEqual({ dx: 1, dy: 0 });
  });
});
