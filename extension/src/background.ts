import { analyzeTone } from "./lib/analyzer.js";
import { rewriteDraft } from "./lib/rewrite.js";

chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  (async () => {
    try {
      if (message.type === "MM_ANALYZE") {
        const data = analyzeTone(message.payload.text);
        sendResponse({ ok: true, data });
      } else if (message.type === "MM_REWRITE") {
        const data = rewriteDraft(message.payload.text, message.payload.targetTone);
        sendResponse({ ok: true, data });
      } else {
        sendResponse({ ok: false, error: "Unknown message type" });
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
  })();

  return true;
});
