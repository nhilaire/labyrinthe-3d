// AC-35: French typography in fr.ts, no plain space before ":", ";", "!", "?", "%", nor inside « ».
import { fr } from '../i18n/fr';

// Every string of the catalogue; functions are called with sample arguments.
function collect(value: unknown, path: string, out: { path: string; text: string }[]): void {
  if (typeof value === 'string') out.push({ path, text: value });
  else if (typeof value === 'function') {
    const fn = value as (...args: unknown[]) => unknown;
    collect(fn(12, 34, 5, 'sans aide', 480), `${path}()`, out);
    collect(fn(0, 1, 2, 'Excellent', 3), `${path}(0)`, out);
  } else if (Array.isArray(value)) value.forEach((v, i) => collect(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collect(v, path ? `${path}.${k}` : k, out);
  }
}

const strings: { path: string; text: string }[] = [];
collect(fr, '', strings);

describe('French typography (AC-35)', () => {
  it('collects the whole catalogue', () => {
    expect(strings.length).toBeGreaterThan(80);
  });

  it.each(strings.map((s) => [s.path, s.text]))('%s', (_path, text) => {
    expect(text).not.toMatch(/ [:;!?%]/);
    expect(text).not.toMatch(/« /);
    expect(text).not.toMatch(/ »/);
    // Before ":" and "%" a no-break space, before "!", "?", ";" a narrow one (when a space is there at all).
    expect(text).not.toMatch(/ [:%]/);
    expect(text).not.toMatch(/ [!?;]/);
    expect(text).not.toMatch(/\.\.\./);
  });
});
