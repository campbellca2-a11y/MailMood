import type { AnalyzeResponse, ToneLabel } from "./types.js";

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// ---------------------------------------------------------------------------
// Lexicons — each entry is [term] or [term, weight].  Multi-word phrases
// are naturally more specific so they carry a higher default weight.
// ---------------------------------------------------------------------------

interface LexEntry { term: string; weight: number }

function lex(raw: Array<string | [string, number]>): LexEntry[] {
  return raw.map((t) => {
    const [term, explicit] = typeof t === "string" ? [t, undefined] : t;
    // Multi-word phrases get a 1.3x base; explicit weight overrides
    const weight = explicit ?? (term.includes(" ") ? 1.3 : 1);
    return { term, weight };
  });
}

const LEX = {
  urgent: lex([
    // single words
    "urgent", "asap", "immediately", "critical", "deadline", "overdue",
    "rush", "expedite", "pressing", "emergency", "escalat",
    // phrases
    "right away", "time sensitive", ["high priority", 1.5],
    "as soon as possible", "behind schedule",
    ["need this today", 1.5], ["need this now", 1.5],
    "end of day", "by eod", "by cob", "by close of business",
    ["don't delay", 1.4], ["can't wait", 1.3], ["running out of time", 1.5],
    ["drop everything", 1.6], ["top priority", 1.5],
    ["this cannot wait", 1.5], ["needs immediate attention", 1.5],
    ["respond immediately", 1.4], "time is running out",
    "act now", "action required", "response required",
    ["final notice", 1.4], ["last chance", 1.3], "comply",
    ["do this now", 1.4], ["handle this", 1.2],
  ]),

  apologetic: lex([
    "sorry", "apolog", "regret", "forgive", "pardon",
    "my fault", "my mistake", "my bad", "oversight", "miscommunication",
    "worried", "worry", "anxious", "nervous", "hesitant", "uneasy",
    ["i take responsibility", 1.5], ["i should have", 1.3],
    ["i was wrong", 1.5], ["i feel bad", 1.4], ["i didn't mean", 1.3],
    ["please understand", 1.3], ["please don't be upset", 1.5],
    ["i hope this is okay", 1.3], ["i'm not sure if", 1.1],
    ["hope i haven't", 1.3], ["i owe you an apology", 1.5],
    ["this is my fault", 1.5], ["i take the blame", 1.5],
    ["i feel terrible", 1.4], ["i'm afraid that", 1.2],
    ["hope you can forgive", 1.4], ["didn't intend to", 1.2],
    ["i messed up", 1.4], ["i dropped the ball", 1.4],
  ]),

  warm: lex([
    "thanks", "thank you", "appreciate", "grateful",
    "congrats", "congratulations",
    "happy", "glad", "excited", "thrilled", "delighted",
    "fantastic", "wonderful", "amazing", "awesome", "excellent",
    "brilliant", "superb", "perfect", "kudos",
    "welcome", "cheers", "warmly",
    ["great job", 1.4], ["well done", 1.4], ["great work", 1.4],
    ["looking forward", 1.3], ["pleasure working", 1.4],
    ["kind regards", 1.2], ["best wishes", 1.2],
    ["you're the best", 1.5], ["really helped", 1.3],
    ["means a lot", 1.4], ["love it", 1.3],
    ["so proud", 1.4], ["couldn't have done it without", 1.5],
    ["above and beyond", 1.4], ["hats off", 1.3],
    ["you rock", 1.4], ["made my day", 1.4],
    ["really impressed", 1.3], ["keep up the great", 1.3],
    ["so grateful", 1.4], ["truly appreciate", 1.4],
    ["can't thank you enough", 1.5], ["what a great", 1.3],
  ]),

  calm: lex([
    "please", "review", "summary", "update", "attached", "kindly",
    "as discussed", "per our conversation", "following up",
    "for your reference", "fyi", "please see",
    "at your convenience", "when you get a chance",
    ["no rush", 1.4], ["not urgent", 1.4], ["no hurry", 1.4],
    ["take your time", 1.4], ["whenever you can", 1.3],
    ["just a heads up", 1.3], ["gentle reminder", 1.3],
    "wanted to check", "circling back", "touching base",
    "let me know", "your thoughts", "feedback", "input",
    "agenda", "action items", "next steps", "moving forward",
    "aligned", "noted", "acknowledged", "confirmed",
    ["on track", 1.3], ["going smoothly", 1.4], ["going well", 1.3],
    ["all good", 1.3], ["sounds good", 1.3], ["works for me", 1.3],
    "hope you're well", "hope this finds you",
    "wanted to share", "brief update", "quick note",
    "for your review", "please advise", "see below",
    "in the loop", "keep you posted", "stay tuned",
    ["no action needed", 1.4], ["just fyi", 1.3],
  ]),

  sad: lex([
    "unfortunate", "sadly", "sad", "concerned", "disappointed",
    "heartbroken", "devastating", "painful", "hopeless", "bleak",
    "tragic", "misfortune", "distress", "disheartened",
    "loss", "grief", "mourn", "condolences", "sympathy",
    "struggling", "suffer",
    ["i'm sorry to hear", 1.5], ["bad news", 1.4], ["terrible news", 1.5],
    ["deeply sorry", 1.5], ["tough time", 1.3], ["passed away", 1.6],
    ["hard to accept", 1.3], ["difficult to process", 1.3],
    ["with heavy heart", 1.5], ["regret to inform", 1.6],
    ["it pains me", 1.4], ["i wish things were different", 1.4],
    ["i'm devastated", 1.5], ["breaks my heart", 1.5],
    ["thinking of you", 1.3], ["my heart goes out", 1.5],
    ["during this difficult", 1.4], ["in our thoughts", 1.3],
    "afraid", "fear", "dread",
  ]),

  automated: lex([
    ["do not reply", 1.6], ["noreply", 1.6], ["no-reply", 1.6],
    ["this is an automated", 1.6], ["auto-generated", 1.5],
    "notification", "automated", "generated", "receipt",
    "unsubscribe", "subscription", "your order", "your account",
    "has been processed", "has been shipped", "tracking number",
    "verify your", "confirm your", "one-time", "passcode",
    "terms of service", "privacy policy",
    "click here", "view in browser", "view online",
    "powered by", "sent via", "manage preferences",
    "email preferences", "opt out", "mailing list",
    ["this email was sent to", 1.5], ["you are receiving this", 1.5],
    "if you did not request", "copyright",
    ["all rights reserved", 1.3], "inc.", "llc",
  ]),
};

