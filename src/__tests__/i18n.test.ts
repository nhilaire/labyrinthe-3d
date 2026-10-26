import meta from '../../factory-app.json';
import { DICTIONARIES, FALLBACK_LANGUAGE, LANGUAGE_NAMES, LANGUAGES, resolveLanguage } from '../i18n';
import { en, ordinal } from '../i18n/en';
import { formatter } from '../i18n/format';

// Shape of a dictionary: every key, function arity and list length (texts differ, structure must not).
function shape(value: unknown): unknown {
  if (typeof value === 'function') return `fn/${value.length}`;
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
  return typeof value;
}

// Every text of a dictionary (functions called with sample arguments).
function texts(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') return texts(value(...Array(value.length).fill(1)));
  if (value && typeof value === 'object') return Object.values(value).flatMap(texts);
  return [];
}

describe('languages (AC-42)', () => {
  it('match factory-app.json, with the reference language first and a supported fallback', () => {
    expect(LANGUAGES).toEqual(meta.languages);
    expect(LANGUAGES).toContain(FALLBACK_LANGUAGE);
    expect(FALLBACK_LANGUAGE).toBe(meta.fallbackLanguage);
    for (const language of LANGUAGES) expect(LANGUAGE_NAMES[language]).toBeTruthy();
  });

  it.each(LANGUAGES.slice(1))('%s has exactly the keys of the reference dictionary', (language) => {
    expect(shape(DICTIONARIES[language])).toEqual(shape(DICTIONARIES[LANGUAGES[0]]));
  });

  it.each(LANGUAGES.slice(1))('%s is really translated (no text left in the reference language)', (language) => {
    const reference = new Set(texts(DICTIONARIES[LANGUAGES[0]]).filter((s) => s.length > 12));
    expect(texts(DICTIONARIES[language]).filter((s) => reference.has(s))).toEqual([]);
  });

  it.each(LANGUAGES)('%s has no empty text', (language) => {
    expect(texts(DICTIONARIES[language]).filter((s) => s.trim() === '')).toEqual([]);
  });
});

describe('resolveLanguage (AC-42)', () => {
  it('follows the phone when the setting is automatic', () => {
    expect(resolveLanguage('auto', ['fr-FR'])).toBe('fr');
    expect(resolveLanguage('auto', ['en-GB', 'fr-FR'])).toBe('en');
    expect(resolveLanguage('auto', ['fr_CA'])).toBe('fr');
  });

  it("takes the phone's first supported language", () => {
    expect(resolveLanguage('auto', ['it-IT', 'fr-FR'])).toBe('fr');
  });

  it('falls back when no phone language is supported', () => {
    expect(resolveLanguage('auto', ['it-IT', 'de-DE'])).toBe(FALLBACK_LANGUAGE);
    expect(resolveLanguage('auto', [])).toBe(FALLBACK_LANGUAGE);
  });

  it("keeps the player's explicit choice whatever the phone says", () => {
    expect(resolveLanguage('en', ['fr-FR'])).toBe('en');
    expect(resolveLanguage('fr', ['en-US'])).toBe('fr');
  });
});

describe('formatting', () => {
  it('French: narrow no-break space for thousands, no-break space before a colon', () => {
    const fr = formatter('fr-FR');
    expect(fr.integer(12345)).toBe('12 345');
    expect(fr.label('Score', 3)).toBe('Score : 3');
  });

  it('English: comma for thousands, no space before a colon', () => {
    const en = formatter('en-US');
    expect(en.integer(12345)).toBe('12,345');
    expect(en.label('Score', 3)).toBe('Score: 3');
  });
});

describe('English copy (AC-42)', () => {
  it('counts steps and choices with the English plural, percentages without a space', () => {
    expect(en.hud.steps(1)).toBe('1 step');
    expect(en.hud.steps(2)).toBe('2 steps');
    expect(en.hud.steps(1234)).toBe('1,234 steps');
    expect(en.hud.plan(0)).toBe('Map −8%');
    expect(en.hud.traces(2)).toBe('Tracks (2) −12%');
    expect(en.victory.line(1, 1, 1, en.victory.noAid, 40)).toBe('1 step for 1 at best · 1 choice · no help · Wall follower: 40 pts');
  });

  it('writes English ordinals', () => {
    const ranks = [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal);
    expect(ranks).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
    expect(en.victory.rank(2, 10)).toBe('2nd of 10');
  });

  it('uses no French no-break space nor « » quotes', () => {
    const texts = Object.values(en).flatMap(function flat(v: unknown): string[] {
      if (typeof v === 'string') return [v];
      if (typeof v === 'function') return [String(v(1, 1, 1, 'x', 1))];
      if (v && typeof v === 'object') return Object.values(v).flatMap(flat);
      return [];
    });
    expect(texts.filter((s) => /[  «»]/.test(s))).toEqual([]);
  });
});
