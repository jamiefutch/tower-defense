# AGENTS.md

Guide for AI coding agents working in this repository. Read this before making changes. For game rules and balance tables see `planning/design.md`; for the original plan see `planning/PLAN.md`.

## Project overview

A browser tower defense game inspired by *Desktop Tower Defense*. Players build towers on an open grid to shape a maze, and survive 40 waves. The game is written from scratch and uses no original art, sound, or code.

## Stack

- **Language:** TypeScript 5.6+, `strict` mode, ES2022 target, ESNext modules, `Bundler` module resolution.
- **Build/dev server:** Vite 5 (`root` is `src/`, output goes to `dist/`).
- **Tests:** Vitest 2. Tests live in `tests/` and match `tests/**/*.test.ts`.
- **Simulator:** `vite-node` runs `scripts/balance-sim.ts`.
- **Rendering:** HTML5 Canvas 2D. Sidebar UI is plain DOM.
- **Audio:** synthesized with WebAudio. No sound files.
- **Runtime dependencies:** none. Do not add a UI framework, game engine, or runtime library without a clear reason. Keep the dependency list to dev tooling.
- **Node:** 20 or newer.
- **Linting/formatting:** no ESLint or Prettier is configured. Match the existing style by hand (see below).

## Commands

```bash
npm install        # install dependencies
npm run dev        # Vite dev server at http://localhost:5173
npm test           # run the Vitest suite once
npm run test:watch # Vitest in watch mode
npm run typecheck  # tsc --noEmit
npm run build      # typecheck, then vite build to dist/
npm run preview    # serve dist/
npm run sim        # headless balance simulator (e.g. `npm run sim -- meadow --trace`)
```

Wrappers exist in `scripts/`: `dev.sh`, `build.sh`, `test.sh`. They just call the npm scripts.

Before you say a change is done, run `npm run typecheck` and `npm test`. For changes to tower, creep, or wave data, also run `npm run sim`.

## Project layout

This is the required directory structure. New files must go in the directory that matches their responsibility. Do not add new top-level folders or move existing modules without updating this section and `README.md`.

```
.
├── AGENTS.md                 this file
├── README.md                 player and developer overview (must stay current)
├── package.json, package-lock.json
├── tsconfig.json             TypeScript config (strict, includes src, tests, vite.config.ts)
├── vite.config.ts            Vite config (root is src/, output to dist/, Vitest settings)
├── .gitignore
├── src/                      all game code
│   ├── index.html, main.ts, style.css   page, browser entry point, styling
│   ├── core/                 headless game state and rules
│   │   ├── config.ts         tunable constants (gold, lives, wave timing, HP growth, FIXED_DT)
│   │   ├── game.ts           the Game class: placement, waves, economy, win/lose
│   │   └── storage.ts        best-wave score in localStorage (the only localStorage access)
│   ├── grid/                 headless playfield
│   │   ├── grid.ts           grid with blocked cells and footprints
│   │   ├── pathfinding.ts    BFS shortest path and multi-waypoint routes
│   │   └── placement.ts      refuses placements that would seal the route
│   ├── entities/             headless state for things on the field
│   │   ├── creep.ts          creep state, movement, slow and stun, repathing
│   │   ├── tower.ts          tower state and footprint helpers
│   │   ├── effects.ts        short-lived visual effects (shots, splashes, leaks)
│   │   └── sound-events.ts   audio cues recorded by game logic (shot, hit, kill, spawn, leak)
│   ├── systems/              headless pure logic that acts on entities
│   │   ├── spawner.ts        turns a wave into timed spawn events
│   │   ├── targeting.ts      target selection by mode, ground/air rules
│   │   ├── combat.ts         firing, damage, armor, splash, slow, stun
│   │   └── economy.ts        interest, sell refunds, bonuses
│   ├── data/                 content as plain tables (balance lives here)
│   │   ├── towers.ts         TOWER_TYPES and upgrade levels
│   │   ├── creeps.ts         CREEP_TYPES
│   │   ├── waves.ts          wave composition, generated per wave number
│   │   └── maps.ts           MAPS: spawn, checkpoints, exit
│   ├── render/
│   │   ├── renderer.ts       canvas drawing only
│   │   └── themes.ts         colour themes for the page and playfield (DOM-free data)
│   ├── ui/
│   │   └── hud.ts            sidebar DOM: palette, stats, tower panel, log
│   └── audio/
│       └── audio.ts          synthesized sound effects (WebAudio, no files)
├── tests/                    Vitest unit tests, one <area>.test.ts per area
├── scripts/                  npm command wrappers (dev.sh, build.sh, test.sh) and balance-sim.ts
├── planning/                 PLAN.md (implementation plan), design.md (rules and tables),
│                             milestones.md (progress checklist)
├── dist/                     generated build output (git-ignored, never edit)
├── node_modules/             dependencies (git-ignored, never edit)
└── .claude/                  Claude Code project settings (settings.json is tracked if
                              present; settings.local.json is git-ignored)
```

