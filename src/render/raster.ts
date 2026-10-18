// Tiny rasteriser on an RGBA buffer (source: mobile/src/render/raster.js). React Native has no 2D canvas, so the
// procedural textures are painted pixel by pixel and handed to three as DataTextures.

export type RGBA = [number, number, number, number];

// RGBA buffer of w x h filled with one colour.
export function createBuffer(w: number, h: number, [r, g, b, a]: RGBA = [0, 0, 0, 0]): Uint8Array {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return data;
}

// Alpha-blends a colour onto a pixel.
function blend(data: Uint8Array, idx: number, r: number, g: number, b: number, a: number): void {
  if (a <= 0) return;
  if (a >= 1) {
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = 255;
    return;
  }
  const dstA = data[idx + 3] / 255;
  const outA = a + dstA * (1 - a);
  data[idx] = Math.round((r * a + data[idx] * dstA * (1 - a)) / outA);
  data[idx + 1] = Math.round((g * a + data[idx + 1] * dstA * (1 - a)) / outA);
  data[idx + 2] = Math.round((b * a + data[idx + 2] * dstA * (1 - a)) / outA);
  data[idx + 3] = Math.round(outA * 255);
}

export function px(data: Uint8Array, w: number, h: number, x: number, y: number, color: RGBA, alpha = 1): void {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  // The 4th component is 0-255 like the others: it must be normalised or every glaze comes out opaque.
  const a = alpha * ((color[3] ?? 255) / 255);
  blend(data, (y * w + x) * 4, color[0], color[1], color[2], a);
}

export function fillRect(data: Uint8Array, w: number, h: number, x0: number, y0: number, rw: number, rh: number, color: RGBA, alpha = 1): void {
  // Rounds BOTH edges to the nearest pixel: with floor/ceil a 1.6 px joint between bricks disappeared.
  const xs = Math.max(0, Math.round(x0));
  const ys = Math.max(0, Math.round(y0));
  const xe = Math.min(w, Math.round(x0 + rw));
  const ye = Math.min(h, Math.round(y0 + rh));
  for (let y = ys; y < ye; y++) {
    for (let x = xs; x < xe; x++) px(data, w, h, x, y, color, alpha);
  }
}

export function fillEllipse(data: Uint8Array, w: number, h: number, cx: number, cy: number, rx: number, ry: number, color: RGBA, alpha = 1): void {
  const xs = Math.max(0, Math.floor(cx - rx));
  const xe = Math.min(w, Math.ceil(cx + rx) + 1);
  const ys = Math.max(0, Math.floor(cy - ry));
  const ye = Math.min(h, Math.ceil(cy + ry) + 1);
  for (let y = ys; y < ye; y++) {
    for (let x = xs; x < xe; x++) {
      const dx = (x + 0.5 - cx) / Math.max(rx, 1e-6);
      const dy = (y + 0.5 - cy) / Math.max(ry, 1e-6);
      if (dx * dx + dy * dy <= 1) px(data, w, h, x, y, color, alpha);
    }
  }
}

// Filled ring of thickness `width` centred on radius `r`.
export function fillRing(data: Uint8Array, w: number, h: number, cx: number, cy: number, r: number, width: number, color: RGBA, alpha = 1): void {
  const outer = r + width / 2;
  const inner = Math.max(0, r - width / 2);
  const xs = Math.max(0, Math.floor(cx - outer));
  const xe = Math.min(w, Math.ceil(cx + outer) + 1);
  const ys = Math.max(0, Math.floor(cy - outer));
  const ye = Math.min(h, Math.ceil(cy + outer) + 1);
  for (let y = ys; y < ye; y++) {
    for (let x = xs; x < xe; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= outer && d >= inner) px(data, w, h, x, y, color, alpha);
    }
  }
}

// Filled polygon (even-odd rule), points in pixels.
export function fillPolygon(data: Uint8Array, w: number, h: number, pts: [number, number][], color: RGBA, alpha = 1): void {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const xs = Math.max(0, Math.floor(minX));
  const xe = Math.min(w, Math.ceil(maxX) + 1);
  const ys = Math.max(0, Math.floor(minY));
  const ye = Math.min(h, Math.ceil(maxY) + 1);

  for (let y = ys; y < ye; y++) {
    const py = y + 0.5;
    for (let x = xs; x < xe; x++) {
      const pxx = x + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > py !== yj > py && pxx < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) px(data, w, h, x, y, color, alpha);
    }
  }
}

// Light grain so flat areas do not look too smooth.
export function addNoise(data: Uint8Array, amount: number, rng: () => number): void {
  for (let i = 0; i < data.length; i += 4) {
    const n = (rng() - 0.5) * amount;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
}

// Downsamples a buffer painted at `scale` times the final size: cheap anti-aliasing for emblems and footprints.
export function downsample(src: Uint8Array, w: number, h: number, scale: number): { data: Uint8Array; width: number; height: number } {
  const dw = w / scale;
  const dh = h / scale;
  const out = new Uint8Array(dw * dh * 4);
  const n = scale * scale;
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const i = ((y * scale + sy) * w + x * scale + sx) * 4;
          const sa = src[i + 3];
          r += src[i] * sa;
          g += src[i + 1] * sa;
          b += src[i + 2] * sa;
          a += sa;
        }
      }
      const o = (y * dw + x) * 4;
      out[o] = a ? Math.round(r / a) : 0;
      out[o + 1] = a ? Math.round(g / a) : 0;
      out[o + 2] = a ? Math.round(b / a) : 0;
      out[o + 3] = Math.round(a / n);
    }
  }
  return { data: out, width: dw, height: dh };
}

// '#rrggbb' -> [r, g, b].
export function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

// Buffers are painted top row first, but a three DataTexture puts its first row at the bottom (v = 0) and ignores
// flipY: textures that have an up and a down (plaques, emblems, apparitions) are flipped before upload.
export function flipRows(data: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(data.length);
  const row = w * 4;
  for (let y = 0; y < h; y++) out.set(data.subarray(y * row, (y + 1) * row), (h - 1 - y) * row);
  return out;
}
