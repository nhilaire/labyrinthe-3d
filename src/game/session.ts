// One game, from the intro plan to the exit. Pure TypeScript: time is passed in (`now`, ms), the camera animation
// lives outside (the screen calls `arrive()` when the walker finishes a route). Same flow as the source MazeGame,
// plus the PRD additions: 3 s tap lock on the intro plan (D5), pause, guided bubbles, active duration.
import { MazeSize, newMaze, replayMaze, sizeOf } from './config';
import { Landmark, pickLandmarks } from './landmarks';
import { Cell, Dir, Maze, MazeReport, opposite } from './maze';
import { Journey, Move, Route, availableMoves, outsideOf, planRoute } from './navigation';
import { Score, computeScore } from './score';
import { wallFollower } from './strategies';

export const INTRO_LOCK_MS = 3000;

export type Phase = 'intro' | 'walking' | 'choosing' | 'won';
export type PlanOverlay = 'intro' | 'map' | null;
export type GuideStep = 'plan' | 'arrows' | 'helps' | 'score';

export type SessionOptions = {
  seed: number;
  now: number;
  size?: MazeSize;
  // Replay of a recorded maze: exact dimensions and accepted seed (D1).
  replay?: { width: number; height: number };
  guided?: boolean;
};

export class GameSession {
  readonly maze: Maze;
  readonly report: MazeReport;
  readonly seed: number;
  readonly size: MazeSize;
  readonly landmarks: Landmark[];
  readonly journey: Journey;
  readonly optimalSteps: number;
  readonly baseline: Score;
  readonly guided: boolean;
  readonly replay: boolean;

  phase: Phase = 'intro';
  plan: PlanOverlay = 'intro';
  paused = false;
  bubble: GuideStep | null = null;
  pos: Cell;
  facing: Dir;
  route: Route | null = null;
  decisions = 0;
  peeks = 0;
  traces = 0;
  tracesVisible = false;
  score: Score | null = null;
  // Set once the player has entered the maze (game_start sent).
  started = false;

  private readonly introOpenedAt: number;
  private decisionPoints = 0;
  private activeMs = 0;
  private runningSince: number | null = null;

  constructor({ seed, now, size = 'medium', replay, guided = false }: SessionOptions) {
    const generated = replay ? replayMaze(replay.width, replay.height, seed) : newMaze(size, seed);
    this.maze = generated.maze;
    this.report = generated.report;
    this.seed = generated.seed;
    this.size = sizeOf(this.maze.width, this.maze.height) ?? size;
    this.landmarks = pickLandmarks(this.maze, this.seed);
    const start = outsideOf(this.maze.entrance);
    this.journey = new Journey(start);
    this.pos = start;
    this.facing = opposite(this.maze.entrance.dir);
    this.optimalSteps = this.report.solutionLength + 1;
    this.baseline = computeScore({ optimalSteps: this.optimalSteps, steps: wallFollower(this.maze).steps });
    this.guided = guided;
    this.replay = Boolean(replay);
    this.introOpenedAt = now;
    if (guided) this.bubble = 'plan';
  }

  get width(): number {
    return this.maze.width;
  }

  get height(): number {
    return this.maze.height;
  }

  // While a plan, the pause overlay or a guide bubble is shown, the game is frozen (camera stopped, no input).
  get frozen(): boolean {
    return this.plan !== null || this.paused || this.bubble !== null;
  }

  get moves(): Move[] {
    return this.phase === 'choosing' && !this.frozen ? availableMoves(this.maze, this.pos, this.facing) : [];
  }

  get beatFollower(): boolean {
    return this.score !== null && this.score.points > this.baseline.points;
  }

  // Can a tap on the intro plan enter the maze yet (D5)?
  introUnlocked(now: number): boolean {
    return now - this.introOpenedAt >= INTRO_LOCK_MS;
  }

