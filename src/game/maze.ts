// Maze generation and validation, ported from the source project (shared/core/maze.js) with the same algorithms
// and constants: a given seed produces the same maze as the source.
//
// Coordinates: x to the right, y down (as on the 2D plan). Directions: 0 = N (y-1), 1 = E (x+1), 2 = S, 3 = W.

export type Dir = 0 | 1 | 2 | 3;
export const N: Dir = 0;
export const E: Dir = 1;
export const S: Dir = 2;
export const W: Dir = 3;

export type Cell = { x: number; y: number };
export type Opening = Cell & { dir: Dir };

export const DIRS: readonly { dx: number; dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

export const opposite = (dir: Dir): Dir => ((dir + 2) % 4) as Dir;
export const rightOf = (dir: Dir): Dir => ((dir + 1) % 4) as Dir;
export const leftOf = (dir: Dir): Dir => ((dir + 3) % 4) as Dir;

export type Rng = () => number;

// Deterministic PRNG (mulberry32): same seed, same maze.
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Maze {
  readonly width: number;
  readonly height: number;
  // One bitmask per cell: bit `dir` set = wall on that side.
  readonly walls: Uint8Array;
  entrance!: Opening;
  exit!: Opening;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.walls = new Uint8Array(width * height).fill(0b1111);
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  // Open passage from (x, y) towards `dir` (also true for the entrance and exit openings).
  isOpen(x: number, y: number, dir: Dir): boolean {
    if (!this.inside(x, y)) return false;
    return (this.walls[this.index(x, y)] & (1 << dir)) === 0;
  }

  hasWall(x: number, y: number, dir: Dir): boolean {
    return !this.isOpen(x, y, dir);
  }

  // Removes the wall between (x, y) and its neighbour in `dir`, on both sides.
  carve(x: number, y: number, dir: Dir): void {
    this.walls[this.index(x, y)] &= ~(1 << dir);
    const nx = x + DIRS[dir].dx;
    const ny = y + DIRS[dir].dy;
    if (this.inside(nx, ny)) this.walls[this.index(nx, ny)] &= ~(1 << opposite(dir));
  }

  openDirs(x: number, y: number): Dir[] {
    const out: Dir[] = [];
    for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) if (this.isOpen(x, y, d)) out.push(d);
    return out;
  }

  step(x: number, y: number, dir: Dir): Cell {
    return { x: x + DIRS[dir].dx, y: y + DIRS[dir].dy };
  }
}

// Perfect maze by iterative recursive backtracking. `straightness` (0-1) is the probability of going on straight
// when possible: higher values make longer, straighter corridors.
function carveMaze(maze: Maze, rng: Rng, straightness: number): void {
  const start = { x: Math.floor(rng() * maze.width), y: Math.floor(rng() * maze.height), dir: -1 };
  const visited = new Uint8Array(maze.width * maze.height);
  const stack = [start];
  visited[maze.index(start.x, start.y)] = 1;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const candidates: Dir[] = [];
    for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
      const nx = cur.x + DIRS[d].dx;
      const ny = cur.y + DIRS[d].dy;
      if (maze.inside(nx, ny) && !visited[maze.index(nx, ny)]) candidates.push(d);
    }
    if (!candidates.length) {
      stack.pop();
      continue;
    }
    // `straightness > 0` first: at 0 no random draw is consumed (same order as the source).
    const goStraight =
      straightness > 0 && cur.dir >= 0 && candidates.includes(cur.dir as Dir) && rng() < straightness;
    const d = goStraight ? (cur.dir as Dir) : candidates[Math.floor(rng() * candidates.length)];
    maze.carve(cur.x, cur.y, d);
    const next = maze.step(cur.x, cur.y, d);
    visited[maze.index(next.x, next.y)] = 1;
    stack.push({ x: next.x, y: next.y, dir: d });
  }
}

