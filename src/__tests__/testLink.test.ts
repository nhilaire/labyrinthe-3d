// PRD D4: the testing deep link only accepts a known size and a uint32 seed.
import { parseTestLink } from '../app/testLink';

describe('testing deep link (D4)', () => {
  it('parses size and seed', () => {
    expect(parseTestLink('labyrinthe3d://play?size=small&seed=42')).toEqual({ size: 'small', seed: 42 });
    expect(parseTestLink('labyrinthe3d://play?seed=4294967295&size=large')).toEqual({ size: 'large', seed: 4294967295 });
  });

  it('rejects anything else', () => {
    for (const url of [
      null,
      '',
      'https://example.org',
      'labyrinthe3d://play?size=huge&seed=1',
      'labyrinthe3d://play?size=small&seed=-1',
      'labyrinthe3d://play?size=small&seed=4294967296',
      'labyrinthe3d://play?size=small',
    ]) {
      expect(parseTestLink(url)).toBeNull();
    }
  });
});
