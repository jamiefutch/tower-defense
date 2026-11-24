import { describe, expect, it } from "vitest";
import { batchGain, isCoolingDown, jitterCents } from "../src/audio/audio";
import { Game } from "../src/core/game";
import { CREEP_TYPES } from "../src/data/creeps";
import type { MapDef } from "../src/data/maps";
import { TOWER_TYPES } from "../src/data/towers";
import { createCreep, type Creep } from "../src/entities/creep";
import { MAX_SOUND_EVENTS, type SoundEvent } from "../src/entities/sound-events";
import type { Tower } from "../src/entities/tower";
import { stepTowers } from "../src/systems/combat";

const FIXED = 1 / 60;

const path = [
  { x: 0, y: 0 },
  { x: 9, y: 0 },
];

function tower(typeId: string): Tower {
  return { id: 99, type: TOWER_TYPES[typeId], x: 0, y: 0, level: 0, invested: 0, cooldown: 0, shots: 0, mode: "nearest", aim: 0 };
}

function creepAt(x: number, y: number, typeId = "normal"): Creep {
  return createCreep(1, CREEP_TYPES[typeId], 1, x, y, path, 1, 1);
}

/** Straight lane 10 wide with a tower above it, so a 2x2 tower at (4, 0) does not seal the route. */
const LANE: MapDef = {
  id: "lane",
  name: "Lane",
  width: 10,
  height: 4,
  spawn: { x: 0, y: 2 },
  checkpoints: [],
  exit: { x: 9, y: 2 },
};

/** Steps the game for `seconds`, collecting every cue it records along the way. */
function collect(game: Game, seconds: number, stopWhen?: (g: Game) => boolean): SoundEvent[] {
  const out: SoundEvent[] = [];
  const steps = Math.round(seconds / FIXED);
  for (let i = 0; i < steps; i++) {
    game.update(FIXED);
    out.push(...game.drainSoundEvents());
    if (stopWhen?.(game)) break;
  }
  return out;
}

describe("combat cues", () => {
  it("a shot records one shot cue with the tower's id", () => {
    const sounds: SoundEvent[] = [];
    stepTowers([tower("dart")], [creepAt(2, 1)], 1, [], sounds);
    expect(sounds[0]).toEqual({ kind: "shot", id: "dart", splash: false });
  });

  it("a hit records a hit cue for the creep's type", () => {
    const sounds: SoundEvent[] = [];
    stepTowers([tower("dart")], [creepAt(2, 1, "armored")], 1, [], sounds);
    expect(sounds).toContainEqual({ kind: "hit", id: "armored" });
  });

  it("splash towers mark their shots as splash", () => {
    const sounds: SoundEvent[] = [];
    stepTowers([tower("snap")], [creepAt(2, 1)], 1, [], sounds);
    expect(sounds[0]).toMatchObject({ kind: "shot", id: "snap", splash: true });
  });

  it("an idle tower records nothing", () => {
    const sounds: SoundEvent[] = [];
    stepTowers([tower("dart")], [], 1, [], sounds);
    expect(sounds).toEqual([]);
  });

  it("omitting the sounds list leaves combat unchanged", () => {
    const c = creepAt(2, 1);
    expect(() => stepTowers([tower("dart")], [c], 1, [])).not.toThrow();
    expect(c.hp).toBeLessThan(CREEP_TYPES.normal.hp);
  });
});

describe("game cues", () => {
  it("starting a wave records a spawn cue for each creep type that appears", () => {
    const g = new Game(LANE);
    g.sendNextWave();
    const events = collect(g, 2);
    expect(events.some((e) => e.kind === "spawn" && e.id === "normal")).toBe(true);
  });

  it("creeps that reach the exit record leak cues", () => {
    const g = new Game(LANE);
    g.sendNextWave();
    const events = collect(g, 120, (x) => x.phase !== "wave");
    expect(g.lives).toBeLessThan(20);
    expect(events.some((e) => e.kind === "leak")).toBe(true);
  });

  it("a creep killed by a tower records a kill cue", () => {
    const g = new Game(LANE);
    expect(g.build("dart", 4, 0)).toBe(true);
    g.sendNextWave();
    // Let the first creep spawn, then make it fragile so one shot is enough to kill it.
    const events = collect(g, 0.2);
    for (const c of g.creeps) c.hp = 1;
    events.push(...collect(g, 10, (x) => x.kills > 0));
    expect(g.kills).toBeGreaterThan(0);
    expect(events.some((e) => e.kind === "kill")).toBe(true);
  });

  it("drainSoundEvents returns the cues and clears them", () => {
    const g = new Game(LANE);
    g.sendNextWave();
    for (let i = 0; i < 60; i++) g.update(FIXED);
    const first = g.drainSoundEvents();
    expect(first.length).toBeGreaterThan(0);
    expect(g.drainSoundEvents()).toEqual([]);
  });

  it("the cue list is trimmed when nothing drains it", () => {
    const g = new Game(LANE);
    for (let i = 0; i < MAX_SOUND_EVENTS * 2; i++) g.soundEvents.push({ kind: "hit", id: "normal" });
    g.update(FIXED);
    expect(g.soundEvents.length).toBeLessThanOrEqual(MAX_SOUND_EVENTS);
  });
});

describe("audio helpers", () => {
  it("a cue is held back only while the same key was played within the cooldown", () => {
    expect(isCoolingDown(undefined, 1)).toBe(false);
    expect(isCoolingDown(1, 1.02, 0.04)).toBe(true);
    expect(isCoolingDown(1, 1.05, 0.04)).toBe(false);
  });

  it("batching never boosts a single cue and gets sub-linearly quieter as the count grows", () => {
    expect(batchGain(1)).toBe(1);
    expect(batchGain(0)).toBe(1);
    expect(batchGain(4)).toBeCloseTo(0.5);
    expect(batchGain(9)).toBeLessThan(batchGain(4));
  });

  it("pitch jitter stays within about 3% (50 cents) either way", () => {
    expect(jitterCents(0)).toBe(-50);
    expect(jitterCents(0.5)).toBeCloseTo(0);
    expect(jitterCents(0.999)).toBeLessThan(50);
  });
});
