#!/usr/bin/env node
// Draws the app icon, adaptive icon layers and splash image in code (no dependency, no third-party asset):
// a small golden maze seen from above, lit like a candle in a dark manor, its exit glowing.
//
//   node scripts/make-icon.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ASSETS = path.join(import.meta.dirname, '..', 'assets');

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function png(w, h, rgba) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// A hand-drawn 5 x 5 maze: walls as grid segments [x1, y1, x2, y2] (cell units), entrance bottom, exit top.
const WALLS = [
  [0, 0, 2, 0], [3, 0, 5, 0], // top border, exit gap between 2 and 3
  [0, 5, 2, 5], [3, 5, 5, 5], // bottom border, entrance gap
  [0, 0, 0, 5], [5, 0, 5, 5],
  [1, 1, 4, 1], [1, 1, 1, 3], [2, 2, 4, 2], [4, 2, 4, 4], [0, 4, 3, 4], [2, 3, 2, 4], [3, 3, 4, 3],
];

function draw(size, { background, foreground, mono = false }) {
  const img = Buffer.alloc(size * size * 4);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (background) {
        const d = Math.hypot(x - c, y - c * 0.85) / (size * 0.75);
        const k = Math.max(0, 1 - d);
        img[i] = 11 + 60 * k * k;
        img[i + 1] = 8 + 34 * k * k;
        img[i + 2] = 9 + 16 * k * k;
        img[i + 3] = 255;
      }
    }
  }
  if (!foreground) return img;
  // The maze sits in the adaptive-icon safe zone (central 60 %).
  const span = size * 0.5;
  const ox = (size - span) / 2;
  const oy = (size - span) / 2;
  const cell = span / 5;
  const thick = cell * 0.22;
  const segDist = (px, py, [x1, y1, x2, y2]) => {
    const ax = ox + x1 * cell, ay = oy + y1 * cell, bx = ox + x2 * cell, by = oy + y2 * cell;
    const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
    return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
  };
  const exitX = ox + 2.5 * cell;
  const exitY = oy;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let d = Infinity;
      for (const w of WALLS) d = Math.min(d, segDist(x, y, w));
      const glow = Math.max(0, 1 - Math.hypot(x - exitX, y - exitY) / (cell * 1.6));
      const wall = Math.max(0, Math.min(1, thick / 2 + 1.2 - d)); // anti-aliased stroke
      const shade = 0.75 + 0.25 * Math.max(0, Math.min(1, 1 - (y - oy) / span)); // lit from the exit side
      let r, g, b, a;
      if (mono) {
        r = g = b = 255;
        a = wall;
      } else {
        r = 255 * shade;
        g = 196 * shade;
        b = 120 * shade;
        a = wall;
        if (glow > 0 && wall < 1) {
          const ga = glow * glow * 0.85;
          r = r * a + 255 * ga * (1 - a);
          g = g * a + 236 * ga * (1 - a);
          b = b * a + 190 * ga * (1 - a);
          a = Math.max(a, ga);
        }
      }
      if (a <= 0) continue;
      const ba = img[i + 3] / 255;
      const oa = a + ba * (1 - a);
      img[i] = Math.min(255, Math.round((r * a + img[i] * ba * (1 - a)) / oa));
      img[i + 1] = Math.min(255, Math.round((g * a + img[i + 1] * ba * (1 - a)) / oa));
      img[i + 2] = Math.min(255, Math.round((b * a + img[i + 2] * ba * (1 - a)) / oa));
      img[i + 3] = Math.round(oa * 255);
    }
  }
  return img;
}

const write = (name, size, opts) => fs.writeFileSync(path.join(ASSETS, name), png(size, size, draw(size, opts)));
write('icon.png', 1024, { background: true, foreground: true });
write('android-icon-foreground.png', 1024, { foreground: true });
write('android-icon-background.png', 1024, { background: true });
write('android-icon-monochrome.png', 1024, { foreground: true, mono: true });
write('splash-icon.png', 512, { foreground: true });
write('favicon.png', 48, { background: true, foreground: true });
console.log('icons written to assets/');
