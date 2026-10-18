// Moves offered at a decision point and the route to the next one (corridors followed automatically, corners
// included). Ported from the source project (shared/core/navigation.js).
import { Cell, DIRS, Dir, Maze, Opening, leftOf, opposite, rightOf } from './maze';

export const cellKey = (c: Cell): string => `${c.x},${c.y}`;
export const edgeKey = (a: Cell, b: Cell): string => {
  const ka = cellKey(a);
  const kb = cellKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};
export const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;

// Virtual cell just outside a border opening.
export function outsideOf(opening: Opening): Cell {
  return { x: opening.x + DIRS[opening.dir].dx, y: opening.y + DIRS[opening.dir].dy };
}

// Passable from `p` towards `dir`, including from outside (only back in through the matching opening).
export function isPassable(maze: Maze, p: Cell, dir: Dir): boolean {
  if (maze.inside(p.x, p.y)) return maze.isOpen(p.x, p.y, dir);
  for (const opening of [maze.entrance, maze.exit]) {
    if (sameCell(p, outsideOf(opening)) && dir === opposite(opening.dir)) return true;
  }
  return false;
}

export type MoveKind = 'forward' | 'left' | 'right' | 'back';
export type Move = { kind: MoveKind; dir: Dir };

// Forward / left / right when passable; U-turn only when there is no other way (dead end).
export function availableMoves(maze: Maze, p: Cell, facing: Dir): Move[] {
  const moves: Move[] = [];
  const candidates: Move[] = [
    { kind: 'forward', dir: facing },
    { kind: 'left', dir: leftOf(facing) },
    { kind: 'right', dir: rightOf(facing) },
  ];
  for (const c of candidates) if (isPassable(maze, p, c.dir)) moves.push(c);
  if (moves.length === 0) {
    const back = opposite(facing);
    if (isPassable(maze, p, back)) moves.push({ kind: 'back', dir: back });
  }
  return moves;
}

export type Route = { cells: Cell[]; endDir: Dir; exited: boolean; deadEnd: boolean };

// Route from `start` in `chosenDir`, followed to the next decision point: a junction (2+ ways on), a dead end, or
// the exit crossed. `cells[0]` is the start; the next ones are the cells entered, in order.
export function planRoute(maze: Maze, start: Cell, chosenDir: Dir): Route {
  const cells: Cell[] = [{ x: start.x, y: start.y }];
  let cur = cells[0];
  let dir = chosenDir;
  let exited = false;
  let deadEnd = false;
  const maxSteps = maze.width * maze.height * 4 + 8;
  for (let i = 0; i < maxSteps; i++) {
    if (!isPassable(maze, cur, dir)) {
      deadEnd = cells.length === 1;
      break;
    }
    const next = { x: cur.x + DIRS[dir].dx, y: cur.y + DIRS[dir].dy };
    cells.push(next);
    cur = next;
    if (!maze.inside(cur.x, cur.y)) {
      exited = sameCell(cur, outsideOf(maze.exit));
      break;
    }
    const back = opposite(dir);
    const onward = maze.openDirs(cur.x, cur.y).filter((d) => d !== back);
    if (onward.length === 1) {
      dir = onward[0];
      continue;
    }
    deadEnd = onward.length === 0;
    break;
  }
  return { cells, endDir: dir, exited, deadEnd };
}

// Walk history: visits per cell and per segment.
export class Journey {
  readonly cellVisits = new Map<string, number>();
  readonly edgeVisits = new Map<string, number>();
  readonly trail: Cell[] = [];
  steps = 0;

  constructor(start?: Cell) {
    if (start) this.enter(start);
  }

  enter(cell: Cell): void {
    const k = cellKey(cell);
    this.cellVisits.set(k, (this.cellVisits.get(k) ?? 0) + 1);
    this.trail.push({ x: cell.x, y: cell.y });
  }

  // Records a whole route (cells[0] is already counted).
  record(cells: Cell[]): void {
    for (let i = 1; i < cells.length; i++) {
      const k = edgeKey(cells[i - 1], cells[i]);
      this.edgeVisits.set(k, (this.edgeVisits.get(k) ?? 0) + 1);
      this.enter(cells[i]);
      this.steps++;
    }
  }

  cellCount(cell: Cell): number {
    return this.cellVisits.get(cellKey(cell)) ?? 0;
  }

  edgeCount(a: Cell, b: Cell): number {
    return this.edgeVisits.get(edgeKey(a, b)) ?? 0;
  }

  get maxEdgeVisits(): number {
    let max = 0;
    for (const v of this.edgeVisits.values()) if (v > max) max = v;
    return max;
  }

  // Walked segments with their number of passes.
  segments(): { a: Cell; b: Cell; count: number }[] {
    const out: { a: Cell; b: Cell; count: number }[] = [];
    const seen = new Set<string>();
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1];
      const b = this.trail[i];
      const k = edgeKey(a, b);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ a, b, count: this.edgeVisits.get(k) ?? 0 });
    }
    return out;
  }
}
