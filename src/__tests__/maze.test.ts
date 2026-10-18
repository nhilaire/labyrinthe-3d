// AC-04, AC-05, AC-06: generation validity, determinism, fidelity to the source, replay of a recorded maze (D1).
import { MazeSize, SIZES, SIZE_ORDER, newMaze, replayMaze } from '../game/config';
import { pickLandmarks } from '../game/landmarks';
import { Maze, distancesFrom, generateMaze, validate } from '../game/maze';
import { wallFollower } from '../game/strategies';
import fixtures from './fixtures/source-mazes.json';

const hex = (walls: Uint8Array): string => Array.from(walls, (b) => b.toString(16).padStart(2, '0')).join('');

const SEEDS = Array.from({ length: 200 }, (_, i) => (i * 2654435761 + 17) >>> 0);

function borderOf(maze: Maze, c: { x: number; y: number; dir: number }): number {
  return c.dir;
}

describe('maze generation (AC-04)', () => {
  it.each(SIZE_ORDER)('%s: 200 seeds give solvable, fully connected mazes with a far exit on another border', (size) => {
    for (const seed of SEEDS) {
      const { maze, report } = newMaze(size, seed);
      expect(maze.width).toBe(SIZES[size].width);
      expect(maze.height).toBe(SIZES[size].height);
      expect(report.solvable).toBe(true);
      expect(report.fullyConnected).toBe(true);
      expect(borderOf(maze, maze.entrance)).not.toBe(borderOf(maze, maze.exit));
      // The exit is on the border of its direction.
      const onBorder = [maze.exit.y === 0, maze.exit.x === maze.width - 1, maze.exit.y === maze.height - 1, maze.exit.x === 0];
      expect(onBorder[maze.exit.dir]).toBe(true);
      // Its distance from the entrance is >= 90 % of the farthest cell of that border.
      const { dist } = distancesFrom(maze, maze.entrance);
      const border = [];
      for (let x = 0; x < maze.width; x++) for (let y = 0; y < maze.height; y++) {
        if ([y === 0, x === maze.width - 1, y === maze.height - 1, x === 0][maze.exit.dir]) border.push(dist[maze.index(x, y)]);
      }
      expect(dist[maze.index(maze.exit.x, maze.exit.y)]).toBeGreaterThanOrEqual(Math.max(...border) * 0.9);
    }
  });
});

describe('determinism and fidelity to the source (AC-05)', () => {
  it('the same seed gives the same maze and landmarks', () => {
    for (const size of SIZE_ORDER) {
      const a = newMaze(size, 424242);
      const b = newMaze(size, 424242);
      expect(Array.from(a.maze.walls)).toEqual(Array.from(b.maze.walls));
      expect(a.maze.entrance).toEqual(b.maze.entrance);
      expect(a.maze.exit).toEqual(b.maze.exit);
      expect(pickLandmarks(a.maze, a.seed)).toEqual(pickLandmarks(b.maze, b.seed));
    }
  });

  it.each(fixtures.cases.map((c) => [c.size, c.seed, c] as const))(
    '%s seed %i matches the original JavaScript game',
    (size, seed, expected) => {
      const g = newMaze(size as MazeSize, seed);
      expect(g.seed).toBe(expected.acceptedSeed);
      expect(g.attempts).toBe(expected.attempts);
      expect(hex(g.maze.walls)).toBe(expected.walls);
      expect(g.maze.entrance).toEqual(expected.entrance);
      expect(g.maze.exit).toEqual(expected.exit);
      expect(g.report.solutionLength).toBe(expected.solutionLength);
      expect(pickLandmarks(g.maze, g.seed)).toEqual(expected.landmarks);
      expect(wallFollower(g.maze)).toEqual(expected.follower);
    },
  );
});

describe('replay of a recorded maze (AC-06, D1)', () => {
  it('rebuilds the exact walls of every fixture from its accepted seed', () => {
    for (const c of fixtures.cases) {
      const { width, height } = SIZES[c.size as MazeSize];
      const replay = replayMaze(width, height, c.acceptedSeed);
      expect(hex(replay.maze.walls)).toBe(c.walls);
      expect(replay.maze.entrance).toEqual(c.entrance);
      expect(replay.maze.exit).toEqual(c.exit);
    }
  });

  it('keeps a maze accepted after relaxation, which the source regeneration would change', () => {
    const { width, height } = SIZES.large;
    const relaxed = SEEDS.map((s) => newMaze('large', s)).find((g) => g.relaxed);
    expect(relaxed).toBeDefined();
    const original = hex(relaxed!.maze.walls);
    // The source replayed with generateMaze(acceptedSeed) and full thresholds: a different maze.
    const sourceReplay = generateMaze({
      width,
      height,
      seed: relaxed!.seed,
      straightness: 0.7,
      minSolutionLength: Math.round(width * height * 0.33),
      minSpread: 0.7,
    });
    expect(hex(sourceReplay.maze.walls)).not.toBe(original);
    // The port rebuilds it exactly.
    const replay = replayMaze(width, height, relaxed!.seed);
    expect(hex(replay.maze.walls)).toBe(original);
    expect(validate(replay.maze).solvable).toBe(true);
  });
});
