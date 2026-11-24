import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/core/game";
import { MAPS } from "../src/data/maps";
import { render, shade, type ViewState } from "../src/render/renderer";
import { getTheme } from "../src/render/themes";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shade", () => {
  it("darkens a colour toward black", () => {
    expect(shade("#ffffff", -0.5)).toBe("rgb(128,128,128)");
  });

  describe("ground layer", () => {
    it("reuses the current layer but discards it when the scale, theme, or dimensions change", () => {
      const layerContext = { setTransform: vi.fn(), fillRect: vi.fn(), fillStyle: "" };
      const createElement = vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: () => layerContext,
      }));
      vi.stubGlobal("document", { createElement });
      vi.stubGlobal("window", { devicePixelRatio: 1 });
      const drawImage = vi.fn();
      const ctx = {
        canvas: { width: 0, height: 0, style: {} },
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        drawImage,
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      const game = new Game(MAPS[0]);
      const view: ViewState = {
        hover: null,
        ghost: null,
        selected: null,
        showRoute: false,
        scale: 1,
        theme: getTheme("green"),
      };

      render(ctx, game, view);
      const firstLayer = drawImage.mock.calls[0][0];
      render(ctx, game, view);
      expect(createElement).toHaveBeenCalledTimes(1);
      expect(drawImage.mock.calls[1][0]).toBe(firstLayer);

      for (const scale of [0.9, 0.8, 0.7, 1]) {
        view.scale = scale;
        render(ctx, game, view);
      }
      expect(createElement).toHaveBeenCalledTimes(5);
      expect(drawImage.mock.calls[5][0]).not.toBe(firstLayer);

      view.theme = getTheme("light");
      render(ctx, game, view);
      expect(createElement).toHaveBeenCalledTimes(6);
      expect(layerContext.fillStyle).toBe(view.theme.field.edge);

      const largerGame = new Game({ ...MAPS[0], width: MAPS[0].width + 1 });
      render(ctx, largerGame, view);
      expect(createElement).toHaveBeenCalledTimes(7);
      render(ctx, largerGame, view);
      expect(createElement).toHaveBeenCalledTimes(7);
    });
  });

  it("lightens a colour toward white", () => {
    expect(shade("#000000", 0.5)).toBe("rgb(128,128,128)");
  });

  it("leaves a colour unchanged at zero", () => {
    expect(shade("#4a90e2", 0)).toBe("rgb(74,144,226)");
  });

  it("expands three-digit hex", () => {
    expect(shade("#fff", 0)).toBe("rgb(255,255,255)");
    expect(shade("#000", 0.5)).toBe("rgb(128,128,128)");
  });

  it("returns unsupported colour formats unchanged instead of producing NaN", () => {
    expect(shade("red", -0.5)).toBe("red");
    expect(shade("rgb(1,2,3)", -0.5)).toBe("rgb(1,2,3)");
  });
});
