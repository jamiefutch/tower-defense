import { describe, expect, it } from "vitest";
import { shade } from "../src/render/renderer";

describe("shade", () => {
  it("darkens a colour toward black", () => {
    expect(shade("#ffffff", -0.5)).toBe("rgb(128,128,128)");
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
