export type ToneLabel =
  | "calm_professional"
  | "warm_positive"
  | "urgent_tense"
  | "apologetic_anxious"
  | "neutral_automated"
  | "sad_concerned";

export interface EmotionScore {
  name: string;
  intensity: number;
}

export interface AnalyzeRequest {
  text: string;
  mode: "incoming" | "outgoing";
}

export interface AnalyzeResponse {
  toneLabel: ToneLabel;
  confidence: number;
  explanation: string;
  emotions: EmotionScore[];
}

export interface RewriteRequest {
  text: string;
  targetTone?: ToneLabel;
}

export interface RewriteResponse {
  original: string;
  rewritten: string;
  strategy: string;
}
