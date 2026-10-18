// Score: fewer steps and less help = more points. Ported from the source project (shared/core/score.js).
// 1000 = the shortest path with no help. The intro plan is free; each peek costs 8 %, each footprints activation 12 %.

export const PEEK_COST = 0.08;
export const TRACE_COST = 0.12;
export const MAX_POINTS = 1000;

export type RatingId = 'r900' | 'r750' | 'r600' | 'r450' | 'r300' | 'r0';

export const RATINGS: readonly { min: number; id: RatingId }[] = [
  { min: 900, id: 'r900' },
  { min: 750, id: 'r750' },
  { min: 600, id: 'r600' },
  { min: 450, id: 'r450' },
  { min: 300, id: 'r300' },
  { min: 0, id: 'r0' },
];

export type Score = { points: number; efficiency: number; aid: number; rating: RatingId; peeks: number; traces: number };

export function ratingOf(points: number): RatingId {
  return (RATINGS.find((r) => points >= r.min) ?? RATINGS[RATINGS.length - 1]).id;
}

export function computeScore({
  optimalSteps,
  steps,
  peeks = 0,
  traces = 0,
}: {
  optimalSteps: number;
  steps: number;
  peeks?: number;
  traces?: number;
}): Score {
  const efficiency = steps > 0 ? Math.min(1, optimalSteps / steps) : 0;
  const aid = Math.max(0, 1 - PEEK_COST * peeks - TRACE_COST * traces);
  const points = Math.max(0, Math.round(MAX_POINTS * efficiency * aid));
  return { points, efficiency, aid, rating: ratingOf(points), peeks, traces };
}

// Help penalty in percent, for display.
export function aidPenalty({ peeks = 0, traces = 0 }: { peeks?: number; traces?: number }): number {
  return Math.min(100, Math.round((PEEK_COST * peeks + TRACE_COST * traces) * 100));
}
