import { describe, expect, it } from "vitest";
import { getTheme, THEMES, themeCssVars } from "../src/render/themes";

describe("themes", () => {
  it("defaults to the green theme when the id is missing or unknown", () => {
    expect(getTheme(null).id).toBe("green");
    expect(getTheme(undefined).id).toBe("green");
    expect(getTheme("no-such-theme").id).toBe("green");
  });

  it("returns the theme for a known id", () => {
    expect(getTheme("dark").id).toBe("dark");
  });

  it("has unique ids and names", () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(new Set(THEMES.map((t) => t.name)).size).toBe(THEMES.length);
  });

  it("gives every theme a non-empty value for every colour", () => {
    for (const t of THEMES) {
      for (const [key, value] of Object.entries({ ...t.ui, ...t.field })) {
        expect(value, `${t.id}.${key}`).toMatch(/^(#[0-9a-fA-F]{6}|rgba?\(.+\))$/);
      }
    }
  });

  it("maps every ui colour to a CSS variable the stylesheet uses", () => {
    const names = themeCssVars(getTheme("green")).map(([name]) => name);
    expect(names).toContain("--panel2");
    expect(names).toContain("--danger-bg");
    expect(names).toContain("--highlight-bg");
    expect(names.every((n) => n === n.toLowerCase())).toBe(true);
  });
});
