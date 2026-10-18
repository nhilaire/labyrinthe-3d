// Reference strategy played with the SAME constraints as the player (forward / left / right, U-turn only in a
// dead end): the left-hand wall follower always gets out, but badly. Ported from shared/core/strategies.js.
import { Maze, opposite } from './maze';
import { MoveKind, availableMoves, outsideOf, planRoute } from './navigation';

const PRIORITIES: Record<'left' | 'right', MoveKind[]> = {
  left: ['left', 'forward', 'right', 'back'],
  right: ['right', 'forward', 'left', 'back'],
};

export function wallFollower(maze: Maze, hand: 'left' | 'right' = 'left', maxDecisions = 20000) {
  const order = PRIORITIES[hand];
  let pos = outsideOf(maze.entrance);
  let facing = opposite(maze.entrance.dir);
  let steps = 0;
  let decisions = 0;

  let route = planRoute(maze, pos, facing); // automatic entry
  steps += route.cells.length - 1;
  pos = route.cells[route.cells.length - 1];
  facing = route.endDir;

  while (!route.exited && decisions < maxDecisions) {
    const moves = availableMoves(maze, pos, facing);
    const move = order.map((k) => moves.find((m) => m.kind === k)).find(Boolean) ?? moves[0];
    decisions++;
    route = planRoute(maze, pos, move.dir);
    steps += route.cells.length - 1;
    pos = route.cells[route.cells.length - 1];
    facing = route.endDir;
  }
  return { solved: route.exited, steps, decisions };
}
