import type { AnalyzeResponse, ToneLabel } from "./types.js";

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// --- Lexicons ---
// Phrases (multi-word) are weighted higher than single keywords.
// Each entry: [term, weight]. Default weight is 1.

interface LexiconEntry {
  term: string;
  weight: number;
}

function lex(terms: Array<string | [string, number]>): LexiconEntry[] {
  return terms.map((t) =>
    typeof t === "string" ? { term: t, weight: 1 } : { term: t[0], weight: t[1] }
  );
}

const LEXICONS: Record<string, LexiconEntry[]> = {
  urgent: lex([
    "urgent", "asap", "immediately", "critical", "deadline",
    ["right away", 1.3], ["time sensitive", 1.4], ["high priority", 1.4],
    ["as soon as possible", 1.2], "escalat", "overdue", "behind schedule",
    ["need this today", 1.5], ["need this now", 1.5], ["end of day", 1.2],
    "rush", "expedite", "pressing", "emergency",
    ["don't delay", 1.3], ["can't wait", 1.3], ["running out of time", 1.4],
    ["drop everything", 1.5], ["top priority", 1.4], "eod", "cob",
  ]),
  apologetic: lex([
    "sorry", "apolog", "regret", "my fault", "my mistake",
    ["i take responsibility", 1.4], ["i should have", 1.2], "forgive",
    "pardon", ["please understand", 1.2], "oversight", "miscommunication",
    ["i was wrong", 1.4], ["i feel bad", 1.3], ["i didn't mean", 1.2],
    "worry", "worried", "anxious", "nervous", "hesitant",
    ["i hope this is okay", 1.3], ["i'm not sure if", 1.1],
    ["please don't be upset", 1.4], ["hope i haven't", 1.2],
  ]),
  warm: lex([
    "thanks", "thank you", "appreciate", "grateful", "great job",
    ["well done", 1.3], "congrats", "congratulations", "fantastic",
    "wonderful", "amazing", "awesome", "excellent", "brilliant",
    "happy", "glad", "excited", "thrilled", "delighted",
    ["looking forward", 1.2], ["pleasure working", 1.3], ["great work", 1.3],
    "welcome", "cheers", "kind regards", "warmly", "best wishes",
    ["you're the best", 1.4], ["really helped", 1.2], ["means a lot", 1.3],
    "love it", "perfect", "superb", "kudos",
  ]),
  calm: lex([
    "please", "review", "summary", "update", "attached",
    "as discussed", "per our conversation", "following up",
    "for your reference", "fyi", "please see", "kindly",
    "at your convenience", "when you get a chance",
    ["no rush", 1.3], ["not urgent", 1.3], ["no hurry", 1.3],
    ["take your time", 1.3], ["just a heads up", 1.2], "gentle reminder",
    "wanted to check", "circling back", "touching base",
    "let me know", "your thoughts", "feedback", "input",
    "agenda", "action items", "next steps", "moving forward",
    "aligned", "noted", "acknowledged", "confirmed",
    ["on track", 1.2], ["going smoothly", 1.3], ["going well", 1.2],
    ["all good", 1.2], "sounds good", "works for me",
  ]),
  sad: lex([
    "unfortunate", "sadly", "sad", "concerned", "loss",
    "difficult", "afraid", "disappointed", "heartbroken",
    ["i'm sorry to hear", 1.4], ["bad news", 1.3], "devastating",
    "painful", "struggling", "tough time", "passed away",
    "condolences", "sympathy", "grief", "mourn",
    ["deeply sorry", 1.4], ["terrible news", 1.4], "suffer",
    "distress", "disheartened", "hopeless", "bleak",
    ["hard to accept", 1.2], "tragic", "misfortune",
  ]),
  automated: lex([
    ["do not reply", 1.5], ["noreply", 1.5], ["no-reply", 1.5],
    "notification", "automated", "generated", "receipt",
    "unsubscribe", "subscription", "your order", "your account",
    "has been processed", "has been shipped", "tracking number",
    "verify your", "confirm your", "one-time", "passcode",
    ["this is an automated", 1.5], "terms of service",
    "privacy policy", "click here", "view in browser",
    "powered by", "sent via", "manage preferences",
  ]),
};

// --- Negation handling ---
const NEGATION_WORDS = new Set([
  "not", "no", "never", "don't", "doesn't", "didn't",
  "won't", "can't", "cannot", "isn't", "aren't", "wasn't",
  "weren't", "hardly", "barely", "neither", "nor",
]);

function isNegated(text: string, termIndex: number): boolean {
  // Look at the 4 words before the matched term
  const before = text.slice(Math.max(0, termIndex - 40), termIndex).toLowerCase();
  const words = before.split(/\s+/).slice(-4);
  return words.some((w) => NEGATION_WORDS.has(w));
}

// --- Scoring ---
function scoreCategory(text: string, entries: LexiconEntry[]): number {
  const lower = text.toLowerCase();
  let score = 0;

  for (const { term, weight } of entries) {
    let searchFrom = 0;
    while (true) {
      const idx = lower.indexOf(term, searchFrom);
      if (idx === -1) break;

      // Check word boundary (don't match "snowflake" for "now")
      if (term.length <= 3) {
        const charBefore = idx > 0 ? lower[idx - 1] : " ";
        const charAfter = idx + term.length < lower.length ? lower[idx + term.length] : " ";
        if (/\w/.test(charBefore) || /\w/.test(charAfter)) {
          searchFrom = idx + 1;
          continue;
        }
      }

      if (isNegated(lower, idx)) {
        // Negated match reduces score slightly instead of adding
        score -= 0.3 * weight;
      } else {
        score += weight;
      }
      searchFrom = idx + term.length;
    }
  }

  return Math.max(0, score);
}

