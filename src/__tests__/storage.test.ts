// AC-19, AC-22, AC-27: score history (100 kept, rank, record not kept), settings and last size persistence.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MAX_ENTRIES, ScoreRecord, clearScores, insertRecord, loadScores, saveScore } from '../storage/scores';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../storage/settings';

const entry = (points: number, at: number) => ({
  at,
  points,
  rating: 'r0' as const,
  steps: 30,
  optimalSteps: 20,
  decisions: 5,
  peeks: 0,
  traces: 0,
  seed: 42,
  width: 8,
  height: 6,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('score history (AC-19)', () => {
  it('keeps the 100 best of 105 games, best first, most recent first on ties', async () => {
    for (let i = 0; i < 105; i++) await saveScore(entry(100 + (i % 50) * 10, 1000 + i));
    const list = await loadScores();
    expect(list).toHaveLength(MAX_ENTRIES);
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].points > list[i].points || (list[i - 1].points === list[i].points && list[i - 1].at > list[i].at)).toBe(true);
    }
    // Dropped: the three 100-point games and the two oldest of the three 110-point games.
    expect(list.filter((e) => e.points === 100)).toHaveLength(0);
    expect(list.filter((e) => e.points === 110).map((e) => e.at)).toEqual([1101]);
  });

  it('returns the rank and total of the new record', async () => {
    await saveScore(entry(500, 1));
    await saveScore(entry(800, 2));
    const res = await saveScore(entry(650, 3));
    expect(res).toMatchObject({ rank: 2, total: 3 });
    expect((await saveScore(entry(900, 4)))!.rank).toBe(1);
  });

  it('gives no rank to a record lower than all 100 kept ones', async () => {
    let list: ScoreRecord[] = [];
    for (let i = 0; i < 100; i++) list = insertRecord(list, { ...entry(500, i), id: `k${i}` }).list;
    const res = insertRecord(list, { ...entry(100, 999), id: 'low' });
    expect(res.rank).toBeNull();
    expect(res.list).toHaveLength(100);
    expect(res.list.some((e) => e.id === 'low')).toBe(false);
  });

  it('clears the history', async () => {
    await saveScore(entry(500, 1));
    await clearScores();
    expect(await loadScores()).toEqual([]);
  });

  it('survives a corrupted store', async () => {
    await AsyncStorage.setItem('maze.scores.v1', '{not json');
    expect(await loadScores()).toEqual([]);
  });
});

describe('settings (AC-27, AC-22)', () => {
  it('defaults to sound on, haptics on, scary off, medium size', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({ sound: true, haptics: true, scary: false, size: 'medium' });
  });

  it('persists every toggle and the last size', async () => {
    await saveSettings({ sound: false, haptics: false, scary: true, size: 'large', guideOfferDone: true });
    expect(await loadSettings()).toEqual({ sound: false, haptics: false, scary: true, size: 'large', guideOfferDone: true });
  });

  it('ignores invalid stored values', async () => {
    await AsyncStorage.setItem('game.settings.v1', JSON.stringify({ sound: 'yes', size: 'huge' }));
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
