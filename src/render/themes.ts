/**
 * Colour themes for the page chrome and the playfield. DOM-free data: the UI applies `ui` as CSS
 * variables, and the renderer reads `field` when drawing the canvas.
 */
export interface Theme {
  id: string;
  name: string;
  /** Page and sidebar colours. Each key becomes a CSS variable named `--<key>` (camel case becomes kebab). */
  ui: {
    bg: string;
    panel: string;
    panel2: string;
    text: string;
    muted: string;
    accent: string;
    line: string;
    canvas: string;
    overlay: string;
    primary: string;
    danger: string;
    dangerBg: string;
    highlight: string;
    highlightBg: string;
  };
  field: {
    fill: string;
    gridLine: string;
    edge: string;
    route: string;
    spawnFill: string;
    spawnStroke: string;
    exitFill: string;
    exitStroke: string;
    checkpointFill: string;
    checkpointStroke: string;
    okStroke: string;
    okFill: string;
    badStroke: string;
    badFill: string;
    rangeStroke: string;
    rangeFill: string;
    shadow: string;
  };
}

/** Light grass-green look modelled on Desktop Tower Defense. This is the default. */
const GREEN: Theme = {
  id: "green",
  name: "Green",
  ui: {
    bg: "#2d4f22",
    panel: "#eef5e6",
    panel2: "#d8e8c8",
    text: "#17301a",
    muted: "#4d6a45",
    accent: "#2e7d32",
    line: "#9ab586",
    canvas: "#6fa84a",
    overlay: "rgba(111, 168, 74, 0.78)",
    primary: "#bfe6a4",
    danger: "#b42318",
    dangerBg: "#fecaca",
    highlight: "#2563eb",
    highlightBg: "#dbeafe",
  },
  field: {
    fill: "#6fa84a",
    gridLine: "rgba(25, 60, 15, 0.2)",
    edge: "#3b6b26",
    route: "rgba(70, 45, 15, 0.45)",
    spawnFill: "rgba(220, 255, 170, 0.5)",
    spawnStroke: "#2e6b1c",
    exitFill: "rgba(248, 120, 100, 0.5)",
    exitStroke: "#8b1e14",
    checkpointFill: "rgba(200, 235, 255, 0.5)",
    checkpointStroke: "#1d4f8a",
    okStroke: "rgba(21, 90, 40, 0.85)",
    okFill: "rgba(200, 255, 170, 0.25)",
    badStroke: "rgba(140, 20, 20, 0.85)",
    badFill: "rgba(255, 120, 110, 0.25)",
    rangeStroke: "rgba(17, 24, 39, 0.6)",
    rangeFill: "rgba(17, 24, 39, 0.08)",
    shadow: "rgba(15, 35, 10, 0.3)",
  },
};

/** The grey-blue look the game shipped with before themes existed. */
const LIGHT: Theme = {
  id: "light",
  name: "Light",
  ui: {
    bg: "#d9dee6",
    panel: "#f5f7fa",
    panel2: "#e4e9f0",
    text: "#1f2937",
    muted: "#5b6472",
    accent: "#15803d",
    line: "#b9c1cd",
    canvas: "#e9ecf1",
    overlay: "rgba(233, 236, 241, 0.75)",
    primary: "#bbf7d0",
    danger: "#b42318",
    dangerBg: "#fecaca",
    highlight: "#2563eb",
    highlightBg: "#dbeafe",
  },
  field: {
    fill: "#e9ecf1",
    gridLine: "rgba(60, 70, 90, 0.16)",
    edge: "#9aa3b2",
    route: "rgba(17, 24, 39, 0.28)",
    spawnFill: "rgba(63, 185, 80, 0.45)",
    spawnStroke: "#1a7f37",
    exitFill: "rgba(248, 81, 73, 0.45)",
    exitStroke: "#b42318",
    checkpointFill: "rgba(56, 139, 253, 0.3)",
    checkpointStroke: "#1d4ed8",
    okStroke: "rgba(21, 128, 61, 0.8)",
    okFill: "rgba(74, 222, 128, 0.12)",
    badStroke: "rgba(185, 28, 28, 0.8)",
    badFill: "rgba(248, 81, 73, 0.12)",
    rangeStroke: "rgba(17, 24, 39, 0.6)",
    rangeFill: "rgba(17, 24, 39, 0.06)",
    shadow: "rgba(15, 23, 42, 0.22)",
  },
};

