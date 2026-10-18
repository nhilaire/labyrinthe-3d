// Procedural textures painted in code (no image asset), source: mobile/src/render/textures.js. The palette is moved
// towards a manor: warm stone blocks, oak floor planks, dark beamed ceiling, dark wood pillars.
import * as THREE from 'three';

import { makeRng } from '../game/maze';
import { emblemColor, emblemShapes } from './emblems';
import { RGBA, addNoise, createBuffer, downsample, fillEllipse, fillPolygon, fillRect, fillRing, hexToRgb } from './raster';

function dataTexture(data: Uint8Array, w: number, h: number, { repeat = true } = {}): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

type BlockOptions = {
  size?: number;
  cols?: number;
  rows?: number;
  mortar?: [number, number, number];
  base?: [number, number, number];
  spread?: number;
  seed?: number;
};

// Stone blocks in a running bond (the source brick pattern, manor colours).
export function stoneTexture({
  size = 256,
  cols = 3,
  rows = 6,
  mortar = [34, 28, 25],
  base = [128, 110, 92],
  spread = 30,
  seed = 1234,
}: BlockOptions = {}): THREE.DataTexture {
  const rng = makeRng(seed);
  const data = createBuffer(size, size, [...mortar, 255]);
  const bw = size / cols;
  const bh = size / rows;
  const joint = Math.max(2, size / 110);
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : bw / 2;
    for (let i = -1; i <= cols; i++) {
      const x = i * bw + offset;
      const y = r * bh;
      const v = (rng() - 0.5) * spread;
      const col: RGBA = [clamp(base[0] + v), clamp(base[1] + v * 0.95), clamp(base[2] + v * 0.9), 255];
      fillRect(data, size, size, x + joint / 2, y + joint / 2, bw - joint, bh - joint, col);
      fillRect(data, size, size, x + joint / 2, y + joint / 2, bw - joint, Math.max(1, bh * 0.08), [255, 240, 220, 255], 0.1);
      fillRect(data, size, size, x + joint / 2, y + bh - joint / 2 - Math.max(1, bh * 0.1), bw - joint, Math.max(1, bh * 0.1), [0, 0, 0, 255], 0.22);
    }
  }
  addNoise(data, 24, rng);
  return dataTexture(data, size, size);
}

// Oak floor planks with staggered joints and a little grain.
export function planksTexture({ size = 256, planks = 5, seed = 99 } = {}): THREE.DataTexture {
  const rng = makeRng(seed);
  const data = createBuffer(size, size, [26, 17, 11, 255]);
  const ph = size / planks;
  const gap = Math.max(2, size / 128);
  for (let p = 0; p < planks; p++) {
    const y = p * ph;
    const cut = rng() * size;
    for (const [x0, w] of [
      [cut - size, size],
      [cut, size],
    ]) {
      const shade = 70 + rng() * 34;
      fillRect(data, size, size, x0 + gap / 2, y + gap / 2, w - gap, ph - gap, [clamp(shade * 1.15), clamp(shade * 0.78), clamp(shade * 0.5), 255]);
    }
    // Grain lines.
    for (let g = 0; g < 7; g++) {
      const gy = y + gap + rng() * (ph - gap * 2);
      fillRect(data, size, size, 0, gy, size, 1, [20, 12, 6, 255], 0.18 + rng() * 0.15);
    }
    fillRect(data, size, size, 0, y + gap / 2, size, Math.max(1, ph * 0.06), [255, 220, 170, 255], 0.07);
  }
  addNoise(data, 16, rng);
  return dataTexture(data, size, size);
}

// Dark plaster ceiling crossed by wooden beams.
export function ceilingTexture({ size = 128, seed = 7 } = {}): THREE.DataTexture {
  const rng = makeRng(seed);
  const data = createBuffer(size, size, [40, 34, 32, 255]);
  for (let i = 0; i < 90; i++) {
    const r = 3 + rng() * 12;
    fillEllipse(data, size, size, rng() * size, rng() * size, r, r, [clamp(48 + rng() * 22), clamp(42 + rng() * 18), clamp(40 + rng() * 16), 255], 0.4);
  }
  const beam = size * 0.22;
  fillRect(data, size, size, 0, size / 2 - beam / 2, size, beam, [52, 32, 20, 255]);
  fillRect(data, size, size, 0, size / 2 - beam / 2, size, Math.max(1, beam * 0.12), [0, 0, 0, 255], 0.35);
  addNoise(data, 14, rng);
  return dataTexture(data, size, size);
}

