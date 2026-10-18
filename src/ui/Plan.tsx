// 2D plan in SVG: intro, peek (with the player) and the final review (walked path, shortest path, corridor network).
// Source: mobile/src/ui/Plan.js; the emblems come from the same shapes as the 3D plaques.
import { memo } from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import type { Landmark } from '../game/landmarks';
import { Cell, DIRS, Dir, Maze, Opening as MazeOpening } from '../game/maze';
import type { Journey } from '../game/navigation';
import { Segment, corridorLines, wallLines } from '../game/planLines';
import { fr } from '../i18n/fr';
import { emblemInk, emblemShapes } from '../render/emblems';

const PAPER = '#e9dcbe';
const PAPER_EDGE = '#c9b489';
const INK = '#2b2118';
const ENTRANCE = '#2f7d4f';
const EXIT = '#a8730a';
const PLAYER = '#1b3f8f';

const pathOf = (segments: Segment[], toX: (v: number) => number, toY: (v: number) => number) =>
  segments.map(([x1, y1, x2, y2]) => `M${toX(x1)} ${toY(y1)}L${toX(x2)} ${toY(y2)}`).join('');

function Emblem({ index, cx, cy, radius }: { index: number; cx: number; cy: number; radius: number }) {
  const color = emblemInk(index);
  return (
    <G>
      {emblemShapes(index).map((shape, i) => {
        if (shape.k === 'ellipse') {
          return <Ellipse key={i} cx={cx + shape.cx * radius} cy={cy + shape.cy * radius} rx={shape.rx * radius} ry={shape.ry * radius} fill={color} />;
        }
        if (shape.k === 'ring') {
          return <Circle key={i} cx={cx + shape.cx * radius} cy={cy + shape.cy * radius} r={shape.r * radius} fill="none" stroke={color} strokeWidth={shape.w * radius} />;
        }
        return <Polygon key={i} points={shape.pts.map(([x, y]) => `${cx + x * radius},${cy + y * radius}`).join(' ')} fill={color} />;
      })}
    </G>
  );
}

// Entrance or exit arrow, outside the border, with its label.
function OpeningMark(props: {
  opening: MazeOpening;
  color: string;
  cell: number;
  cx: (v: number) => number;
  cy: (v: number) => number;
  isEntrance: boolean;
}) {
  const { opening, color, cell, cx, cy, isEntrance } = props;
  const d = DIRS[opening.dir];
  const ax = isEntrance ? -d.dx : d.dx;
  const ay = isEntrance ? -d.dy : d.dy;
  const bx = cx(opening.x) + d.dx * cell * 0.72;
  const by = cy(opening.y) + d.dy * cell * 0.72;
  const s = cell * 0.34;
  const pts = [
    [bx + ax * s, by + ay * s],
    [bx - ax * s * 0.5 + ay * s * 0.7, by - ay * s * 0.5 - ax * s * 0.7],
    [bx - ax * s * 0.5 - ay * s * 0.7, by - ay * s * 0.5 + ax * s * 0.7],
  ];
  // Horizontal borders: the label goes beyond the arrow; vertical borders: above the arrow, so it stays on paper.
  const vertical = d.dx !== 0;
  // On a left/right border the label starts just outside the wall, away from it, above the arrow.
  const tx = vertical ? cx(opening.x) + d.dx * cell * 0.82 : cx(opening.x);
  const ty = vertical ? cy(opening.y) - cell * 0.42 : cy(opening.y) + d.dy * cell * 1.25 + cell * 0.12;
  const anchor = !vertical ? 'middle' : d.dx > 0 ? 'start' : 'end';
  return (
    <G>
      <Polygon points={pts.map((p) => p.join(',')).join(' ')} fill={color} />
      <SvgText x={tx} y={ty} fill={color} fontSize={Math.max(8, cell * 0.32)} fontWeight="bold" textAnchor={anchor}>
        {isEntrance ? fr.plan.entrance : fr.plan.exit}
      </SvgText>
    </G>
  );
}

