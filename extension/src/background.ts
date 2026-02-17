import { API_BASE_URL } from "./constants";
import { localAnalyze, localRewrite } from "./lib/localFallback";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  BackgroundMessage,
  RewriteRequest,
  RewriteResponse
} from "./types";

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
  (async () => {
    if (message.type === "MM_ANALYZE") {
      const payload: AnalyzeRequest = message.payload;
      try {
        const result = await postJson<AnalyzeResponse>("/analyze", payload);
        result.confidence = clamp(result.confidence);
        result.emotions = result.emotions.map((emotion) => ({
          ...emotion,
          intensity: clamp(emotion.intensity)
        }));
        sendResponse({ ok: true, data: result });
      } catch {
        sendResponse({ ok: true, data: localAnalyze(payload.text) });
      }
      return;
    }

    if (message.type === "MM_REWRITE") {
      const payload: RewriteRequest = message.payload;
      try {
        const result = await postJson<RewriteResponse>("/rewrite", payload);
        sendResponse({ ok: true, data: result });
      } catch {
        sendResponse({ ok: true, data: localRewrite(payload.text) });
      }
      return;
    }

    sendResponse({ ok: false, error: "Unknown message type" });
  })();

  return true;
});
