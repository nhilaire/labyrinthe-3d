// AC-10: the smooth camera stays in the corridors (never crosses a wall), and ends each route on its last cell
// facing its end direction. Mazes are explored to the exit, preferring the least walked passages.
import * as THREE from 'three';

import { MazeSize, newMaze } from '../game/config';
import { DIRS, Maze, opposite } from '../game/maze';
import { Route, availableMoves, edgeKey, outsideOf, planRoute, sameCell } from '../game/navigation';
import { CELL, EYE_H, WALL_T, worldOf, yawForDir } from '../render/dimensions';
import { Walker } from '../render/walker';

const BODY_RADIUS = 0.3;

const norm = (a: number) => {
  let v = a % (Math.PI * 2);
  if (v > Math.PI) v -= Math.PI * 2;
  if (v < -Math.PI) v += Math.PI * 2;
  return v;
};

// Distance from a point to the walls of the cell that contains it (Infinity outside the grid).
function clearanceAt(maze: Maze, p: THREE.Vector3, route: Route): number {
  const cx = Math.floor(p.x / CELL);
  const cz = Math.floor(p.z / CELL);
  expect(route.cells.some((c) => c.x === cx && c.y === cz)).toBe(true);
  if (!maze.inside(cx, cz)) return Infinity;
  const lx = p.x - cx * CELL;
  const lz = p.z - cz * CELL;
  const gaps = [lz, CELL - lx, CELL - lz, lx];
  let min = Infinity;
  for (let d = 0; d < 4; d++) {
    if (maze.isOpen(cx, cz, d as 0 | 1 | 2 | 3)) continue;
    min = Math.min(min, gaps[d] - WALL_T / 2);
  }
  return min;
}

function explore(size: MazeSize, seed: number) {
  const { maze } = newMaze(size, seed);
  const camera = new THREE.PerspectiveCamera(75, 1.5, 0.1, 200);
  const walker = new Walker(camera);
  let pos = outsideOf(maze.entrance);
  let facing = opposite(maze.entrance.dir);
  walker.setPose(pos, facing);
  const used = new Map<string, number>();
  let exited = false;
  let minClearance = Infinity;

  for (let step = 0; step < 4000 && !exited; step++) {
    const moves = step === 0 ? [{ kind: 'forward' as const, dir: facing }] : availableMoves(maze, pos, facing);
    let best = moves[0];
    let bestScore = Infinity;
    for (const m of moves) {
      const next = { x: pos.x + DIRS[m.dir].dx, y: pos.y + DIRS[m.dir].dy };
      const score = used.get(edgeKey(pos, next)) ?? 0;
      if (score < bestScore) {
        bestScore = score;
        best = m;
      }
    }
    const route = planRoute(maze, pos, best.dir);
    for (let i = 1; i < route.cells.length; i++) {
      const k = edgeKey(route.cells[i - 1], route.cells[i]);
      used.set(k, (used.get(k) ?? 0) + 1);
    }
    expect(walker.startRoute(route.cells, best.dir)).toBe(true);

    let frames = 0;
    let done = false;
    while (!done) {
      done = walker.update(1 / 30);
      frames++;
      expect(frames).toBeLessThan(5000);
      if (frames % 3 === 0 || done) minClearance = Math.min(minClearance, clearanceAt(maze, camera.position, route));
      expect(Math.abs(camera.position.y - EYE_H)).toBeLessThan(0.2);
    }
    const target = worldOf(route.cells[route.cells.length - 1], EYE_H);
    expect(Math.abs(camera.position.x - target.x)).toBeLessThan(1e-3);
    expect(Math.abs(camera.position.z - target.z)).toBeLessThan(1e-3);
    expect(Math.abs(norm(walker.yaw - yawForDir(route.endDir)))).toBeLessThan(0.02);
    expect(walker.facingDir()).toBe(route.endDir);

    pos = route.cells[route.cells.length - 1];
    facing = route.endDir;
    exited = route.exited;
  }
  expect(exited).toBe(true);
  expect(sameCell(pos, outsideOf(maze.exit))).toBe(true);
  return minClearance;
}

describe('camera walker (AC-10)', () => {
  it('never crosses a wall and ends every route on its cell and heading, 200 seeds', () => {
    let min = Infinity;
    // 170 small, 20 medium, 10 large mazes walked to the exit (each route sampled at 30 fps).
    for (let i = 0; i < 200; i++) {
      const size: MazeSize = i < 170 ? 'small' : i < 190 ? 'medium' : 'large';
      min = Math.min(min, explore(size, (31 * i + 20000) >>> 0));
    }
    expect(min).toBeGreaterThan(BODY_RADIUS);
  });

  it('turns in place before moving when the chosen direction differs', () => {
    const camera = new THREE.PerspectiveCamera();
    const walker = new Walker(camera);
    walker.setPose({ x: 0, y: 0 }, 0);
    walker.startRoute([{ x: 0, y: 0 }, { x: 1, y: 0 }], 1);
    expect(walker.state).toBe('turning');
    const before = walker.position.clone();
    walker.update(1 / 60);
    expect(walker.position.distanceTo(before)).toBeLessThan(1e-6);
    let guard = 0;
    while (!walker.update(1 / 60) && guard++ < 1000);
    expect(walker.cellAt()).toEqual({ x: 1, y: 0 });
    expect(walker.isBusy).toBe(false);
  });
});
