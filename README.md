# Tower Defense

A browser tower defense game inspired by *Desktop Tower Defense*. Build towers on an open grid to shape a maze, make creeps walk the long way round, and stop them before they reach the exit. Survive 40 waves.

<!-- TODO: add a screenshot or GIF of a mid-game maze -->

## How to play

- **Goal:** survive all 40 waves. You start with 20 lives. Each creep that reaches the exit costs one. Lose them all and the game is over.
- **Mazing:** towers are 2 x 2 and block movement. Creeps take the shortest open route, so you can build long detours.
- **You can't wall them off:** a placement that would cut every route from the spawn to the exit is refused. Ground creeps always have a path.
- **Creeps can't be placed on:** a tower can't go on top of a ground creep, so wait for it to pass.
- **Economy:** kills pay gold. Clearing a wave pays a bonus plus interest on the gold you're holding. Calling a wave early pays half the seconds left on the countdown.
- **Towers:** seven types (Pellet, Squirt, Dart, Snap, Swarm, Frost, Bash). Each upgrades three times. Selling refunds 70% of everything you've spent on it.
- **Targeting:** each tower can prefer the nearest, strongest, weakest, or furthest-along creep.

The full tower, creep, and wave tables are in [`planning/design.md`](planning/design.md).

### Controls

| Input | Action |
|---|---|
| `1`–`7` | Pick a tower to place (or click it again to put it down) |
| Click the map | Place the selected tower, or select a built tower |
| Click a built tower | Inspect it: upgrade, change targeting, or sell |
| `Space` | Send the next wave now |
| `P` | Pause or resume |
| `R` | Show or hide the route |
| `Esc` or right-click | Cancel the current selection |
| Speed buttons | Run the game at 1x, 2x, or 3x |
| Sound button | Mute or unmute sound effects. Each tower type has its own shot sound. Creeps make a sound when they spawn, when they are hit or killed, and when they escape |

Your best wave is saved in the browser's local storage.

## Quick start

**Prerequisites:** Node.js 20 or newer.

```bash
npm install        # install dependencies
npm run dev        # start the dev server at http://localhost:5173
npm test           # run the unit tests once
npm run build      # typecheck and build to dist/
npm run preview    # serve dist/ locally
npm run sim        # run the headless balance simulator
```

Wrappers for the same commands are in `scripts/`: `dev.sh`, `build.sh`, and `test.sh`.

## Project structure

```
src/
  index.html, main.ts, style.css  page, entry point, styling
  core/
    config.ts        tunable constants: gold, lives, wave timing, HP growth
    game.ts          the game: placement rules, waves, economy, win/lose
    storage.ts       best-wave score in localStorage
  grid/
    grid.ts          playfield with blocked cells
    pathfinding.ts   BFS shortest path and multi-waypoint routes
    placement.ts     refuses placements that would block the route
  entities/
    creep.ts         creep state, movement, slow and stun, repathing
    tower.ts         tower state and footprint helpers
    effects.ts       short visual effects (shots, splashes, leaks)
    sound-events.ts  audio cues (shot, hit, kill, spawn, leak) recorded for the sound layer
  systems/
    spawner.ts       turns a wave into timed spawn events
    targeting.ts     target selection by mode, and ground/air rules
    combat.ts        firing, damage, armor, splash, slow, stun
    economy.ts       interest, sell refunds, bonuses
  data/
    towers.ts        tower types and upgrade levels
    creeps.ts        creep types
    waves.ts         wave composition, generated per wave number
    maps.ts          map layouts: spawn, checkpoints, exit
  render/
    renderer.ts      canvas drawing
  ui/
    hud.ts           sidebar: palette, stats, tower panel, log
  audio/
    audio.ts         synthesized sound effects and per-tower/creep recipes (WebAudio, no files)
tests/               unit tests (Vitest)
scripts/
  dev.sh, build.sh, test.sh   wrappers around npm commands
  balance-sim.ts              headless simulator for tuning difficulty
planning/
  PLAN.md             the implementation plan
  milestones.md       progress checklist
  design.md           rules, tower/creep/wave tables, balance notes
.claude/              Claude Code project settings
```

## Architecture

- **Headless core.** `src/core/`, `src/grid/`, `src/entities/`, and `src/systems/` never touch the DOM or canvas. Everything in them can run in Node, which is how the tests and the simulator work.
- **Fixed timestep.** The game advances in steps of 1/60 s. The UI loop runs as many steps as the frame time and game speed call for. Pausing and speed never change the outcome, only how fast it plays out.
- **Data-driven content.** Towers, creeps, waves, and maps are plain tables in `src/data/`. Balance changes usually mean editing those tables, not the logic.
- **Routing.** Ground creeps follow a route through spawn, checkpoints, and exit. A placement is checked by running the same route search on a copy of the grid. Creeps already on the field re-route when the maze changes.
- **Flyers.** Air creeps ignore the maze. They fly in straight lines between the same checkpoints, so towers along the lane can hit them.

## Adding content

- **New tower:** add an entry to `TOWER_TYPES` in `src/data/towers.ts`. Give it a list of levels (level 0 is the build, the rest are upgrades) and set whether it targets ground or air. It appears in the palette automatically, in the order the keys are declared.
- **New creep:** add an entry to `CREEP_TYPES` in `src/data/creeps.ts`. Set HP, speed, bounty, armor, and any flags (`air`, `immune`, `boss`, `splitInto`). Then reference its id from `src/data/waves.ts`.
- **New map:** add a `MapDef` to `MAPS` in `src/data/maps.ts`: width, height, spawn, ordered checkpoints, and exit. The test suite checks that every map has an open route.
- **Difficulty:** run `npm run sim` after any change. It reports how far a scripted strategy gets on each map. Use `npm run sim -- meadow --trace` to see lives and gold before each wave.

## Testing

Unit tests live in `tests/` and run with Vitest:

```bash
npm test
```

They cover grid bounds and footprints; BFS pathfinding; multi-waypoint routes; placement rules (mazing allowed, route sealing refused, waypoints and occupied cells refused); creep movement, slow, stun, and re-routing; targeting modes and ground/air rules; armor, splash, and rate of fire; frost and bash effects; the wave generator and spawn queue; economy formulas; and full game rules (building, selling, upgrading, early calls, leaks, losing, and clearing a wave).

## Credits

Inspired by *Desktop Tower Defense*, originally created by Paul Preece. This is an independent clone written from scratch. It uses no original art, sound, or code.

## License

No license has been chosen yet.
