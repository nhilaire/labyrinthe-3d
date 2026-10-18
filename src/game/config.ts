// Game constants from the PRD (sizes) and the source project (generation parameters).
import { Generated, generateMaze, rebuildMaze } from './maze';

export type MazeSize = 'small' | 'medium' | 'large';

export const SIZES: Record<MazeSize, { width: number; height: number }> = {
  small: { width: 8, height: 6 },
  medium: { width: 14, height: 9 },
  large: { width: 20, height: 12 },
};

export const SIZE_ORDER: readonly MazeSize[] = ['small', 'medium', 'large'];

// Corridor straightness: 0 winds a lot, 1 is very straight (source default 0.7). Perfect maze (no braid).
export const STRAIGHTNESS = 0.7;
export const BRAID_RATIO = 0;
export const MIN_SOLUTION_SHARE = 0.33;
export const MIN_SPREAD = 0.7;

export function sizeOf(width: number, height: number): MazeSize | null {
  return SIZE_ORDER.find((s) => SIZES[s].width === width && SIZES[s].height === height) ?? null;
}

// A new random maze of the given size (the seed, a random uint32, is drawn by the caller).
export function newMaze(size: MazeSize, seed: number): Generated {
  const { width, height } = SIZES[size];
  return generateMaze({
    width,
    height,
    seed,
    braidRatio: BRAID_RATIO,
    straightness: STRAIGHTNESS,
    minSolutionLength: Math.round(width * height * MIN_SOLUTION_SHARE),
    minSpread: MIN_SPREAD,
  });
}

// The exact maze of a recorded game (deviation D1).
export function replayMaze(width: number, height: number, acceptedSeed: number): Generated {
  return rebuildMaze(width, height, acceptedSeed, STRAIGHTNESS, BRAID_RATIO);
}

// The guided first game always uses this small maze: its shortest path stops at 4 decision points, so every guide
// bubble appears (checked in session.test.ts).
export const GUIDED_SEED = 5;
