import { describe, expect, it } from "vitest";
import { CREEP_TYPES } from "../src/data/creeps";
import { TOWER_TYPES } from "../src/data/towers";
import { createCreep, type Creep } from "../src/entities/creep";
import type { Effect } from "../src/entities/effects";
import { BARREL_REACH, type Tower } from "../src/entities/tower";
import { stepTowers } from "../src/systems/combat";
import { pickTarget } from "../src/systems/targeting";

const path = [
  { x: 0, y: 0 },
  { x: 9, y: 0 },
];

function tower(typeId: string, x = 0, y = 0, mode: Tower["mode"] = "nearest"): Tower {
  return { id: 99, type: TOWER_TYPES[typeId], x, y, level: 0, invested: 0, cooldown: 0, shots: 0, mode, aim: 0 };
}

/** Creep at a given position. Uses wave 1 so HP is the base value. */
function creepAt(x: number, y: number, typeId = "normal", id = 1): Creep {
  return createCreep(id, CREEP_TYPES[typeId], 1, x, y, path, 1, 1);
}

describe("targeting", () => {
  const center = { x: 1, y: 1 };

  it("nearest picks the closest creep in range", () => {
    const far = creepAt(3, 1, "normal", 1);
    const near = creepAt(2, 1, "normal", 2);
    expect(pickTarget(tower("dart"), [far, near], center)).toBe(near);
  });

  it("ignores creeps out of range", () => {
    const out = creepAt(9, 9);
    expect(pickTarget(tower("pellet"), [out], center)).toBeNull();
  });

  it("strongest prefers the creep with the most HP", () => {
    const weak = creepAt(2, 1, "normal", 1);
    const strong = creepAt(2.5, 1, "armored", 2);
    expect(pickTarget(tower("dart", 0, 0, "strongest"), [weak, strong], center)).toBe(strong);
  });

  it("weakest prefers the creep with the least HP", () => {
    const weak = creepAt(2, 1, "normal", 1);
    const strong = creepAt(2.5, 1, "armored", 2);
    expect(pickTarget(tower("dart", 0, 0, "weakest"), [weak, strong], center)).toBe(weak);
  });

  it("first prefers the creep that has traveled furthest", () => {
    const behind = creepAt(2, 1, "normal", 1);
    const ahead = creepAt(2.2, 1, "normal", 2);
    ahead.traveled = 10;
    expect(pickTarget(tower("dart", 0, 0, "first"), [behind, ahead], center)).toBe(ahead);
  });

  it("swarm (air only) never targets ground creeps", () => {
    const ground = creepAt(2, 1, "normal");
    expect(pickTarget(tower("swarm"), [ground], center)).toBeNull();
  });

  it("pellet (ground only) never targets air creeps", () => {
    const flyer = creepAt(2, 1, "air");
    expect(pickTarget(tower("pellet"), [flyer], center)).toBeNull();
  });

  it("dart targets both ground and air", () => {
    const flyer = creepAt(2, 1, "air");
    expect(pickTarget(tower("dart"), [flyer], center)).toBe(flyer);
  });
});

describe("damage", () => {
  it("armor reduces each hit, but at least 1 damage gets through", () => {
    // Armored creep has armor 3. Pellet L0 does 4 damage, so it takes 1 per hit.
    const armored = creepAt(2, 1, "armored");
    const t = tower("pellet", 0, 0);
    const effects: Effect[] = [];
    stepTowers([t], [armored], 1, effects);
    expect(armored.hp).toBeLessThan(CREEP_TYPES.armored.hp);
    expect(CREEP_TYPES.armored.hp - armored.hp).toBeGreaterThanOrEqual(1);
  });

  it("a creep killed in a step is marked dead and returned", () => {
    const weak = creepAt(2, 1, "normal");
    weak.hp = 1;
    const killed = stepTowers([tower("pellet")], [weak], 1, []);
    expect(killed).toEqual([weak]);
    expect(weak.status).toBe("dead");
  });

  it("splash damages every ground creep in the radius", () => {
    const a = creepAt(2, 1, "normal", 1);
    const b = creepAt(2.5, 1, "normal", 2);
    const c = creepAt(8, 1, "normal", 3);
    const t = tower("snap", 0, 0);
    stepTowers([t], [a, b, c], 1, []);
    expect(a.hp).toBeLessThan(CREEP_TYPES.normal.hp);
    expect(b.hp).toBeLessThan(CREEP_TYPES.normal.hp);
    expect(c.hp).toBe(CREEP_TYPES.normal.hp);
  });
});

