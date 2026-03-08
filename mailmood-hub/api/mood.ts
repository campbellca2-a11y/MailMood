import { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Project EOS™: MailMood Lean Hub
 * Updated: 2026-03-03
 */

const API_KEY = process.env.GEMINI_API_KEY || "";
const HUB_TOKEN = process.env.MAILMOOD_HUB_TOKEN?.trim();

const genAI = new GoogleGenerativeAI(API_KEY);

function setCors(res: VercelResponse) {
  // You can lock this down later to your chrome-extension://<id>
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-MailMood-Token"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Cache-Control", "no-store");
}

function getToken(req: VercelRequest) {
  // supports either body token OR header token (use either, keep lean)
  const headerToken =
    (req.headers["x-mailmood-token"] as string | undefined)?.trim() ||
    (req.headers["authorization"] as string | undefined)?.replace(/^Bearer\s+/i, "").trim();

  const bodyToken = (req.body?.token as string | undefined)?.trim();

  return headerToken || bodyToken || "";
}

function extractRetryAfterSeconds(error: any): number | null {
  // Your log includes: errorDetails: [{...RetryInfo retryDelay:"50s"}]
  const details = error?.errorDetails;
  if (!Array.isArray(details)) return null;

  for (const d of details) {
    const retryDelay = d?.retryDelay;
    if (typeof retryDelay === "string") {
      const m = retryDelay.match(/(\d+)\s*s/i);
      if (m) return Number(m[1]);
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  // 1) Preflight + method gate
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  // 2) Env sanity
  if (!API_KEY) return res.status(500).json({ ok: false, error: "SERVER_MISCONFIGURED" });

  const { text, task } = req.body || {};
  const cleanText = (text ?? "").toString().trim();
  const cleanTask = (task ?? "").toString().trim();

  // 3) Lightweight protection (optional)
  if (HUB_TOKEN) {
    const got = getToken(req);
    if (!got || got !== HUB_TOKEN) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }
  }

  // 4) Input validation
  if (!cleanText) return res.status(400).json({ ok: false, error: "MISSING_TEXT" });
  if (cleanText.length > 500) return res.status(413).json({ ok: false, error: "TEXT_TOO_LONG" });
  if (cleanTask !== "mood" && cleanTask !== "rewrite") {
    return res.status(400).json({ ok: false, error: "INVALID_TASK" });
  }

  try {
    // Keep your current model; quotas are still quotas.
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    const prompt =
      cleanTask === "rewrite"
        ? [
            "Rewrite this email subject line to be professional yet empathetic.",
            "Rules: keep it short; preserve intent; output ONLY the rewritten subject (no quotes).",
            "",
            cleanText,
          ].join("\n")
        : [
            "Analyze the sentiment of this email subject line.",
            "Return ONE word ONLY: Positive, Neutral, or Negative.",
            "",
            cleanText,
          ].join("\n");

    const result = await model.generateContent(prompt);
    const output = result?.response?.text?.() ?? "";

    return res.status(200).json({
      ok: true,
      data: output.trim(),
    });
  } catch (error: any) {
    const status = error?.status ?? error?.response?.status;

    // ✅ Key fix: propagate 429 as 429 (not 500) + include retryAfter
    if (status === 429) {
      const retryAfter = extractRetryAfterSeconds(error) ?? 60;
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        ok: false,
        error: "RATE_LIMIT",
        retryAfter,
      });
    }

    // Keep logs minimal (errors only)
    console.error("Gemini Execution Error:", error?.message ?? error);

    return res.status(500).json({
      ok: false,
      error: "AI_PROXY_ERROR",
    });
  }
}