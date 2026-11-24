import { AUTO_WAVE_DELAY, TOTAL_WAVES } from "../core/config";
import type { Game } from "../core/game";
import { TARGET_LABELS, TARGET_MODES, TOWER_ORDER, TOWER_TYPES, type TargetMode, type TowerType } from "../data/towers";
import { towerLevel, type Tower } from "../entities/tower";
import { earlyCallBonus, sellRefund } from "../systems/economy";

type Child = Node | string;

/** Small helper for building DOM without innerHTML (no string injection). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { cls?: string; text?: string; title?: string; onClick?: () => void; disabled?: boolean } = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.cls) node.className = props.cls;
  if (props.text !== undefined) node.textContent = props.text;
  if (props.title) node.title = props.title;
  if (props.disabled) (node as HTMLButtonElement).disabled = true;
  if (props.onClick) node.addEventListener("click", props.onClick);
  node.append(...children);
  return node;
}

export function towerTooltip(t: TowerType): string {
  const lvl = t.levels[0];
  const targets = [t.groundTarget ? "ground" : "", t.airTarget ? "air" : ""].filter(Boolean).join(" + ");
  return `${t.description}\nTargets: ${targets}\nDamage ${lvl.damage} · Range ${lvl.range} · ${lvl.rate}/s`;
}

export interface Palette {
  setSelected(id: string | null): void;
}

export function buildPalette(root: HTMLElement, onPick: (id: string) => void): Palette {
  const buttons = new Map<string, HTMLButtonElement>();
  TOWER_ORDER.forEach((id, i) => {
    const t = TOWER_TYPES[id];
    const swatch = el("span", { cls: "swatch" });
    swatch.style.background = t.color;
    const btn = el(
      "button",
      { cls: "tower-btn", title: towerTooltip(t), onClick: () => onPick(id) },
      [swatch, el("span", { cls: "tower-name", text: `${i + 1}. ${t.name}` }), el("span", { cls: "cost", text: `${t.levels[0].cost}g` })],
    );
    buttons.set(id, btn);
    root.append(btn);
  });
  return {
    setSelected(id) {
      for (const [key, btn] of buttons) btn.classList.toggle("active", key === id);
    },
  };
}

export interface StatElements {
  gold: HTMLElement;
  lives: HTMLElement;
  wave: HTMLElement;
  total: HTMLElement;
  phase: HTMLElement;
  nextWave: HTMLButtonElement;
}

export function renderStats(els: StatElements, game: Game): void {
  els.gold.textContent = String(game.gold);
  els.lives.textContent = String(game.lives);
  els.wave.textContent = String(game.wave);
  els.total.textContent = String(TOTAL_WAVES);

  if (game.phase === "build") {
    els.phase.textContent = `Next wave in ${Math.ceil(game.countdown)}s`;
    els.nextWave.disabled = false;
    const bonus = earlyCallBonus(game.countdown);
    els.nextWave.textContent = `Send wave ${game.wave + 1} (Space)${bonus > 0 ? ` +${bonus}g` : ""}`;
  } else if (game.phase === "wave") {
    els.phase.textContent = `${game.creepsAlive} creeps on the field`;
    els.nextWave.disabled = true;
    els.nextWave.textContent = `Wave ${game.wave} in progress`;
  } else {
    els.phase.textContent = game.phase === "won" ? "Victory" : "Defeated";
    els.nextWave.disabled = true;
    els.nextWave.textContent = "Game over";
  }
}

export function renderLog(list: HTMLElement, messages: readonly string[]): void {
  list.replaceChildren(...messages.slice(-8).reverse().map((m) => el("li", { text: m })));
}

export interface TowerPanelActions {
  upgrade(t: Tower): void;
  sell(t: Tower): void;
  setMode(t: Tower, mode: TargetMode): void;
}

export function renderTowerPanel(panel: HTMLElement, game: Game, t: Tower | null, actions: TowerPanelActions): void {
  if (!t) {
    panel.replaceChildren(el("p", { cls: "muted", text: "Click a tower to inspect it." }));
    return;
  }

  const lvl = towerLevel(t);
  const upgradeCost = game.upgradeCost(t);
  const refund = sellRefund(t.invested);

  const stats = [`Damage ${lvl.damage}`, `Range ${lvl.range}`, `${lvl.rate}/s`];
  if (lvl.splash) stats.push(`Splash ${lvl.splash}`);
  if (lvl.effectValue !== undefined) stats.push(`${t.type.effect?.kind === "slow" ? "Slow" : "Stun"} ${lvl.effectValue}s`);

  const modeButtons = TARGET_MODES.map((mode) =>
    el("button", {
      cls: `mode-btn${t.mode === mode ? " active" : ""}`,
      text: TARGET_LABELS[mode],
      onClick: () => actions.setMode(t, mode),
    }),
  );

  panel.replaceChildren(
    el("h3", { text: t.type.name }),
    el("p", { cls: "muted", text: `Level ${t.level + 1} of ${t.type.levels.length} · invested ${t.invested}g` }),
    el("p", { text: stats.join(" · ") }),
    el("p", { cls: "muted", text: "Targeting" }),
    el("div", { cls: "row" }, modeButtons),
    el("div", { cls: "row" }, [
      el(
        "button",
        {
          cls: "primary",
          text: upgradeCost === null ? "Max level" : `Upgrade (${upgradeCost}g)`,
          disabled: upgradeCost === null,
          onClick: () => actions.upgrade(t),
        },
        [],
      ),
      el("button", { cls: "danger", text: `Sell (+${refund}g)`, onClick: () => actions.sell(t) }),
    ]),
  );
}

/** Shown beside the palette so new players can see the rules at a glance. */
export const HELP_TEXT = `Keys: 1-7 pick a tower · Esc cancel · Space send wave · P pause · R route · right-click cancel. Wave timer: ${AUTO_WAVE_DELAY}s.`;