// ---------------------------------------------------------------------------
// Negation
// ---------------------------------------------------------------------------

const NEGATORS = new Set([
  "not", "no", "never", "don't", "doesn't", "didn't", "dont", "doesnt",
  "won't", "can't", "cannot", "isn't", "aren't", "wasn't", "wont", "cant",
  "weren't", "hardly", "barely", "neither", "nor", "without",
]);

function isNegated(lower: string, idx: number): boolean {
  const window = lower.slice(Math.max(0, idx - 50), idx);
  // Check up to 5 preceding words
  const words = window.split(/\s+/).slice(-5);
  // But a comma/period/semicolon resets the negation scope
  const lastPunct = window.lastIndexOf(",");
  const lastPeriod = window.lastIndexOf(".");
  const lastSemi = window.lastIndexOf(";");
  const barrier = Math.max(lastPunct, lastPeriod, lastSemi);
  if (barrier !== -1) {
    const afterBarrier = window.slice(barrier + 1);
    const barrierWords = afterBarrier.trim().split(/\s+/);
    return barrierWords.some((w) => NEGATORS.has(w));
  }
  return words.some((w) => NEGATORS.has(w));
}

// ---------------------------------------------------------------------------
// Intensity modifiers — amplify or dampen nearby matches
// ---------------------------------------------------------------------------

