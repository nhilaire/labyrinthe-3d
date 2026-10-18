// AC-16, AC-17: score formula, ratings, aid penalty, wall-follower baseline.
import { SIZE_ORDER, newMaze } from '../game/config';
import { aidPenalty, computeScore, ratingOf } from '../game/score';
import { wallFollower } from '../game/strategies';

describe('score (AC-16)', () => {
  it('gives 1000 for the shortest path without help', () => {
    expect(computeScore({ optimalSteps: 20, steps: 20 })).toMatchObject({ points: 1000, rating: 'r900' });
  });

  it('halves the score when the path is twice as long', () => {
    expect(computeScore({ optimalSteps: 20, steps: 40 }).points).toBe(500);
  });

  it('applies -8 % per peek and -12 % per footprints activation', () => {
    expect(computeScore({ optimalSteps: 20, steps: 20, peeks: 2, traces: 1 }).points).toBe(720);
  });

  it('never goes below 0 and treats 0 steps as 0 points', () => {
    expect(computeScore({ optimalSteps: 20, steps: 20, peeks: 20 }).points).toBe(0);
    expect(computeScore({ optimalSteps: 20, steps: 0 }).points).toBe(0);
  });

  it('caps efficiency at 1', () => {
    expect(computeScore({ optimalSteps: 30, steps: 20 }).points).toBe(1000);
  });

  it.each([
    [1000, 'r900'],
    [900, 'r900'],
    [899, 'r750'],
    [750, 'r750'],
    [600, 'r600'],
    [599, 'r450'],
    [450, 'r450'],
    [300, 'r300'],
    [299, 'r0'],
    [0, 'r0'],
  ] as const)('rates %i points as %s', (points, rating) => {
    expect(ratingOf(points)).toBe(rating);
  });

  it('shows the aid penalty in percent, capped at 100', () => {
    expect(aidPenalty({})).toBe(0);
    expect(aidPenalty({ peeks: 2, traces: 1 })).toBe(28);
    expect(aidPenalty({ peeks: 20 })).toBe(100);
  });
});

describe('wall-follower baseline (AC-17)', () => {
  it.each(SIZE_ORDER)('%s: always exits on 100 seeds, never better than the shortest path', (size) => {
    for (let i = 0; i < 100; i++) {
      const { maze, report } = newMaze(size, (i * 7777 + 3) >>> 0);
      const f = wallFollower(maze);
      expect(f.solved).toBe(true);
      const optimalSteps = report.solutionLength + 1;
      expect(f.steps).toBeGreaterThanOrEqual(optimalSteps);
      const baseline = computeScore({ optimalSteps, steps: f.steps });
      expect(baseline.points).toBe(Math.round((1000 * optimalSteps) / f.steps));
    }
  });
});
