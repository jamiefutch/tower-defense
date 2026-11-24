import type { Cell, Grid } from "./grid";
import { findRoute } from "./pathfinding";

export interface Footprint {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Returns true if placing a tower with the given footprint keeps every spawn
 * connected to the exit through the ordered checkpoints. The grid is not modified.
 *
 * `route` is the ordered list of waypoints: [spawn, ...checkpoints, exit].
 * A placement is rejected if it leaves the route unreachable, so the player can
 * maze creeps but never fully wall them off.
 */
export function canPlaceTower(grid: Grid, fp: Footprint, route: readonly Cell[]): boolean {
  if (route.length < 2) return false;
  // Footprint must be fully inside the grid and on open cells.
  for (let dy = 0; dy < fp.h; dy++) {
    for (let dx = 0; dx < fp.w; dx++) {
      if (!grid.isOpen(fp.x + dx, fp.y + dy)) return false;
    }
  }
  const trial = grid.clone();
  trial.setFootprint(fp.x, fp.y, fp.w, fp.h, true);
  return findRoute(trial, route) !== null;
}
