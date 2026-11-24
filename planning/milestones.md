# Milestones

- [x] 1. Scaffold: package.json, Vite/TS/Vitest config, `scripts/*`, `.gitignore`, page renders
- [x] 2. Grid + pathfinding: BFS path, multi-waypoint route, placement blocks-path check, tests
- [x] 3. Creeps & movement: spawner, fixed-timestep loop, creeps follow path, re-path on change
- [x] 4. Towers & combat: placement UI, targeting modes, shots, armor, splash, slow/stun, kills pay gold
- [x] 5. Waves & economy: 40-wave generator, lives, interest, early call bonus, win/lose screens
- [x] 6. Upgrades & UI polish: tower panel, upgrade/sell, tooltips, range preview, hotkeys, speed control
- [x] 7. Balance & extras: `scripts/balance-sim.ts`, difficulty tuning, sound effects, best-wave score, second map
- [x] 8. Docs & release: README, design reference, production build verified

## Known gaps

- Interaction (click, hotkey, and panel flows) is covered by the Game-level tests, not by browser automation. The page has been checked for load errors and layout in headless Chrome, not played through end to end.
- The plan listed `rng.ts` and `events.ts`. Neither was needed: the game is deterministic and events are logged as messages, so they were not built.