type Props = {
  maze: Maze;
  width: number;
  height: number;
  landmarks?: Landmark[];
  journey?: Journey | null;
  solution?: Cell[] | null;
  network?: boolean;
  player?: { cell: Cell; dir: Dir } | null;
  testID?: string;
};

function PlanView({ maze, width, height, landmarks = [], journey = null, solution = null, network = false, player = null, testID }: Props) {
  if (width <= 0 || height <= 0) return null;
  const margin = Math.max(8, Math.min(width, height) * 0.04);
  const cell = Math.min((width - margin * 2) / (maze.width + 3.6), (height - margin * 2) / (maze.height + 3.6));
  const planW = cell * maze.width;
  const planH = cell * maze.height;
  const ox = (width - planW) / 2;
  const oy = (height - planH) / 2;
  const px = (gx: number) => ox + gx * cell;
  const py = (gy: number) => oy + gy * cell;
  const cx = (gx: number) => px(gx + 0.5);
  const cy = (gy: number) => py(gy + 0.5);
  const pad = cell * 1.4;
  const maxVisits = journey ? Math.max(2, journey.maxEdgeVisits) : 2;

  return (
    <Svg width={width} height={height} testID={testID}>
      <Rect x={ox - pad} y={oy - pad} width={planW + pad * 2} height={planH + pad * 2} rx={Math.min(18, cell)} fill={PAPER} stroke={PAPER_EDGE} strokeWidth={2} />
      {network && (
        <Path d={pathOf(corridorLines(maze), cx, cy)} stroke="rgba(43,33,24,0.14)" strokeWidth={Math.max(1, cell * 0.1)} strokeLinecap="round" fill="none" />
      )}
      {journey?.segments().map((seg, i) => {
        const k = Math.min(1, (seg.count - 1) / (maxVisits - 1));
        return (
          <Line
            key={`t${i}`}
            x1={cx(seg.a.x)}
            y1={cy(seg.a.y)}
            x2={cx(seg.b.x)}
            y2={cy(seg.b.y)}
            stroke={`hsl(4, 72%, ${58 - k * 40}%)`}
            strokeOpacity={0.62 + k * 0.38}
            strokeWidth={cell * (0.17 + k * 0.1)}
            strokeLinecap="round"
          />
        );
      })}
      {solution && (
        <Path
          d={solution.map((c, i) => `${i ? 'L' : 'M'}${cx(c.x)} ${cy(c.y)}`).join('')}
          stroke="#123f78"
          strokeWidth={cell * 0.09}
          strokeDasharray={`${cell * 0.26},${cell * 0.2}`}
          fill="none"
        />
      )}
      <Path d={pathOf(wallLines(maze), px, py)} stroke={INK} strokeWidth={Math.max(1.4, cell * 0.13)} strokeLinecap="round" fill="none" />
      {landmarks.map((mark, i) => (
        <G key={`l${i}`}>
          <Circle cx={cx(mark.x)} cy={cy(mark.y)} r={cell * 0.35} fill={PAPER} stroke={emblemInk(mark.emblem)} strokeWidth={Math.max(1, cell * 0.045)} />
          <Emblem index={mark.emblem} cx={cx(mark.x)} cy={cy(mark.y)} radius={cell * 0.2} />
        </G>
      ))}
      <OpeningMark opening={maze.entrance} color={ENTRANCE} cell={cell} cx={cx} cy={cy} isEntrance />
      <OpeningMark opening={maze.exit} color={EXIT} cell={cell} cx={cx} cy={cy} isEntrance={false} />
      {player && maze.inside(player.cell.x, player.cell.y) && (
        <G>
          <Circle cx={cx(player.cell.x)} cy={cy(player.cell.y)} r={cell * 0.26} fill={PLAYER} />
          <Line
            x1={cx(player.cell.x)}
            y1={cy(player.cell.y)}
            x2={cx(player.cell.x) + DIRS[player.dir].dx * cell * 0.55}
            y2={cy(player.cell.y) + DIRS[player.dir].dy * cell * 0.55}
            stroke={PLAYER}
            strokeWidth={Math.max(2, cell * 0.1)}
            strokeLinecap="round"
          />
        </G>
      )}
    </Svg>
  );
}

export const Plan = memo(PlanView);
