/**
 * MailMood Inbox Pill Injector (Local-First, Resilient)
 * - Re-stamps rows if Gmail re-renders them (hover/click/header changes)
 * - Observes document.body so it survives main container replacement
 * - Uses MM_ANALYZE -> background local analyzer
 * - IntersectionObserver analyzes only visible rows
 */

type AnalyzeResult = {
  toneLabel: string;
  confidence: number;
  explanation?: string;
};

const PILL_CLASS = "mailmood-pill";
const rowResultCache = new Map<string, AnalyzeResult>(); // key: message-id or fallback key

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
    "background-color:#f5f5f4; color:#78716c; border:1px solid #d6d3d1; line-height:16px; vertical-align:middle;";
  return pill;
}

function setPill(pill: HTMLElement, toneLabel: string) {
  const s = toneToDisplay(toneLabel);
  pill.textContent = s.text;
  pill.style.backgroundColor = s.bg;
  pill.style.color = s.fg;
  pill.style.borderColor = s.border;
}

function getMainRoot(): HTMLElement | null {
  return document.querySelector('div[role="main"]') as HTMLElement | null;
}

function getCandidateRows(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('tr[data-legacy-last-message-id], tr.zA, div.zA'));
}

function getRowKey(row: HTMLElement): string {
  const legacyId = row.getAttribute("data-legacy-last-message-id");
  if (legacyId) return `legacy:${legacyId}`;

  const subj = (row.querySelector(".bog")?.textContent || "").trim();
  const snip = (row.querySelector(".y2")?.textContent || "").trim();
  return `fallback:${subj}::${snip}`.slice(0, 220);
}

function getSnippetText(row: HTMLElement): string {
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
    chrome.runtime.sendMessage({ type: "MM_ANALYZE", text }, (response) => {
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

function ensureStamped(row: HTMLElement, io: IntersectionObserver) {
  // If a pill already exists, nothing to do (prevents duplicates)
  if (row.querySelector(`.${PILL_CLASS}`)) return;

  const target = getTargetCell(row);
  if (!target) return;

  const pill = makePill();
  target.prepend(pill);

  const key = getRowKey(row);

  const cached = rowResultCache.get(key);
  if (cached) {
    setPill(pill, cached.toneLabel);
    const conf = typeof cached.confidence === "number" ? Math.round(cached.confidence * 100) : undefined;
    const expl = cached.explanation ? ` — ${cached.explanation}` : "";
    pill.title = `${cached.toneLabel}${conf != null ? ` (${conf}%)` : ""}${expl}`;
    return;
  }

  (row as any).__mailmoodPill = pill;
  (row as any).__mailmoodKey = key;

  io.observe(row);
}

function analyzeRow(row: HTMLElement) {
  const pill = (row as any).__mailmoodPill as HTMLElement | undefined;
  const key = (row as any).__mailmoodKey as string | undefined;
  if (!pill || !key) return;

  const cached = rowResultCache.get(key);
  if (cached) {
    setPill(pill, cached.toneLabel || "neutral_automated");
    return;
  }

  const text = getSnippetText(row);
  if (!text) {
    const r = { toneLabel: "neutral_automated", confidence: 0.5 } as AnalyzeResult;
    rowResultCache.set(key, r);
    setPill(pill, r.toneLabel);
    return;
  }

  sendAnalyze(text)
    .then((r) => {
      rowResultCache.set(key, r);
      setPill(pill, r.toneLabel || "neutral_automated");

      const conf = typeof r.confidence === "number" ? Math.round(r.confidence * 100) : undefined;
      const expl = r.explanation ? ` — ${r.explanation}` : "";
      pill.title = `${r.toneLabel}${conf != null ? ` (${conf}%)` : ""}${expl}`;
    })
    .catch(() => {
      pill.textContent = "??";
      pill.style.backgroundColor = "#f1f5f9";
      pill.style.color = "#475569";
      pill.style.borderColor = "#cbd5e1";
      pill.title = "MailMood: analysis failed";
    });
}

export function injectPills() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const row = e.target as HTMLElement;
        analyzeRow(row);
        io.unobserve(row);
      }
    },
    { root: null, threshold: 0.1 }
  );

  const restamp = () => {
    const main = getMainRoot();
    if (!main) return;
    const rows = getCandidateRows(main);
    for (const row of rows) ensureStamped(row, io);
  };

  // Initial pass
  restamp();

  // Observe the whole document so we're resilient to Gmail replacing role="main"
  const mo = new MutationObserver(() => restamp());
  mo.observe(document.body, { childList: true, subtree: true });
}