// Owns the 3D scene of a game screen and its frame loop. expo-gl may create a new GL context for the same screen
// (onContextCreate called again): the previous loop is cancelled and its scene disposed, the new scene is mounted at
// the session's pose with the footprints visibility, and a walk cut in the middle is completed (the new walker
// already stands at the end of the route), so the game never stays stuck in 'walking'. No three, no React: testable.
import type { Landmark } from '../game/landmarks';
import type { Cell, Dir, Maze } from '../game/maze';
import type { GameSession } from '../game/session';

export type HostedScene = {
  mount(maze: Maze, landmarks: Landmark[], seed: number, pose: { cell: Cell; dir: Dir }): void;
  setTracesVisible(visible: boolean): void;
  dispose(): void;
};

export type FrameScheduler = {
  request(callback: () => void): number;
  cancel(handle: number): void;
};

export class SceneHost<S extends HostedScene> {
  private current: S | null = null;
  private handle: number | null = null;

  constructor(private readonly scheduler: FrameScheduler) {}

  get scene(): S | null {
    return this.current;
  }

  // Replaces any previous scene, then runs `frame` once per animation frame. Returns true when an interrupted walk
  // was completed: the caller then re-renders, or finishes the game if the session is won.
  attach(scene: S, session: GameSession, now: number, frame: () => void): boolean {
    this.detach();
    this.current = scene;
    scene.mount(session.maze, session.landmarks, session.seed, { cell: session.pos, dir: session.facing });
    scene.setTracesVisible(session.tracesVisible);
    const resumed = session.phase === 'walking';
    if (resumed) session.arrive(now);
    const loop = () => {
      this.handle = this.scheduler.request(loop);
      frame();
    };
    loop();
    return resumed;
  }

  detach(): void {
    if (this.handle !== null) this.scheduler.cancel(this.handle);
    this.handle = null;
    this.current?.dispose();
    this.current = null;
  }
}
