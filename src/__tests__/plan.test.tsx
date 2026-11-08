// AC-14: the plan shows the player's position, including on the virtual cell just outside the entrance where a
// route back out of the maze legitimately ends.
import { render, screen } from '@testing-library/react-native';

import { newMaze } from '../game/config';
import { opposite } from '../game/maze';
import { outsideOf } from '../game/navigation';
import { I18nProvider } from '../i18n/I18nProvider';
import { Plan } from '../ui/Plan';

const WIDTH = 400;
const HEIGHT = 300;

async function playerMarkers(cell: { x: number; y: number }, dir: number) {
  const { maze } = newMaze('small', 7);
  await render(
    <I18nProvider setting="fr" onChange={() => {}}>
      <Plan maze={maze} width={WIDTH} height={HEIGHT} player={{ cell, dir: dir as 0 | 1 | 2 | 3 }} />
    </I18nProvider>,
  );
  const markers = screen.queryAllByTestId('plan-player');
  await screen.unmount();
  return markers.map((m) => m.props as { cx: number; cy: number; r: number });
}

describe('plan player marker (AC-14)', () => {
  it('draws the player inside the maze', async () => {
    expect(await playerMarkers({ x: 0, y: 0 }, 1)).toHaveLength(1);
  });

  it('draws the player on the cell outside the entrance, within the canvas', async () => {
    const { maze } = newMaze('small', 7);
    const outside = outsideOf(maze.entrance);
    const markers = await playerMarkers(outside, opposite(maze.entrance.dir));
    expect(markers).toHaveLength(1);
    const { cx, cy, r } = markers[0];
    expect(cx - r).toBeGreaterThanOrEqual(0);
    expect(cy - r).toBeGreaterThanOrEqual(0);
    expect(cx + r).toBeLessThanOrEqual(WIDTH);
    expect(cy + r).toBeLessThanOrEqual(HEIGHT);
  });

  it('draws nothing for a cell that is neither inside nor at an opening', async () => {
    expect(await playerMarkers({ x: -5, y: -5 }, 0)).toHaveLength(0);
  });
});
