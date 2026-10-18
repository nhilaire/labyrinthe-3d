// Testing deep link (PRD D4): `labyrinthe3d://play?size=<small|medium|large>&seed=<uint32>` starts a normal game
// on that maze, so Maestro flows can play a known maze. Harmless: it only chooses which maze is played.
import { MazeSize, SIZE_ORDER } from '../game/config';

export function parseTestLink(url: string | null | undefined): { size: MazeSize; seed: number } | null {
  if (!url) return null;
  const m = /^labyrinthe3d:\/\/play\?(.*)$/.exec(url.trim());
  if (!m) return null;
  const params = new Map(
    m[1].split('&').map((pair) => {
      const [k, v = ''] = pair.split('=');
      return [decodeURIComponent(k), decodeURIComponent(v)] as const;
    }),
  );
  const size = params.get('size') as MazeSize;
  const seedText = params.get('seed') ?? '';
  if (!SIZE_ORDER.includes(size) || !/^\d{1,10}$/.test(seedText)) return null;
  const seed = Number(seedText);
  if (seed > 0xffffffff) return null;
  return { size, seed };
}
