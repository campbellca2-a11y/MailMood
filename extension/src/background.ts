/**
 * MailMood Background Service Worker (Local-First)
 * - No network calls
 * - No tokens
 * - Runs tone analysis + polish locally
 *
 * Back-compat:
 * - still accepts { type: "PROCESS_TEXT", task: "mood"|"rewrite", text }
 *
 * New message types:
 * - { type: "MM_ANALYZE", text }
 * - { type: "MM_POLISH", text }
 */

import { analyzeTone } from "./lib/analyzer";
import { polishText } from "./lib/polisher";

const DEBUG = false;

function log(...args: any[]) {
  if (DEBUG) console.log("[MailMood SW]", ...args);
}

type LegacyTask = "mood" | "rewrite";

type LegacyMsg = {
  type: "PROCESS_TEXT";
  task: LegacyTask;
  text: string;
};

type AnalyzeMsg = {
  type: "MM_ANALYZE";
  text: string;
};

type PolishMsg = {
  type: "MM_POLISH";
  text: string;
};

type AnyMsg = LegacyMsg | AnalyzeMsg | PolishMsg;

chrome.runtime.onMessage.addListener((msg: AnyMsg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object" || !("type" in msg)) return;

  try {
    // Legacy path
    if (msg.type === "PROCESS_TEXT") {
      const text = (msg.text || "").toString();

      if (msg.task === "rewrite") {
        const out = polishText(text);
        return sendResponse({ success: true, data: out });
      }

      // mood
      const out = analyzeTone(text);
      return sendResponse({ success: true, data: out });
    }

    // New paths
    if (msg.type === "MM_ANALYZE") {
      const text = (msg.text || "").toString();
      const out = analyzeTone(text);
      return sendResponse({ ok: true, data: out });
    }

    if (msg.type === "MM_POLISH") {
      const text = (msg.text || "").toString();
      const out = polishText(text);
      return sendResponse({ ok: true, data: out });
    }
  } catch (e: any) {
    log("Error:", e?.message || e);

    // Return both shapes so callers don't break
    return sendResponse({
      success: false,
      ok: false,
      error: "LOCAL_PROCESSING_ERROR"
    });
  }
});