// --- Punctuation & formatting signals ---
function punctuationSignals(text: string): {
  exclamationDensity: number;
  questionDensity: number;
  capsRatio: number;
  ellipsisDensity: number;
} {
  const len = Math.max(1, text.length);
  const exclamations = (text.match(/!/g) ?? []).length;
  const questions = (text.match(/\?/g) ?? []).length;
  const ellipses = (text.match(/\.{2,}/g) ?? []).length;

  // Caps ratio: only for alpha characters, ignoring short words
  const words = text.split(/\s+/).filter((w) => w.length > 2);
  const allCapsWords = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w));
  const capsRatio = words.length > 0 ? allCapsWords.length / words.length : 0;

  return {
    exclamationDensity: Math.min(1, exclamations / (len / 80)),
    questionDensity: Math.min(1, questions / (len / 120)),
    capsRatio: Math.min(1, capsRatio),
    ellipsisDensity: Math.min(1, ellipses / (len / 150)),
  };
}

export function analyzeTone(rawText: string): AnalyzeResponse {
  const text = rawText.trim();
  if (!text) {
    return {
      toneLabel: "neutral_automated",
      confidence: 0.5,
      explanation: "No meaningful text to analyze.",
      emotions: [],
    };
  }

  const signals = punctuationSignals(text);

  const urgentScore = scoreCategory(text, LEXICONS.urgent);
  const apologeticScore = scoreCategory(text, LEXICONS.apologetic);
  const warmScore = scoreCategory(text, LEXICONS.warm);
  const calmScore = scoreCategory(text, LEXICONS.calm);
  const sadScore = scoreCategory(text, LEXICONS.sad);
  const automatedScore = scoreCategory(text, LEXICONS.automated);

  // Build score card with bonus signals
  const scoreCard: Array<{ tone: ToneLabel; value: number }> = [
    {
      tone: "urgent_tense",
      value: urgentScore * 1.3
        + signals.exclamationDensity * 1.5
        + signals.capsRatio * 1.2,
    },
    {
      tone: "apologetic_anxious",
      value: apologeticScore * 1.25
        + signals.ellipsisDensity * 0.6,
    },
    {
      tone: "warm_positive",
      value: warmScore * 1.2
        + signals.exclamationDensity * 0.3, // excited exclamation marks
    },
    {
      tone: "calm_professional",
      value: calmScore * 1.0
        + (text.length > 100 ? 0.4 : 0), // longer texts tend to be professional
    },
    {
      tone: "sad_concerned",
      value: sadScore * 1.2
        + signals.ellipsisDensity * 0.4,
    },
    {
      tone: "neutral_automated",
      value: automatedScore * 1.4
        + 0.5, // baseline — catches emails with no emotional signal
    },
  ];

  const sorted = scoreCard.sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const second = sorted[1];
  const gap = top.value - second.value;

  // Confidence: bigger gap between top two = higher confidence
  const confidence = clamp(0.48 + gap * 0.1 + Math.min(0.2, top.value * 0.04));
  const toneLabel = top.tone;

  // More specific explanations based on what was actually detected
  const explanationDetails: Record<ToneLabel, string> = {
    urgent_tense: signals.capsRatio > 0.3
      ? "Urgency language and emphasized capitalization detected."
      : "Language suggests urgency and time pressure.",
    apologetic_anxious: apologeticScore > 2
      ? "Multiple apology or anxiety markers found."
      : "Wording contains apologetic or anxious phrasing.",
    warm_positive: warmScore > 3
      ? "Strong appreciation and positive sentiment throughout."
      : "Text includes appreciation and positive intent.",
    calm_professional: "Wording is measured, structured, and task-oriented.",
    neutral_automated: automatedScore > 2
      ? "Automated/system-generated email patterns detected."
      : "Low emotional signal; likely informational or transactional.",
    sad_concerned: sadScore > 2
      ? "Multiple indicators of sadness, concern, or bad news."
      : "Text contains concern or negative emotional framing.",
  };

  // Emotion breakdown — more granular
  const emotions = [
    { name: "urgency", intensity: clamp(urgentScore * 0.18 + signals.capsRatio * 0.15) },
    { name: "warmth", intensity: clamp(warmScore * 0.16) },
    { name: "anxiety", intensity: clamp(apologeticScore * 0.18 + signals.ellipsisDensity * 0.1) },
    { name: "concern", intensity: clamp(sadScore * 0.18) },
    { name: "professionalism", intensity: clamp(calmScore * 0.12 + (text.length > 80 ? 0.15 : 0)) },
    { name: "stress", intensity: clamp(signals.exclamationDensity * 0.3 + signals.capsRatio * 0.25) },
  ].filter((e) => e.intensity > 0.06);

  return {
    toneLabel,
    confidence,
    explanation: explanationDetails[toneLabel],
    emotions,
  };
}
