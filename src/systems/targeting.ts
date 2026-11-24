import type { TargetMode, TowerType } from "../data/towers";
import type { Creep } from "../entities/creep";
import { towerLevel, type Tower } from "../entities/tower";

/** Whether a tower's type is able to hit this creep at all (ground vs air). */
export function canTargetCreep(type: TowerType, creep: Creep): boolean {
  return creep.type.air ? type.airTarget : type.groundTarget;
}

/** Lower score wins. */
function score(mode: TargetMode, creep: Creep, distance: number): number {
  switch (mode) {
    case "strongest":
      return -creep.hp;
    case "weakest":
      return creep.hp;
    case "first":
      return -creep.traveled;
    case "nearest":
      return distance;
  }
}

/**
 * Chooses which creep a tower fires at next: the best-scoring living creep
 * that is within range and that the tower can hit. Returns null if none qualify.
 */
export function pickTarget(tower: Tower, creeps: readonly Creep[], center: { x: number; y: number }): Creep | null {
  const range = towerLevel(tower).range;
  let best: Creep | null = null;
  let bestScore = Infinity;

  for (const c of creeps) {
    if (c.status !== "alive" || !canTargetCreep(tower.type, c)) continue;
    const distance = Math.hypot(c.x - center.x, c.y - center.y);
    if (distance > range) continue;
    const s = score(tower.mode, c, distance);
    if (s < bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}
