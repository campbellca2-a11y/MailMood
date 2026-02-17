import { SELECTORS, TONE_META } from "../constants";
import type { AnalyzeResponse, BackgroundAnalyzeMessage } from "../types";

const toneCache = new Map<string, AnalyzeResponse>();
const MAX_CACHE_SIZE = 200;

function setCached(key: string, value: AnalyzeResponse): void {
  if (toneCache.size >= MAX_CACHE_SIZE) {
    const firstKey = toneCache.keys().next().value;
    if (firstKey !== undefined) toneCache.delete(firstKey);
  }
  toneCache.set(key, value);
}

function digest(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `${hash}`;
}

function sendAnalyze(text: string): Promise<AnalyzeResponse> {
  const message: BackgroundAnalyzeMessage = {
    type: "MM_ANALYZE",
    payload: { text, mode: "incoming" }
  };

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error ?? "Unknown background error"));
        return;
      }
      resolve(response.data as AnalyzeResponse);
    });
  });
}

function upsertMoodBadge(subjectEl: Element, analysis: AnalyzeResponse): void {
  const meta = TONE_META[analysis.toneLabel];
  const host = subjectEl.parentElement;
  if (!host) {
    return;
  }

  let badge = host.querySelector<HTMLSpanElement>(".mm-inbox-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "mm-inbox-badge";
    badge.addEventListener("mousedown", (e) => { e.stopPropagation(); });
    badge.addEventListener("click", (e) => { e.stopPropagation(); });
    host.appendChild(badge);
  }

  badge.textContent = meta.label;
  badge.style.backgroundColor = `${meta.color}1A`;
  badge.style.color = meta.color;
  badge.style.borderColor = `${meta.color}55`;
  badge.title = `${meta.label} (${Math.round(analysis.confidence * 100)}%) - ${analysis.explanation}`;
}

// Track in-flight requests to avoid duplicates
const pending = new Set<string>();

async function analyzeRow(row: Element): Promise<void> {
  const subjectEl = row.querySelector(SELECTORS.subject);
  const previewEl = row.querySelector(SELECTORS.preview);
  if (!subjectEl) {
    return;
  }

  const subject = subjectEl.textContent?.trim() ?? "";
  const preview = previewEl?.textContent?.trim().replace(/^-\s*/, "") ?? "";
  const text = `${subject}. ${preview}`.trim();

  if (!text || text === ".") {
    return;
  }

  const hash = digest(text);

  // If badge already exists on this row, skip
  if (subjectEl.parentElement?.querySelector(".mm-inbox-badge")) {
    return;
  }

  // Use cache if available
  const cached = toneCache.get(hash);
  if (cached) {
    upsertMoodBadge(subjectEl, cached);
    return;
  }

  // Don't fire duplicate requests
  if (pending.has(hash)) {
    return;
  }

  pending.add(hash);
  try {
    const analysis = await sendAnalyze(text);
    setCached(hash, analysis);
    // Re-query the subject element in case Gmail re-rendered the row
    const freshSubject = row.querySelector(SELECTORS.subject);
    if (freshSubject) {
      upsertMoodBadge(freshSubject, analysis);
    }
  } catch {
    // Skip noisy errors in Gmail DOM churn.
  } finally {
    pending.delete(hash);
  }
}

let observerPaused = false;

function scanInbox(): void {
  // Pause observer while we modify DOM to avoid infinite loop
  observerPaused = true;
  const rows = document.querySelectorAll(SELECTORS.inboxRow);
  rows.forEach((row) => {
    void analyzeRow(row);
  });
  // Resume observer on next microtask (after our DOM writes settle)
  queueMicrotask(() => { observerPaused = false; });
}

export function initInboxWatcher(): void {
  scanInbox();

  let rafId = 0;
  const observer = new MutationObserver((mutations) => {
    if (observerPaused) return;

    // Only rescan if mutations came from Gmail, not from our own badge inserts
    const isOwnMutation = mutations.every((m) =>
      Array.from(m.addedNodes).every((n) =>
        n instanceof HTMLElement && n.classList.contains("mm-inbox-badge")
      )
    );
    if (isOwnMutation) return;

    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      scanInbox();
    });
  });

  observer.observe(document.body, { subtree: true, childList: true });
}
