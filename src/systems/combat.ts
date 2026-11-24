import type { Creep } from "../entities/creep";
import { lineFx, ringFx, type Effect } from "../entities/effects";
import type { SoundEvent } from "../entities/sound-events";
import { BARREL_REACH, towerCenter, towerLevel, type Tower } from "../entities/tower";
import { canTargetCreep, pickTarget } from "./targeting";

interface Point {
  x: number;
  y: number;
}

/** Applies damage after armor. Every hit does at least 1 damage. Records the kill. */
function hit(c: Creep, raw: number, killed: Creep[]): void {
  if (c.status !== "alive") return;
  c.hp -= Math.max(1, raw - c.type.armor);
  if (c.hp <= 0) {
    c.status = "dead";
    killed.push(c);
  }
}

function fire(
  t: Tower,
  target: Creep,
  creeps: readonly Creep[],
  center: Point,
  effects: Effect[],
  killed: Creep[],
  sounds: SoundEvent[],
): void {
  const lvl = towerLevel(t);
  t.shots += 1;
  // Shots leave the barrel tip, so the tracer visibly comes out of the weapon.
  const muzzleX = center.x + Math.cos(t.aim) * BARREL_REACH;
  const muzzleY = center.y + Math.sin(t.aim) * BARREL_REACH;
  effects.push(lineFx(muzzleX, muzzleY, target.x, target.y, t.type.color));
  const splash = Boolean(lvl.splash && lvl.damage > 0);
  sounds.push({ kind: "shot", id: t.type.id, splash });

  if (lvl.damage > 0) {
    hit(target, lvl.damage, killed);
    sounds.push({ kind: "hit", id: target.type.id });
  }

  if (splash && lvl.splash) {
    for (const c of creeps) {
      if (c === target || c.status !== "alive" || !canTargetCreep(t.type, c)) continue;
      if (Math.hypot(c.x - target.x, c.y - target.y) <= lvl.splash) hit(c, lvl.damage, killed);
    }
    effects.push(ringFx(target.x, target.y, lvl.splash, t.type.color));
  }

  const eff = t.type.effect;
  if (!eff || target.status !== "alive" || target.type.immune) return;
  if (eff.kind === "slow") {
    target.slowFactor = eff.factor;
    target.slowTimer = lvl.effectValue ?? 0;
  } else if (t.shots % eff.everyShots === 0) {
    target.stunTimer = Math.max(target.stunTimer, lvl.effectValue ?? 0);
  }
}

/**
 * Advances every tower by `dt` seconds, firing at targets whenever a shot is ready.
 * Mutates creep HP and status. Returns the creeps killed during this step.
 * Idle towers do not bank up shots: a tower with no target resets its cooldown.
 * Audio cues for each shot and hit are appended to `sounds` when it is passed.
 */
export function stepTowers(
  towers: readonly Tower[],
  creeps: readonly Creep[],
  dt: number,
  effects: Effect[],
  sounds: SoundEvent[] = [],
): Creep[] {
  const killed: Creep[] = [];
  for (const t of towers) {
    const interval = 1 / towerLevel(t).rate;
    const center = towerCenter(t);
    t.cooldown -= dt;
    // The weapon tracks its target every step, including while it is reloading.
    const tracked = pickTarget(t, creeps, center);
    if (tracked) t.aim = Math.atan2(tracked.y - center.y, tracked.x - center.x);
    while (t.cooldown <= 0) {
      const target = pickTarget(t, creeps, center);
      if (!target) {
        t.cooldown = 0;
        break;
      }
      t.cooldown += interval;
      fire(t, target, creeps, center, effects, killed, sounds);
    }
  }
  return killed;
}
