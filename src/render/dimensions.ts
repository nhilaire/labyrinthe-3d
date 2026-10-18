// World dimensions and plan <-> world mapping (source: shared/three/dimensions.js).
// Cell (x, y) of the plan is centred in the world on (x * CELL + CELL/2, 0, y * CELL + CELL/2). Plan north (y - 1)
// is -Z.
import * as THREE from 'three';

import type { Cell, Dir } from '../game/maze';

export const CELL = 4; // cell width, world units
export const WALL_H = 5; // wall height
export const WALL_T = 0.5; // wall thickness
export const EYE_H = 2.05; // eye height
export const TILE = 2; // world units covered by one texture tile

// World centre of a plan cell (cells outside the grid are accepted).
export function worldOf(cell: Cell, y = 0): THREE.Vector3 {
  return new THREE.Vector3(cell.x * CELL + CELL / 2, y, cell.y * CELL + CELL / 2);
}

// Camera yaw for a plan direction (the camera looks at -Z when yaw = 0).
export function yawForDir(dir: Dir): number {
  return -dir * (Math.PI / 2);
}
