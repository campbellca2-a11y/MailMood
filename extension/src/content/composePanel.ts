import { SELECTORS, TONE_META } from "../constants";
import type {
  AnalyzeResponse,
  BackgroundAnalyzeMessage,
  BackgroundRewriteMessage,
  RewriteResponse,
  ToneLabel
} from "../types";

interface ComposeContext {
  body: HTMLElement;
  panel: HTMLDivElement;
  panelBody: HTMLDivElement;
  status: HTMLDivElement;
  emotionList: HTMLUListElement;
  rewriteButton: HTMLButtonElement;
  sendAnywayButton: HTMLButtonElement;
  rewritePreview: HTMLDivElement;
  rewriteText: HTMLPreElement;
  applyRewriteButton: HTMLButtonElement;
  dismissRewriteButton: HTMLButtonElement;
  lastDraft: string;
  lastAnalysis: AnalyzeResponse | null;
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

function sendRewrite(text: string, targetTone: ToneLabel): Promise<RewriteResponse> {
  const message: BackgroundRewriteMessage = {
    type: "MM_REWRITE",
    payload: { text, targetTone }
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
      resolve(response.data as RewriteResponse);
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

function setRewriteLoading(context: ComposeContext, loading: boolean): void {
  context.rewriteButton.disabled = loading;
  context.rewriteButton.textContent = loading ? "Rewriting..." : "Rewrite";
}

function hideRewritePreview(context: ComposeContext): void {
  context.rewritePreview.hidden = true;
  context.rewriteText.textContent = "";
}

function showRewritePreview(context: ComposeContext, rewrite: RewriteResponse): void {
  context.rewriteText.textContent = rewrite.rewritten;
  context.rewritePreview.hidden = false;
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
      <div class="mm-actions">
        <button class="mm-btn mm-btn-primary mm-rewrite-btn" type="button">Rewrite</button>
        <button class="mm-btn mm-btn-muted mm-send-anyway-btn" type="button">Send Anyway</button>
      </div>
      <div class="mm-rewrite-preview" hidden>
        <div class="mm-rewrite-label">Suggested rewrite</div>
        <pre class="mm-rewrite-text"></pre>
        <div class="mm-actions">
          <button class="mm-btn mm-btn-primary mm-apply-rewrite-btn" type="button">Apply Rewrite</button>
          <button class="mm-btn mm-btn-muted mm-dismiss-rewrite-btn" type="button">Dismiss</button>
        </div>
      </div>
      <p class="mm-caption">No email text is stored.</p>
    </div>
  `;

  const header = panel.querySelector<HTMLDivElement>(".mm-header")!;
  const panelBody = panel.querySelector<HTMLDivElement>(".mm-panel-body")!;
  const toggleBtn = panel.querySelector<HTMLButtonElement>(".mm-toggle")!;
  const status = panel.querySelector<HTMLDivElement>(".mm-status")!;
  const emotionList = panel.querySelector<HTMLUListElement>(".mm-emotions")!;
  const rewriteButton = panel.querySelector<HTMLButtonElement>(".mm-rewrite-btn")!;
  const sendAnywayButton = panel.querySelector<HTMLButtonElement>(".mm-send-anyway-btn")!;
  const rewritePreview = panel.querySelector<HTMLDivElement>(".mm-rewrite-preview")!;
  const rewriteText = panel.querySelector<HTMLPreElement>(".mm-rewrite-text")!;
  const applyRewriteButton = panel.querySelector<HTMLButtonElement>(".mm-apply-rewrite-btn")!;
  const dismissRewriteButton = panel.querySelector<HTMLButtonElement>(".mm-dismiss-rewrite-btn")!;

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
    rewriteButton,
    sendAnywayButton,
    rewritePreview,
    rewriteText,
    applyRewriteButton,
    dismissRewriteButton,
    lastDraft: "",
    lastAnalysis: null,
    timerId: null
  };
}

async function updateAnalysis(context: ComposeContext): Promise<void> {
  const text = getDraftText(context.body);
  if (text.length < 6 || text === context.lastDraft) {
    return;
  }

  context.lastDraft = text;
  hideRewritePreview(context);
  context.status.textContent = "Analyzing...";
  try {
    const analysis = await sendAnalyze(text);
    context.lastAnalysis = analysis;
    renderAnalysis(context, analysis);
  } catch {
    context.lastAnalysis = null;
    context.status.textContent = "Tone unavailable.";
  }
}

async function runRewrite(context: ComposeContext): Promise<void> {
  const text = getDraftText(context.body);
  if (!text) {
    return;
  }

  const detectedTone = context.lastAnalysis?.toneLabel ?? "calm_professional";
  const targetTone: ToneLabel = detectedTone === "urgent_tense" || detectedTone === "apologetic_anxious"
    ? "calm_professional"
    : "warm_positive";

  setRewriteLoading(context, true);
  try {
    const rewrite = await sendRewrite(text, targetTone);
    showRewritePreview(context, rewrite);
  } catch {
    context.status.textContent = "Rewrite unavailable.";
  } finally {
    setRewriteLoading(context, false);
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

  context.rewriteButton.addEventListener("click", () => {
    void runRewrite(context);
  });

  context.sendAnywayButton.addEventListener("click", () => {
    hideRewritePreview(context);
    context.status.textContent = "Send decision remains yours.";
  });

  context.dismissRewriteButton.addEventListener("click", () => {
    hideRewritePreview(context);
  });

  context.applyRewriteButton.addEventListener("click", () => {
    const rewritten = context.rewriteText.textContent?.trim() ?? "";
    if (!rewritten) {
      return;
    }
    body.innerText = rewritten;
    body.dispatchEvent(new Event("input", { bubbles: true }));
    hideRewritePreview(context);
    context.status.textContent = "Rewrite applied.";
  });

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
