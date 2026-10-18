// Scary-mode apparitions (PRD AC-37 to AC-40): when they happen, where ghosts and spiders appear, where cobwebs hang.
// Pure TypeScript with an injected random source; it never reads or changes the game session (decor only).
import { Cell, DIRS, Dir, Maze, Rng, leftOf, makeRng, rightOf } from './maze';

export type ApparitionKind = 'ghost' | 'spider' | 'candle';
export const APPARITION_KINDS: readonly ApparitionKind[] = ['ghost', 'spider', 'candle'];

export const MIN_GAP_MS = 10_000;
export const MAX_GAP_MS = 20_000;

// Counts active time (scary mode on, game not frozen) and fires an apparition every 10 to 20 s of it.
export class ApparitionScheduler {
  private elapsed = 0;
  private gap: number;

  constructor(private readonly rng: Rng) {
    this.gap = this.nextGap();
  }

  private nextGap(): number {
    return MIN_GAP_MS + this.rng() * (MAX_GAP_MS - MIN_GAP_MS);
  }

  // Returns the kind to start now, or null.
  update(dtMs: number, { scary, frozen }: { scary: boolean; frozen: boolean }): ApparitionKind | null {
    if (!scary || frozen || !(dtMs > 0)) return null;
    this.elapsed += Math.min(dtMs, 1000);
    if (this.elapsed < this.gap) return null;
    this.elapsed = 0;
    this.gap = this.nextGap();
    return APPARITION_KINDS[Math.floor(this.rng() * APPARITION_KINDS.length)];
  }
}

// Plan coordinates in cell units (cell (x, y) spans [x, x+1] x [y, y+1]; its centre is x + 0.5, y + 0.5).
export type Point = { x: number; y: number };

// Open cells in a straight line from `from` towards `dir`, nearest first, stopping at the first wall.
export function cellsInSight(maze: Maze, from: Cell, dir: Dir, max = 6): Cell[] {
  const out: Cell[] = [];
  let cur = from;
  for (let i = 0; i < max; i++) {
    if (!maze.inside(cur.x, cur.y) || !maze.isOpen(cur.x, cur.y, dir)) break;
    const next = { x: cur.x + DIRS[dir].dx, y: cur.y + DIRS[dir].dy };
    if (!maze.inside(next.x, next.y)) break;
    out.push(next);
    cur = next;
  }
  return out;
}

// The corridor the player is looking down (side corridors are off screen). Null when facing a wall: the caller then
// dims the candle instead.
function sightLine(maze: Maze, pos: Cell, facing: Dir): { dir: Dir; cells: Cell[] } | null {
  const cells = cellsInSight(maze, pos, facing);
  return cells.length ? { dir: facing, cells } : null;
}

export type GhostPath = { from: Point; to: Point; cell: Cell };

// A ghost glides across a corridor cell in sight (side to side, inside the cell, or out through a side opening).
export function placeGhost(maze: Maze, pos: Cell, facing: Dir, rng: Rng): GhostPath | null {
  if (!maze.inside(pos.x, pos.y)) return null;
  const line = sightLine(maze, pos, facing);
  if (!line) return null;
  // Two to four cells ahead when the corridor allows it: seen through the scary fog, not right in the player's face.
  const near = line.cells.slice(1, 4);
  const pool = near.length ? near : line.cells.slice(0, 1);
  const cell = pool[Math.floor(rng() * pool.length)];
  const side = rng() < 0.5 ? leftOf(line.dir) : rightOf(line.dir);
  const c = { x: cell.x + 0.5, y: cell.y + 0.5 };
  const d = DIRS[side];
  // From the threshold of a side opening when there is one (it seems to come out of the side corridor), else from
  // wall to wall; it always stays inside the cell in sight.
  const reach = maze.isOpen(cell.x, cell.y, side) ? 0.48 : 0.32;
  return {
    cell,
    from: { x: c.x + d.dx * reach, y: c.y + d.dy * reach },
    to: { x: c.x - d.dx * 0.32, y: c.y - d.dy * 0.32 },
  };
}

// A spider comes down in the middle of a corridor cell in sight, one or two cells ahead.
export function placeSpider(maze: Maze, pos: Cell, facing: Dir, rng: Rng): Point | null {
  if (!maze.inside(pos.x, pos.y)) return null;
  const line = sightLine(maze, pos, facing);
  if (!line) return null;
  const pool = line.cells.slice(0, 2);
  const cell = pool[Math.floor(rng() * pool.length)];
  return { x: cell.x + 0.5, y: cell.y + 0.5 };
}

export type Cobweb = { x: number; y: number; walls: [Dir, Dir] };

export const COBWEB_SHARE = 0.15;

// Corner and dead-end cells (two perpendicular walls) get a cobweb in one upper corner; about 15 % of them, by seed.
export function pickCobwebs(maze: Maze, seed: number): Cobweb[] {
  const candidates: Cobweb[] = [];
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      const walls = ([0, 1, 2, 3] as Dir[]).filter((d) => maze.hasWall(x, y, d));
      const open = 4 - walls.length;
      if (open > 2 || open === 0) continue;
      const corners = walls.filter((d) => walls.includes(rightOf(d)));
      if (open === 2 && corners.length === 0) continue; // straight corridor: no corner
      if (corners.length) candidates.push({ x, y, walls: [corners[0], rightOf(corners[0])] });
    }
  }
  const rng = makeRng((seed ^ 0x5bd1e995) >>> 0);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const count = Math.max(1, Math.round(candidates.length * COBWEB_SHARE));
  return candidates.slice(0, count);
}

// Is the straight segment between two plan points free of walls? (samples the segment cell by cell)
export function segmentClear(maze: Maze, a: Point, b: Point): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 20) + 1;
  let prev = { x: Math.floor(a.x), y: Math.floor(a.y) };
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const cell = { x: Math.floor(a.x + (b.x - a.x) * t), y: Math.floor(a.y + (b.y - a.y) * t) };
    if (cell.x !== prev.x || cell.y !== prev.y) {
      if (!maze.inside(cell.x, cell.y)) return false;
      const dir = DIRS.findIndex((d) => prev.x + d.dx === cell.x && prev.y + d.dy === cell.y);
      if (dir < 0 || !maze.isOpen(prev.x, prev.y, dir as Dir)) return false;
      prev = cell;
    }
  }
  return true;
}
