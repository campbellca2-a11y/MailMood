import type { AnalyzeResponse, RewriteResponse } from "../types";

export function localAnalyze(text: string): AnalyzeResponse {
  const normalized = text.toLowerCase();
  const contains = (terms: string[]) => terms.some((term) => normalized.includes(term));

  if (contains(["urgent", "asap", "immediately", "deadline", "critical"])) {
    return {
      toneLabel: "urgent_tense",
      confidence: 0.71,
      explanation: "Local fallback detected urgency-oriented language.",
      emotions: [
        { name: "urgency", intensity: 0.82 },
        { name: "stress", intensity: 0.62 }
      ],
      fallback: true
    };
  }

  if (contains(["sorry", "apolog", "regret", "my fault"])) {
    return {
      toneLabel: "apologetic_anxious",
      confidence: 0.69,
      explanation: "Local fallback found apologetic wording.",
      emotions: [
        { name: "anxiety", intensity: 0.63 },
        { name: "remorse", intensity: 0.7 }
      ],
      fallback: true
    };
  }

  if (contains(["thanks", "appreciate", "great", "excited", "happy"])) {
    return {
      toneLabel: "warm_positive",
      confidence: 0.67,
      explanation: "Local fallback found positive and appreciative phrasing.",
      emotions: [
        { name: "warmth", intensity: 0.65 },
        { name: "optimism", intensity: 0.58 }
      ],
      fallback: true
    };
  }

  return {
    toneLabel: "neutral_automated",
    confidence: 0.58,
    explanation: "Local fallback could not detect a strong emotional signal.",
    emotions: [{ name: "neutral", intensity: 0.38 }],
    fallback: true
  };
}

export function localRewrite(text: string): RewriteResponse {
  const softened = text
    .replace(/\bASAP\b/gi, "as soon as possible")
    .replace(/\bmust\b/gi, "could")
    .replace(/\byou need to\b/gi, "could you")
    .replace(/\bwhy didn't you\b/gi, "could you help me understand why")
    .trim();

  return {
    original: text,
    rewritten: softened,
    strategy: "Applied local fallback softening substitutions.",
    fallback: true
  };
}