const AMPLIFIERS: Record<string, number> = {
  very: 1.35, extremely: 1.5, really: 1.3, absolutely: 1.4,
  incredibly: 1.4, deeply: 1.35, so: 1.25, truly: 1.3,
  completely: 1.35, utterly: 1.4, desperately: 1.45,
  seriously: 1.3, genuinely: 1.25, particularly: 1.2,
};

const DAMPENERS: Record<string, number> = {
  slightly: 0.6, somewhat: 0.65, a_little: 0.6, mildly: 0.6,
  possibly: 0.7, maybe: 0.7, perhaps: 0.7, kind_of: 0.65,
  sort_of: 0.65,
};

function getModifier(lower: string, idx: number): number {
  const window = lower.slice(Math.max(0, idx - 30), idx).trim();
  const words = window.split(/\s+/);
  const last = words[words.length - 1] ?? "";
  const lastTwo = words.slice(-2).join("_");

  if (DAMPENERS[lastTwo]) return DAMPENERS[lastTwo];
  if (DAMPENERS[last]) return DAMPENERS[last];
  if (AMPLIFIERS[last]) return AMPLIFIERS[last];
  return 1;
}

// ---------------------------------------------------------------------------
// Score a category against text — handles boundaries, negation, modifiers
// ---------------------------------------------------------------------------

function scoreCategory(text: string, entries: LexEntry[]): number {
  const lower = text.toLowerCase();
  let score = 0;

  for (const { term, weight } of entries) {
    let from = 0;
    while (true) {
      const idx = lower.indexOf(term, from);
      if (idx === -1) break;

      // Word-boundary check for short terms (<=4 chars)
      if (term.length <= 4 && !/\s/.test(term)) {
        const before = idx > 0 ? lower[idx - 1] : " ";
        const after = idx + term.length < lower.length ? lower[idx + term.length] : " ";
        if (/\w/.test(before) || /\w/.test(after)) {
          from = idx + 1;
          continue;
        }
      }

      const modifier = getModifier(lower, idx);

      if (isNegated(lower, idx)) {
        score -= 0.4 * weight;
      } else {
        score += weight * modifier;
      }
      from = idx + term.length;
    }
  }

  return Math.max(0, score);
}

// ---------------------------------------------------------------------------
// Sentence-level analysis — score each sentence independently, then combine
// with position weighting (opening and closing sentences matter more for tone)
// ---------------------------------------------------------------------------

