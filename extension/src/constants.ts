import type { ToneLabel } from "./types";

export const API_BASE_URL = "http://localhost:8787";

export const TONE_META: Record<ToneLabel, { label: string; color: string }> = {
  calm_professional: { label: "Calm / Professional", color: "#2e7d32" },
  warm_positive: { label: "Warm / Positive", color: "#ef6c00" },
  urgent_tense: { label: "Urgent / Tense", color: "#c62828" },
  apologetic_anxious: { label: "Apologetic / Anxious", color: "#6a1b9a" },
  neutral_automated: { label: "Neutral / Automated", color: "#607d8b" },
  sad_concerned: { label: "Sad / Concerned", color: "#1565c0" }
};

export const SELECTORS = {
  inboxRow: "tr.zA",
  subject: "span.bog",
  preview: "span.y2",
  composeBody: "div[role='textbox'][g_editable='true']",
  composeDialog: "div[role='dialog']"
} as const;
