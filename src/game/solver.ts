// The move to play at a decision point to follow the shortest path. Used by tests, the debug deep link flows and
// the guided-game seed check; never shown to the player.
import { DIRS, Dir } from './maze';
import { Move, outsideOf, sameCell } from './navigation';
import type { GameSession } from './session';

export function shortestMove(session: GameSession): Move | null {
  const path = session.report.path;
  if (!path) return null;
  const exitOutside = outsideOf(session.maze.exit);
  const i = path.findIndex((c) => sameCell(c, session.pos));
  if (i < 0) return null;
  const next = i === path.length - 1 ? exitOutside : path[i + 1];
  const dir = DIRS.findIndex((d) => session.pos.x + d.dx === next.x && session.pos.y + d.dy === next.y) as Dir;
  return session.moves.find((m) => m.dir === dir) ?? null;
}
