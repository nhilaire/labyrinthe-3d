// Maze walls and pillars as two merged geometries (source: shared/three/mazeGeometry.js): two draw calls whatever
// the maze size, which keeps large mazes smooth.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import { E, Maze, N, S, W } from '../game/maze';
import { CELL, TILE, WALL_H, WALL_T } from './dimensions';

// Rescales the UVs of a box so the texture keeps the same density on every face and lines up from wall to wall.
function worldAlignedBoxUVs(geo: THREE.BoxGeometry, w: number, h: number, d: number, center: THREE.Vector3) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z (4 vertices each).
  const faces = [
    { dimU: d, dimV: h, cU: center.z, cV: center.y },
    { dimU: d, dimV: h, cU: center.z, cV: center.y },
    { dimU: w, dimV: d, cU: center.x, cV: center.z },
    { dimU: w, dimV: d, cU: center.x, cV: center.z },
    { dimU: w, dimV: h, cU: center.x, cV: center.y },
    { dimU: w, dimV: h, cU: center.x, cV: center.y },
  ];
  for (let f = 0; f < 6; f++) {
    const { dimU, dimV, cU, cV } = faces[f];
    const offU = (cU - dimU / 2) / TILE;
    const offV = (cV - dimV / 2) / TILE;
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * (dimU / TILE) + offU, uv.getY(i) * (dimV / TILE) + offV);
    }
  }
  uv.needsUpdate = true;
}

function boxAt(w: number, h: number, d: number, center: THREE.Vector3): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  worldAlignedBoxUVs(geo, w, h, d, center);
  geo.translate(center.x, center.y, center.z);
  return geo;
}

// Wall on the horizontal grid line y, column x?
export function horizontalWall(maze: Maze, x: number, y: number): boolean {
  if (x < 0 || x >= maze.width) return false;
  if (y === 0) return maze.hasWall(x, 0, N);
  if (y === maze.height) return maze.hasWall(x, maze.height - 1, S);
  return maze.hasWall(x, y, N);
}

// Wall on the vertical grid line x, row y?
export function verticalWall(maze: Maze, x: number, y: number): boolean {
  if (y < 0 || y >= maze.height) return false;
  if (x === 0) return maze.hasWall(0, y, W);
  if (x === maze.width) return maze.hasWall(maze.width - 1, y, E);
  return maze.hasWall(x, y, W);
}

export function buildWallGeometry(maze: Maze): THREE.BufferGeometry {
  const boxes: THREE.BufferGeometry[] = [];
  for (let y = 0; y <= maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      if (!horizontalWall(maze, x, y)) continue;
      boxes.push(boxAt(CELL + WALL_T, WALL_H, WALL_T, new THREE.Vector3(x * CELL + CELL / 2, WALL_H / 2, y * CELL)));
    }
  }
  for (let x = 0; x <= maze.width; x++) {
    for (let y = 0; y < maze.height; y++) {
      if (!verticalWall(maze, x, y)) continue;
      boxes.push(boxAt(WALL_T, WALL_H, CELL + WALL_T, new THREE.Vector3(x * CELL, WALL_H / 2, y * CELL + CELL / 2)));
    }
  }
  const merged = mergeGeometries(boxes, false);
  boxes.forEach((g) => g.dispose());
  return merged;
}

// Pillars at every grid intersection touched by a wall.
export function buildPillarGeometry(maze: Maze): THREE.BufferGeometry {
  const boxes: THREE.BufferGeometry[] = [];
  const size = WALL_T * 1.7;
  for (let y = 0; y <= maze.height; y++) {
    for (let x = 0; x <= maze.width; x++) {
      const touched =
        horizontalWall(maze, x - 1, y) || horizontalWall(maze, x, y) || verticalWall(maze, x, y - 1) || verticalWall(maze, x, y);
      if (touched) boxes.push(boxAt(size, WALL_H, size, new THREE.Vector3(x * CELL, WALL_H / 2, y * CELL)));
    }
  }
  const merged = mergeGeometries(boxes, false);
  boxes.forEach((g) => g.dispose());
  return merged;
}
