import { getCreepType } from "../data/creeps";
import { routeWaypoints, type MapDef } from "../data/maps";
import { TOWER_TYPES, type TargetMode } from "../data/towers";
import { buildWave } from "../data/waves";
import { advanceCreep, cellOf, createCreep, repathCreep, type Creep } from "../entities/creep";
import { ringFx, tickEffects, type Effect } from "../entities/effects";
import { MAX_SOUND_EVENTS, type SoundEvent } from "../entities/sound-events";
import { footprintCovers, towerCovers, type Tower } from "../entities/tower";
import { Grid, type Cell } from "../grid/grid";
import { findRoute } from "../grid/pathfinding";
import { canPlaceTower } from "../grid/placement";
import { stepTowers } from "../systems/combat";
import * as economy from "../systems/economy";
import { buildSpawnQueue, Spawner } from "../systems/spawner";
import { AUTO_WAVE_DELAY, FOOTPRINT, START_GOLD, START_LIVES, TOTAL_WAVES } from "./config";

export type Phase = "build" | "wave" | "won" | "lost";

const MAX_MESSAGES = 60;

/**
 * Headless game state and rules. No DOM access, so it can run in tests and in the balance simulator.
 * The UI calls the public methods and calls `update(dt)` once per fixed step.
 */
export class Game {
  readonly map: MapDef;
  readonly grid: Grid;
  /** Spawn, checkpoints, exit. */
  readonly waypoints: readonly Cell[];
  /** Current ground route from spawn to exit. Recomputed whenever the maze changes. */
  route: readonly Cell[];

  towers: Tower[] = [];
  creeps: Creep[] = [];
  effects: Effect[] = [];
  /** Audio cues since the last `drainSoundEvents()`. The UI drains them once per frame. */
  soundEvents: SoundEvent[] = [];
  /** Most recent log lines, capped at MAX_MESSAGES. */
  messages: string[] = [];
  /** Total log lines ever written. Lets the UI find lines it has not seen yet. */
  messageCount = 0;

  gold = START_GOLD;
  lives = START_LIVES;
  /** Number of the most recently started wave. 0 before the first. */
  wave = 0;
  phase: Phase = "build";
  /** Seconds until the next wave starts on its own. Only counts down in the build phase. */
  countdown = AUTO_WAVE_DELAY;
  kills = 0;
  /** Simulation speed multiplier for the UI loop. The game itself always advances by `update(dt)`. */
  speed = 1;
  paused = false;

  private nextId = 1;
  private spawner: Spawner | null = null;

  constructor(map: MapDef) {
    this.map = map;
    this.grid = new Grid(map.width, map.height);
    this.waypoints = routeWaypoints(map);
    const route = findRoute(this.grid, this.waypoints);
    if (!route) throw new Error(`map "${map.id}" has no route from spawn to exit`);
    this.route = route;
  }

  get isOver(): boolean {
    return this.phase === "won" || this.phase === "lost";
  }

  get creepsAlive(): number {
    let n = 0;
    for (const c of this.creeps) if (c.status === "alive") n += 1;
    return n;
  }

  towerAt(cellX: number, cellY: number): Tower | undefined {
    return this.towers.find((t) => towerCovers(t, cellX, cellY));
  }

  /** Gold needed to upgrade this tower one level, or null if it is already at max. */
  upgradeCost(t: Tower): number | null {
    const next = t.type.levels[t.level + 1];
    return next ? next.cost : null;
  }

  /**
   * Why a tower cannot be built at (x, y), or null if it can. Top-left origin.
   * Pure: does not change any state, so the UI can use it to draw placement previews.
   */
  buildError(typeId: string, x: number, y: number): string | null {
    if (this.isOver) return "The game is over";
    const type = TOWER_TYPES[typeId];
    if (!type) return "Unknown tower";
    if (x < 0 || y < 0 || x + FOOTPRINT > this.grid.width || y + FOOTPRINT > this.grid.height) {
      return "Out of bounds";
    }
    if (this.gold < type.levels[0].cost) return "Not enough gold";
    for (let dy = 0; dy < FOOTPRINT; dy++) {
      for (let dx = 0; dx < FOOTPRINT; dx++) {
        if (this.grid.isBlocked(x + dx, y + dy)) return "Space is occupied";
      }
    }
    for (const c of this.creeps) {
      // Flying creeps are above the maze, so they never block placement.
      if (c.status !== "alive" || c.type.air) continue;
      const cell = cellOf(c);
      if (footprintCovers(x, y, cell.x, cell.y)) return "A creep is in the way";
    }
    if (!canPlaceTower(this.grid, { x, y, w: FOOTPRINT, h: FOOTPRINT }, this.waypoints)) {
      return "That would block the route";
    }
    return null;
  }

  /** Builds a tower with its top-left at (x, y). Returns false and logs the reason on failure. */
  build(typeId: string, x: number, y: number): boolean {
    const err = this.buildError(typeId, x, y);
    if (err) {
      this.note(err);
      return false;
    }
    const type = TOWER_TYPES[typeId];
    const cost = type.levels[0].cost;
    this.gold -= cost;
    this.grid.setFootprint(x, y, FOOTPRINT, FOOTPRINT, true);
    this.towers.push({
      id: this.nextId++,
      type,
      x,
      y,
      level: 0,
      invested: cost,
      cooldown: 0,
      shots: 0,
      mode: "nearest",
      aim: 0,
    });
    this.note(`Built ${type.name}`);
    this.repathAll();
    return true;
  }

