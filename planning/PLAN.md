# Plan: Web-based Tower Defense (Desktop Tower Defense-style)

## Context
Build a browser tower defense game modeled on Desktop Tower Defense (Flash): an open grid where towers double as walls, so players "maze" creeps along long paths. Creeps spawn from entry points and run to exit points; the player must never fully block the path. The project dir is empty except for four directories (`src/`, `planning/`, `scripts/`, `.claude/`), so the plan uses them as given. No git repo yet.

## Stack (defaults, no framework)
- TypeScript + Vite, HTML5 Canvas 2D rendering, no runtime dependencies.
- Vitest for unit tests (game logic is kept DOM-free so it is testable).
- Static build output (`dist/`) can be hosted anywhere.

## Directory usage
- `planning/` – this plan copy (`PLAN.md`), `design.md` (game rules/balance tables), `milestones.md` checklist.
- `src/` – all game code (layout below), plus `index.html`, `main.ts`, `style.css`.
- `scripts/` – `dev.sh`, `build.sh`, `test.sh` wrappers, and `balance-sim.ts` (headless wave simulation to tune balance).
- `.claude/` – project settings only; untouched except optional permission allowlist for the scripts.
- Root (new): `package.json`, `tsconfig.json`, `vite.config.ts`, `README.md`, `.gitignore`.

## src/ layout
```
src/
  index.html, main.ts, style.css
  core/        game.ts (loop, fixed timestep), state.ts, events.ts, rng.ts
  grid/        grid.ts (30x20 cells, 2x2 tower footprint), pathfinding.ts (BFS/A* multi-waypoint), placement.ts (blocks-path check)
  entities/    tower.ts, creep.ts, projectile.ts
  data/        towers.ts, creeps.ts, waves.ts, maps.ts  (pure data tables)
  systems/     spawner.ts, targeting.ts, combat.ts, economy.ts (gold, interest, lives)
  render/      renderer.ts, sprites.ts, effects.ts
  ui/          hud.ts, tower-panel.ts, tooltip.ts, input.ts, screens.ts (menu/win/lose)
  audio/       audio.ts (optional WebAudio blips)
tests/         pathfinding, placement, combat, economy, waves
```

## Core mechanics (mirroring DTD)
- **Grid & mazing**: 30x20 playfield, towers occupy 2x2 cells. Creeps recompute path on placement. Placement is rejected if it leaves no route from every spawn through checkpoints to exit (`placement.ts` runs pathfinding on a hypothetical grid). Selling a tower reopens cells.
- **Creeps**: Normal, Fast, Group, Air (ignores maze, flies straight), Spawn (splits), Armored, Immune, Boss. Per-level HP scaling and bounty from `data/creeps.ts`; 40-level wave table in `data/waves.ts`.
- **Towers**: Pellet, Squirt, Dart, Snap, Swarm (air), Frost (slow, no damage), Bash (stun). Each has 3+ upgrade tiers, range, damage, rate, cost; sell for ~70%. Targeting modes: nearest / strongest / weakest / first.
- **Economy**: start gold, bounty per kill, interest on banked gold each wave, "send next wave early" bonus. 20 lives; a creep reaching the exit costs one.
- **Win/Lose**: survive all levels / lives reach 0. Pause, 1x/2x/3x speed.

## Milestones (tracked in `planning/milestones.md`)
1. **Scaffold**: package.json, Vite/TS/Vitest config, `scripts/*`, `.gitignore`, empty canvas shows grid.
2. **Grid + pathfinding**: placement with block-detection, path overlay, tests.
3. **Creeps & movement**: spawner, fixed-timestep loop, creeps follow path and re-path on changes.
4. **Towers & combat**: placement UI, targeting, projectiles, damage/slow/stun, kills pay gold.
5. **Waves & economy**: 40-level table, lives, interest, next-wave button, win/lose screens.
6. **Upgrades & UI polish**: tower panel, upgrade/sell, tooltips, range preview, hotkeys, speed control.
7. **Balance & extras**: `balance-sim.ts`, tune tables, optional sound, localStorage high score, additional maps.
8. **Docs & release**: README, production build, deploy notes.

## README.md contents (written in milestone 1, finalized in 8)
- Title, short description, screenshot/GIF placeholder.
- How to play: goal, mazing, controls (click to place, hotkeys, speed), creep and tower reference tables.
- Quick start: prerequisites (Node 20+), `npm install`, `npm run dev`, `npm run build`, `npm test`.
- Project structure (the tree above) and the role of `planning/` and `scripts/`.
- Architecture notes: fixed timestep, data-driven tables, DOM-free core.
- How to add a tower/creep/map (edit `src/data/*`).
- Roadmap, credits/inspiration (note: original by Paul Preece; this is an independent clone, no original assets used), license.

## Critical files
`src/grid/pathfinding.ts`, `src/grid/placement.ts`, `src/core/game.ts`, `src/data/{towers,creeps,waves}.ts`, `README.md`.

## Verification
- `npm test`: pathfinding finds shortest route; placement rejects path-blocking towers; damage/slow/stun math; economy interest; wave table sanity.
- `npm run dev`, then in browser: place towers to build a maze, confirm a blocking placement is refused, creeps re-route, kills grant gold, lives drop on leaks, a full run reaches win/lose screen.
- `npm run build` then serve `dist/` and repeat a smoke test.
- `scripts/balance-sim.ts` runs a fixed tower layout headless and reports which level it dies on, to check difficulty curve.
- Review README commands by running each one verbatim.
