import { describe, expect, it } from "vitest";
import { localAnalyze, localRewrite } from "../src/lib/localFallback";

describe("localAnalyze", () => {
  it("detects urgent fallback tone", () => {
    const result = localAnalyze("Need this ASAP, this is urgent.");
    expect(result.toneLabel).toBe("urgent_tense");
    expect(result.fallback).toBe(true);
  });

  it("detects apologetic fallback tone", () => {
    const result = localAnalyze("Sorry, this was my fault.");
    expect(result.toneLabel).toBe("apologetic_anxious");
  });
});

describe("localRewrite", () => {
  it("softens directive language", () => {
    const result = localRewrite("You need to do this ASAP and you must send it.");
    expect(result.rewritten).toContain("as soon as possible");
    expect(result.rewritten.toLowerCase()).toContain("could");
    expect(result.fallback).toBe(true);
  });
});
