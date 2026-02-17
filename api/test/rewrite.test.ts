import { describe, expect, it } from "vitest";
import { rewriteDraft } from "../src/rewrite.js";

describe("rewriteDraft", () => {
  it("softens tense text for calm_professional", () => {
    const result = rewriteDraft("I need this now. You must finish this ASAP!", "calm_professional");
    expect(result.rewritten).toContain("as soon as possible");
    expect(result.rewritten).not.toContain("must");
  });

  it("adds warmth for warm_positive target", () => {
    const result = rewriteDraft("Please review the document.", "warm_positive");
    expect(result.rewritten).toContain("Hi,");
    expect(result.rewritten.toLowerCase()).toContain("thanks");
  });
});
