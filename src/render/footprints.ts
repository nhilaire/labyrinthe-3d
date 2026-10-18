// Footprints on the floor (« Traces »), source: shared/three/footprints.js. Each print is an instance of a small
// textured quad: repeated passes overlap (additive blending) and stand out more, the same information as the walked
// path on the final plan. Prints are always recorded; the mesh is only shown when footprints are on.
import * as THREE from 'three';

import { CELL } from './dimensions';

const STRIDE = 1.15;
const SPREAD = 0.32;
const FOOT_LENGTH = 0.85;
const FOOT_WIDTH = 0.5;
const HEIGHT = 0.035; // above the floor, against z-fighting
const MAX_PRINTS = 4096;

export type Footprints = ReturnType<typeof createFootprints>;

export function createFootprints({ texture, maxPrints = MAX_PRINTS, rng = Math.random }: { texture: THREE.Texture; maxPrints?: number; rng?: () => number }) {
  const geometry = new THREE.PlaneGeometry(FOOT_LENGTH, FOOT_WIDTH);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0xffc891,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, maxPrints);
  mesh.name = 'footprints';
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 1;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  let travelled = 0;
  let left = false;
  let lastX: number | null = null;
  let lastZ: number | null = null;

  function place(x: number, z: number, heading: number, side: number) {
    if (mesh.count >= maxPrints) return;
    const nx = Math.cos(heading + Math.PI / 2) * SPREAD * side;
    const nz = Math.sin(heading + Math.PI / 2) * SPREAD * side;
    position.set(x + nx, HEIGHT, z + nz);
    quaternion.setFromAxisAngle(up, -heading + (rng() - 0.5) * 0.12);
    const s = 0.92 + rng() * 0.16;
    scale.set(s, 1, s);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(mesh.count, matrix);
    mesh.count += 1;
    mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    mesh,
    get count() {
      return mesh.count;
    },
    // Follows the camera and drops a print every STRIDE; `heading` is the move angle in the (x, z) plane.
    follow(x: number, z: number, heading: number) {
      if (lastX === null || lastZ === null) {
        lastX = x;
        lastZ = z;
        return;
      }
      const d = Math.hypot(x - lastX, z - lastZ);
      lastX = x;
      lastZ = z;
      if (d <= 0 || d > CELL) return; // teleport: no trail
      travelled += d;
      while (travelled >= STRIDE) {
        travelled -= STRIDE;
        left = !left;
        place(x, z, heading, left ? 1 : -1);
      }
    },
    breakTrail() {
      lastX = null;
      lastZ = null;
    },
    setVisible(value: boolean) {
      mesh.visible = value;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
}