function splitSentences(text: string): string[] {
  // Split on sentence boundaries but keep fragments reasonable
  return text
    .split(/(?<=[.!?])\s+|(?:\r?\n){1,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

interface SentenceScore {
  text: string;
  scores: Record<string, number>;
  position: "opening" | "body" | "closing";
}

function scoreSentences(sentences: string[]): SentenceScore[] {
  return sentences.map((s, i) => {
    const position = i === 0
      ? "opening"
      : i === sentences.length - 1
        ? "closing"
        : "body";

    return {
      text: s,
      scores: {
        urgent: scoreCategory(s, LEX.urgent),
        apologetic: scoreCategory(s, LEX.apologetic),
        warm: scoreCategory(s, LEX.warm),
        calm: scoreCategory(s, LEX.calm),
        sad: scoreCategory(s, LEX.sad),
        automated: scoreCategory(s, LEX.automated),
      },
      position,
    };
  });
}

// Position weights: opening/closing lines set the tone more than body
const POSITION_WEIGHT: Record<string, number> = {
  opening: 1.3,
  body: 1.0,
  closing: 1.2,
};

function aggregateScores(
  sentenceScores: SentenceScore[]
): Record<string, number> {
  const totals: Record<string, number> = {
    urgent: 0, apologetic: 0, warm: 0, calm: 0, sad: 0, automated: 0,
  };

  for (const ss of sentenceScores) {
    const pw = POSITION_WEIGHT[ss.position];
    for (const cat of Object.keys(totals)) {
      totals[cat] += ss.scores[cat] * pw;
    }
  }

  return totals;
}

// ---------------------------------------------------------------------------
// Punctuation & formatting signals
// ---------------------------------------------------------------------------

interface Signals {
  exclamationDensity: number;
  questionDensity: number;
  capsRatio: number;
  ellipsisDensity: number;
  avgSentenceLen: number;
}

function extractSignals(text: string, sentenceCount: number): Signals {
  const len = Math.max(1, text.length);
  const exclamations = (text.match(/!+/g) ?? []).length;
  const questions = (text.match(/\?/g) ?? []).length;
  const ellipses = (text.match(/\.{2,}/g) ?? []).length;

  const words = text.split(/\s+/).filter((w) => w.length > 2);
  const capsWords = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w));
  const capsRatio = words.length > 0 ? capsWords.length / words.length : 0;

  return {
    exclamationDensity: clamp(exclamations / Math.max(1, len / 80)),
    questionDensity: clamp(questions / Math.max(1, len / 120)),
    capsRatio: clamp(capsRatio),
    ellipsisDensity: clamp(ellipses / Math.max(1, len / 150)),
    avgSentenceLen: len / Math.max(1, sentenceCount),
  };
}

// ---------------------------------------------------------------------------
// Email structure detection
// ---------------------------------------------------------------------------

function detectEmailStructure(text: string): {
  hasGreeting: boolean;
  hasSignOff: boolean;
  hasForwarded: boolean;
  isShort: boolean;
} {
  const lower = text.toLowerCase();
  const hasGreeting = /^(hi|hello|hey|dear|good morning|good afternoon|good evening)\b/i.test(text.trim());
  const hasSignOff = /(regards|sincerely|best|cheers|thanks|thank you|warm regards|kind regards|respectfully)\s*[,.]?\s*$/im.test(text.trim());
  const hasForwarded = /^-+\s*(forwarded|original message)/im.test(lower);
  const isShort = text.trim().length < 60;

  return { hasGreeting, hasSignOff, hasForwarded, isShort };
}

// ---------------------------------------------------------------------------
// Main analyzer
// ---------------------------------------------------------------------------

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

  const sentences = splitSentences(text);
  const sentenceScores = scoreSentences(sentences);
  const catScores = aggregateScores(sentenceScores);
  const sig = extractSignals(text, sentences.length);
  const structure = detectEmailStructure(text);

  // Detect whether any emotional category has a strong signal.
  // When emotions are strong, structural cues (greeting/signoff) should NOT
  // override them — "Dear John, I regret to inform you... Regards" is still sad.
  const emotionalPeak = Math.max(
    catScores.urgent, catScores.apologetic, catScores.warm,
    catScores.sad,
  );
  const strongEmotion = emotionalPeak > 1.2;

  // Structural bonuses only kick in when no strong emotion is present
  const structureBonus = strongEmotion ? 0 : (
    (structure.hasGreeting ? 0.25 : 0)
    + (structure.hasSignOff ? 0.25 : 0)
    + (sig.avgSentenceLen > 60 ? 0.2 : 0)
  );

  // Build composite score card
  const scoreCard: Array<{ tone: ToneLabel; value: number }> = [
    {
      tone: "urgent_tense",
      value: catScores.urgent * 1.25
        + sig.exclamationDensity * 1.6
        + sig.capsRatio * 1.8,
    },
    {
      tone: "apologetic_anxious",
      value: catScores.apologetic * 1.2
        + sig.ellipsisDensity * 0.5,
    },
    {
      tone: "warm_positive",
      value: catScores.warm * 1.15
        + (sig.exclamationDensity > 0 && catScores.warm > 0 ? 0.4 : 0),
    },
    {
      tone: "calm_professional",
      value: catScores.calm * 1.0
        + structureBonus
        + 0.35,  // baseline — human emails with no strong emotion default here
    },
    {
      tone: "sad_concerned",
      value: catScores.sad * 1.2
        + sig.ellipsisDensity * 0.3,
    },
    {
      tone: "neutral_automated",
      // Only wins when actual automation signals are present — no free baseline
      value: catScores.automated * 1.4
        + (catScores.automated >= 2 ? 0.5 : 0),  // bonus when multiple automation markers
    },
  ];

  const sorted = scoreCard.sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const second = sorted[1];
  const gap = top.value - second.value;

  // Confidence: based on gap, absolute score, and sentence count
  const sentenceBonus = clamp(sentences.length * 0.02); // more text = more data = more confidence
  const confidence = clamp(
    0.45
    + gap * 0.09
    + Math.min(0.22, top.value * 0.04)
    + sentenceBonus
  );

  // --- Dynamic explanations ---
  const explanation = buildExplanation(top.tone, catScores, sig, structure);

  // --- Emotion breakdown ---
  const emotions = [
    {
      name: "urgency",
      intensity: clamp(catScores.urgent * 0.14 + sig.capsRatio * 0.2 + sig.exclamationDensity * 0.15),
    },
    {
      name: "warmth",
      intensity: clamp(catScores.warm * 0.13),
    },
    {
      name: "anxiety",
      intensity: clamp(catScores.apologetic * 0.14 + sig.ellipsisDensity * 0.1),
    },
    {
      name: "concern",
      intensity: clamp(catScores.sad * 0.14),
    },
    {
      name: "professionalism",
      intensity: clamp(
        catScores.calm * 0.1
        + (structure.hasGreeting ? 0.1 : 0)
        + (structure.hasSignOff ? 0.1 : 0)
      ),
    },
    {
      name: "stress",
      intensity: clamp(sig.exclamationDensity * 0.35 + sig.capsRatio * 0.3),
    },
  ].filter((e) => e.intensity > 0.05);

  return { toneLabel: top.tone, confidence, explanation, emotions };
}