// Adds loops by removing a share of the inner walls. Kept for fidelity; the game uses ratio 0 (perfect maze).
function braid(maze: Maze, rng: Rng, ratio: number): void {
  if (ratio <= 0) return;
  const edges: { x: number; y: number; d: Dir }[] = [];
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      if (x + 1 < maze.width && maze.hasWall(x, y, E)) edges.push({ x, y, d: E });
      if (y + 1 < maze.height && maze.hasWall(x, y, S)) edges.push({ x, y, d: S });
    }
  }
  const count = Math.floor(edges.length * ratio);
  for (let i = 0; i < count; i++) {
    const k = i + Math.floor(rng() * (edges.length - i));
    const e = edges[k];
    edges[k] = edges[i];
    edges[i] = e;
    maze.carve(e.x, e.y, e.d);
  }
}

// BFS distances (in cells) from a cell, and the predecessor tree.
export function distancesFrom(maze: Maze, start: Cell): { dist: Int32Array; prev: Int32Array } {
  const { width } = maze;
  const dist = new Int32Array(width * maze.height).fill(-1);
  const prev = new Int32Array(width * maze.height).fill(-1);
  const startIdx = maze.index(start.x, start.y);
  dist[startIdx] = 0;
  const queue = [startIdx];
  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head];
    const x = idx % width;
    const y = (idx - x) / width;
    for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
      if (!maze.isOpen(x, y, d)) continue;
      const nx = x + DIRS[d].dx;
      const ny = y + DIRS[d].dy;
      if (!maze.inside(nx, ny)) continue; // border opening (entrance / exit)
      const nIdx = maze.index(nx, ny);
      if (dist[nIdx] !== -1) continue;
      dist[nIdx] = dist[idx] + 1;
      prev[nIdx] = idx;
      queue.push(nIdx);
    }
  }
  return { dist, prev };
}

const BORDERS: { dir: Dir; cells: (m: Maze) => Cell[] }[] = [
  { dir: N, cells: (m) => Array.from({ length: m.width }, (_, x) => ({ x, y: 0 })) },
  { dir: E, cells: (m) => Array.from({ length: m.height }, (_, y) => ({ x: m.width - 1, y })) },
  { dir: S, cells: (m) => Array.from({ length: m.width }, (_, x) => ({ x, y: m.height - 1 })) },
  { dir: W, cells: (m) => Array.from({ length: m.height }, (_, y) => ({ x: 0, y })) },
];

// Entrance and exit on two different random borders; the exit is among the cells of its border that are the
// farthest from the entrance (>= 90 % of the farthest), so the solution really crosses the maze.
function openBorders(maze: Maze, rng: Rng): void {
  const a = Math.floor(rng() * 4);
  let b = Math.floor(rng() * 3);
  if (b >= a) b++;

  const inCells = BORDERS[a].cells(maze);
  const outCells = BORDERS[b].cells(maze);
  const from = inCells[Math.floor(rng() * inCells.length)];
  const entrance: Opening = { x: from.x, y: from.y, dir: BORDERS[a].dir };

  const { dist } = distancesFrom(maze, entrance);
  let far = 0;
  for (const c of outCells) far = Math.max(far, dist[maze.index(c.x, c.y)]);

  const distinct = outCells.filter((c) => c.x !== entrance.x || c.y !== entrance.y);
  const pool = distinct.length ? distinct : outCells;
  const candidates = pool.filter((c) => {
    const d = dist[maze.index(c.x, c.y)];
    return d >= 0 && d >= far * 0.9;
  });
  const list = candidates.length ? candidates : pool;
  const to = list[Math.floor(rng() * list.length)];

  maze.entrance = entrance;
  maze.exit = { x: to.x, y: to.y, dir: BORDERS[b].dir };
  maze.walls[maze.index(entrance.x, entrance.y)] &= ~(1 << entrance.dir);
  maze.walls[maze.index(to.x, to.y)] &= ~(1 << maze.exit.dir);
}

export type MazeReport = {
  solvable: boolean;
  fullyConnected: boolean;
  reached: number;
  distances: Int32Array;
  path: Cell[] | null;
  deadEnds: number;
  solutionLength: number;
  rowCoverage: number;
  colCoverage: number;
  spread: number;
};