const DARK: Theme = {
  id: "dark",
  name: "Dark",
  ui: {
    bg: "#0b0f17",
    panel: "#1f2937",
    panel2: "#2b3644",
    text: "#e5e7eb",
    muted: "#9ca3af",
    accent: "#22c55e",
    line: "#4b5563",
    canvas: "#1a2230",
    overlay: "rgba(26, 34, 48, 0.8)",
    primary: "#14532d",
    danger: "#f87171",
    dangerBg: "#7f1d1d",
    highlight: "#60a5fa",
    highlightBg: "#1e3a5f",
  },
  field: {
    fill: "#1a2230",
    gridLine: "rgba(255, 255, 255, 0.07)",
    edge: "#4b5563",
    route: "rgba(226, 232, 240, 0.3)",
    spawnFill: "rgba(74, 222, 128, 0.3)",
    spawnStroke: "#4ade80",
    exitFill: "rgba(248, 113, 113, 0.3)",
    exitStroke: "#f87171",
    checkpointFill: "rgba(96, 165, 250, 0.3)",
    checkpointStroke: "#60a5fa",
    okStroke: "rgba(74, 222, 128, 0.8)",
    okFill: "rgba(74, 222, 128, 0.15)",
    badStroke: "rgba(248, 113, 113, 0.8)",
    badFill: "rgba(248, 113, 113, 0.18)",
    rangeStroke: "rgba(226, 232, 240, 0.6)",
    rangeFill: "rgba(226, 232, 240, 0.08)",
    shadow: "rgba(0, 0, 0, 0.4)",
  },
};

const SAND: Theme = {
  id: "sand",
  name: "Sand",
  ui: {
    bg: "#b9a57a",
    panel: "#f6efdc",
    panel2: "#e9dcbc",
    text: "#3b2f1c",
    muted: "#7a6a4f",
    accent: "#a16207",
    line: "#c4b28c",
    canvas: "#ecdfbf",
    overlay: "rgba(236, 223, 191, 0.78)",
    primary: "#fde68a",
    danger: "#b42318",
    dangerBg: "#fecaca",
    highlight: "#2563eb",
    highlightBg: "#dbeafe",
  },
  field: {
    fill: "#ecdfbf",
    gridLine: "rgba(90, 70, 30, 0.16)",
    edge: "#a8956b",
    route: "rgba(59, 47, 28, 0.35)",
    spawnFill: "rgba(132, 204, 22, 0.4)",
    spawnStroke: "#4d7c0f",
    exitFill: "rgba(248, 113, 80, 0.4)",
    exitStroke: "#b42318",
    checkpointFill: "rgba(96, 165, 250, 0.35)",
    checkpointStroke: "#1d4ed8",
    okStroke: "rgba(77, 124, 15, 0.85)",
    okFill: "rgba(190, 242, 100, 0.2)",
    badStroke: "rgba(185, 28, 28, 0.85)",
    badFill: "rgba(248, 113, 113, 0.2)",
    rangeStroke: "rgba(59, 47, 28, 0.6)",
    rangeFill: "rgba(59, 47, 28, 0.08)",
    shadow: "rgba(59, 47, 28, 0.25)",
  },
};

export const THEMES: readonly Theme[] = [GREEN, LIGHT, DARK, SAND];

export const DEFAULT_THEME_ID = GREEN.id;

/** Returns the theme with this id, or the default when the id is unknown (e.g. a stale saved value). */
export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? GREEN;
}

/** CSS variable assignments for a theme's page colours, as [name, value] pairs. */
export function themeCssVars(theme: Theme): [string, string][] {
  return Object.entries(theme.ui).map(([key, value]) => [`--${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`, value]);
}
