import type { Cell, Grid } from "./grid";

/** Four-directional movement, matching the grid-locked creep movement of the original. */
const DIRS: readonly Cell[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/**
 * Shortest open-cell path from `start` to `goal`, inclusive of both ends.
 * Returns null when no route exists. Uses BFS since every step costs the same.
 */
export function findPath(grid: Grid, start: Cell, goal: Cell): Cell[] | null {
  if (!grid.isOpen(start.x, start.y) || !grid.isOpen(goal.x, goal.y)) return null;

  const w = grid.width;
  const total = w * grid.height;
  const prev = new Int32Array(total).fill(-1);
  const seen = new Uint8Array(total);
  const queue = new Int32Array(total);

  const startIdx = start.y * w + start.x;
  const goalIdx = goal.y * w + goal.x;
  let head = 0;
  let tail = 0;
  queue[tail++] = startIdx;
  seen[startIdx] = 1;

  while (head < tail) {
    const idx = queue[head++];
    if (idx === goalIdx) break;
    const cx = idx % w;
    const cy = (idx - cx) / w;
    for (const d of DIRS) {
      const nx = cx + d.x;
      const ny = cy + d.y;
      if (!grid.isOpen(nx, ny)) continue;
      const nIdx = ny * w + nx;
      if (seen[nIdx]) continue;
      seen[nIdx] = 1;
      prev[nIdx] = idx;
      queue[tail++] = nIdx;
    }
  }

  if (!seen[goalIdx]) return null;

  const path: Cell[] = [];
  for (let idx = goalIdx; idx !== -1; idx = prev[idx]) {
    const x = idx % w;
    path.push({ x, y: (idx - x) / w });
  }
  path.reverse();
  return path;
}

/**
 * Chains shortest paths through an ordered list of waypoints.
 * Returns null if any leg is unreachable.
 */
export function findRoute(grid: Grid, waypoints: readonly Cell[]): Cell[] | null {
  if (waypoints.length < 2) return waypoints.length === 1 ? [{ ...waypoints[0] }] : null;
  const route: Cell[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const leg = findPath(grid, waypoints[i], waypoints[i + 1]);
    if (!leg) return null;
    // Skip the first cell of every leg after the first, it duplicates the previous leg's end.
    route.push(...(i === 0 ? leg : leg.slice(1)));
  }
  return route;
}
