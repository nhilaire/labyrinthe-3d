// Wall emblems: a few landmarks at remarkable, well spread places, drawn both in 3D and on the plan. They are what
// lets the player locate themselves. Ported from the source project (shared/core/landmarks.js); deterministic.
import { Dir, Maze, Rng, makeRng, opposite } from './maze';

export const EMBLEM_COUNT = 10;

export type Landmark = { x: number; y: number; dir: Dir; emblem: number };
type Spot = Omit<Landmark, 'emblem'>;

function shuffle<T>(list: T[], rng: Rng): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The wall that carries the emblem: the back wall of a dead end, else the first wall (N, E, S, W order).
function wallFace(maze: Maze, x: number, y: number): Dir | -1 {
  const open = maze.openDirs(x, y);
  if (open.length === 1) return opposite(open[0]);
  for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) if (maze.hasWall(x, y, d)) return d;
  return -1;
}

export function landmarkTarget(width: number, height: number): number {
  return Math.max(3, Math.min(EMBLEM_COUNT, Math.round((width * height) / 26)));
}

// Junctions first (where the emblem helps to decide), then dead ends (where it helps to remember).
export function pickLandmarks(
  maze: Maze,
  seed = 1,
  { count, minDistance = 5 }: { count?: number; minDistance?: number } = {},
): Landmark[] {
  const target = count ?? landmarkTarget(maze.width, maze.height);
  const rng = makeRng((seed ^ 0x9e3779b9) >>> 0);
  const junctions: Spot[] = [];
  const deadEnds: Spot[] = [];
  const reserved = new Set([`${maze.entrance.x},${maze.entrance.y}`, `${maze.exit.x},${maze.exit.y}`]);
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      if (reserved.has(`${x},${y}`)) continue;
      const degree = maze.openDirs(x, y).length;
      const dir = wallFace(maze, x, y);
      if (dir === -1) continue;
      if (degree >= 3) junctions.push({ x, y, dir });
      else if (degree === 1) deadEnds.push({ x, y, dir });
    }
  }
  const ordered = [...shuffle(junctions, rng), ...shuffle(deadEnds, rng)];
  const chosen: Spot[] = [];
  for (let spacing = minDistance; spacing >= 0 && chosen.length < target; spacing--) {
    for (const c of ordered) {
      if (chosen.length >= target) break;
      if (chosen.some((k) => k.x === c.x && k.y === c.y)) continue;
      if (chosen.every((k) => Math.abs(k.x - c.x) + Math.abs(k.y - c.y) >= spacing)) chosen.push(c);
    }
  }
  return chosen.map((c, i) => ({ ...c, emblem: i % EMBLEM_COUNT }));
}
