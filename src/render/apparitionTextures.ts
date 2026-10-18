// Procedural textures of the scary-mode apparitions (no image asset): a pale hooded shadow, a small black spider and
// a cobweb, painted with the rasteriser and handed to three as DataTextures.
import * as THREE from 'three';

import { makeRng } from '../game/maze';
import { RGBA, createBuffer, downsample, fillEllipse, fillPolygon } from './raster';

function texture(data: Uint8Array, w: number, h: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.flipY = true;
  tex.needsUpdate = true;
  return tex;
}

// A thick line as a thin quad.
function line(data: Uint8Array, w: number, h: number, x1: number, y1: number, x2: number, y2: number, width: number, color: RGBA, alpha = 1) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = (-(y2 - y1) / len) * (width / 2);
  const ny = ((x2 - x1) / len) * (width / 2);
  fillPolygon(data, w, h, [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], color, alpha);
}

// Hooded silhouette, soft edges, fading towards the bottom (no feet: it floats).
export function ghostTexture({ width = 96, height = 176 } = {}): THREE.DataTexture {
  const s = 2;
  const w = width * s;
  const h = height * s;
  const data = createBuffer(w, h, [0, 0, 0, 0]);
  const white: RGBA = [236, 242, 255, 255];
  // Several faint layers make a soft outline.
  for (let k = 0; k < 6; k++) {
    const grow = (5 - k) * w * 0.018;
    const a = 0.12 + k * 0.06;
    fillEllipse(data, w, h, w / 2, h * 0.2, w * 0.24 + grow, h * 0.15 + grow, white, a); // hood
    fillPolygon(
      data,
      w,
      h,
      [[w * 0.27 - grow, h * 0.22], [w * 0.73 + grow, h * 0.22], [w * 0.9 + grow, h * 0.98], [w * 0.1 - grow, h * 0.98]],
      white,
      a,
    ); // robe
  }
  // Dark face hollow and two faint eyes.
  fillEllipse(data, w, h, w / 2, h * 0.22, w * 0.13, h * 0.08, [30, 34, 48, 255], 0.8);
  fillEllipse(data, w, h, w * 0.45, h * 0.215, w * 0.025, h * 0.012, [190, 220, 255, 255], 0.9);
  fillEllipse(data, w, h, w * 0.55, h * 0.215, w * 0.025, h * 0.012, [190, 220, 255, 255], 0.9);
  // Fade the robe out towards the bottom.
  for (let y = Math.floor(h * 0.55); y < h; y++) {
    const f = 1 - (y - h * 0.55) / (h * 0.45);
    for (let x = 0; x < w; x++) data[(y * w + x) * 4 + 3] = Math.round(data[(y * w + x) * 4 + 3] * Math.max(0, f));
  }
  const small = downsample(data, w, h, s);
  return texture(small.data, small.width, small.height);
}

// Small black spider seen from the front: body, head, eight bent legs.
export function spiderTexture({ size = 64 } = {}): THREE.DataTexture {
  const s = 2;
  const n = size * s;
  const data = createBuffer(n, n, [0, 0, 0, 0]);
  // Dark grey with a lighter rim: pure black disappears against the dark corridors.
  const black: RGBA = [52, 44, 46, 255];
  const c = n / 2;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const y0 = c - n * 0.06 + i * n * 0.05;
      const kx = c + side * n * (0.32 + 0.04 * (i % 2));
      const ky = y0 - n * (0.12 - i * 0.06);
      const fx = c + side * n * (0.44 - 0.02 * i);
      const fy = y0 + n * (0.12 + i * 0.03);
      line(data, n, n, c + side * n * 0.06, y0, kx, ky, n * 0.025, black);
      line(data, n, n, kx, ky, fx, fy, n * 0.022, black);
    }
  }
  fillEllipse(data, n, n, c, c + n * 0.06, n * 0.13, n * 0.16, black); // abdomen
  fillEllipse(data, n, n, c, c - n * 0.1, n * 0.08, n * 0.07, black); // head
  fillEllipse(data, n, n, c, c + n * 0.03, n * 0.07, n * 0.09, [96, 84, 86, 255], 0.6); // sheen on the abdomen
  fillEllipse(data, n, n, c - n * 0.03, c - n * 0.11, n * 0.018, n * 0.018, [255, 60, 40, 255]); // eyes
  fillEllipse(data, n, n, c + n * 0.03, c - n * 0.11, n * 0.018, n * 0.018, [255, 60, 40, 255]);
  const small = downsample(data, n, n, s);
  return texture(small.data, small.width, small.height);
}

// Cobweb stretched across an upper corner: anchored on the top edge and both sides, hub near the top middle.
export function cobwebTexture({ size = 128, seed = 3 } = {}): THREE.DataTexture {
  const s = 2;
  const n = size * s;
  const data = createBuffer(n, n, [0, 0, 0, 0]);
  const rng = makeRng(seed);
  const silk: RGBA = [225, 225, 235, 255];
  const hub = { x: n * 0.5, y: n * 0.3 };
  // Anchor points along the top edge and down both sides.
  const anchors: [number, number][] = [];
  for (let i = 0; i <= 6; i++) anchors.push([(i / 6) * n, 0]);
  for (let i = 1; i <= 3; i++) {
    anchors.push([0, (i / 3) * n * 0.8]);
    anchors.push([n, (i / 3) * n * 0.8]);
  }
  for (const [x, y] of anchors) line(data, n, n, hub.x, hub.y, x, y, n * 0.008, silk, 0.75);
  // Sagging rings between the radial threads.
  const sorted = anchors
    .map(([x, y]) => ({ x, y, a: Math.atan2(y - hub.y, x - hub.x) }))
    .sort((p, q) => p.a - q.a);
  for (let r = 1; r <= 5; r++) {
    const k = r / 6;
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const b = sorted[(i + 1) % sorted.length];
      if (Math.abs(b.a - a.a) > Math.PI * 0.9) continue;
      const sag = 1 + (rng() - 0.5) * 0.08;
      line(
        data,
        n,
        n,
        hub.x + (a.x - hub.x) * k * sag,
        hub.y + (a.y - hub.y) * k * sag,
        hub.x + (b.x - hub.x) * k,
        hub.y + (b.y - hub.y) * k,
        n * 0.006,
        silk,
        0.6,
      );
    }
  }
  const small = downsample(data, n, n, s);
  return texture(small.data, small.width, small.height);
}
