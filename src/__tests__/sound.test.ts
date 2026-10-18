// Sound engine wiring (AC-28 is proven on the device; here: the mute switch and the scary ambience choice).
import { createSound } from '../feedback/sound';

function fakePlayers() {
  const made: { play: jest.Mock; pause: jest.Mock; seekTo: jest.Mock; remove: jest.Mock; volume: number; loop: boolean }[] = [];
  const make = () => {
    const p = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(), remove: jest.fn(), volume: 1, loop: false };
    made.push(p);
    return p as never;
  };
  return { made, make };
}

describe('sound engine', () => {
  beforeEach(() => jest.useFakeTimers());

  it('plays effects when enabled and nothing when « Son » is off', () => {
    const { made, make } = fakePlayers();
    const s = createSound(make);
    s.click();
    const played = made.filter((p) => p.play.mock.calls.length > 0).length;
    expect(played).toBe(1);
    s.setEnabled(false);
    made.forEach((p) => p.play.mockClear());
    s.click();
    s.step(1);
    s.chime(3);
    s.victory();
    s.setAmbience(true);
    expect(made.some((p) => p.play.mock.calls.length > 0)).toBe(false);
  });

  it('loops the ambience during a game and switches to the scary drone with creaks', () => {
    const { made, make } = fakePlayers();
    const s = createSound(make);
    s.setAmbience(true);
    const [ambience, scary] = made;
    expect(ambience.loop).toBe(true);
    expect(ambience.play).toHaveBeenCalled();
    s.setScary(true);
    expect(ambience.pause).toHaveBeenCalled();
    expect(scary.play).toHaveBeenCalled();
    const creak = made[made.length - 1];
    jest.advanceTimersByTime(41000);
    expect(creak.play).toHaveBeenCalled();
    s.dispose();
  });
});
