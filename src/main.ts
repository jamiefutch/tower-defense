import { Sound, type Sfx } from "./audio/audio";
import { CELL_PX, FIXED_DT, TOTAL_WAVES } from "./core/config";
import { Game } from "./core/game";
import { loadThemeId, saveBestWave, saveThemeId } from "./core/storage";
import { MAPS, getMap } from "./data/maps";
import { TOWER_ORDER, getTowerType, type TargetMode } from "./data/towers";
import type { SoundEvent } from "./entities/sound-events";
import type { Tower } from "./entities/tower";
import type { Cell } from "./grid/grid";
import { footprintOrigin, render, type ViewState } from "./render/renderer";
import { getTheme, THEMES, themeCssVars, type Theme } from "./render/themes";
import { buildPalette, el, HELP_TEXT, renderLog, renderStats, renderTowerPanel, type TowerPanelActions } from "./ui/hud";

/** Upper bound on fixed steps per frame, so a slow tab cannot freeze the page. */
const MAX_STEPS_PER_FRAME = 240;
/** How often the sidebar text refreshes, in seconds. */
const HUD_INTERVAL = 0.1;
/** Page chrome around the board: #app padding on each side, and the gap before the sidebar. */
const PAGE_PAD = 16;
const PAGE_GAP = 16;
/** Limits on the board scale. Below the minimum the page scrolls rather than shrinking further. */
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

