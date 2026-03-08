"use strict";

/**
 * MailMood Inbox Pill Injector (Local-First + Tooltip + Re-render Safe)
 * - Exports injectPills for src/content/index.ts compatibility
 * - Re-stamps rows when Gmail re-renders them
 * - Adds tooltip: Tone + Confidence + Explanation
 */

type AnalyzeResult = {
  toneLabel: string;
  confidence: number;
  explanation?: string;
};

const PILL_CLASS = "mailmood-pill";
const cache = new Map<string, AnalyzeResult>();

function toneToDisplay(toneLabel: string): { text: string; bg: string; fg: string; border: string } {
  const t = (toneLabel || "").toLowerCase();

  if (t.includes("urgent") || t.includes("tense")) return { text: "URGENT", bg: "#fee2e2", fg: "#991b1b", border: "#fecaca" };
  if (t.includes("warm") || t.includes("positive")) return { text: "WARM", bg: "#ffedd5", fg: "#9a3412", border: "#fed7aa" };
  if (t.includes("apologetic") || t.includes("anxious")) return { text: "ANXIOUS", bg: "#f3e8ff", fg: "#6b21a8", border: "#e9d5ff" };
  if (t.includes("sad") || t.includes("concern")) return { text: "SAD", bg: "#dbeafe", fg: "#1e40af", border: "#bfdbfe" };
  if (t.includes("calm") || t.includes("professional")) return { text: "CALM", bg: "#dcfce7", fg: "#166534", border: "#bbf7d0" };

  return { text: "NEUTRAL", bg: "#fef9c3", fg: "#854d0e", border: "#fef08a" };
}

function makePill(): HTMLSpanElement {
  const pill = document.createElement("span");
  pill.className = PILL_CLASS;
  pill.textContent = "…";
  pill.style.cssText =
    "display:inline-block; border-radius:12px; padding:2px 10px; margin:0 8px; font-size:10px; font-weight:700;" +
    "background-color:#f5f5f4; color:#78716c; border:1px solid #d6d3d1; line-height:16px; vertical-align:middle;" +
    "cursor:default;";
  return pill;
}

function applyPillStyle(pill: HTMLElement, toneLabel: string) {
  const s = toneToDisplay(toneLabel);
  pill.textContent = s.text;
  pill.style.backgroundColor = s.bg;
  pill.style.color = s.fg;
  pill.style.borderColor = s.border;
}

function getMainRoot(): HTMLElement | null {
  return document.querySelector('div[role="main"]') as HTMLElement | null;
}

function getRows(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('tr[data-legacy-last-message-id], tr.zA, div.zA'));
}

function getRowKey(row: HTMLElement): string {
  const legacyId = row.getAttribute("data-legacy-last-message-id");
  if (legacyId) return `legacy:${legacyId}`;

  const subj = (row.querySelector(".bog")?.textContent || "").trim();
  const snip = (row.querySelector(".y2")?.textContent || "").trim();
  return `fallback:${subj}::${snip}`.slice(0, 220);
}

function getTextForAnalysis(row: HTMLElement): string {
  const subj = (row.querySelector(".bog")?.textContent || "").trim();
  const snip = (row.querySelector(".y2")?.textContent || "").trim();
  const combined = [subj, snip].filter(Boolean).join(" — ").trim();
  return combined || subj || snip;
}

function getTargetCell(row: HTMLElement): HTMLElement | null {
  return (row.querySelector(".xW, .by1") as HTMLElement | null) || row;
}

function sendAnalyze(text: string): Promise<AnalyzeResult> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "MM_ANALYZE", text }, (response: any) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(err);

      const ok = response?.ok === true || response?.success === true;
      if (!ok) return reject(response);

      const data = response?.data;
      if (!data || typeof data !== "object") return reject({ error: "BAD_ANALYZE_RESULT" });

      resolve(data as AnalyzeResult);
    });
  });
}

function setTooltip(pill: HTMLElement, r: AnalyzeResult) {
  const tone = (r.toneLabel || "neutral").toUpperCase();
  const conf = typeof r.confidence === "number" ? Math.round(r.confidence * 100) : 50;
  const expl = (r.explanation || "").trim();
  pill.title = tone + "\nConfidence: " + conf + "%\n" + expl;
}

function ensurePillForRow(row: HTMLElement) {
  // If pill already exists in this row, do nothing (prevents duplicates)
  if (row.querySelector(`.${PILL_CLASS}`)) return;

  const target = getTargetCell(row);
  if (!target) return;

  const pill = makePill();
  target.prepend(pill);

  const key = getRowKey(row);
  const cached = cache.get(key);

  if (cached) {
    applyPillStyle(pill, cached.toneLabel || "neutral_automated");
    setTooltip(pill, cached);
    return;
  }

  const text = getTextForAnalysis(row);
  if (!text) {
    const r: AnalyzeResult = { toneLabel: "neutral_automated", confidence: 0.5, explanation: "No meaningful text to analyze." };
    cache.set(key, r);
    applyPillStyle(pill, r.toneLabel);
    setTooltip(pill, r);
    return;
  }

  // Local analysis (async message to SW)
  sendAnalyze(text)
    .then((r) => {
      cache.set(key, r);
      applyPillStyle(pill, r.toneLabel || "neutral_automated");
      setTooltip(pill, r);
    })
    .catch(() => {
      pill.textContent = "??";
      pill.style.backgroundColor = "#f1f5f9";
      pill.style.color = "#475569";
      pill.style.borderColor = "#cbd5e1";
      pill.title = "MailMood: analysis failed";
    });
}

/**
 * Exported for src/content/index.ts
 */
export function injectPills() {
  const main = getMainRoot();
  if (!main) return;

  const rows = getRows(main);
  for (const row of rows) ensurePillForRow(row);
}

let _observerStarted = false;

function startObserverOnce() {
  if (_observerStarted) return;
  _observerStarted = true;

  const mo = new MutationObserver(() => injectPills());
  mo.observe(document.body, { childList: true, subtree: true });
}

/**
 * If your index.ts calls initInboxWatcher(), keep this.
 */
export function initInboxWatcher() {
  injectPills();
  startObserverOnce();
}