  upgrade(t: Tower): boolean {
    const cost = this.upgradeCost(t);
    if (cost === null) {
      this.note(`${t.type.name} is already at max level`);
      return false;
    }
    if (this.gold < cost) {
      this.note("Not enough gold to upgrade");
      return false;
    }
    this.gold -= cost;
    t.level += 1;
    t.invested += cost;
    this.note(`${t.type.name} upgraded to level ${t.level + 1}`);
    return true;
  }

  /** Removes a tower, refunds part of its cost, and reopens its cells. */
  sell(t: Tower): boolean {
    const refund = economy.sellRefund(t.invested);
    this.gold += refund;
    this.grid.setFootprint(t.x, t.y, FOOTPRINT, FOOTPRINT, false);
    this.towers = this.towers.filter((o) => o !== t);
    this.note(`Sold ${t.type.name} for ${refund}`);
    this.repathAll();
    return true;
  }

  setMode(t: Tower, mode: TargetMode): void {
    t.mode = mode;
  }

  /** Starts the next wave now. Returns false unless the game is between waves. */
  sendNextWave(): boolean {
    if (this.phase !== "build") return false;
    const bonus = economy.earlyCallBonus(this.countdown);
    this.gold += bonus;
    if (bonus > 0) this.note(`Early call bonus +${bonus}`);
    this.startWave();
    return true;
  }

  /** Returns the audio cues recorded since the last call and clears them. */
  drainSoundEvents(): SoundEvent[] {
    const out = this.soundEvents;
    this.soundEvents = [];
    return out;
  }

  /** Advances the simulation by `dt` seconds. Callers pass fixed steps. */
  update(dt: number): void {
    if (this.paused) return;
    tickEffects(this.effects, dt);
    if (this.soundEvents.length > MAX_SOUND_EVENTS) {
      this.soundEvents.splice(0, this.soundEvents.length - MAX_SOUND_EVENTS);
    }
    if (this.isOver) return;

    if (this.phase === "build") {
      this.countdown -= dt;
      if (this.countdown <= 0) this.startWave();
    } else {
      this.updateWave(dt);
    }
  }

  private startWave(): void {
    this.wave += 1;
    this.spawner = new Spawner(buildSpawnQueue(buildWave(this.wave)));
    this.phase = "wave";
    this.note(`Wave ${this.wave} incoming`);
  }

  private updateWave(dt: number): void {
    if (this.spawner) {
      for (const ev of this.spawner.update(dt)) this.spawnCreep(ev.type);
    }

    for (const c of this.creeps) {
      if (c.status !== "alive") continue;
      if (advanceCreep(c, dt, this.waypoints)) this.leak(c);
    }

    const killed = stepTowers(this.towers, this.creeps, dt, this.effects, this.soundEvents);
    for (const c of killed) this.onKill(c);

    this.creeps = this.creeps.filter((c) => c.status === "alive");

    if (this.lives <= 0) {
      this.lives = 0;
      this.phase = "lost";
      this.note("Out of lives. Game over.");
      return;
    }

    if (this.spawner?.done && this.creeps.length === 0) this.finishWave();
  }

  private finishWave(): void {
    const interest = economy.interestOn(this.gold);
    const bonus = economy.waveClearBonus(this.wave);
    this.gold += interest + bonus;
    this.note(`Wave ${this.wave} cleared: +${bonus} bonus, +${interest} interest`);
    this.spawner = null;

    if (this.wave >= TOTAL_WAVES) {
      this.phase = "won";
      this.note("You survived every wave!");
    } else {
      this.phase = "build";
      this.countdown = AUTO_WAVE_DELAY;
    }
  }

  private spawnCreep(typeId: string): void {
    const type = getCreepType(typeId);
    const { spawn } = this.map;
    // Flyers ignore the maze but still pass the same checkpoints, in straight segments
    // between them, so towers placed along the lane can hit them. Ground creeps follow the maze.
    const path = type.air ? this.waypoints : this.route;
    this.creeps.push(createCreep(this.nextId++, type, this.wave, spawn.x + 0.5, spawn.y + 0.5, path, 1, 1));
    this.soundEvents.push({ kind: "spawn", id: type.id });
  }

  private leak(c: Creep): void {
    c.status = "leaked";
    this.lives -= 1;
    this.effects.push(ringFx(this.map.exit.x + 0.5, this.map.exit.y + 0.5, 0.8, "#f85149", 0.4));
    this.soundEvents.push({ kind: "leak", id: c.type.id });
    this.note(`${c.type.name} escaped (-1 life)`);
  }

  private onKill(c: Creep): void {
    this.gold += c.type.bounty;
    this.kills += 1;
    this.effects.push(ringFx(c.x, c.y, 0.5, c.type.color, 0.3));
    this.soundEvents.push({ kind: "kill", id: c.type.id });

    if (c.type.splitInto) {
      const childType = getCreepType(c.type.splitInto.type);
      for (let i = 0; i < c.type.splitInto.count; i++) {
        const child = createCreep(this.nextId++, childType, this.wave, c.x, c.y, c.path, c.pathIdx, c.nextWp);
        child.traveled = c.traveled;
        this.creeps.push(child);
      }
    }
  }

  /** Recomputes the shared route and every living ground creep's path after the maze changes. */
  private repathAll(): void {
    const route = findRoute(this.grid, this.waypoints);
    if (route) this.route = route;
    for (const c of this.creeps) {
      if (c.status === "alive" && !c.type.air) repathCreep(c, this.grid, this.waypoints);
    }
  }

  private note(msg: string): void {
    this.messages.push(msg);
    this.messageCount += 1;
    if (this.messages.length > MAX_MESSAGES) this.messages.shift();
  }
}
