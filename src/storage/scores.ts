// Score history in AsyncStorage (source: mobile/src/store/scores.js, same record format). Best first, the most
// recent first on ties, 100 records kept. A record lower than all 100 kept ones is not kept and gets no rank.
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RatingId } from '../game/score';
import { reportError } from '../telemetry/telemetry';

const KEY = 'maze.scores.v1';
export const MAX_ENTRIES = 100;

export type ScoreRecord = {
  id: string;
  at: number;
  points: number;
  rating: RatingId;
  steps: number;
  optimalSteps: number;
  decisions: number;
  peeks: number;
  traces: number;
  seed: number;
  width: number;
  height: number;
};

export type SaveResult = { record: ScoreRecord; rank: number | null; total: number };

const isValid = (e: unknown): e is ScoreRecord =>
  !!e && typeof (e as ScoreRecord).points === 'number' && typeof (e as ScoreRecord).at === 'number';

const byRank = (a: ScoreRecord, b: ScoreRecord) => b.points - a.points || b.at - a.at;

async function read(): Promise<ScoreRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValid) : [];
  } catch (error) {
    reportError(error, 'load_scores');
    return [];
  }
}

export async function loadScores(): Promise<ScoreRecord[]> {
  return (await read()).sort(byRank);
}

// Pure ranking step, exported for tests: inserts a record and keeps the best MAX_ENTRIES.
export function insertRecord(list: ScoreRecord[], record: ScoreRecord): { list: ScoreRecord[]; rank: number | null } {
  const all = [...list, record].sort(byRank).slice(0, MAX_ENTRIES);
  const index = all.findIndex((e) => e.id === record.id);
  return { list: all, rank: index >= 0 ? index + 1 : null };
}

export async function saveScore(entry: Omit<ScoreRecord, 'id' | 'at'> & { at?: number }): Promise<SaveResult | null> {
  const at = entry.at ?? Date.now();
  const record: ScoreRecord = { ...entry, at, id: `${at}-${Math.random().toString(36).slice(2, 8)}`, points: Math.round(entry.points) };
  const { list, rank } = insertRecord(await read(), record);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch (error) {
    reportError(error, 'save_score');
    return null;
  }
  return { record, rank, total: list.length };
}

export async function clearScores(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (error) {
    reportError(error, 'clear_scores');
  }
}
