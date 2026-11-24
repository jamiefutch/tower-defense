import { creepHpAt, type CreepType } from "../data/creeps";
import type { Cell, Grid } from "../grid/grid";
import { findRoute } from "../grid/pathfinding";

export type CreepStatus = "alive" | "dead" | "leaked";

export interface Creep {
  id: number;
  type: CreepType;
  wave: number;
  hp: number;
  maxHp: number;
  /** Position in cell units. Cell (i, j) spans [i, i+1) x [j, j+1); its center is (i+0.5, j+0.5). */
  x: number;
  y: number;
  /** Cells to walk through in order. `path[pathIdx]` is the current target. */
  path: readonly Cell[];
  pathIdx: number;
  /** Index into the map waypoints of the next checkpoint this creep has not yet passed. */
  nextWp: number;
  slowTimer: number;
  slowFactor: number;
  stunTimer: number;
  /** Total distance walked, used by the "first" targeting mode. */
  traveled: number;
  status: CreepStatus;
}

export function createCreep(
  id: number,
  type: CreepType,
  wave: number,
  x: number,
  y: number,
  path: readonly Cell[],
  pathIdx: number,
  nextWp: number,
): Creep {
  const maxHp = creepHpAt(type, wave);
  return {
    id,
    type,
    wave,
    hp: maxHp,
    maxHp,
    x,
    y,
    path,
    pathIdx,
    nextWp,
    slowTimer: 0,
    slowFactor: 1,
    stunTimer: 0,
    traveled: 0,
    status: "alive",
  };
}

/** The cell a creep currently occupies. */
export function cellOf(c: Creep): Cell {
  return { x: Math.floor(c.x), y: Math.floor(c.y) };
}

/**
 * Moves a creep along its path for `dt` seconds, honouring slow and stun.
 * Returns true once the creep has run out of path, which means it reached the exit.
 */
export function advanceCreep(c: Creep, dt: number, waypoints: readonly Cell[]): boolean {
  const speed = c.type.speed * (c.slowTimer > 0 ? c.slowFactor : 1);

  c.slowTimer = Math.max(0, c.slowTimer - dt);
  if (c.slowTimer === 0) c.slowFactor = 1;

  if (c.stunTimer > 0) {
    c.stunTimer = Math.max(0, c.stunTimer - dt);
    return c.pathIdx >= c.path.length;
  }

  let budget = speed * dt;
  while (budget > 0 && c.pathIdx < c.path.length) {
    const target = c.path[c.pathIdx];
    const tx = target.x + 0.5;
    const ty = target.y + 0.5;
    const dx = tx - c.x;
    const dy = ty - c.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= budget) {
      c.x = tx;
      c.y = ty;
      budget -= dist;
      c.traveled += dist;
      c.pathIdx += 1;
      const wp = waypoints[c.nextWp];
      if (wp && wp.x === target.x && wp.y === target.y) c.nextWp += 1;
    } else {
      const f = budget / dist;
      c.x += dx * f;
      c.y += dy * f;
      c.traveled += budget;
      budget = 0;
    }
  }

  return c.pathIdx >= c.path.length;
}

/**
 * Recomputes a ground creep's route from where it stands to the exit, passing
 * through any checkpoints it has not yet reached. Returns false if no route exists,
 * in which case the creep keeps its old path.
 */
export function repathCreep(c: Creep, grid: Grid, waypoints: readonly Cell[]): boolean {
  const origin = cellOf(c);
  let k = c.nextWp;
  const next = waypoints[k];
  if (next && next.x === origin.x && next.y === origin.y) k += 1;

  const route = findRoute(grid, [origin, ...waypoints.slice(k)]);
  if (!route) return false;

  c.path = route;
  c.pathIdx = 1;
  c.nextWp = k;
  return true;
}
