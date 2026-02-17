import { SELECTORS, TONE_META } from "../constants";
import type {
  AnalyzeResponse,
  BackgroundAnalyzeMessage
} from "../types";

interface ComposeContext {
  body: HTMLElement;
  panel: HTMLDivElement;
  panelBody: HTMLDivElement;
  status: HTMLDivElement;
  emotionList: HTMLUListElement;
  lastDraft: string;
  timerId: number | null;
}

// Use a Map (not WeakMap) so we can iterate to find orphaned panels
const contexts = new Map<HTMLElement, ComposeContext>();

function sendAnalyze(text: string): Promise<AnalyzeResponse> {
  const message: BackgroundAnalyzeMessage = {
    type: "MM_ANALYZE",
    payload: { text, mode: "outgoing" }
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

function getDraftText(body: HTMLElement): string {
  return body.innerText.trim();
}

function renderAnalysis(context: ComposeContext, analysis: AnalyzeResponse): void {
  const meta = TONE_META[analysis.toneLabel];
  context.status.textContent = `${meta.label} (${Math.round(analysis.confidence * 100)}%)`;
  context.status.style.color = meta.color;
  context.status.title = analysis.explanation;

  context.emotionList.innerHTML = "";
  analysis.emotions.forEach((emotion) => {
    const item = document.createElement("li");
    item.textContent = `${emotion.name}: ${Math.round(emotion.intensity * 100)}%`;
    context.emotionList.appendChild(item);
  });
}

function makeDraggable(panel: HTMLDivElement, handle: HTMLDivElement): void {
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;

  handle.addEventListener("mousedown", (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest(".mm-toggle")) {
      return;
    }
    dragging = true;
    offsetX = e.clientX - panel.getBoundingClientRect().left;
    offsetY = e.clientY - panel.getBoundingClientRect().top;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e: MouseEvent) => {
    if (!dragging) return;
    panel.style.left = `${e.clientX - offsetX}px`;
    panel.style.top = `${e.clientY - offsetY}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
}

function createPanel(): ComposeContext {
  const panel = document.createElement("div");
  panel.className = "mm-compose-panel";
  panel.innerHTML = `
    <div class="mm-header">
      <span class="mm-title">MailMood</span>
      <button class="mm-toggle" type="button" title="Minimize">_</button>
    </div>
    <div class="mm-panel-body">
      <div class="mm-status">Analyzing draft...</div>
      <ul class="mm-emotions"></ul>
      <p class="mm-caption">No email text is stored.</p>
    </div>
  `;

  const header = panel.querySelector<HTMLDivElement>(".mm-header")!;
  const panelBody = panel.querySelector<HTMLDivElement>(".mm-panel-body")!;
  const toggleBtn = panel.querySelector<HTMLButtonElement>(".mm-toggle")!;
  const status = panel.querySelector<HTMLDivElement>(".mm-status")!;
  const emotionList = panel.querySelector<HTMLUListElement>(".mm-emotions")!;

  makeDraggable(panel, header);

  toggleBtn.addEventListener("click", () => {
    const isHidden = panelBody.style.display === "none";
    panelBody.style.display = isHidden ? "" : "none";
    toggleBtn.textContent = isHidden ? "_" : "+";
    toggleBtn.title = isHidden ? "Minimize" : "Expand";
    panel.classList.toggle("mm-minimized", !isHidden);
  });

  return {
    body: document.createElement("div"),
    panel,
    panelBody,
    status,
    emotionList,
    lastDraft: "",
    timerId: null
  };
}

async function updateAnalysis(context: ComposeContext): Promise<void> {
  const text = getDraftText(context.body);
  if (text.length < 6 || text === context.lastDraft) {
    return;
  }

  context.lastDraft = text;
  context.status.textContent = "Analyzing...";
  try {
    const analysis = await sendAnalyze(text);
    renderAnalysis(context, analysis);
  } catch {
    context.status.textContent = "Tone unavailable.";
  }
}

function attachToComposeBody(body: HTMLElement): void {
  if (contexts.has(body)) {
    return;
  }

  const dialog = body.closest(SELECTORS.composeDialog);
  if (!dialog) {
    return;
  }

  const context = createPanel();
  context.body = body;
  contexts.set(body, context);

  document.body.appendChild(context.panel);

  // Position near the compose dialog initially
  const dialogRect = dialog.getBoundingClientRect();
  context.panel.style.top = `${dialogRect.top + 10}px`;
  context.panel.style.left = `${dialogRect.right + 8}px`;

  const panelWidth = 280;
  if (dialogRect.right + panelWidth + 16 > window.innerWidth) {
    context.panel.style.left = `${Math.max(8, dialogRect.left - panelWidth - 8)}px`;
  }

  const schedule = () => {
    if (context.timerId !== null) {
      window.clearTimeout(context.timerId);
    }
    context.timerId = window.setTimeout(() => {
      void updateAnalysis(context);
    }, 500);
  };

  body.addEventListener("input", schedule, { passive: true });
  void updateAnalysis(context);
}

function cleanupOrphanedPanels(): void {
  for (const [body, context] of contexts) {
    // If the compose body is no longer in the document, remove the panel
    if (!document.body.contains(body)) {
      if (context.timerId !== null) {
        window.clearTimeout(context.timerId);
      }
      context.panel.remove();
      contexts.delete(body);
    }
  }
}

function scanComposeBodies(): void {
  cleanupOrphanedPanels();
  const bodies = document.querySelectorAll<HTMLElement>(SELECTORS.composeBody);
  bodies.forEach((body) => attachToComposeBody(body));
}

export function initComposeWatcher(): void {
  scanComposeBodies();

  let rafId = 0;
  const observer = new MutationObserver(() => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(scanComposeBodies);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
