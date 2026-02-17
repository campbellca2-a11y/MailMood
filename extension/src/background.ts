const DEFAULTS = {
  apiBase: "http://localhost:8787"
};

const REQUEST_TIMEOUT_MS = 8000;

async function getSettings() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...data };
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  (async () => {
    try {
      const { apiBase } = await getSettings();

      if (message.type === "ANALYZE_TONE") {
        const res = await fetchWithTimeout(`${apiBase}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message.text })
        });
        const data = await res.json();
        sendResponse({ ok: true, data });
      }

      if (message.type === "REWRITE") {
        const res = await fetchWithTimeout(`${apiBase}/rewrite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message.text })
        });
        const data = await res.json();
        sendResponse({ ok: true, data });
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
  })();

  return true;
});