Placement rule: anything that touches the DOM, canvas, or `window` belongs in `src/render/`, `src/ui/`, `src/audio/`, or `src/main.ts`. Everything else in `src/` must stay headless.

## Architecture rules

These are the rules the code is built on. Keep them intact.

1. **Headless core.** `src/core/`, `src/grid/`, `src/entities/`, and `src/systems/` must never touch the DOM, canvas, or `window`. They have to run in Node so tests and the simulator work. The only place `window.localStorage` is used is `src/core/storage.ts`. Rendering and UI belong in `src/render/`, `src/ui/`, `src/audio/`, and `src/main.ts`.
2. **Fixed timestep.** Game logic advances in steps of `1/60` s (`FIXED_DT` in `src/core/config.ts`). Pausing and game speed change only how fast the game plays, never the outcome. Do not use wall-clock time or frame time inside game logic.
3. **Deterministic.** No `Math.random()` in game logic today, and none should be added to core, grid, entities, or systems. Wave generation is a pure function of the wave number. If randomness is ever needed, it must be seeded and passed in.
4. **Data-driven content.** Towers, creeps, waves, and maps are tables in `src/data/`. Balance changes should be edits to those tables, not to the logic. Do not hard-code tower or creep numbers in systems.
5. **Routing.** Ground creeps follow a route through spawn, checkpoints, and exit. A placement is validated by running the same route search on a copy of the grid. Never let the maze fully seal the route. Creeps already on the field re-route when the maze changes.
6. **Flyers ignore the maze.** Air creeps fly straight between checkpoints. Towers have a `ground` or `air` targeting flag, and targeting must respect it.
7. **Pure functions where possible.** Prefer functions that take state and return new values or mutate only the state they are given. Checks such as `Game.buildError` must not change state, since the UI uses them for previews.

## Coding standards

Follow the patterns already in the codebase. When in doubt, copy the nearest existing file.

### Formatting

- **Indentation:** 2 spaces.
- **Quotes:** double quotes for strings.
- **Semicolons:** always.
- **Trailing commas:** only where the surrounding code already uses them. Do not reformat unrelated lines.
- **Line length:** keep lines readable, roughly 120 characters or fewer.
- **Imports:** use relative paths without file extensions. Use `import type` for type-only imports. Use `import * as economy from ...` when a module is a namespace of helpers.

### Naming

- `camelCase` for variables, functions, and methods.
- `PascalCase` for classes, interfaces, and type aliases.
- `UPPER_SNAKE_CASE` for module-level constants (for example `FIXED_DT`, `TOTAL_WAVES`, `MAX_MESSAGES`).
- Data ids (tower types, creep types, map ids) are lowercase strings such as `"normal"` or `"meadow"`.
- Filenames are `kebab-case` or single lowercase words, matching the existing files.

### TypeScript

- Keep `strict` passing. Do not weaken compiler options.
- `noUnusedLocals` and `noUnusedParameters` are on. Remove unused code rather than prefixing with `_`.
- Prefer `interface` for object shapes and `type` for unions and aliases, as the existing code does.
- Avoid `any`. If something truly needs an escape hatch, comment why.
- Model variants as discriminated unions (for example `TowerEffect`) and switch on the tag.

