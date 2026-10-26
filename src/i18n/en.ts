// English translation of fr.ts (same keys, enforced by the Strings type). Tone: neutral « you », US spelling.
// English typography: no space before ": ! ? %", “quotes”, comma as thousands separator.
import { formatter } from './format';
import type { Strings } from './types';

const { integer, label } = formatter('en-US');
const pct = (n: number) => `${n}%`;

// 1st, 2nd, 3rd, 4th… 11th, 12th, 13th… 21st, 22nd…
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

const steps = (n: number) => `${integer(n)} ${n === 1 ? 'step' : 'steps'}`;

export const en: Strings = {
  locale: 'en-US',
  consent: {
    title: 'Anonymous statistics',
    body: 'To improve the game, you can share anonymous statistics (games played, scores, crashes). No personal data, no ads.',
    accept: 'Accept',
    refuse: 'Decline',
    footnote: 'You can change your mind later in Settings.',
  },
  guideOffer: {
    title: 'Guided first game?',
    body: 'A small maze to learn how to play, with a few tips.',
    go: "Let's go",
    skip: 'Skip',
  },
  home: {
    pitch: 'Memorize the map, then find the exit.',
    size: { small: 'Small 8 × 6', medium: 'Medium 14 × 9', large: 'Large 20 × 12' },
    play: 'Play',
    scores: 'Scores',
    settings: 'Settings',
    about: 'About',
  },
  hud: {
    steps,
    plan: (n: number) => `Map${n ? ` (${n})` : ''} −${pct(8)}`,
    traces: (n: number) => `Tracks${n ? ` (${n})` : ''} −${pct(12)}`,
    pause: 'Pause',
  },
  move: {
    forward: 'Straight ahead',
    left: 'Left',
    right: 'Right',
    back: 'Turn back',
  },
  plan: {
    introTitle: 'Memorize the map',
    introHint: 'Tap the screen to enter the maze',
    peekTitle: 'Map',
    peekHint: `Tap the screen to continue (this peek costs ${pct(8)} of the score)`,
    entrance: 'ENTRANCE',
    exit: 'EXIT',
  },
  pause: {
    title: 'Pause',
    resume: 'Resume',
    quit: 'Give up',
  },
  victory: {
    title: (points: number, rating: string) => `${integer(points)} points · ${rating}`,
    line: (stepCount: number, optimal: number, decisions: number, aid: string, baseline: number) =>
      `${steps(stepCount)} for ${optimal} at best · ${decisions} ${decisions === 1 ? 'choice' : 'choices'} · ${aid} · ${label('Wall follower', `${baseline} pts`)}`,
    noAid: 'no help',
    aid: (p: number) => `help −${pct(p)}`,
    best: 'Best score!',
    rank: (rank: number, total: number) => `${ordinal(rank)} of ${total}`,
    new: 'New maze',
    again: 'Play this one again',
    scores: 'Scores',
    home: 'Home',
  },
  rating: {
    r900: 'Flawless',
    r750: 'Excellent',
    r600: 'Very good',
    r450: 'Fair',
    r300: 'Hard going',
    r0: 'Out by luck',
  },
  scores: {
    title: 'Best scores',
    empty: 'No game saved yet.',
    hint: 'Tap a row to replay that maze.',
    close: 'Close',
    clear: 'Clear history',
    confirm: 'Confirm?',
    steps: (stepCount: number, ratio: string) => `${steps(stepCount)} (×${ratio})`,
    noAid: '—',
    aid: (p: number) => `−${pct(p)}`,
    size: (w: number, h: number) => `${w}×${h}`,
  },
  settings: {
    title: 'Settings',
    sound: 'Sound',
    haptics: 'Vibrations',
    scary: 'Spooky mode',
    scaryHint: 'Darker and creepier. Not for the youngest.',
    telemetry: 'Anonymous statistics',
    telemetryHelp: 'Helps fix bugs and improve the game. No personal data is sent.',
    replayGuide: 'Replay the guided game',
    language: 'Language',
    languageAuto: 'Automatic (phone language)',
    back: 'Back',
  },
  guide: {
    skip: 'Skip',
    plan:
      'Memorize this map: you come in at the ENTRANCE and must find the EXIT. ' +
      'The colored symbols carved on the walls will help you know where you are.',
    arrows: 'At each junction, tap an arrow. You walk on your own to the next junction.',
    helps: `Lost? “Map” shows the map again with your position (−${pct(8)}). “Tracks” shows where you have already been (−${pct(12)}).`,
    score: 'Fewer steps and less help mean more points. Try to beat the wall follower!',
    next: 'Tap to continue',
  },
  about: {
    title: 'About',
    whyTitle: 'Why this game',
    story: [
      'As a child, I copied a little maze game line by line in GFA Basic on my Atari ST: one of my first programs. ' +
        'A few years later, the manor maze of The 7th Guest gave me chills. ' +
        'I made this game to bring those two memories together and share them with my family.',
    ],
    gameTitle: 'This game',
    game: [
      'Made by a passionate independent developer. Inspired by The 7th Guest, not affiliated with its authors.',
      'It was imagined and programmed in my free time, without pretension: it is probably not free of bugs. ' +
        'Thank you in advance for your patience.',
    ],
    dataTitle: 'Your data',
    data: ['No account, no ads. Anonymous statistics are only sent if you agreed, and you can change your mind in Settings.'],
    builtWith: 'Made with React Native, Expo and Three.js',
    version: (version: string) => `Version ${version}`,
    back: 'Back',
  },
  errors: {
    title: 'Oops',
    body: 'Something went wrong. Restart the game.',
    retry: 'Try again',
  },
};