  // Tap on the intro plan: closes a guide bubble first, then enters the maze once the 3 s lock is over.
  // Returns the first route when the walk starts.
  tapIntro(now: number): Route | null {
    if (this.phase !== 'intro' || this.plan !== 'intro') return null;
    if (this.bubble) {
      this.bubble = null;
      return null;
    }
    if (!this.introUnlocked(now)) return null;
    this.plan = null;
    this.started = true;
    this.resumeClock(now);
    return this.travel(this.facing);
  }

  // The player picks an offered move. Returns the route to animate, or null if the move is not allowed now.
  choose(move: Move): Route | null {
    if (this.phase !== 'choosing' || this.frozen) return null;
    if (!availableMoves(this.maze, this.pos, this.facing).some((m) => m.dir === move.dir)) return null;
    this.decisions++;
    return this.travel(move.dir);
  }

  private travel(dir: Dir): Route | null {
    const route = planRoute(this.maze, this.pos, dir);
    if (route.cells.length < 2) return null;
    this.journey.record(route.cells);
    this.pos = route.cells[route.cells.length - 1];
    this.facing = route.endDir;
    this.route = route;
    this.phase = 'walking';
    return route;
  }

  // The camera reached the end of the route.
  arrive(now: number): void {
    if (this.phase !== 'walking') return;
    if (this.route?.exited) {
      this.finish(now);
      return;
    }
    this.phase = 'choosing';
    this.decisionPoints++;
    if (this.guided && this.decisionPoints === 1) this.showBubble('arrows', now);
    else if (this.guided && this.decisionPoints === 2) this.showBubble('helps', now);
  }

  private showBubble(step: GuideStep, now: number): void {
    this.bubble = step;
    this.pauseClock(now);
  }

  dismissBubble(now: number): void {
    if (!this.bubble) return;
    this.bubble = null;
    if (!this.frozen && (this.phase === 'walking' || this.phase === 'choosing')) this.resumeClock(now);
  }

  // « Plan »: opens the map (8 % each time) or closes it at no cost.
  togglePeek(now: number): void {
    if (this.phase !== 'walking' && this.phase !== 'choosing') return;
    if (this.plan === 'map') {
      this.closePeek(now);
      return;
    }
    if (this.frozen) return;
    this.peeks++;
    this.plan = 'map';
    this.pauseClock(now);
  }

  closePeek(now: number): void {
    if (this.plan !== 'map') return;
    this.plan = null;
    if (!this.frozen) this.resumeClock(now);
  }

  // « Traces »: footprints on (12 % per activation) or off (free); not while frozen.
  toggleTraces(): void {
    if ((this.phase !== 'walking' && this.phase !== 'choosing') || this.frozen) return;
    this.tracesVisible = !this.tracesVisible;
    if (this.tracesVisible) this.traces++;
  }

  pause(now: number): void {
    if (this.phase === 'won' || this.paused) return;
    this.paused = true;
    this.pauseClock(now);
  }

  resume(now: number): void {
    if (!this.paused) return;
    this.paused = false;
    if (!this.frozen && this.started && this.phase !== 'won') this.resumeClock(now);
  }

  private finish(now: number): void {
    this.pauseClock(now);
    this.phase = 'won';
    this.score = computeScore({
      optimalSteps: this.optimalSteps,
      steps: this.journey.steps,
      peeks: this.peeks,
      traces: this.traces,
    });
    if (this.guided) this.bubble = 'score';
  }

  // Active play time (pauses, open plans and bubbles excluded), in whole seconds.
  durationSeconds(now: number): number {
    const running = this.runningSince === null ? 0 : now - this.runningSince;
    return Math.round((this.activeMs + running) / 1000);
  }

  private pauseClock(now: number): void {
    if (this.runningSince === null) return;
    this.activeMs += now - this.runningSince;
    this.runningSince = null;
  }

  private resumeClock(now: number): void {
    if (this.runningSince === null) this.runningSince = now;
  }
}