### Comments and docs

- Write doc comments (`/** ... */`) for exported functions, classes, and modules that are not obvious. Keep them to a sentence or two, stating the rule or the reason, not restating the code.
- Comments explain *why*, not *what*. Do not add comments that narrate the code.
- If a change alters a rule, update `planning/design.md` and, if the user-facing behavior changes, `README.md`.

### Tests

- Put tests in `tests/` as `<area>.test.ts`, importing from `../src/...`.
- Use `describe` and `it` from Vitest, with `expect`.
- Test behavior through the public functions. Build small fixtures with helpers in the test file (see `creepAt` and `tower` in `tests/combat.test.ts`).
- When you fix a bug or add a rule, add a test that would have caught it.
- Key areas that are already covered and should stay covered: grid bounds and footprints, BFS pathfinding, placement and route sealing, creep movement and re-routing, targeting modes and ground/air rules, combat (armor, splash, rate of fire), wave generation and spawn queue, economy formulas, and full game rules.

### Balance changes

- Change numbers in `src/data/` and `src/core/config.ts`, not in the logic.
- After any balance change, run `npm run sim` and report how far the scripted strategy gets on each map. Use `--trace` to see lives and gold before each wave when investigating.

## Adding content

- **New tower:** add an entry to `TOWER_TYPES` in `src/data/towers.ts`. Provide levels (level 0 is the build, the rest are upgrades), and set the ground or air targeting flag. It appears in the palette in key declaration order.
- **New creep:** add an entry to `CREEP_TYPES` in `src/data/creeps.ts` with HP, speed, bounty, armor, and any flags (`air`, `immune`, `boss`, `splitInto`). Then reference its id from `src/data/waves.ts`.
- **New map:** add a `MapDef` to `MAPS` in `src/data/maps.ts` with width, height, spawn, ordered checkpoints, and exit. The test suite checks that every map has an open route.

## Gameplay constants to respect

- 40 waves (`TOTAL_WAVES`). Start with 20 lives.
- Towers are 2 x 2 (`FOOTPRINT`) and block movement.
- A tower cannot be placed on top of a ground creep.
- Selling refunds 70% of the total invested in that tower.
- Calling a wave early pays half the seconds left on the countdown.
- Each tower has seven types and up to three upgrades.
- Targeting modes: `nearest`, `strongest`, `weakest`, `first`.
- Best wave is stored in `localStorage` under the key defined in `src/core/storage.ts`.

Check these against `planning/design.md` and `src/core/config.ts` before relying on them, since the numbers may have changed.

## Working conventions for agents

- **Read before editing.** Look at the file and its tests first. Check `planning/milestones.md` for the state of any feature you touch.
- **Keep changes small and scoped.** Do not refactor unrelated code while fixing something else.
- **Do not edit `dist/` or `node_modules/`.** Both are generated and git-ignored.
- **Do not commit secrets or local settings.** `.claude/settings.local.json` is local-only.
- **Keep `README.md` up to date.** It is the player and developer overview. Any change that affects how the game plays (rules, towers, creeps, waves, controls, economy), how to run or test it (commands, prerequisites), or the project structure must update `README.md` in the same change. Do not leave the README describing behavior the code no longer has. If you change the directory structure, update both the layout section of `README.md` and the one in this file.
- **Update `planning/design.md`** in the same change whenever a rule, tower, creep, or wave table changes.
- **Commit messages: no agent attribution.** Do not add `Co-Authored-By`, `Generated with`, or any other signature, footer, emoji, or line that credits or names an AI agent or tool in commit messages, PR titles or bodies, or code comments. Write the message as the user's own work.
- **Update the milestone checklist** in `planning/milestones.md` when you finish a planned item.
- **Verify in the browser** for UI or rendering changes when you can (`npm run dev`). Tests and typecheck do not catch layout or canvas problems.
- **Say what you could not verify.** If you could not run tests, the simulator, or the browser, say so in your summary.
