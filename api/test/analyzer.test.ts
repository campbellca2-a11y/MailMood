import { describe, expect, it } from "vitest";
import { analyzeTone } from "../src/analyzer.js";

describe("analyzeTone", () => {
  it("detects urgent tone", () => {
    const result = analyzeTone("This is urgent. Please respond ASAP!");
    expect(result.toneLabel).toBe("urgent_tense");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("detects warm tone", () => {
    const result = analyzeTone("Thanks so much, I really appreciate your help.");
    expect(result.toneLabel).toBe("warm_positive");
  });

  it("returns confidence and emotions bounds", () => {
    const result = analyzeTone("Please review and share an update.");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    result.emotions.forEach((emotion) => {
      expect(emotion.intensity).toBeGreaterThanOrEqual(0);
      expect(emotion.intensity).toBeLessThanOrEqual(1);
    });
  });
});