function must<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id} in index.html`);
  return node as T;
}

const canvas = must<HTMLCanvasElement>("game");
const canvasCtx = canvas.getContext("2d");
if (!canvasCtx) throw new Error("2D canvas context unavailable");
const ctx: CanvasRenderingContext2D = canvasCtx;

const overlay = must<HTMLDivElement>("overlay");
const overlayTitle = must<HTMLElement>("overlay-title");
const overlayBody = must<HTMLElement>("overlay-body");
const overlayBtn = must<HTMLButtonElement>("overlay-btn");
const pauseBtn = must<HTMLButtonElement>("pause");
const nextBtn = must<HTMLButtonElement>("next-wave");
const panel = must<HTMLElement>("tower-panel");
const logList = must<HTMLElement>("log");
const mapSelect = must<HTMLSelectElement>("map-select");
const themeSelect = must<HTMLSelectElement>("theme-select");
const sidebar = must<HTMLElement>("sidebar");
const speedBtns = Array.from(document.querySelectorAll<HTMLButtonElement>(".speed"));
const statEls = {
  gold: must<HTMLElement>("gold"),
  lives: must<HTMLElement>("lives"),
  wave: must<HTMLElement>("wave"),
  total: must<HTMLElement>("total"),
  phase: must<HTMLElement>("phase"),
  nextWave: nextBtn,
};

const palette = buildPalette(must("palette"), (id) => togglePick(id));
must<HTMLElement>("help").textContent = HELP_TEXT;
for (const m of MAPS) mapSelect.append(new Option(m.name, m.id));
for (const t of THEMES) themeSelect.append(new Option(t.name, t.id));
themeSelect.addEventListener("change", () => applyTheme(getTheme(themeSelect.value)));

let game = new Game(MAPS[0]);
let view: ViewState = { hover: null, ghost: null, selected: null, showRoute: false, scale: 1, theme: getTheme(null) };
let panelKey = "";
let endShown = false;
let seenMessages = 0;

const sound = new Sound();
const muteBtn = must<HTMLButtonElement>("mute");
muteBtn.addEventListener("click", () => {
  sound.setMuted(!sound.isMuted);
  muteBtn.textContent = sound.isMuted ? "Sound off" : "Sound on";
});

/** Maps a log line to the sound it should make, if any. */
function sfxFor(msg: string): Sfx | null {
  if (msg.startsWith("Built")) return "build";
  if (msg.startsWith("Sold")) return "sell";
  if (msg.includes("incoming")) return "wave";
  if (msg.startsWith("You survived")) return "win";
  if (msg.startsWith("Out of lives")) return "lose";
  return null;
}

/** Plays one sound per distinct kind for log lines written since the last call. */
function playNewLogSounds(): void {
  const fresh = game.messageCount - seenMessages;
  seenMessages = game.messageCount;
  if (fresh <= 0) return;
  const kinds = new Set<Sfx>();
  for (const m of game.messages.slice(-fresh)) {
    const s = sfxFor(m);
    if (s) kinds.add(s);
  }
  for (const s of kinds) sound.play(s);
}

/**
 * Plays the cues the game recorded since the last frame. Identical cues are merged into one
 * sound so that a crowd of towers firing together does not stack into noise.
 */
function playNewSoundEvents(): void {
  const merged = new Map<string, { ev: SoundEvent; count: number }>();
  for (const ev of game.drainSoundEvents()) {
    // Hits are the most frequent cue and are inaudible at high speed, so skip them there.
    if (ev.kind === "hit" && game.speed > 1) continue;
    const key = `${ev.kind}:${ev.id}:${ev.splash ? "splash" : ""}`;
    const slot = merged.get(key);
    if (slot) slot.count += 1;
    else merged.set(key, { ev, count: 1 });
  }
  for (const { ev, count } of merged.values()) sound.cue(ev, count);
}

function cellFromEvent(e: MouseEvent): Cell {
  const cell = CELL_PX * view.scale;
  return { x: Math.floor(e.offsetX / cell), y: Math.floor(e.offsetY / cell) };
}

/** Largest board scale that fits the current window beside the sidebar, clamped to the allowed range. */
function fitScale(): number {
  const boardW = game.grid.width * CELL_PX;
  const boardH = game.grid.height * CELL_PX;
  const availW = window.innerWidth - sidebar.offsetWidth - 2 * PAGE_PAD - PAGE_GAP;
  const availH = window.innerHeight - 2 * PAGE_PAD;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(availW / boardW, availH / boardH)));
}

/** Re-fits the board to the window. The sidebar is set to the board's height so the two columns line up. */
function updateLayout(): void {
  view.scale = fitScale();
  const boardH = game.grid.height * CELL_PX * view.scale;
  document.documentElement.style.setProperty("--board-height", `${boardH}px`);
}

/** Applies a colour theme to the page chrome, remembers it, and gives the renderer the new palette. */
function applyTheme(t: Theme): void {
  for (const [name, value] of themeCssVars(t)) document.documentElement.style.setProperty(name, value);
  view.theme = t;
  themeSelect.value = t.id;
  saveThemeId(t.id);
}

function showOverlay(title: string, paragraphs: string[], label: string, onClick: () => void): void {
  overlayTitle.textContent = title;
  overlayBody.replaceChildren(...paragraphs.map((text) => el("p", { text })));
  overlayBtn.textContent = label;
  overlayBtn.onclick = onClick;
  overlay.hidden = false;
}

function hideOverlay(): void {
  overlay.hidden = true;
}

function newGame(mapId: string, intro: boolean): void {
  game = new Game(getMap(mapId));
  view = { ...view, hover: null, ghost: null, selected: null };
  updateLayout();
  endShown = false;
  seenMessages = 0;
  mapSelect.value = mapId;
  palette.setSelected(null);
  pauseBtn.textContent = "Pause";
  refreshSpeed();
  refreshPanel();

  if (intro) {
    game.paused = true;
    showOverlay(
      "Tower Defense",
      [
        "Creeps walk from the green S to the red E. Each one that escapes costs a life.",
        "Build towers to shape a maze, but you can never fully block the route.",
        "Pick a tower on the left and click the map. Click a built tower to upgrade, target, or sell it.",
        "Send waves early with Space or the button for a bonus.",
      ],
      "Play",
      () => {
        hideOverlay();
        game.paused = false;
      },
    );
  } else {
    game.paused = false;
    hideOverlay();
  }
}

function togglePick(id: string): void {
  if (view.ghost?.id === id) {
    view.ghost = null;
    palette.setSelected(null);
  } else {
    view.ghost = getTowerType(id);
    view.selected = null;
    palette.setSelected(id);
  }
  refreshPanel();
}

function clearSelection(): void {
  view.ghost = null;
  view.selected = null;
  palette.setSelected(null);
  refreshPanel();
}

function refreshPanel(): void {
  if (view.selected && !game.towers.includes(view.selected)) view.selected = null;
  renderTowerPanel(panel, game, view.selected, panelActions);
}

const panelActions: TowerPanelActions = {
  upgrade(t: Tower) {
    game.upgrade(t);
    refreshPanel();
  },
  sell(t: Tower) {
    game.sell(t);
    view.selected = null;
    refreshPanel();
  },
  setMode(t: Tower, mode: TargetMode) {
    game.setMode(t, mode);
    refreshPanel();
  },
};

function refreshSpeed(): void {
  for (const btn of speedBtns) btn.classList.toggle("active", Number(btn.dataset.speed) === game.speed);
}

function togglePause(): void {
  if (game.isOver) return;
  game.paused = !game.paused;
  pauseBtn.textContent = game.paused ? "Resume" : "Pause";
}

function showEndScreen(): void {
  endShown = true;
  const best = saveBestWave(game.wave);
  const won = game.phase === "won";
  showOverlay(
    won ? "Victory!" : "Defeated",
    [
      `You reached wave ${game.wave} of ${TOTAL_WAVES} with ${game.kills} kills.`,
      `Best wave on this browser: ${best}.`,
    ],
    "Play again",
    () => newGame(game.map.id, false),
  );
}

// Canvas input: hover previews placement, click places or selects.
canvas.addEventListener("pointermove", (e) => {
  view.hover = cellFromEvent(e);
});
canvas.addEventListener("pointerleave", () => {
  view.hover = null;
});
canvas.addEventListener("click", (e) => {
  if (!overlay.hidden) return;
  const cell = cellFromEvent(e);

  if (view.ghost) {
    const origin = footprintOrigin(cell);
    if (game.build(view.ghost.id, origin.x, origin.y)) {
      refreshPanel();
      return;
    }
  }

  const tower = game.towerAt(cell.x, cell.y);
  if (tower) {
    view.selected = tower;
    view.ghost = null;
    palette.setSelected(null);
  } else if (!view.ghost) {
    view.selected = null;
  }
  refreshPanel();
});
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  clearSelection();
});

// Keyboard shortcuts.
window.addEventListener("keydown", (e) => {
  if (!overlay.hidden) return;
  if (e.target instanceof HTMLSelectElement) return;

  const n = Number(e.key);
  if (Number.isInteger(n) && n >= 1 && n <= TOWER_ORDER.length) {
    togglePick(TOWER_ORDER[n - 1]);
    return;
  }
  switch (e.key) {
    case " ":
      e.preventDefault();
      game.sendNextWave();
      break;
    case "p":
    case "P":
      togglePause();
      break;
    case "r":
    case "R":
      view.showRoute = !view.showRoute;
      break;
    case "Escape":
      clearSelection();
      break;
  }
});

// Sidebar controls.
nextBtn.addEventListener("click", () => game.sendNextWave());
pauseBtn.addEventListener("click", togglePause);
must<HTMLButtonElement>("restart").addEventListener("click", () => newGame(mapSelect.value, false));
mapSelect.addEventListener("change", () => newGame(mapSelect.value, false));
for (const btn of speedBtns) {
  btn.addEventListener("click", () => {
    game.speed = Number(btn.dataset.speed);
    refreshSpeed();
  });
}

function refreshHud(): void {
  renderStats(statEls, game);
  renderLog(logList, game.messages);
  // The upgrade button only changes when the tower levels up or the player can afford the upgrade.
  // Rebuilding the panel on those changes alone keeps a click from being lost to a re-render mid-press.
  const t = view.selected;
  const cost = t ? game.upgradeCost(t) : null;
  const key = t ? `${t.id}:${t.level}:${cost === null || game.gold >= cost}` : "";
  if (key !== panelKey) {
    panelKey = key;
    refreshPanel();
  }
}

// Fixed-timestep loop: the simulation always advances in FIXED_DT steps, scaled by game speed.
let last = performance.now();
let acc = 0;
let hudTimer = 0;

function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;

  if (!game.paused && !game.isOver) {
    acc += dt * game.speed;
    let steps = 0;
    while (acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      game.update(FIXED_DT);
      acc -= FIXED_DT;
      steps += 1;
    }
    if (steps >= MAX_STEPS_PER_FRAME) acc = 0;
  } else {
    acc = 0;
  }

  if (game.isOver && !endShown) showEndScreen();
  playNewLogSounds();
  playNewSoundEvents();

  render(ctx, game, view);

  hudTimer += dt;
  if (hudTimer >= HUD_INTERVAL) {
    hudTimer = 0;
    refreshHud();
  }
  requestAnimationFrame(frame);
}

applyTheme(getTheme(loadThemeId()));
window.addEventListener("resize", updateLayout);
newGame(MAPS[0].id, true);
refreshHud();
requestAnimationFrame(frame);
