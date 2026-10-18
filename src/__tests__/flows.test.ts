// The Maestro flows play known mazes along their shortest path. The arrow taps are generated from the engine here
// and checked against the flow files: a rule change that alters a path fails this test.
// UPDATE_FLOWS=1 npx jest flows   rewrites the generated blocks.
import fs from 'fs';
import path from 'path';

import { MazeSize } from '../game/config';
import { GameSession } from '../game/session';
import { shortestMove } from '../game/solver';

const DIR = path.join(__dirname, '..', '..', '.maestro');
const BLOCK = /( *)# moves (small|medium|large) (\d+)( guided)? begin\n[\s\S]*?\1# moves end/g;

function waitAndTap(indent: string, id: string): string {
  return [
    `${indent}- extendedWaitUntil:`,
    `${indent}    visible:`,
    `${indent}      id: "${id}"`,
    `${indent}    timeout: 30000`,
    `${indent}- tapOn:`,
    `${indent}    id: "${id}"`,
  ].join('\n');
}

// Taps from the first decision point to the exit (the intro plan is handled by the flow itself).
export function shortestTaps(size: MazeSize, seed: number, guided: boolean): string[] {
  const s = new GameSession({ seed, now: 0, size, guided });
  if (s.bubble) s.dismissBubble(0);
  s.tapIntro(10_000);
  s.arrive(10_000);
  const taps: string[] = [];
  let guard = 0;
  while (s.phase !== 'won' && guard++ < 300) {
    if (s.bubble) {
      taps.push('guide-bubble');
      s.dismissBubble(10_000);
    }
    const move = shortestMove(s)!;
    taps.push(`arrow-${move.kind}`);
    s.choose(move);
    s.arrive(10_000);
  }
  return taps;
}

function regenerate(text: string): string {
  return text.replace(BLOCK, (_m, indent: string, size: MazeSize, seed: string, guided?: string) => {
    const taps = shortestTaps(size, Number(seed), Boolean(guided));
    return [`${indent}# moves ${size} ${seed}${guided ?? ''} begin`, ...taps.map((id) => waitAndTap(indent, id)), `${indent}# moves end`].join('\n');
  });
}

const flows = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.yaml')) : [];

describe('generated Maestro moves', () => {
  it('has flows with generated moves', () => {
    expect(flows.some((f) => new RegExp(BLOCK.source).test(fs.readFileSync(path.join(DIR, f), 'utf8')))).toBe(true);
  });

  it.each(flows)('%s is up to date with the engine', (file) => {
    const full = path.join(DIR, file);
    const text = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
    const next = regenerate(text);
    if (process.env.UPDATE_FLOWS === '1' && next !== text) fs.writeFileSync(full, next);
    else expect(next).toBe(text);
  });

  it('plays the guided maze with the arrows and helps bubbles', () => {
    const taps = shortestTaps('small', 5, true);
    expect(taps.filter((t) => t === 'guide-bubble')).toHaveLength(2);
    expect(taps[0]).toBe('guide-bubble');
  });
});
