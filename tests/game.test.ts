import { describe, expect, it } from "vitest";
import { AUTO_WAVE_DELAY, START_GOLD, START_LIVES } from "../src/core/config";
import { Game } from "../src/core/game";
import { MAPS, type MapDef } from "../src/data/maps";

const FIXED = 1 / 60;

/** Single straight lane 4 wide and 2 tall: placing a 2x2 tower at x=1 seals it. */
const TINY: MapDef = {
  id: "tiny",
  name: "Tiny",
  width: 4,
  height: 2,
  spawn: { x: 0, y: 0 },
  checkpoints: [],
  exit: { x: 3, y: 0 },
};

function run(game: Game, seconds: number): void {
  const steps = Math.round(seconds / FIXED);
  for (let i = 0; i < steps; i++) game.update(FIXED);
}

/** Runs until the wave is over or the time limit is hit. */
function runUntilBuildPhase(game: Game, maxSeconds: number): void {
  const steps = Math.round(maxSeconds / FIXED);
  for (let i = 0; i < steps && game.phase === "wave"; i++) game.update(FIXED);
}

describe("building", () => {
  it("charges the tower's cost and blocks its cells", () => {
    const g = new Game(MAPS[0]);
    expect(g.build("pellet", 10, 10)).toBe(true);
    expect(g.gold).toBe(START_GOLD - 10);
    expect(g.grid.isBlocked(10, 10)).toBe(true);
    expect(g.grid.isBlocked(11, 11)).toBe(true);
  });

  it("refuses a tower that would seal the route", () => {
    const g = new Game(TINY);
    g.gold = 1000;
    expect(g.build("pellet", 1, 0)).toBe(false);
    expect(g.buildError("pellet", 1, 0)).toBe("That would block the route");
    expect(g.towers).toHaveLength(0);
    expect(g.gold).toBe(1000);
  });

  it("refuses a tower on an occupied cell", () => {
    const g = new Game(MAPS[0]);
    g.build("pellet", 10, 10);
    expect(g.buildError("pellet", 10, 10)).toBe("Space is occupied");
  });

  it("refuses when the player cannot afford it", () => {
    const g = new Game(MAPS[0]);
    g.gold = 5;
    expect(g.buildError("pellet", 10, 10)).toBe("Not enough gold");
  });

  it("refuses a tower on top of a ground creep", () => {
    const g = new Game(MAPS[0]);
    g.sendNextWave();
    run(g, 2);
    const creep = g.creeps.find((c) => c.status === "alive" && !c.type.air);
    expect(creep).toBeDefined();
    // A 2x2 origin at the creep's own cell covers that cell, which is open, so only the creep check can fire.
    const cx = Math.floor(creep!.x);
    const cy = Math.floor(creep!.y);
    expect(g.grid.isBlocked(cx, cy)).toBe(false);
    expect(g.buildError("pellet", cx, cy)).toBe("A creep is in the way");
  });

  it("refuses to build out of bounds", () => {
    const g = new Game(MAPS[0]);
    expect(g.buildError("pellet", 29, 0)).toBe("Out of bounds");
  });
});

describe("selling and upgrading", () => {
  it("selling refunds 70% of total invested, including upgrades", () => {
    const g = new Game(MAPS[0]);
    g.build("pellet", 10, 10); // 10
    const t = g.towerAt(10, 10)!;
    g.upgrade(t); // +12 -> invested 22
    const before = g.gold;
    g.sell(t);
    expect(g.gold).toBe(before + Math.floor(22 * 0.7));
    expect(g.towers).toHaveLength(0);
    expect(g.grid.isBlocked(10, 10)).toBe(false);
  });

  it("upgrading charges the next level's cost and stops at max", () => {
    const g = new Game(MAPS[0]);
    g.gold = 1000;
    g.build("dart", 10, 10);
    const t = g.towerAt(10, 10)!;
    expect(g.upgradeCost(t)).toBe(20);
    g.upgrade(t);
    g.upgrade(t);
    g.upgrade(t);
    expect(t.level).toBe(3);
    expect(g.upgradeCost(t)).toBeNull();
    expect(g.upgrade(t)).toBe(false);
  });

  it("cannot upgrade without enough gold", () => {
    const g = new Game(MAPS[0]);
    g.build("dart", 10, 10);
    g.gold = 0;
    expect(g.upgrade(g.towerAt(10, 10)!)).toBe(false);
  });
});

describe("waves", () => {
  it("the countdown starts a wave on its own", () => {
    const g = new Game(MAPS[0]);
    run(g, AUTO_WAVE_DELAY + 0.1);
    expect(g.phase).toBe("wave");
    expect(g.wave).toBe(1);
  });

  it("calling a wave early pays a bonus based on time left", () => {
    const g = new Game(MAPS[0]);
    run(g, 2); // about 18s left
    const before = g.gold;
    expect(g.sendNextWave()).toBe(true);
    expect(g.gold).toBeGreaterThan(before);
    expect(g.phase).toBe("wave");
  });

  it("cannot call a wave while one is in progress", () => {
    const g = new Game(MAPS[0]);
    g.sendNextWave();
    expect(g.sendNextWave()).toBe(false);
  });

  it("creeps escaping the exit cost lives", () => {
    const g = new Game(TINY);
    g.sendNextWave();
    runUntilBuildPhase(g, 120);
    expect(g.lives).toBeLessThan(START_LIVES);
  });

  it("losing all lives ends the game", () => {
    const g = new Game(TINY);
    g.lives = 1;
    g.sendNextWave();
    runUntilBuildPhase(g, 120);
    expect(g.phase).toBe("lost");
    expect(g.isOver).toBe(true);
    expect(g.build("pellet", 0, 0)).toBe(false);
  });

  it("clearing a wave with a few towers pays out and returns to build phase", () => {
    const g = new Game(MAPS[0]);
    // Towers beside the first lane (row 3), out of the creeps' way.
    g.gold = 500;
    g.build("dart", 5, 0);
    g.build("dart", 12, 0);
    g.build("snap", 18, 0);
    g.sendNextWave();
    runUntilBuildPhase(g, 300);
    expect(g.kills).toBeGreaterThan(0);
    expect(g.wave).toBe(1);
    expect(g.phase).toBe("build");
    expect(g.countdown).toBe(AUTO_WAVE_DELAY);
    expect(g.messages.some((m) => m.startsWith("Wave 1 cleared"))).toBe(true);
  });

  it("paused games do not advance", () => {
    const g = new Game(MAPS[0]);
    g.paused = true;
    run(g, 60);
    expect(g.countdown).toBe(AUTO_WAVE_DELAY);
    expect(g.phase).toBe("build");
  });
});
