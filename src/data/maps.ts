import type { Cell } from "../grid/grid";

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Where creeps enter. The route starts here. */
  spawn: Cell;
  /** Ordered waypoints every ground creep must pass through. */
  checkpoints: readonly Cell[];
  /** Where creeps leave. Each creep that reaches it costs a life. */
  exit: Cell;
}

export const MAPS: readonly MapDef[] = [
  {
    id: "meadow",
    name: "Meadow",
    width: 30,
    height: 20,
    spawn: { x: 0, y: 3 },
    checkpoints: [
      { x: 27, y: 3 },
      { x: 27, y: 16 },
      { x: 4, y: 16 },
    ],
    exit: { x: 0, y: 16 },
  },
  {
    id: "switchback",
    name: "Switchback",
    width: 30,
    height: 20,
    spawn: { x: 0, y: 10 },
    checkpoints: [
      { x: 8, y: 10 },
      { x: 8, y: 3 },
      { x: 20, y: 3 },
      { x: 20, y: 15 },
      { x: 29, y: 15 },
    ],
    exit: { x: 29, y: 6 },
  },
];

/** Full ordered waypoint list: spawn, checkpoints, exit. */
export function routeWaypoints(map: MapDef): Cell[] {
  return [map.spawn, ...map.checkpoints, map.exit];
}

export function getMap(id: string): MapDef {
  const map = MAPS.find((m) => m.id === id);
  if (!map) throw new Error(`unknown map "${id}"`);
  return map;
}
