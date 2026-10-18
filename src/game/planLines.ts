// 2D plan geometry, independent of the drawing technique (source: shared/core/planLines.js).
import { DIRS, E, Maze, N, S, W } from './maze';

export type Segment = [number, number, number, number];

// Wall segments in grid coordinates, without duplicates.
export function wallLines(maze: Maze): Segment[] {
  const lines: Segment[] = [];
  const { width: mw, height: mh } = maze;
  for (let y = 0; y <= mh; y++) {
    for (let x = 0; x < mw; x++) {
      const present = y === 0 ? maze.hasWall(x, 0, N) : y === mh ? maze.hasWall(x, mh - 1, S) : maze.hasWall(x, y, N);
      if (present) lines.push([x, y, x + 1, y]);
    }
  }
  for (let x = 0; x <= mw; x++) {
    for (let y = 0; y < mh; y++) {
      const present = x === 0 ? maze.hasWall(0, y, W) : x === mw ? maze.hasWall(mw - 1, y, E) : maze.hasWall(x, y, W);
      if (present) lines.push([x, y, x, y + 1]);
    }
  }
  return lines;
}

// Segments joining the centres of connected cells (the whole corridor network).
export function corridorLines(maze: Maze): Segment[] {
  const lines: Segment[] = [];
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      for (const d of [E, S] as const) {
        const nx = x + DIRS[d].dx;
        const ny = y + DIRS[d].dy;
        if (maze.inside(nx, ny) && maze.isOpen(x, y, d)) lines.push([x, y, nx, ny]);
      }
    }
  }
  return lines;
}
