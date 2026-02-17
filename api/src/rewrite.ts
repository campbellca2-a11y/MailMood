import { analyzeTone } from "./analyzer.js";
import type { ToneLabel, RewriteResponse } from "./types.js";

function softener(text: string): string {
  return text
    .replace(/\bASAP\b/gi, "as soon as possible")
    .replace(/\bmust\b/gi, "could")
    .replace(/\byou need to\b/gi, "could you")
    .replace(/\bwhy didn't you\b/gi, "could you help me understand why")
    .replace(/\bthis is unacceptable\b/gi, "this is concerning")
    .replace(/\bI need this now\b/gi, "I would appreciate a quick turnaround");
}

function addWarmth(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }

  const hasGreeting = /^(hi|hello|hey)\b/i.test(trimmed);
  const hasThanks = /\bthanks\b|\bthank you\b/i.test(trimmed);

  let result = trimmed;
  if (!hasGreeting) {
    result = `Hi,\n\n${result}`;
  }
  if (!hasThanks) {
    result = `${result}\n\nThanks for your help.`;
  }
  return result;
}

function capitalizeSentences(text: string): string {
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (_m, prefix, letter) => prefix + letter.toUpperCase());
}

export function rewriteDraft(rawText: string, targetTone: ToneLabel = "calm_professional"): RewriteResponse {
  const original = rawText.trim();
  const detected = analyzeTone(original);
  let rewritten = original;
  let strategy = "Applied minimal edits to improve readability.";

  if (targetTone === "calm_professional") {
    rewritten = softener(original);
    strategy = "Softened directive language and reduced tension markers.";
  } else if (targetTone === "warm_positive") {
    rewritten = addWarmth(softener(original));
    strategy = "Added positive framing and appreciation language.";
  } else if (targetTone === "neutral_automated") {
    rewritten = original.replace(/\bI\b/g, "We").replace(/\b!\b/g, ".");
    strategy = "Reduced personal emphasis for neutral transactional tone.";
  }

  if (detected.toneLabel === "urgent_tense" && targetTone !== "urgent_tense") {
    rewritten = rewritten.replace(/\s*!+/g, ".").replace(/\bnow\b/gi, "soon");
  }

  rewritten = capitalizeSentences(rewritten);

  return {
    original,
    rewritten,
    strategy
  };
}