describe("rate of fire", () => {
  it("fires once per interval, not once per step", () => {
    const creep = creepAt(2, 1, "boss", 1); // tanky, so it survives
    const t = tower("pellet");
    // Pellet L0 fires 1.2 shots/s, so one second should give about 1-2 shots, not 60.
    for (let i = 0; i < 60; i++) stepTowers([t], [creep], 1 / 60, []);
    expect(t.shots).toBeGreaterThanOrEqual(1);
    expect(t.shots).toBeLessThanOrEqual(2);
  });

  it("an idle tower does not bank shots", () => {
    const t = tower("pellet");
    // Ten seconds with nothing in range.
    for (let i = 0; i < 600; i++) stepTowers([t], [], 1 / 60, []);
    expect(t.shots).toBe(0);

    // A creep arrives. The tower should fire at most once immediately, not a burst.
    const creep = creepAt(2, 1, "boss", 1);
    stepTowers([t], [creep], 1 / 60, []);
    expect(t.shots).toBeLessThanOrEqual(1);
  });
});

describe("status effects", () => {
  it("frost slows its target", () => {
    const creep = creepAt(2, 1, "boss", 1);
    stepTowers([tower("frost")], [creep], 1 / 60, []);
    expect(creep.slowFactor).toBe(0.5);
    expect(creep.slowTimer).toBeGreaterThan(0);
  });

  it("frost does not slow immune creeps", () => {
    const creep = creepAt(2, 1, "immune", 1);
    stepTowers([tower("frost")], [creep], 1 / 60, []);
    expect(creep.slowTimer).toBe(0);
  });

  it("bash stuns on every 4th shot, not before", () => {
    const creep = creepAt(2, 1, "boss", 1);
    const t = tower("bash");
    // Step finely so each step produces at most one shot (bash fires once per second).
    while (t.shots < 3) stepTowers([t], [creep], 1 / 60, []);
    expect(creep.stunTimer).toBe(0);
    while (t.shots < 4) stepTowers([t], [creep], 1 / 60, []);
    expect(creep.stunTimer).toBeGreaterThan(0);
  });

  it("bash does not stun immune creeps", () => {
    const creep = creepAt(2, 1, "immune", 1);
    const t = tower("bash");
    t.shots = 3;
    while (t.shots < 4) stepTowers([t], [creep], 1 / 60, []);
    expect(creep.stunTimer).toBe(0);
  });
});

describe("effects output", () => {
  it("each shot pushes a line effect", () => {
    const effects: Effect[] = [];
    stepTowers([tower("dart")], [creepAt(2, 1, "normal")], 1, effects);
    expect(effects.some((e) => e.kind === "line")).toBe(true);
  });
});

describe("aiming", () => {
  // Tower centre is (1, 1) for a footprint at the origin.
  it("points the weapon at the target", () => {
    const t = tower("dart");
    stepTowers([t], [creepAt(1, 3)], 1 / 60, []);
    expect(t.aim).toBeCloseTo(Math.PI / 2);
  });

  it("keeps tracking the target while reloading", () => {
    const t = tower("pellet");
    stepTowers([t], [creepAt(1, 3, "normal", 1)], 1 / 60, []);
    t.cooldown = 5;
    stepTowers([t], [creepAt(3, 1, "normal", 2)], 1 / 60, []);
    expect(t.aim).toBeCloseTo(0);
    expect(t.shots).toBe(1);
  });

  it("holds its last aim when no target is in range", () => {
    const t = tower("dart");
    stepTowers([t], [creepAt(0, 1)], 1 / 60, []);
    const aimed = t.aim;
    stepTowers([t], [], 1 / 60, []);
    expect(t.aim).toBe(aimed);
  });

  it("shots start at the barrel tip, not the tower centre", () => {
    const effects: Effect[] = [];
    const t = tower("dart");
    stepTowers([t], [creepAt(3, 1)], 1, effects);
    const fx = effects.find((e) => e.kind === "line");
    expect(fx).toBeDefined();
    expect(fx!.x1).toBeCloseTo(1 + BARREL_REACH);
    expect(fx!.y1).toBeCloseTo(1);
  });
});
