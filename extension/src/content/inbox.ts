"use strict";

/**
 * MailMood Inbox Pill Injector
 * Local-First + Tooltip + Gmail DOM resilience
 */

type AnalyzeResult = {
  toneLabel: string;
  confidence: number;
  explanation?: string;
};

const PILL_CLASS = "mailmood-pill";
const cache = new Map<string, AnalyzeResult>();

function toneStyle(tone: string) {

  const t = tone.toLowerCase();

  if (t.includes("urgent") || t.includes("tense")) {
    return { bg: "#fee2e2", fg: "#991b1b", border: "#fecaca", label: "URGENT" };
  }

  if (t.includes("warm") || t.includes("positive")) {
    return { bg: "#ffedd5", fg: "#9a3412", border: "#fed7aa", label: "WARM" };
  }

  if (t.includes("apologetic") || t.includes("anxious")) {
    return { bg: "#f3e8ff", fg: "#6b21a8", border: "#e9d5ff", label: "ANXIOUS" };
  }

  if (t.includes("sad") || t.includes("concern")) {
    return { bg: "#dbeafe", fg: "#1e40af", border: "#bfdbfe", label: "SAD" };
  }

  if (t.includes("calm") || t.includes("professional")) {
    return { bg: "#dcfce7", fg: "#166534", border: "#bbf7d0", label: "CALM" };
  }

  return { bg: "#fef9c3", fg: "#854d0e", border: "#fef08a", label: "NEUTRAL" };
}

function createPill() {

  const pill = document.createElement("span");

  pill.className = PILL_CLASS;
  pill.textContent = "...";

  pill.style.cssText =
    "display:inline-flex;" +
    "align-items:center;" +
    "border-radius:999px;" +
    "padding:2px 10px;" +
    "margin:0 8px;" +
    "font-size:11px;" +
    "font-weight:600;" +
    "letter-spacing:0.02em;" +
    "border:1px solid rgba(0,0,0,0.08);" +
    "box-shadow:0 1px 2px rgba(0,0,0,0.08);" +
    "line-height:16px;" +
    "cursor:default;";

  return pill;
}

function applyTone(pill: HTMLElement, tone: string) {

  const style = toneStyle(tone);

  pill.textContent = style.label;
  pill.style.backgroundColor = style.bg;
  pill.style.color = style.fg;
  pill.style.borderColor = style.border;
}

function getRows(): HTMLElement[] {

  return Array.from(
    document.querySelectorAll<HTMLElement>(
      'tr[data-legacy-last-message-id], tr.zA, div.zA'
    )
  );
}

function getSnippet(row: HTMLElement) {

  const subject = row.querySelector(".bog")?.textContent?.trim() || "";
  const snippet = row.querySelector(".y2")?.textContent?.trim() || "";

  return (subject + " " + snippet).trim();
}

function getTargetCell(row: HTMLElement): HTMLElement | null {

  return row.querySelector(".xW, .by1") as HTMLElement || row;
}

function getRowKey(row: HTMLElement) {

  const id = row.getAttribute("data-legacy-last-message-id");
  if (id) return id;

  return getSnippet(row).slice(0, 200);
}

function analyze(text: string): Promise<AnalyzeResult> {

  return new Promise((resolve, reject) => {

    chrome.runtime.sendMessage(
      { type: "MM_ANALYZE", text },
      (response) => {

        const err = chrome.runtime.lastError;
        if (err) return reject(err);

        if (!response?.ok && !response?.success)
          return reject(response);

        resolve(response.data);
      }
    );

  });
}

function setTooltip(pill: HTMLElement, r: AnalyzeResult) {

  const tone = (r.toneLabel || "neutral").toUpperCase();
  const conf = Math.round((r.confidence || 0.5) * 100);
  const exp = r.explanation || "";

  pill.title =
    tone +
    "\nConfidence: " + conf + "%" +
    "\n" + exp;
}

function processRow(row: HTMLElement) {

  if (row.querySelector("." + PILL_CLASS)) return;

  const text = getSnippet(row);
  if (!text) return;

  const target = getTargetCell(row);
  if (!target) return;

  const pill = createPill();
  target.prepend(pill);

  const key = getRowKey(row);

  const cached = cache.get(key);

  if (cached) {
    applyTone(pill, cached.toneLabel);
    setTooltip(pill, cached);
    return;
  }

  analyze(text)
    .then((result) => {

      cache.set(key, result);

      applyTone(pill, result.toneLabel);
      setTooltip(pill, result);

    })
    .catch(() => {

      pill.textContent = "??";
      pill.style.backgroundColor = "#f1f5f9";
      pill.style.color = "#475569";

    });
}

export function injectPills() {

  const rows = getRows();

  rows.forEach((row) => processRow(row));

}

let observerStarted = false;

function startObserver() {

  if (observerStarted) return;
  observerStarted = true;

  const observer = new MutationObserver(() => {
    injectPills();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

}

export function initInboxWatcher() {

  injectPills();
  startObserver();

}