/**
 * Headless balance simulator.
 *
 * Plays the game with a simple scripted strategy and reports how far it gets.
 * Use it to check the difficulty curve after changing tower, creep, or wave data.
 *
 *   npx vite-node scripts/balance-sim.ts              # default map, default strategy
 *   npx vite-node scripts/balance-sim.ts switchback   # pick a map by id
 */
import { FIXED_DT, TOTAL_WAVES } from "../src/core/config";
import { Game } from "../src/core/game";
import { getMap, MAPS } from "../src/data/maps";
import { getTowerType, TOWER_TYPES } from "../src/data/towers";
import type { Cell } from "../src/grid/grid";

/** Cycle of towers the scripted player buys, in order. */
const BUILD_ORDER = ["pellet", "dart", "snap", "frost", "pellet", "bash", "swarm", "dart"];
/** Spend above this reserve on upgrades. Keeps some gold for new towers. */
const UPGRADE_RESERVE = 20;
/** Tower placements must be within this many cells of the route. */
const NEAR_ROUTE = 2.5;
/** Safety cap on simulated time, in seconds. */
const MAX_SECONDS = 4 * 60 * 60;

/** How many route cells lie within range of a tower with its top-left at (x, y). */
function routeCoverage(game: Game, x: number, y: number): number {
  const cx = x + 1;
  const cy = y + 1;
  return game.route.filter((c: Cell) => Math.hypot(c.x + 0.5 - cx, c.y + 0.5 - cy) <= NEAR_ROUTE).length;
}

/** Legal origin that covers the most route. Ties go to the first found. */
function findSpot(game: Game, typeId: string): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestCoverage = 0;
  for (let y = 0; y < game.grid.height - 1; y++) {
    for (let x = 0; x < game.grid.width - 1; x++) {
      const coverage = routeCoverage(game, x, y);
      if (coverage <= bestCoverage) continue;
      if (game.buildError(typeId, x, y) !== null) continue;
      best = { x, y };
      bestCoverage = coverage;
    }
  }
  return best;
}

/** Spends gold on new towers in build order, then on upgrades with what is left. */
function playBuildPhase(game: Game): void {
  for (;;) {
    const typeId = BUILD_ORDER[game.towers.length % BUILD_ORDER.length];
    if (game.gold < getTowerType(typeId).levels[0].cost) break;
    const spot = findSpot(game, typeId);
    if (!spot) break;
    if (!game.build(typeId, spot.x, spot.y)) break;
  }

  for (const t of game.towers) {
    for (;;) {
      const cost = game.upgradeCost(t);
      if (cost === null || game.gold < cost + UPGRADE_RESERVE) break;
      game.upgrade(t);
    }
  }
}

function simulate(mapId: string, trace: boolean): void {
  const game = new Game(getMap(mapId));
  let previousPhase = "";
  const maxTicks = Math.round(MAX_SECONDS / FIXED_DT);

  for (let tick = 0; tick < maxTicks && !game.isOver; tick++) {
    if (game.phase === "build" && previousPhase !== "build") {
      playBuildPhase(game);
      if (trace) {
        console.log(`  before wave ${game.wave + 1}: lives ${game.lives}, gold ${game.gold}, towers ${game.towers.length}`);
      }
    }
    previousPhase = game.phase;
    game.update(FIXED_DT);
  }

  const outcome = game.phase === "won" ? "WON" : game.phase === "lost" ? "LOST" : "TIMED OUT";
  console.log(`map: ${mapId}`);
  console.log(`  outcome:  ${outcome} at wave ${game.wave} of ${TOTAL_WAVES}`);
  console.log(`  lives:    ${game.lives}`);
  console.log(`  gold:     ${game.gold}`);
  console.log(`  towers:   ${game.towers.length} (${summarizeTowers(game)})`);
  console.log(`  kills:    ${game.kills}`);
  console.log(`  last log: ${game.messages.slice(-3).join(" | ")}`);
  if (!game.isOver) {
    const stuck = game.creeps.filter((c) => c.status === "alive").slice(0, 5);
    for (const c of stuck) {
      console.log(
        `  stuck: ${c.type.id} at (${c.x.toFixed(2)}, ${c.y.toFixed(2)}) pathIdx ${c.pathIdx}/${c.path.length} nextWp ${c.nextWp} stun ${c.stunTimer.toFixed(2)} slow ${c.slowTimer.toFixed(2)}`,
      );
    }
  }
  console.log("");
}

function summarizeTowers(game: Game): string {
  const counts = new Map<string, number>();
  for (const t of game.towers) counts.set(t.type.name, (counts.get(t.type.name) ?? 0) + 1);
  return [...counts].map(([name, n]) => `${name} x${n}`).join(", ") || "none";
}

const trace = process.argv.includes("--trace");
const requested = process.argv.slice(2).find((a) => !a.startsWith("--"));
const mapIds = requested ? [requested] : MAPS.map((m) => m.id);
console.log(`Towers available: ${Object.keys(TOWER_TYPES).join(", ")}\n`);
for (const id of mapIds) simulate(id, trace);