// Pillars: dark carved wood.
export function pillarTexture({ size = 128, seed = 555 } = {}): THREE.DataTexture {
  return stoneTexture({ size, cols: 1, rows: 4, mortar: [22, 13, 8], base: [86, 54, 34], spread: 18, seed });
}

function paintEmblem(data: Uint8Array, w: number, h: number, cx: number, cy: number, radius: number, index: number, color: string) {
  const rgb: RGBA = [...hexToRgb(color), 255];
  for (const shape of emblemShapes(index)) {
    if (shape.k === 'ellipse') {
      fillEllipse(data, w, h, cx + shape.cx * radius, cy + shape.cy * radius, shape.rx * radius, shape.ry * radius, rgb);
    } else if (shape.k === 'ring') {
      fillRing(data, w, h, cx + shape.cx * radius, cy + shape.cy * radius, shape.r * radius, shape.w * radius, rgb);
    } else {
      fillPolygon(data, w, h, shape.pts.map(([x, y]) => [cx + x * radius, cy + y * radius] as [number, number]), rgb);
    }
  }
}

// Wall plaque: dark framed stone, glowing emblem in the middle (source design).
export function plateTexture(emblem: number, { width = 128, ratio = 1.2 } = {}): THREE.DataTexture {
  const scale = 2; // supersampling
  const w = width * scale;
  const h = Math.round(width * ratio) * scale;
  const data = createBuffer(w, h, [0, 0, 0, 0]);
  const pad = w * 0.06;
  for (let y = Math.round(pad); y < h * 0.82; y++) {
    const t = (y - pad) / (h * 0.82 - pad);
    const shade = Math.round(59 - t * 22);
    fillRect(data, w, h, pad, y, w - pad * 2, 1, [shade, shade - 9, shade + 8, 255]);
  }
  fillPolygon(data, w, h, [[pad, h * 0.8], [w - pad, h * 0.8], [w / 2, h - pad]], [30, 25, 36, 255]);
  const border = Math.max(2, w * 0.03);
  fillRect(data, w, h, pad, pad, w - pad * 2, border, [214, 190, 150, 255], 0.55);
  fillRect(data, w, h, pad, pad, border, h * 0.8 - pad, [214, 190, 150, 255], 0.45);
  fillRect(data, w, h, w - pad - border, pad, border, h * 0.8 - pad, [214, 190, 150, 255], 0.45);
  const color = emblemColor(emblem);
  fillEllipse(data, w, h, w / 2, h * 0.44, w * 0.36, w * 0.36, [...hexToRgb(color), 255], 0.16);
  paintEmblem(data, w, h, w / 2, h * 0.44, w * 0.26, emblem, color);
  const small = downsample(data, w, h, scale);
  return dataTexture(small.data, small.width, small.height, { repeat: false });
}

// Footprint pointing to +X. White: the tint comes from the material.
export function footprintTexture({ size = 64 } = {}): THREE.DataTexture {
  const scale = 2;
  const s = size * scale;
  const data = createBuffer(s, s, [0, 0, 0, 0]);
  const white: RGBA = [255, 255, 255, 255];
  const u = s / 128;
  fillEllipse(data, s, s, 78 * u, 64 * u, 25 * u, 19 * u, white, 0.95);
  fillEllipse(data, s, s, 38 * u, 64 * u, 16 * u, 13 * u, white, 0.95);
  fillEllipse(data, s, s, 58 * u, 64 * u, 12 * u, 9 * u, white, 0.7);
  for (let i = 0; i < 3; i++) fillEllipse(data, s, s, 102 * u, (52 + i * 12) * u, 5.5 * u, 5 * u, white, 0.95);
  const small = downsample(data, s, s, scale);
  return dataTexture(small.data, small.width, small.height, { repeat: false });
}
