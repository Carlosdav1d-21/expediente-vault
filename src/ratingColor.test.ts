import { describe, expect, it } from "vitest";
import { ratingColor } from "./ratingColor";

describe("ratingColor", () => {
  it("cada franja de la rampa tiene su propio color", () => {
    const bands = [9.5, 8.2, 7.6, 7.2, 6.5, 5.5, 3];
    const colors = bands.map(ratingColor);
    expect(new Set(colors).size).toBe(bands.length);
  });

  it("respeta los límites exactos de cada franja", () => {
    expect(ratingColor(8.5)).toBe("#1a9850");
    expect(ratingColor(8.49)).not.toBe("#1a9850");
    expect(ratingColor(5)).toBe("#fdae61");
    expect(ratingColor(4.99)).toBe("#f46d43");
  });
});
