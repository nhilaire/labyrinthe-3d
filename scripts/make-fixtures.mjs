#!/usr/bin/env node
// Produces golden fixtures from the original JavaScript game (its `shared/core` folder), so that the TypeScript
// port is proven to generate exactly the same mazes, landmarks and wall-follower results.
//
//   node scripts/make-fixtures.mjs <path to the original project>
//
// Output: src/__tests__/fixtures/source-mazes.json (committed). Run once; the source is not needed afterwards.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const source = process.argv[2];
if (!source) {
  console.error('usage: node scripts/make-fixtures.mjs <path to the original project>');
  process.exit(1);
}
const core = (name) => import(pathToFileURL(path.join(source, 'shared', 'core', name)).href);

const { generateMaze } = await core('maze.js');
const { pickLandmarks } = await core('landmarks.js');
const { wallFollower } = await core('strategies.js');

const SIZES = { small: [8, 6], medium: [14, 9], large: [20, 12] };
const SEEDS = Array.from({ length: 20 }, (_, i) => (1000 + i * 7919) >>> 0);

const cases = [];
for (const [size, [width, height]] of Object.entries(SIZES)) {
  for (const seed of SEEDS) {
    const g = generateMaze({
      width,
      height,
      seed,
      braidRatio: 0,
      straightness: 0.7,
      minSolutionLength: Math.round(width * height * 0.33),
      minSpread: 0.7,
    });
    cases.push({
      size,
      seed,
      acceptedSeed: g.seed,
      attempts: g.attempts,
      walls: Buffer.from(g.maze.walls).toString('hex'),
      entrance: g.maze.entrance,
      exit: g.maze.exit,
      solutionLength: g.report.solutionLength,
      landmarks: pickLandmarks(g.maze, g.seed),
      follower: wallFollower(g.maze),
    });
  }
}

const out = path.join(import.meta.dirname, '..', 'src', '__tests__', 'fixtures', 'source-mazes.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ generator: 'original shared/core', cases }, null, 1) + '\n');
console.log(`wrote ${cases.length} cases to ${path.relative(process.cwd(), out)}`);