// ---------------------------------------------------------------------------
// Explanation builder — produces a human-readable 1-2 sentence explanation
// that cites the actual signals found
// ---------------------------------------------------------------------------

function buildExplanation(
  tone: ToneLabel,
  scores: Record<string, number>,
  sig: Signals,
  structure: { hasGreeting: boolean; hasSignOff: boolean; isShort: boolean },
): string {
  const parts: string[] = [];

  switch (tone) {
    case "urgent_tense":
      if (sig.capsRatio > 0.3) parts.push("heavy use of capitalization");
      if (sig.exclamationDensity > 0.3) parts.push("frequent exclamation marks");
      if (scores.urgent > 3) parts.push("multiple urgency keywords");
      else if (scores.urgent > 0) parts.push("urgency language");
      if (parts.length === 0) parts.push("tone and phrasing suggest time pressure");
      return `Detected: ${parts.join(", ")}. This email reads as urgent or demanding.`;

    case "apologetic_anxious":
      if (scores.apologetic > 3) parts.push("repeated apology/anxiety markers");
      else parts.push("apologetic or anxious phrasing");
      if (sig.ellipsisDensity > 0.2) parts.push("trailing punctuation (hesitation)");
      return `Detected: ${parts.join(", ")}. The sender may feel regretful or uneasy.`;

    case "warm_positive":
      if (scores.warm > 4) parts.push("strong appreciation throughout");
      else parts.push("positive and appreciative language");
      if (structure.hasGreeting) parts.push("friendly greeting");
      return `Detected: ${parts.join(", ")}. This is a warm, encouraging message.`;

    case "calm_professional":
      if (structure.hasGreeting && structure.hasSignOff) parts.push("proper greeting and sign-off");
      if (scores.calm > 3) parts.push("measured, task-oriented phrasing");
      else parts.push("structured and professional wording");
      return `Detected: ${parts.join(", ")}. This email is business-appropriate and neutral.`;

    case "sad_concerned":
      if (scores.sad > 3) parts.push("strong indicators of sadness or concern");
      else parts.push("language conveying worry or bad news");
      return `Detected: ${parts.join(", ")}. The message carries a somber or concerned tone.`;

    case "neutral_automated":
      if (scores.automated > 2) parts.push("system-generated patterns (unsubscribe, noreply)");
      else if (structure.isShort) parts.push("very short message with no clear emotional signal");
      else parts.push("low emotional signal");
      return `Detected: ${parts.join(", ")}. Likely informational or machine-generated.`;
  }
}
