// Wall emblems as normalised shapes (in a circle of radius 1), source: mobile/src/ui/emblems.js. The same
// description feeds the 3D plaque textures and the SVG plan, so both always match. Each emblem differs by shape and
// colour (never by colour alone).

// Bright colours (wall plaque, dark background).
export const EMBLEM_COLORS = [
  '#f0c04a',
  '#e06148',
  '#63b96f',
  '#5b9ede',
  '#a97ce0',
  '#4fc4bb',
  '#ef8f42',
  '#e888b4',
  '#cfc0a4',
  '#b5cf55',
] as const;

// Same hues, darker, readable on the paper-coloured plan.
export const EMBLEM_INKS = [
  '#8a6410',
  '#8f2a17',
  '#1f6b2c',
  '#1d4f88',
  '#553087',
  '#12655f',
  '#8a4508',
  '#8c3560',
  '#5f5236',
  '#5c701a',
] as const;

export type EmblemShape =
  | { k: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { k: 'ring'; cx: number; cy: number; r: number; w: number }
  | { k: 'poly'; pts: [number, number][] };

const polygon = (sides: number, radius: number, rotation = -Math.PI / 2): [number, number][] =>
  Array.from({ length: sides }, (_, i) => {
    const a = (i / sides) * Math.PI * 2 + rotation;
    return [Math.cos(a) * radius, Math.sin(a) * radius];
  });

const star = (branches: number, outer: number, inner: number): [number, number][] =>
  Array.from({ length: branches * 2 }, (_, i) => {
    const a = (i / (branches * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });

const SHAPES: EmblemShape[][] = [
  // 0 disc
  [{ k: 'ellipse', cx: 0, cy: 0, rx: 0.88, ry: 0.88 }],
  // 1 ring
  [{ k: 'ring', cx: 0, cy: 0, r: 0.72, w: 0.34 }],
  // 2 triangle
  [{ k: 'poly', pts: polygon(3, 1) }],
  // 3 diamond
  [{ k: 'poly', pts: [[0, -1], [0.78, 0], [0, 1], [-0.78, 0]] }],
  // 4 square
  [{ k: 'poly', pts: [[-0.72, -0.72], [0.72, -0.72], [0.72, 0.72], [-0.72, 0.72]] }],
  // 5 star
  [{ k: 'poly', pts: star(5, 1, 0.44) }],
  // 6 cross
  [
    { k: 'poly', pts: [[-0.32, -1], [0.32, -1], [0.32, 1], [-0.32, 1]] },
    { k: 'poly', pts: [[-1, -0.32], [1, -0.32], [1, 0.32], [-1, 0.32]] },
  ],
  // 7 chevron
  [
    { k: 'poly', pts: [[-0.85, -0.75], [-0.2, -0.75], [0.5, 0], [-0.2, 0.75], [-0.85, 0.75], [-0.15, 0]] },
    { k: 'poly', pts: [[0.15, -0.75], [0.5, -0.75], [1, 0], [0.5, 0.75], [0.15, 0.75], [0.65, 0]] },
  ],
  // 8 hourglass
  [{ k: 'poly', pts: [[-0.8, -0.95], [0.8, -0.95], [-0.8, 0.95], [0.8, 0.95]] }],
  // 9 flower
  [
    { k: 'ellipse', cx: 0.45, cy: 0, rx: 0.5, ry: 0.32 },
    { k: 'ellipse', cx: -0.45, cy: 0, rx: 0.5, ry: 0.32 },
    { k: 'ellipse', cx: 0, cy: 0.45, rx: 0.32, ry: 0.5 },
    { k: 'ellipse', cx: 0, cy: -0.45, rx: 0.32, ry: 0.5 },
  ],
];

const wrap = (i: number) => ((i % SHAPES.length) + SHAPES.length) % SHAPES.length;

export function emblemShapes(index: number): EmblemShape[] {
  return SHAPES[wrap(index)];
}

export function emblemColor(index: number): string {
  return EMBLEM_COLORS[wrap(index)];
}

export function emblemInk(index: number): string {
  return EMBLEM_INKS[wrap(index)];
}