// BFS check of a generated maze: exit reachable, every cell connected, solution path and spread.
export function validate(maze: Maze): MazeReport {
  const { width, height } = maze;
  const { dist, prev } = distancesFrom(maze, maze.entrance);
  const goalIdx = maze.index(maze.exit.x, maze.exit.y);
  const solvable = dist[goalIdx] !== -1;
  let reached = 0;
  for (let i = 0; i < dist.length; i++) if (dist[i] !== -1) reached++;

  let path: Cell[] | null = null;
  if (solvable) {
    path = [];
    for (let i = goalIdx; i !== -1; i = prev[i]) {
      const x = i % width;
      path.push({ x, y: (i - x) / width });
    }
    path.reverse();
  }

  let deadEnds = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (maze.openDirs(x, y).length === 1) deadEnds++;

  const rows = new Set<number>();
  const cols = new Set<number>();
  for (const c of path ?? []) {
    rows.add(c.y);
    cols.add(c.x);
  }
  const rowCoverage = rows.size / height;
  const colCoverage = cols.size / width;

  return {
    solvable,
    fullyConnected: reached === width * height,
    reached,
    distances: dist,
    path,
    deadEnds,
    solutionLength: solvable ? dist[goalIdx] + 1 : 0,
    rowCoverage,
    colCoverage,
    spread: Math.min(rowCoverage, colCoverage),
  };
}

export type GenerateOptions = {
  width: number;
  height: number;
  seed: number;
  braidRatio?: number;
  straightness?: number;
  minSolutionLength?: number;
  minSpread?: number;
  maxAttempts?: number;
};

export type Generated = { maze: Maze; report: MazeReport; seed: number; attempts: number; relaxed: boolean };

// One attempt with a given seed: carve, braid, open the borders.
function build(width: number, height: number, seed: number, straightness: number, braidRatio: number): Maze {
  const rng = makeRng(seed);
  const maze = new Maze(width, height);
  carveMaze(maze, rng, straightness);
  braid(maze, rng, braidRatio);
  openBorders(maze, rng);
  return maze;
}

// Generates a valid maze. Validity (solvable, fully connected) is never negotiated; quality thresholds relax
// linearly over the first 75 % of attempts. The returned `seed` is the accepted attempt's seed.
export function generateMaze({
  width,
  height,
  seed,
  braidRatio = 0,
  straightness = 0,
  minSolutionLength = 0,
  minSpread = 0,
  maxAttempts = 40,
}: GenerateOptions): Generated {
  let last: MazeReport | null = null;
  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    const attemptSeed = (seed + (attempts - 1) * 0x9e3779b1) >>> 0;
    const maze = build(width, height, attemptSeed, straightness, braidRatio);
    const report = validate(maze);
    last = report;

    const relax = Math.min(1, (attempts - 1) / Math.max(1, maxAttempts * 0.75));
    const lengthNeeded = Math.max(0, minSolutionLength) * (1 - relax);
    const spreadNeeded = minSpread * (1 - relax);
    if (
      report.solvable &&
      report.fullyConnected &&
      report.solutionLength >= lengthNeeded &&
      report.spread >= spreadNeeded
    ) {
      return {
        maze,
        report,
        seed: attemptSeed,
        attempts,
        relaxed: report.solutionLength < Math.max(0, minSolutionLength) || report.spread < minSpread,
      };
    }
  }
  throw new Error(
    `no valid maze after ${maxAttempts} attempts (solvable=${last?.solvable}, connected=${last?.fullyConnected})`,
  );
}

// Rebuilds a recorded maze from its accepted seed, with no quality check (deviation D1): the walls are always
// identical to the recorded game, even when the original was accepted after relaxation.
export function rebuildMaze(width: number, height: number, seed: number, straightness = 0, braidRatio = 0): Generated {
  const maze = build(width, height, seed >>> 0, straightness, braidRatio);
  const report = validate(maze);
  if (!report.solvable || !report.fullyConnected) throw new Error(`seed ${seed} does not give a valid maze`);
  return { maze, report, seed: seed >>> 0, attempts: 1, relaxed: false };
}
