// AC-24 hardening: expo-gl may create a new GL context for the same game screen. The previous frame loop is then
// cancelled and its scene disposed, the new scene is mounted at the session's pose with the footprints visibility,
// and a walk cut in the middle is completed, so the game never stays stuck in 'walking'.
import { INTRO_LOCK_MS, GameSession } from '../game/session';
import { HostedScene, SceneHost } from '../render/sceneHost';

function fakeScheduler() {
  let nextId = 1;
  const pending = new Map<number, () => void>();
  return {
    pending,
    cancelled: [] as number[],
    request(cb: () => void) {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    },
    cancel(id: number) {
      this.cancelled.push(id);
      pending.delete(id);
    },
  };
}

function fakeScene() {
  return {
    mount: jest.fn() as jest.MockedFunction<HostedScene['mount']>,
    setTracesVisible: jest.fn(),
    dispose: jest.fn(),
  };
}

describe('scene host (GL context recreated)', () => {
  it('starts a frame loop on the first scene without touching the intro', () => {
    const scheduler = fakeScheduler();
    const host = new SceneHost(scheduler);
    const session = new GameSession({ seed: 5, now: 0, size: 'small' });
    const scene = fakeScene();
    const frame = jest.fn();
    expect(host.attach(scene, session, 10, frame)).toBe(false);
    expect(host.scene).toBe(scene);
    expect(frame).toHaveBeenCalledTimes(1);
    expect(scheduler.pending.size).toBe(1);
    expect(scene.mount).toHaveBeenCalledWith(session.maze, session.landmarks, session.seed, { cell: session.pos, dir: session.facing });
    expect(session.phase).toBe('intro');
  });

  it('cancels the previous loop, disposes the previous scene and completes an interrupted walk', () => {
    const scheduler = fakeScheduler();
    const host = new SceneHost(scheduler);
    const session = new GameSession({ seed: 5, now: 0, size: 'small' });
    const first = fakeScene();
    const firstFrame = jest.fn();
    host.attach(first, session, 0, firstFrame);
    const [firstHandle] = [...scheduler.pending.keys()];
    // The player enters the maze and shows the traces; the context is lost in the middle of the walk.
    expect(session.tapIntro(INTRO_LOCK_MS)).not.toBeNull();
    session.toggleTraces();
    expect(session.phase).toBe('walking');

    const second = fakeScene();
    const resumed = host.attach(second, session, 3200, jest.fn());
    expect(scheduler.cancelled).toContain(firstHandle);
    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(second.dispose).not.toHaveBeenCalled();
    expect(host.scene).toBe(second);
    expect(scheduler.pending.size).toBe(1);
    // The new scene stands where the route ends, with the traces still shown.
    expect(second.mount.mock.calls[0][3]).toEqual({ cell: session.pos, dir: session.facing });
    expect(second.setTracesVisible).toHaveBeenCalledWith(true);
    // The walk is over: the player can choose again (or has won).
    expect(resumed).toBe(true);
    expect(['choosing', 'won']).toContain(session.phase);
    // The old loop never runs again.
    firstFrame.mockClear();
    for (const cb of [...scheduler.pending.values()]) cb();
    expect(firstFrame).not.toHaveBeenCalled();
  });

  it('detach stops the loop and disposes the scene', () => {
    const scheduler = fakeScheduler();
    const host = new SceneHost(scheduler);
    const scene = fakeScene();
    host.attach(scene, new GameSession({ seed: 5, now: 0, size: 'small' }), 0, jest.fn());
    host.detach();
    expect(scheduler.pending.size).toBe(0);
    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(host.scene).toBeNull();
    host.detach();
    expect(scene.dispose).toHaveBeenCalledTimes(1);
  });
});
