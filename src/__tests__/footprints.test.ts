// AC-15: footprints are always recorded. When the instance buffer is full, the oldest prints are recycled so the
// most recent trail is always on the floor (a long game used to stop leaving prints after ~1180 cells).
import * as THREE from 'three';

import { createFootprints } from '../render/footprints';
import { footprintTexture } from '../render/textures';

function printXs(prints: ReturnType<typeof createFootprints>): number[] {
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const xs: number[] = [];
  for (let i = 0; i < prints.mesh.count; i++) {
    prints.mesh.getMatrixAt(i, m);
    p.setFromMatrixPosition(m);
    xs.push(p.x);
  }
  return xs.sort((a, b) => a - b);
}

// Walks along +x (heading 0 along x, so the side offset is on z only) from 0 to `distance`.
function walk(prints: ReturnType<typeof createFootprints>, distance: number) {
  for (let x = 0; x <= distance; x += 0.5) prints.follow(x, 0, 0);
}

describe('footprints (AC-15)', () => {
  it('drops a print about every stride', () => {
    const prints = createFootprints({ texture: footprintTexture({ size: 16 }), maxPrints: 64, rng: () => 0.5 });
    walk(prints, 23);
    expect(prints.count).toBe(20);
    prints.dispose();
  });

  it('keeps recording when full by recycling the oldest prints', () => {
    const prints = createFootprints({ texture: footprintTexture({ size: 16 }), maxPrints: 4, rng: () => 0.5 });
    walk(prints, 23);
    expect(prints.count).toBe(4);
    const xs = printXs(prints);
    // The 4 most recent prints, all near the end of the walk (20 prints dropped over 23 units).
    expect(xs[0]).toBeGreaterThan(23 - 4 * 1.15 - 0.5);
    expect(xs[3]).toBeGreaterThan(22);
    prints.dispose();
  });
});
