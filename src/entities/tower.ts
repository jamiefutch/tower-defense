import { FOOTPRINT } from "../core/config";
import type { TargetMode, TowerLevel, TowerType } from "../data/towers";

export interface Tower {
  id: number;
  type: TowerType;
  /** Top-left cell of the footprint. */
  x: number;
  y: number;
  level: number;
  /** Total gold spent on this tower, used to compute the sell refund. */
  invested: number;
  /** Seconds until the tower can fire again. */
  cooldown: number;
  shots: number;
  mode: TargetMode;
}

export function towerLevel(t: Tower): TowerLevel {
  return t.type.levels[t.level];
}

/** Center of the footprint, in cell units. */
export function towerCenter(t: Tower): { x: number; y: number } {
  return { x: t.x + FOOTPRINT / 2, y: t.y + FOOTPRINT / 2 };
}

export function footprintCovers(x: number, y: number, cellX: number, cellY: number): boolean {
  return cellX >= x && cellX < x + FOOTPRINT && cellY >= y && cellY < y + FOOTPRINT;
}

export function towerCovers(t: Tower, cellX: number, cellY: number): boolean {
  return footprintCovers(t.x, t.y, cellX, cellY);
}
