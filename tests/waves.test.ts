import { describe, expect, it } from "vitest";
import { TOTAL_WAVES } from "../src/core/config";
import { CREEP_TYPES } from "../src/data/creeps";
import { MAPS, routeWaypoints } from "../src/data/maps";
import { buildWave } from "../src/data/waves";
import { Grid } from "../src/grid/grid";
import { findRoute } from "../src/grid/pathfinding";
import { buildSpawnQueue, Spawner } from "../src/systems/spawner";
import { earlyCallBonus, interestOn, sellRefund, waveClearBonus } from "../src/systems/economy";

describe("wave composition", () => {
  it("every generated wave references only known creep types", () => {
    for (let w = 1; w <= TOTAL_WAVES; w++) {
      for (const g of buildWave(w).groups) {
        expect(CREEP_TYPES[g.type], `wave ${w} uses ${g.type}`).toBeDefined();
      }
    }
  });

  it("wave 1 is only normal creeps", () => {
    const types = new Set(buildWave(1).groups.map((g) => g.type));
    expect([...types]).toEqual(["normal"]);
  });

  it("every tenth wave ends with a boss", () => {
    for (const w of [10, 20, 30, 40]) {
      expect(buildWave(w).groups.some((g) => g.type === "boss")).toBe(true);
    }
    expect(buildWave(9).groups.some((g) => g.type === "boss")).toBe(false);
  });

  it("later waves are bigger than earlier ones", () => {
    const count = (w: number) => buildWave(w).groups.reduce((n, g) => n + g.count, 0);
    expect(count(30)).toBeGreaterThan(count(5));
  });

  it("rejects out-of-range wave numbers", () => {
    expect(() => buildWave(0)).toThrow(RangeError);
    expect(() => buildWave(TOTAL_WAVES + 1)).toThrow(RangeError);
  });
});

describe("spawn queue", () => {
  it("is sorted by time and contains every creep", () => {
    const spec = buildWave(12);
    const queue = buildSpawnQueue(spec);
    const total = spec.groups.reduce((n, g) => n + g.count, 0);
    expect(queue).toHaveLength(total);
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i].time).toBeGreaterThanOrEqual(queue[i - 1].time);
    }
  });

  it("the spawner releases events only when their time is reached", () => {
    const spawner = new Spawner([
      { time: 0, type: "normal" },
      { time: 1, type: "normal" },
    ]);
    expect(spawner.update(0.5)).toHaveLength(1);
    expect(spawner.update(0.4)).toHaveLength(0);
    expect(spawner.update(0.2)).toHaveLength(1);
    expect(spawner.done).toBe(true);
  });
});

describe("maps", () => {
  it.each(MAPS.map((m) => [m.id, m] as const))("%s has an open route from spawn to exit", (_id, map) => {
    const grid = new Grid(map.width, map.height);
    expect(findRoute(grid, routeWaypoints(map))).not.toBeNull();
  });
});

describe("economy", () => {
  it("interest is 5% of gold, capped", () => {
    expect(interestOn(100)).toBe(5);
    expect(interestOn(10_000)).toBe(25);
    expect(interestOn(0)).toBe(0);
  });

  it("selling refunds 70% of the invested gold, rounded down", () => {
    expect(sellRefund(25)).toBe(17);
    expect(sellRefund(100)).toBe(70);
  });

  it("wave clear bonus grows with the wave number", () => {
    expect(waveClearBonus(10)).toBeGreaterThan(waveClearBonus(1));
  });

  it("early call pays half the seconds left", () => {
    expect(earlyCallBonus(20)).toBe(10);
    expect(earlyCallBonus(0.5)).toBe(0);
    expect(earlyCallBonus(-3)).toBe(0);
  });
});
